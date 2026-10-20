#!/usr/bin/env node
// Drift check: npm `latest` vs data/versions.json known_good, and vendor doc pages vs data/doc-hashes.json.
// Prints a table; exit 1 on drift (CI opens an issue; nothing is edited automatically). `--update-hashes` rewrites doc-hashes.json.
import { readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const versions = JSON.parse(readFileSync(join(root, "data", "versions.json"), "utf8"));
const hashPath = join(root, "data", "doc-hashes.json");
const hashes = JSON.parse(readFileSync(hashPath, "utf8"));
const update = process.argv.includes("--update-hashes");
let drift = 0;
const rows = [];

for (const [pkg, v] of Object.entries(versions.packages)) {
  let latest = "?";
  try { latest = execFileSync("npm", ["view", pkg, "version"], { encoding: "utf8", timeout: 60000 }).trim(); } catch { rows.push([pkg, v.known_good, "npm view failed", "ERROR"]); drift++; continue; }
  const bad = latest !== v.known_good;
  if (bad) drift++;
  rows.push([pkg, v.known_good, latest, bad ? "DRIFT" : "ok"]);
}
for (const [url, old] of Object.entries(hashes.pages)) {
  let h = "?";
  try { const r = await fetch(url, { redirect: "follow" }); if (r.ok) h = createHash("sha256").update(await r.text()).digest("hex").slice(0, 16); } catch { /* network */ }
  const bad = h !== old;
  if (update && h !== "?") hashes.pages[url] = h;
  else if (bad) drift++;
  rows.push([url.replace(/^https:\/\//, ""), old, h, bad ? (update ? "updated" : "CHANGED") : "ok"]);
}
if (update) { hashes.as_of = new Date().toISOString().slice(0, 10); writeFileSync(hashPath, JSON.stringify(hashes, null, 2) + "\n"); }
for (const r of rows) console.log(r.map((c) => String(c).padEnd(44)).join(" ").trimEnd());
console.log(drift ? `\n${drift} drift item(s): review the docs MCP servers and re-run scripts/typecheck-fixtures.sh with the new versions before bumping known_good.` : "\nno drift");
process.exit(drift ? 1 : 0);
