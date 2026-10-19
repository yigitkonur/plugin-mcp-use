import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, dirname, relative, sep } from "node:path";
import { execFileSync } from "node:child_process";
import { readTsv } from "./tsv.mjs";
import { walk, globToRegex, readText, cmpVersion } from "./project.mjs";
import { findToolDefs, pathState } from "./tooldef.mjs";
import { PLUGIN_ROOT } from "./detect.mjs";

export const SEVERITY_RANK = { error: 0, warning: 1, advisory: 2 };
const COLS = ["id", "host", "glob", "kind", "pattern", "when", "unless", "severity", "fix_mode", "replacement", "message", "source", "min", "max"];

export function loadRules(path = join(PLUGIN_ROOT, "data", "guard-rules.tsv")) {
  return readTsv(path, COLS).map((r) => ({ ...r, g: globToRegex(r.glob) }));
}

const isCommentLine = (line) => /^\s*(?:\/\/|\/\*|\*|\*\/)/.test(line);
const stripComments = (t) => t.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " ")).replace(/(^|[^:])\/\/[^\n]*/g, "$1");
const lineOf = (text, idx) => text.slice(0, idx).split("\n").length;
const lineText = (text, idx) => {
  const s = text.lastIndexOf("\n", idx - 1) + 1;
  const e = text.indexOf("\n", idx);
  return text.slice(s, e < 0 ? text.length : e);
};
const expand = (tpl, groups, nm) => tpl.replace(/\{\{nm\}\}/g, nm).replace(/\$(\d)/g, (_, d) => groups[Number(d)] ?? "");

export function applicable(rule, rel, hosts, mcpUse) {
  if (rule.host !== "stack" && !hosts.includes(rule.host)) return false;
  if (!rule.g.test(rel)) return false;
  if (mcpUse && rule.min && cmpVersion(mcpUse, rule.min) < 0) return false;
  if (mcpUse && rule.max && cmpVersion(mcpUse, rule.max) > 0) return false;
  return true;
}

function finding(rule, file, line, evidence, extra = {}) {
  return {
    rule_id: rule.id, severity: rule.severity, host: rule.host, file, line, evidence: evidence.trim().slice(0, 140),
    message: rule.message, fix_mode: rule.fix_mode, source: rule.source, ...extra,
  };
}

