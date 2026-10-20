import { existsSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { readTsv } from "./tsv.mjs";
import { walk, globToRegex, readJson, readText, readSettings, versionOf, cmpVersion } from "./project.mjs";

export const PLUGIN_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OTHER_STACKS = ["pyproject.toml", "requirements.txt", "go.mod", "Cargo.toml", "pom.xml", "build.gradle", "build.gradle.kts", "Gemfile", "composer.json", "Package.swift"];
const ALL_WORKFLOWS = ["start", "new", "migrate", "apps", "host", "verify", "archestra-app"];

export function installedWorkflows() {
  try {
    return ALL_WORKFLOWS.filter((w) => existsSync(join(PLUGIN_ROOT, "skills", w, "SKILL.md")));
  } catch { return ["start"]; }
}

function packageDirs(root, files) {
  // root package.json plus any package.json in the walked tree (workspaces); bounded by the walk.
  return files.filter((f) => f === "package.json" || f.endsWith("/package.json")).map((f) => (f === "package.json" ? "" : f.slice(0, -"/package.json".length)));
}

export function detect(root, { rulesPath = join(PLUGIN_ROOT, "data", "signals.tsv"), versionsPath = join(PLUGIN_ROOT, "data", "versions.json") } = {}) {
  const settings = readSettings(root);
  const files = walk(root);
  const pkgDirs = packageDirs(root, files);
  const result = {
    stack: { node: pkgDirs.length > 0, typescript: false, other: [] },
    packages: [], signals: [], scenario: "NONE", secondary: [],
    hosts: { declared: settings.hosts, inferred: [], configured: settings.configured_hosts },
    versions: {}, entry: null, views: [], settings: { enabled: settings.enabled },
  };

  if (!result.stack.node) {
    result.stack.other = OTHER_STACKS.filter((f) => files.includes(f) || files.some((x) => x.endsWith("/" + f)));
    // Without a package.json this is not a Node project: detect and the hooks stay out of it, even when owned_app_paths is declared.
    // Owned-App HTML there is linted only when the user names the file: `archestra-app-lint <file>` works on any HTML file.
    result.scenario = result.stack.other.length ? "OUT_OF_SCOPE" : "NONE";
    return result;
  }

  result.stack.typescript = files.some((f) => /(^|\/)tsconfig[^/]*\.json$/.test(f)) || files.some((f) => /\.(ts|tsx|mts)$/.test(f) && !f.endsWith(".d.ts"));

  const rules = readTsv(rulesPath, ["id", "kind", "glob", "pattern", "meaning"]);
  const hit = new Map(); // id -> evidence {file, line?}
  const depNames = new Map(); // dep name -> {range, dir}

  for (const dir of pkgDirs) {
    const pj = readJson(join(root, dir, "package.json")) || {};
    const deps = { ...pj.dependencies, ...pj.devDependencies, ...pj.peerDependencies, ...pj.optionalDependencies };
    for (const [name, range] of Object.entries(deps)) if (!depNames.has(name)) depNames.set(name, { range, dir });
    result.packages.push({ dir: dir || ".", name: pj.name ?? null });
  }
  for (const r of rules.filter((x) => x.kind === "dep")) {
    const re = new RegExp(r.pattern);
    for (const [name, v] of depNames) if (re.test(name)) { hit.set(r.id, { dep: name, range: v.range, dir: v.dir }); break; }
  }
  for (const r of rules.filter((x) => x.kind === "path")) {
    const re = globToRegex(r.glob);
    const m = files.find((f) => re.test(f));
    if (m) hit.set(r.id, { file: m });
  }
  const srcRules = rules.filter((x) => x.kind === "src").map((r) => ({ ...r, g: globToRegex(r.glob), re: new RegExp(r.pattern) }));
  const ownedPaths = settings.owned_app_paths.map((p) => globToRegex(p));
  for (const f of files) {
    const cands = srcRules.filter((r) => !hit.has(r.id) && r.g.test(f));
    const owned = ownedPaths.some((g) => g.test(f));
    if (!cands.length && !owned) continue;
    const text = readText(join(root, f));
    if (!text) continue;
    for (const r of cands) {
      const m = r.re.exec(text);
      if (m) hit.set(r.id, { file: f, line: text.slice(0, m.index).split("\n").length });
    }
    if (owned && !hit.has("O-APP")) hit.set("O-APP", { file: f });
    if (hit.size === rules.length + 1) break;
  }

  const has = (id) => hit.has(id);
  const sig = {
    "M-USE": has("M-USE"), "M-USE-SRV": has("M-USE-SRV"),
    "M-USE-V1": has("M-USE-V1-IMPORT") || has("M-USE-V1-WIDGET"),
    "M-SDK1": has("M-SDK1-DEP") && has("M-SDK1-SRC"),
    "M-SDK2": has("M-SDK2-DEP") && has("M-SDK2-SRC"),
    "M-EXT": has("M-EXT") && (has("M-SDK1-SRC") || has("M-SDK2-SRC")),
    "V-VIEWS": has("V-VIEWS-PATH") || has("V-VIEWS-SRC"),
    "H-GPT": has("H-GPT-DEP") || has("H-GPT-SRC"),
    "O-APP": has("O-APP"),
  };
  result.signals = Object.keys(sig).filter((k) => sig[k]).concat(has("M-OAI-WIDGET") && (sig["M-SDK1"] || sig["M-SDK2"]) ? ["M-OAI-WIDGET"] : []);

  // versions
  const vj = readJson(versionsPath) || { packages: {} };
  const useRange = depNames.get("mcp-use")?.range ?? null;
  const useDir = depNames.get("mcp-use")?.dir ?? "";
  const installed = versionOf(root, "mcp-use") ?? versionOf(join(root, useDir), "mcp-use");
  const kg = vj.packages?.["mcp-use"]?.known_good ?? null;
  const floor = vj.packages?.["mcp-use"]?.floor ?? null;
  if (sig["M-USE"]) {
    const eff = installed ?? (useRange ? (useRange.match(/\d+\.\d+\.\d+/)?.[0] ?? null) : null);
    let status = "unknown";
    if (eff && kg) status = cmpVersion(eff, kg) === 0 ? "current" : cmpVersion(eff, kg) < 0 ? (floor && cmpVersion(eff, floor) < 0 ? "below_floor" : "behind") : "ahead";
    result.versions["mcp-use"] = { range: useRange, installed, effective: eff, known_good: kg, floor, status };
  }
  const sdk = depNames.get("@modelcontextprotocol/sdk") ?? depNames.get("@modelcontextprotocol/server");
  if (sig["M-SDK1"] || sig["M-SDK2"]) {
    const name = sig["M-SDK1"] ? "@modelcontextprotocol/sdk" : "@modelcontextprotocol/server";
    result.versions[name] = { range: sdk?.range ?? null, installed: versionOf(root, name), known_good: vj.packages?.[name]?.known_good ?? null };
  }
  if (sig["M-USE-SRV"]) result.entry = hit.get("M-USE-SRV").file;
  else if (sig["M-SDK1"]) result.entry = hit.get("M-SDK1-SRC").file;
  else if (sig["M-SDK2"]) result.entry = hit.get("M-SDK2-SRC").file;
  result.views = files.filter((f) => /(^|\/)views\/[^/]+\/view\.tsx$/.test(f)).map((f) => f.split("/").slice(-2)[0]);

  // hosts
  if (sig["H-GPT"]) result.hosts.inferred.push("chatgpt");
  const evidenceFor = (h) => result.hosts.inferred.includes(h) || result.hosts.configured.includes(h);

  // scenario (03 §1.3)
  const server = sig["M-USE-SRV"];
  const classic = (sig["M-SDK1"] || sig["M-SDK2"] || sig["M-EXT"]) && !server;
  const order = [];
  if (sig["M-USE-V1"]) order.push("LEGACY_V1");
  if (classic) order.push("MIGRATE");
  if (server && !sig["V-VIEWS"]) order.push("ADD_APPS");
  if (server && sig["V-VIEWS"]) {
    const allHosts = [...new Set([...result.hosts.declared, ...result.hosts.inferred])];
    if (allHosts.some((h) => !evidenceFor(h))) order.push("ADD_HOST");
    else if (allHosts.length) order.push("IMPROVE_HOST");
    else order.push("HAS_VIEWS");
  }
  if (sig["O-APP"]) order.push("OWNED_APP");
  if (!order.length) { result.scenario = "NONE"; return result; }
  [result.scenario, ...result.secondary] = order;
  return result;
}

const has = (w) => installedWorkflows().includes(w);

export function nextActions(r) {
  const a = [];
  const push = (w, cmd, why) => { if (has(w)) a.push({ cmd, why }); };
  const hosts = [...new Set([...r.hosts.declared, ...r.hosts.inferred])];
  switch (r.scenario) {
    case "LEGACY_V1": case "MIGRATE": push("migrate", "/mcp-use:migrate", "port this server to mcp-use v2"); break;
    case "ADD_APPS": push("apps", "/mcp-use:apps", "add MCP Apps views to this server"); break;
    case "ADD_HOST": for (const h of hosts) push("host", `/mcp-use:host ${h} add`, `close the gaps for ${h}`); break;
    case "IMPROVE_HOST": for (const h of hosts) push("host", `/mcp-use:host ${h} audit`, `audit the ${h} integration`); break;
    case "OWNED_APP": push("archestra-app", "/mcp-use:archestra-app lint <file.html>", "lint an Archestra Owned App"); break;
    default: break;
  }
  if (r.scenario !== "NONE" && r.scenario !== "OUT_OF_SCOPE") push("verify", "/mcp-use:verify", "typecheck, run, and call the server");
  if (!a.length) push("start", "/mcp-use:start", "see what applies to this project");
  return a;
}

export function brief(r) {
  const lines = [];
  const u = r.versions["mcp-use"];
  const where = r.entry ? ` at ${r.entry}` : "";
  const vtxt = u ? `mcp-use ${u.installed ?? u.effective ?? u.range ?? "?"}${u.known_good ? ` (known-good ${u.known_good}${u.status === "behind" ? ", behind" : u.status === "below_floor" ? ", BELOW supported floor " + u.floor : ""})` : ""}` : "";
  switch (r.scenario) {
    case "LEGACY_V1": lines.push(`mcp-use plugin: legacy mcp-use v1 server${where} (imports from "mcp-use/server"); v2 uses the root import.`); break;
    case "MIGRATE": {
      const k = Object.keys(r.versions).find((x) => x.startsWith("@modelcontextprotocol/"));
      lines.push(`mcp-use plugin: official MCP SDK server${where} (${k ?? "@modelcontextprotocol/sdk"} ${r.versions[k]?.installed ?? r.versions[k]?.range ?? ""}) — candidate for migration to mcp-use${r.signals.includes("M-OAI-WIDGET") ? "; OpenAI Apps SDK widget pattern detected" : ""}.`);
      break;
    }
    case "ADD_APPS": lines.push(`mcp-use plugin: ${vtxt} server${where}; tools only, no views yet.`); break;
    case "OWNED_APP": lines.push(`mcp-use plugin: Archestra Owned App HTML found${r.entry ? ` (server ${r.entry})` : ""}.`); break;
    default: lines.push(`mcp-use plugin: ${vtxt} server${where}.`);
  }
  if (r.views.length) lines.push(`Views: ${r.views.length} (${r.views.slice(0, 4).join(", ")}${r.views.length > 4 ? ", …" : ""}).`);
  const hostBits = [];
  for (const h of r.hosts.inferred) hostBits.push(`${h} (inferred)`);
  for (const h of r.hosts.declared) if (!r.hosts.inferred.includes(h)) hostBits.push(`${h} (declared)`);
  if (r.views.length) lines.push(`Hosts: ${hostBits.length ? hostBits.join(", ") : "none declared — Archestra can only be declared in .mcp-use-plugin/settings.md (hosts: [archestra])"}.`);
  const na = nextActions(r);
  if (na.length) lines.push(`Likely next: ${na.map((x) => x.cmd).join(" · ")}`);
  lines.push("Docs MCP: mcp-use-docs, openai-docs, archestra-docs — prefer them and installed .d.ts files over memory; never call submit_feedback. Off switch: MCP_USE_PLUGIN=off.");
  const text = lines.join("\n");
  return text.length > 1200 ? text.slice(0, 1197) + "…" : text;
}

export function preflight(dir) {
  const major = (process.versions.node.split(".").map(Number));
  const need = [22, 22, 2];
  const ok = major[0] > need[0] || (major[0] === need[0] && (major[1] > need[1] || (major[1] === need[1] && major[2] >= need[2])));
  let empty = true, entries = [];
  try { entries = readdirSync(dir).filter((x) => x !== ".git" && x !== ".DS_Store"); empty = entries.length === 0; } catch { empty = true; }
  const managers = ["npm", "pnpm", "bun", "yarn"].filter((m) => {
    try { return !!(process.env.PATH || "").split(":").some((p) => existsSync(join(p, m))); } catch { return false; }
  });
  const hints = [".nvmrc", ".node-version", ".tool-versions", "volta"].filter((f) => existsSync(join(dir, f)));
  return { node: process.versions.node, required: ">=22.22.2", node_ok: ok, dir_empty: empty, dir_entries: entries.slice(0, 10), package_managers: managers, version_manager_files: hints };
}
