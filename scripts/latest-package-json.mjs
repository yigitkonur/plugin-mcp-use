#!/usr/bin/env node
// Write a copy of a package.json whose tracked packages (the keys of data/versions.json "packages") are set to npm latest.
// usage: node scripts/latest-package-json.mjs <in package.json> <out package.json>
// Everything else (react, zod, typescript ranges) is left alone: a ^ range already resolves to the newest match.
import { readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const [inp, out] = process.argv.slice(2);
if (!inp || !out) { console.error("usage: latest-package-json.mjs <in> <out>"); process.exit(3); }
const tracked = new Set(Object.keys(JSON.parse(readFileSync(join(root, "data", "versions.json"), "utf8")).packages));
const pj = JSON.parse(readFileSync(inp, "utf8"));
for (const field of ["dependencies", "devDependencies"]) {
  for (const name of Object.keys(pj[field] ?? {})) {
    if (!tracked.has(name)) continue;
    const latest = execFileSync("npm", ["view", name, "version"], { encoding: "utf8", timeout: 60000 }).trim();
    console.error(`${name}: ${pj[field][name]} -> ${latest}`);
    pj[field][name] = latest;
  }
}
writeFileSync(out, JSON.stringify(pj, null, 2) + "\n");
