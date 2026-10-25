#!/usr/bin/env node
// Repo validation: manifests, size caps, source citations, version agreement. Exit 1 on any failure.
import { readFileSync, readdirSync, statSync, existsSync, accessSync, constants } from "node:fs";
import { join, dirname, relative } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { findBrokenRefs } from "../lib/refs.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const errors = [];

const err = (m) => errors.push(m);
const json = (p) => { try { return JSON.parse(readFileSync(join(root, p), "utf8")); } catch (e) { err(`${p}: invalid JSON (${e.message})`); return null; } };

const plugin = json(".claude-plugin/plugin.json");
const market = json(".claude-plugin/marketplace.json");
json("hooks/hooks.json"); json(".mcp.json"); json("data/versions.json");
const sources = json("data/sources.json")?.sources ?? {};
if (plugin && market) {
  const mv = market.plugins?.[0]?.version;
  if (plugin.version !== mv || plugin.version !== market.metadata?.version) err(`version mismatch: plugin.json ${plugin.version}, marketplace plugin ${mv}, marketplace metadata ${market.metadata?.version}`);
}

// the Codex side: same version as the Claude manifest, same docs MCP servers, hook scripts that exist
const codex = json(".codex-plugin/plugin.json");
const codexMarket = json(".agents/plugins/marketplace.json");
const codexMcp = json(".codex-mcp.json");
const codexHooks = json("hooks/codex-hooks.json");
if (plugin && codex && codex.version !== plugin.version) err(`version mismatch: .codex-plugin/plugin.json ${codex.version}, .claude-plugin/plugin.json ${plugin.version}`);
if (codex) for (const k of ["skills", "mcpServers", "hooks"]) if (!codex[k] || !existsSync(join(root, codex[k]))) err(`.codex-plugin/plugin.json: ${k} "${codex[k]}" does not exist`);
if (codexMarket) { const e = codexMarket.plugins?.[0]; if (e?.name !== plugin?.name || !e?.policy?.installation || !e?.policy?.authentication || !e?.category) err(".agents/plugins/marketplace.json: entry needs the plugin name, policy.installation, policy.authentication and category"); }
if (codexMcp) {
  const claudeMcp = json(".mcp.json")?.mcpServers ?? {};
  const want = Object.fromEntries(Object.entries(claudeMcp).map(([k, v]) => [k, v.url]));
  const have = Object.fromEntries(Object.entries(codexMcp.mcpServers ?? {}).map(([k, v]) => [k, v.url]));
  if (JSON.stringify(want, Object.keys(want).sort()) !== JSON.stringify(have, Object.keys(have).sort())) err(`.codex-mcp.json servers ${JSON.stringify(have)} differ from .mcp.json ${JSON.stringify(want)}`);
}
if (codexHooks) for (const m of JSON.stringify(codexHooks).matchAll(/\$\{PLUGIN_ROOT\}\/([\w./-]+)/g)) if (!existsSync(join(root, m[1]))) err(`hooks/codex-hooks.json: ${m[1]} does not exist`);
for (const d of readdirSync(join(root, "skills"))) {
  const sk = readFileSync(join(root, "skills", d, "SKILL.md"), "utf8");
  const noModel = /^disable-model-invocation:\s*true/m.test(sk);
  const yaml = join(root, "skills", d, "agents", "openai.yaml");
  if (noModel !== (existsSync(yaml) && /allow_implicit_invocation:\s*false/.test(readFileSync(yaml, "utf8")))) err(`skills/${d}: disable-model-invocation and agents/openai.yaml allow_implicit_invocation:false must agree`);
  if (!sk.includes("In Codex:")) err(`skills/${d}/SKILL.md: missing the "In Codex:" line`);
}

function* walk(dir) {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) { if (e !== "node_modules") yield* walk(p); } else yield p;
  }
}
const lines = (p) => readFileSync(p, "utf8").split("\n").length - 1;
const KNOWLEDGE = new Set(["mcp-use-server", "mcp-apps", "host-chatgpt", "host-archestra"]);

