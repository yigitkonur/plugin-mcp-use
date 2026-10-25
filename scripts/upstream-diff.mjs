#!/usr/bin/env node
// What changed between two published versions of an npm package: package.json fields that matter and every
// .d.ts file, from the tarballs (release notes are often empty stubs; the tarball is the evidence).
// usage: node scripts/upstream-diff.mjs <package> <old-version> <new-version>
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, readdirSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const [pkg, oldV, newV] = process.argv.slice(2);
if (!pkg || !oldV || !newV) { console.error("usage: upstream-diff.mjs <package> <old-version> <new-version>"); process.exit(3); }

function fetchVersion(v) {
  const dir = mkdtempSync(join(tmpdir(), "upstream-diff-"));
  const out = execFileSync("npm", ["pack", `${pkg}@${v}`, "--silent", "--pack-destination", dir], { encoding: "utf8" }).trim().split("\n").pop();
  execFileSync("tar", ["-xzf", join(dir, out), "-C", dir]);
  return join(dir, "package");
}
function dts(root, rel = "") {
  const found = {};
  for (const name of readdirSync(join(root, rel))) {
    const r = rel ? `${rel}/${name}` : name;
    if (statSync(join(root, r)).isDirectory()) Object.assign(found, dts(root, r));
    else if (name.endsWith(".d.ts")) found[r] = readFileSync(join(root, r), "utf8");
  }
  return found;
}
const A = fetchVersion(oldV), B = fetchVersion(newV);
const pa = JSON.parse(readFileSync(join(A, "package.json"), "utf8")), pb = JSON.parse(readFileSync(join(B, "package.json"), "utf8"));
for (const key of ["exports", "bin", "engines", "dependencies", "peerDependencies", "optionalDependencies"]) {
  const x = JSON.stringify(pa[key] ?? null, null, 1), y = JSON.stringify(pb[key] ?? null, null, 1);
  if (x === y) continue;
  console.log(`package.json ${key} changed:`);
  const ka = pa[key] ?? {}, kb = pb[key] ?? {};
  for (const k of new Set([...Object.keys(ka), ...Object.keys(kb)])) {
    if (JSON.stringify(ka[k]) !== JSON.stringify(kb[k])) console.log(`  ${k}: ${JSON.stringify(ka[k]) ?? "(none)"} -> ${JSON.stringify(kb[k]) ?? "(none)"}`);
  }
}
const da = dts(A), db = dts(B);
const added = Object.keys(db).filter((f) => !(f in da)), removed = Object.keys(da).filter((f) => !(f in db));
const changed = Object.keys(db).filter((f) => f in da && da[f] !== db[f]);
console.log(`.d.ts files: ${Object.keys(da).length} -> ${Object.keys(db).length}; added ${added.length}, removed ${removed.length}, changed ${changed.length}`);
for (const f of added) console.log(`  + ${f}`);
for (const f of removed) console.log(`  - ${f}`);
for (const f of changed) console.log(`  ~ ${f}`);
console.log(`inspect further: diff -r ${A} ${B}`);
