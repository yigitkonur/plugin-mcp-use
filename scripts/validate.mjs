#!/usr/bin/env node
// Repo validation: manifests, size caps, source citations, version agreement. Exit 1 on any failure.
import { readFileSync, readdirSync, statSync, existsSync, accessSync, constants } from "node:fs";
import { join, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";

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
    if (!m) err(`${rel}: no "Sources:" line`);
    else for (const id of m[1].split(/[,\s]+/).filter(Boolean)) if (!sources[id]) err(`${rel}: unknown source id ${id}`);
  }
}
for (const f of [...walk(join(root, "bin")), ...walk(join(root, "hooks")).filter((x) => x.endsWith(".sh")), ...walk(join(root, "skills")).filter((x) => x.includes("/scripts/"))]) {
  try { accessSync(f, constants.X_OK); } catch { err(`${relative(root, f)}: not executable`); }
}
if (errors.length) { console.error(errors.map((e) => "FAIL " + e).join("\n")); process.exit(1); }
console.log("validate: ok");
