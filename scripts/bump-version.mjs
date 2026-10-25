#!/usr/bin/env node
// Bump the plugin version in .claude-plugin/plugin.json and both entries of marketplace.json (they must agree).
// usage: node scripts/bump-version.mjs [patch|minor|major]   -> prints the new version
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const level = process.argv[2] ?? "patch";
if (!["patch", "minor", "major"].includes(level)) { console.error(`bump-version: unknown level ${level}`); process.exit(3); }

const pluginPath = join(root, ".claude-plugin", "plugin.json");
const marketPath = join(root, ".claude-plugin", "marketplace.json");
const current = JSON.parse(readFileSync(pluginPath, "utf8")).version;
const m = /^(\d+)\.(\d+)\.(\d+)$/.exec(current);
if (!m) { console.error(`bump-version: plugin.json version "${current}" is not x.y.z`); process.exit(3); }
let [maj, min, pat] = m.slice(1).map(Number);
if (level === "major") { maj++; min = 0; pat = 0; } else if (level === "minor") { min++; pat = 0; } else pat++;
const next = `${maj}.${min}.${pat}`;

// replace only the version strings, so the files keep their formatting
const swap = (path, expectCount) => {
  const text = readFileSync(path, "utf8");
  const re = new RegExp(`("version"\\s*:\\s*")${current.replaceAll(".", "\\.")}(")`, "g");
  const found = (text.match(re) ?? []).length;
  if (found !== expectCount) { console.error(`bump-version: ${path} has ${found} "version": "${current}" entries, expected ${expectCount}`); process.exit(3); }
  writeFileSync(path, text.replace(re, `$1${next}$2`));
};
swap(pluginPath, 1);
swap(marketPath, 2);
console.log(next);
