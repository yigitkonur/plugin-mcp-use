#!/usr/bin/env node
// Extract fenced TS/TSX examples that are marked with <!-- fixture: name --> (must compile) or
// <!-- fixture-bad: name --> (must NOT compile) from skills/**/*.md into <outDir>/{good,bad}/.
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
mkdirSync(join(out, "good"), { recursive: true });
mkdirSync(join(out, "bad"), { recursive: true });

const seen = new Set();
let good = 0, bad = 0;
for (const file of mdFiles(join(root, "skills"))) {
  const lines = readFileSync(file, "utf8").split("\n");
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^<!--\s*fixture(-bad)?:\s*([a-z0-9-]+)\s*-->\s*$/);
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
    writeFileSync(join(out, m[1] ? "bad" : "good", `${name}.${f[1]}`), `// extracted from ${file.slice(root.length + 1)}:${i + 1}\n` + body.join("\n") + "\n");
    m[1] ? bad++ : good++;
  }
}
// Stub so examples can `import server from "./server.js"` as a project would.
writeFileSync(join(out, "good", "server.ts"), 'export { default } from "../../index.js";\n');
console.log(JSON.stringify({ good, bad }));
