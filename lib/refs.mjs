// Cross-reference check for the shipped docs (skills, agents, README, AGENTS): every backticked path that names a file in
// this repository must exist, and must be written so it resolves from wherever the model reads it.
//   ${CLAUDE_PLUGIN_ROOT}/skills/...   resolved from the plugin root
//   skills/..., data/..., bin/...      resolved from the plugin root (README, AGENTS, and docs that say where things live)
//   references/..., assets/...         resolved from the skill that contains the file
//   <skill-name>/references/...        an error: it only works from inside skills/, so it must carry the plugin root prefix
import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT_DIRS = new Set(["skills", "data", "hooks", "bin", "lib", "scripts", "spikes", "tests", "evals", "agents", ".claude-plugin", ".github"]);
const SKILL_DIRS = new Set(["references", "assets", "scripts"]);
const PLUGIN_ROOT_VAR = "${CLAUDE_PLUGIN_ROOT}/";
// Paths that look like repo paths but live in the user's project (examples in the docs). Keep this list short and explain each entry.
const ALLOW = {
  "skills/mcp-use-server/references/skills-over-mcp.md": ["skills/broken/SKILL.md"], // a deliberately malformed skill in an example server project
};

function* walkMd(dir) {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) { if (e !== "node_modules") yield* walkMd(p); } else if (p.endsWith(".md")) yield p;
  }
}

export function docFiles(root) {
  const files = [...walkMd(join(root, "skills"))];
  if (existsSync(join(root, "agents"))) files.push(...walkMd(join(root, "agents")));
  for (const f of ["README.md", "AGENTS.md"]) if (existsSync(join(root, f))) files.push(join(root, f));
  return files;
}

// Returns [{ file, line, ref, problem }] for every backticked reference that does not resolve.
export function findBrokenRefs(root) {
  const skillNames = new Set(existsSync(join(root, "skills")) ? readdirSync(join(root, "skills")) : []);
  const broken = [];
  for (const file of docFiles(root)) {
    const rel = relative(root, file).split("\\").join("/");
    const skillDir = rel.startsWith("skills/") ? rel.split("/").slice(0, 2).join("/") : null;
    let inFence = false;
    readFileSync(file, "utf8").split("\n").forEach((text, i) => {
      if (/^\s*```/.test(text)) { inFence = !inFence; return; }
      if (inFence) return;
      for (const m of text.matchAll(/`([^`]+)`/g)) {
        let ref = m[1].trim();
        const rooted = ref.startsWith(PLUGIN_ROOT_VAR);
        if (rooted) ref = ref.slice(PLUGIN_ROOT_VAR.length);
        if (/[\s<>*{}$…]|\.\.\.|^https?:|^~/.test(ref)) continue;
        ref = ref.replace(/:\d+(?:-\d+)?$/, "").replace(/\/$/, "");
        if (!/^[.\w@-]+(?:\/[.\w@-]+)+$/.test(ref)) continue;
        if (/\.d\.ts$/.test(ref)) continue; // type declarations inside an installed package, not files of this repository
        if (ALLOW[rel]?.includes(ref)) continue;
        const first = ref.split("/")[0];
        const add = (problem) => broken.push({ file: rel, line: i + 1, ref: m[1], problem });
        const named = /\.[A-Za-z0-9]+$/.test(ref) || m[1].trim().endsWith("/"); // a file name or a directory
        if (rooted) { if (!existsSync(join(root, ref))) add("does not exist under the plugin root"); continue; }
        if (skillNames.has(first)) { add(`write it as \${CLAUDE_PLUGIN_ROOT}/skills/${ref}: a bare skill-relative path only resolves from inside skills/`); continue; }
        if (ROOT_DIRS.has(first) && existsSync(join(root, ref))) continue;
        if (SKILL_DIRS.has(first) && skillDir && existsSync(join(root, skillDir, ref))) continue;
        if (!named && first === "skills") continue; // "skills/list" and "skills/get" are MCP methods, not paths
        if (ROOT_DIRS.has(first) || (SKILL_DIRS.has(first) && first !== "scripts")) add(skillDir && SKILL_DIRS.has(first) ? `not found in ${skillDir}/` : "does not exist");
      }
    });
  }
  return broken;
}
