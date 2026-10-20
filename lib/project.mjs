import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, relative, sep } from "node:path";

const SKIP_DIRS = new Set(["node_modules", ".git", "dist", "build", ".next", ".mcp-use", "coverage", ".turbo", ".cache", "out", ".venv", "venv", "vendor", "__pycache__", ".nuxt", ".output", ".svelte-kit"]);

export function readJson(path) {
  try { return JSON.parse(readFileSync(path, "utf8")); } catch { return null; }
}

// Bounded walk: returns project-relative POSIX paths.
export function walk(root, { maxDepth = 6, maxFiles = 2000 } = {}) {
  const out = [];
  const stack = [[root, 0]];
  while (stack.length && out.length < maxFiles) {
    const [dir, depth] = stack.pop();
    let entries;
    try { entries = readdirSync(dir, { withFileTypes: true }); } catch { continue; }
    for (const e of entries) {
      if (e.isDirectory()) {
        if (SKIP_DIRS.has(e.name) || (e.name.startsWith(".") && e.name !== ".github")) continue;
        if (depth < maxDepth) stack.push([join(dir, e.name), depth + 1]);
      } else if (e.isFile()) {
        out.push(relative(root, join(dir, e.name)).split(sep).join("/"));
        if (out.length >= maxFiles) break;
      }
    }
  }
  return out;
}

// Minimal glob: ** (any depth), * (no slash), {a,b} (no nesting). An unmatched { is a literal brace.
function globSource(glob) {
  let re = "";
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i];
    if (c === "*" && glob[i + 1] === "*") {
      if (glob[i + 2] === "/") { re += "(?:.*/)?"; i += 2; } else { re += ".*"; i += 1; }
    } else if (c === "*") re += "[^/]*";
    else if (c === "{") {
      const j = glob.indexOf("}", i);
      if (j < 0) re += "\\{";
      else { re += "(?:" + glob.slice(i + 1, j).split(",").map(globSource).join("|") + ")"; i = j; }
    } else re += escapeRe(c);
  }
  return re;
}
export function globToRegex(glob) { return new RegExp("^" + globSource(glob) + "$"); }
const escapeRe = (s) => s.replace(/[.+^${}()|[\]\\]/g, "\\$&");

export const MAX_TEXT_BYTES = 300_000;
export function readText(path, maxBytes = MAX_TEXT_BYTES) {
  try {
    if (statSync(path).size > maxBytes) return "";
    return readFileSync(path, "utf8");
  } catch { return ""; }
}

// .mcp-use-plugin/settings.md — YAML-ish frontmatter with `key: value` and `key: [a, b]` only.
export function readSettings(root) {
  const p = join(root, ".mcp-use-plugin", "settings.md");
  const s = { enabled: true, hosts: [], archestra_routes: [], owned_app_paths: [], configured_hosts: [] };
  if (!existsSync(p)) return s;
  const m = readFileSync(p, "utf8").match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return s;
  for (const line of m[1].split(/\r?\n/)) {
    const kv = line.match(/^([a-z_]+)\s*:\s*(.*)$/);
    if (!kv) continue;
    const [, k, v] = kv;
    if (k === "enabled" || k === "strict") s[k] = !/^(false|no|off|0)$/i.test(v.trim());
    else if (v.trim().startsWith("[")) s[k] = v.replace(/[\[\]"']/g, "").split(",").map((x) => x.trim()).filter(Boolean);
    else s[k] = Array.isArray(s[k]) ? (v.trim() ? [v.trim().replace(/^["']|["']$/g, "")] : []) : v.trim();
  }
  return s;
}

export function versionOf(root, pkg) {
  const j = readJson(join(root, "node_modules", pkg, "package.json"));
  return j?.version ?? null;
}

export function cmpVersion(a, b) {
  const pa = String(a).split(/[.-]/).map((x) => parseInt(x, 10) || 0);
  const pb = String(b).split(/[.-]/).map((x) => parseInt(x, 10) || 0);
  for (let i = 0; i < 3; i++) if ((pa[i] ?? 0) !== (pb[i] ?? 0)) return (pa[i] ?? 0) - (pb[i] ?? 0);
  return 0;
}
