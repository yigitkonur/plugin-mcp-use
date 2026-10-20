#!/usr/bin/env node
// Extract fenced TS/TSX examples marked with <!-- fixture: name --> (must compile against mcp-use),
// <!-- fixture-bad: name --> (must NOT compile) or <!-- fixture-sdk1: name --> / <!-- fixture-sdk2: name -->
// (official MCP SDK v1 / v2 "before" code, must compile in the migration workspace) from skills/**/*.md
// into <outDir>/{good,bad,sdk1,sdk2}/.
import { readdirSync, readFileSync, writeFileSync, mkdirSync, rmSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const out = process.argv[2];
if (!out) { console.error("usage: extract-fixtures.mjs <outDir>"); process.exit(3); }

function* mdFiles(dir) {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) yield* mdFiles(p);
    else if (e.endsWith(".md")) yield p;
  }
}
rmSync(join(out, "good"), { recursive: true, force: true });
rmSync(join(out, "bad"), { recursive: true, force: true });
for (const d of ["good", "bad", "sdk1", "sdk2"]) { rmSync(join(out, d), { recursive: true, force: true }); mkdirSync(join(out, d), { recursive: true }); }

const seen = new Set();
const counts = { good: 0, bad: 0, sdk1: 0, sdk2: 0 };
for (const file of mdFiles(join(root, "skills"))) {
  const lines = readFileSync(file, "utf8").split("\n");
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^<!--\s*fixture(-bad|-sdk1|-sdk2)?:\s*([a-z0-9-]+)\s*-->\s*$/);
    if (!m) continue;
    let j = i + 1;
    while (j < lines.length && !lines[j].trim()) j++;
    const f = lines[j]?.match(/^```(tsx?)\s*$/);
    if (!f) { console.error(`${file}:${i + 1}: fixture marker not followed by a ts/tsx fence`); process.exit(1); }
    const name = m[2];
    if (seen.has(name)) { console.error(`${file}:${i + 1}: duplicate fixture name ${name}`); process.exit(1); }
    seen.add(name);
    const body = [];
    for (j = j + 1; j < lines.length && !lines[j].startsWith("```"); j++) body.push(lines[j]);
    const kind = m[1] ? m[1].slice(1) : "good";
    writeFileSync(join(out, kind, `${name}.${f[1]}`), `// extracted from ${file.slice(root.length + 1)}:${i + 1}\n` + body.join("\n") + "\n");
    counts[kind]++;
  }
}
// Stub so examples can `import server from "./server.js"` as a project would.
writeFileSync(join(out, "good", "server.ts"), 'export { default } from "../../index.js";\n');
console.log(JSON.stringify(counts));