export function scanText(rule, text, rel) {
  const out = [];
  if (rule.unless && new RegExp(rule.unless, "m").test(text)) return out;
  const kind = rule.kind;
  if (kind === "regex" || kind.startsWith("count>")) {
    const re = new RegExp(rule.pattern, "gm");
    const hits = [];
    let m;
    while ((m = re.exec(text))) {
      if (m[0] === "") { re.lastIndex++; continue; }
      if (isCommentLine(lineText(text, m.index))) continue;
      hits.push(m);
    }
    if (kind === "regex") for (const m of hits) out.push(finding(rule, rel, lineOf(text, m.index), lineText(text, m.index)));
    else if (hits.length > Number(kind.slice(6))) out.push(finding(rule, rel, lineOf(text, hits[0].index), `${hits.length} matches of ${rule.pattern}`, { count: hits.length }));
  } else if (kind === "absent") {
    const code = stripComments(text);
    if ((!rule.when || new RegExp(rule.when, "m").test(code)) && !new RegExp(rule.pattern, "m").test(code)) out.push(finding(rule, rel, 1, `(file lacks ${rule.pattern})`));
  } else if (kind === "tooldef") {
    const recv = new Set(["server"]);
    for (const m of text.matchAll(/(?:const|let|var)\s+(\w+)\s*=\s*new\s+MCPServer\b/g)) recv.add(m[1]);
    if (!/\.\s*tool\s*\(/.test(text)) return out;
    const [op, body] = [rule.pattern.slice(0, rule.pattern.indexOf(":")), rule.pattern.slice(rule.pattern.indexOf(":") + 1)];
    for (const tool of findToolDefs(text, [...recv])) {
      const label = tool.name ? ` (tool "${tool.name}")` : "";
      if (op === "require") {
        const missing = body.split(",").filter((p) => pathState(tool, p) === "absent");
        if (missing.length) out.push(finding(rule, rel, tool.line, `server.tool${label} missing ${missing.join(", ")}`, { missing, tool: tool.name }));
      } else if (op === "imply") {
        const [a, b] = body.split("=>");
        const hasA = a === "@structuredContent" ? /\bstructuredContent\b/.test(tool.call.slice(tool.def.length)) : pathState(tool, a) === "present";
        if (hasA && pathState(tool, b) === "absent") out.push(finding(rule, rel, tool.line, `server.tool${label} has ${a} but no ${b}`, { missing: [b], tool: tool.name }));
      }
    }
  }
  return out;
}

// Named project-level checks (kind "project:<name>"): need more than one file to decide.
const PROJECT_CHECKS = {
  // Components from @openai/apps-sdk-ui in a view, but no vite.config.* that excludes the package from optimizeDeps:
  // `mcp-use dev` then fails to render the view (S19).
  "apps-sdk-ui-vite"(root, files) {
    const uses = files.find((f) => /(^|\/)views\/.+\.tsx$/.test(f) && /from\s*["']@openai\/apps-sdk-ui\/components\//.test(readText(join(root, f))));
    if (!uses) return null;
    const cfgs = files.filter((f) => /(^|\/)vite\.config\.(?:ts|mts|js|mjs)$/.test(f));
    if (cfgs.some((f) => /exclude\s*:\s*\[[^\]]*apps-sdk-ui/.test(readText(join(root, f))))) return null;
    return { file: uses, line: 1, evidence: "imports @openai/apps-sdk-ui/components/* without a vite.config excluding it from optimizeDeps" };
  },
};

export function scanFiles(root, files, rules, { hosts, mcpUse = null, allFiles = null }) {
  const findings = [];
  const universe = allFiles ?? files;
  for (const r of rules) {
    if (!r.kind.startsWith("project:")) continue;
    if (r.host !== "stack" && !hosts.includes(r.host)) continue;
    const hit = PROJECT_CHECKS[r.kind.slice(8)]?.(root, universe);
    if (hit && files.includes(hit.file)) findings.push(finding(r, hit.file, hit.line, hit.evidence));
  }
  for (const rel of files) {
    const rs = rules.filter((r) => applicable(r, rel, hosts, mcpUse));
    if (!rs.length) continue;
    const text = readText(join(root, rel));
    if (!text) continue;
    for (const r of rs) findings.push(...scanText(r, text, rel));
  }
  const seen = new Set();
  return findings
    .filter((f) => { const k = `${f.rule_id}\t${f.file}\t${f.line}`; if (seen.has(k)) return false; seen.add(k); return true; })
    .sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity] || a.file.localeCompare(b.file) || a.line - b.line);
}

export function projectFiles(root) {
  return walk(root);
}

// ---- fixes ---------------------------------------------------------------------------------
function gitClean(root, rel) {
  try {
    execFileSync("git", ["-C", root, "rev-parse", "--is-inside-work-tree"], { stdio: "ignore" });
    const st = execFileSync("git", ["-C", root, "status", "--porcelain", "--", rel], { encoding: "utf8" });
    return st.trim() === "";
  } catch { return false; }
}

export function applyFixes(root, findings, rules, { force = false } = {}) {
  const byRule = new Map(rules.map((r) => [r.id, r]));
  const files = [...new Set(findings.filter((f) => f.fix_mode === "auto").map((f) => f.file))];
  const result = { fixed: [], skipped: [] };
  for (const rel of files) {
    if (!force && !gitClean(root, rel)) { result.skipped.push({ file: rel, reason: "file has uncommitted changes or the project is not a git repository (use --force)" }); continue; }
    const abs = join(root, rel);
    let text = readFileSync(abs, "utf8");
    const before = text;
    const nm = (relative(dirname(abs), join(root, "node_modules")) || ".").split(sep).join("/");
    for (const id of new Set(findings.filter((f) => f.file === rel && f.fix_mode === "auto").map((f) => f.rule_id))) {
      const r = byRule.get(id);
      if (r.kind === "regex") {
        const re = new RegExp(r.pattern, "gm");
        text = text.replace(re, (...a) => {
          const m = a[0]; const idx = a[a.findIndex((x) => typeof x === "number")];
          if (isCommentLine(lineText(text, idx))) return m;
          return expand(r.replacement, a.slice(0, -2), nm);
        });
      } else if (r.kind === "absent") {
        text = text.replace(/\n*$/, "\n") + expand(r.replacement, [], nm) + "\n";
      }
    }
    if (text !== before) { writeFileSync(abs, text); result.fixed.push(rel); }
  }
  return result;
}

export function writeReport(root, tool, payload) {
  const dir = join(root, ".mcp-use-plugin", "reports");
  mkdirSync(dir, { recursive: true });
  const p = join(dir, `${tool}-${new Date().toISOString().replace(/[:.]/g, "-")}.json`);
  writeFileSync(p, JSON.stringify(payload, null, 2));
  return relative(root, p);
}