for (const dir of readdirSync(join(root, "skills"))) {
  const skillMd = join(root, "skills", dir, "SKILL.md");
  if (!existsSync(skillMd)) { err(`skills/${dir}: no SKILL.md`); continue; }
  const text = readFileSync(skillMd, "utf8");
  const fm = text.match(/^---\n([\s\S]*?)\n---/)?.[1] ?? "";
  const name = fm.match(/^name:\s*(.+)$/m)?.[1].trim();
  if (name !== dir) err(`skills/${dir}/SKILL.md: name "${name}" must equal the directory`);
  const desc = fm.match(/^description:\s*(.+)$/m)?.[1].trim().replace(/^"|"$/g, "") ?? "";
  if (!desc) err(`skills/${dir}/SKILL.md: missing description`);
  if (KNOWLEDGE.has(dir) && desc.length > 350) err(`skills/${dir}: knowledge description ${desc.length} chars > 350`);
  if (KNOWLEDGE.has(dir) && !/user-invocable:\s*false/.test(fm)) err(`skills/${dir}: knowledge skill must set user-invocable: false`);
  if (!KNOWLEDGE.has(dir) && !/disable-model-invocation:\s*true/.test(fm)) err(`skills/${dir}: workflow skill must set disable-model-invocation: true`);
  if (lines(skillMd) > 150) err(`skills/${dir}/SKILL.md: ${lines(skillMd)} lines > 150`);
}
for (const f of walk(join(root, "skills"))) {
  if (!f.endsWith(".md") || f.endsWith("/SKILL.md")) continue;
  const rel = relative(root, f);
  const text = readFileSync(f, "utf8");
  if (rel.includes("/references/")) {
    if (lines(f) > 300) err(`${rel}: ${lines(f)} lines > 300`);
    const m = text.match(/^Sources:\s*(.+?)\.?\s*$/m);
    const knowledge = KNOWLEDGE.has(rel.split("/")[1]);
    if (!m) { if (knowledge) err(`${rel}: no "Sources:" line`); }
    else for (const id of m[1].split(/[,\s]+/).filter(Boolean)) if (!sources[id]) err(`${rel}: unknown source id ${id}`);
  }
}
for (const f of [...walk(join(root, "bin")), ...walk(join(root, "hooks")).filter((x) => x.endsWith(".sh")), ...walk(join(root, "skills")).filter((x) => x.includes("/scripts/"))]) {
  try { accessSync(f, constants.X_OK); } catch { err(`${relative(root, f)}: not executable`); }
}
// docs: every backticked path resolves, written so it works from wherever the model reads it (lib/refs.mjs)
for (const b of findBrokenRefs(root)) err(`${b.file}:${b.line}: \`${b.ref}\` ${b.problem}`);
// checklists: every referenced static rule exists in guard-rules.tsv, every probe rule is emitted by lib/probe.mjs
const ruleIds = new Set(readFileSync(join(root, "data", "guard-rules.tsv"), "utf8").split("\n").filter((l) => l && !l.startsWith("#")).map((l) => l.split("\t")[0]));
const probeSrc = readFileSync(join(root, "lib", "probe.mjs"), "utf8");
const { RULE_IDS: lintIds, RULE_META } = await import(pathToFileURL(join(root, "lib", "archestra-lint.mjs")).href);
for (const f of readdirSync(join(root, "data", "hosts"))) {
  const cl = json(`data/hosts/${f}`);
  for (const it of cl?.items ?? []) {
    if (!sources[it.source]) err(`data/hosts/${f}: ${it.id} cites unknown source ${it.source}`);
    for (const r of it.static_rules) if (!ruleIds.has(r)) err(`data/hosts/${f}: ${it.id} names unknown static rule ${r}`);
    for (const r of it.lint_rules ?? []) if (!lintIds.includes(r)) err(`data/hosts/${f}: ${it.id} names unknown lint rule ${r}`);
    for (const r of it.probe_rules) if (!probeSrc.includes(`"${r}"`)) err(`data/hosts/${f}: ${it.id} names probe rule ${r} not emitted by lib/probe.mjs`);
  }
}
const archItems = json("data/hosts/archestra.checklist.json")?.items ?? [];
const recipes = readFileSync(join(root, "skills", "archestra-app", "references", "fix-recipes.md"), "utf8");
for (const id of lintIds) if (RULE_META[id].fix_mode !== "auto" && !new RegExp(`\\*\\*[^*\\n]*\\b${id}\\b[^*\\n]*\\*\\*`).test(recipes)) err(`skills/archestra-app/references/fix-recipes.md: no recipe heading for ${id}`);
const lintDoc = readFileSync(join(root, "skills", "host-archestra", "references", "lint-rules.md"), "utf8");
for (const id of lintIds) if (!new RegExp(`\\| ${id} \\|`).test(lintDoc)) err(`skills/host-archestra/references/lint-rules.md: no table row for ${id}`);
for (const id of lintIds) if (!archItems.some((it) => (it.lint_rules ?? []).includes(id))) err(`data/hosts/archestra.checklist.json: lint rule ${id} is not covered by any AO-* item`);
for (const l of readFileSync(join(root, "data", "guard-rules.tsv"), "utf8").split("\n").filter((x) => x && !x.startsWith("#"))) {
  const c = l.split("\t");
  if (!sources[c[11]]) err(`data/guard-rules.tsv: ${c[0]} cites unknown source ${c[11]}`);
}
// migration fixtures and workspace pin the official SDK at data/versions.json known_good
const vp = json("data/versions.json")?.packages ?? {};
for (const [where, file] of [["tests/types/migration", "tests/types/migration/package.json"], ["tests/fixtures/f02", "tests/fixtures/f02/package.json"], ["tests/fixtures/f03", "tests/fixtures/f03/package.json"], ["tests/fixtures/f11", "tests/fixtures/f11/package.json"]]) {
  const pj = json(file);
  for (const [dep, v] of Object.entries(pj?.dependencies ?? {})) {
    const want = vp[dep]?.known_good ?? null;
    if (want && v !== want) err(`${where}: ${dep} is ${v}, expected ${want} (data/versions.json known_good)`);
  }
}
if (errors.length) { console.error(errors.map((e) => "FAIL " + e).join("\n")); process.exit(1); }
console.log("validate: ok");
