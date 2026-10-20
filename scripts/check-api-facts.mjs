#!/usr/bin/env node
// Verify data/api-facts.json against the installed mcp-use declarations: node scripts/check-api-facts.mjs <workspace>
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const ws = process.argv[2];
if (!ws) { console.error("usage: check-api-facts.mjs <workspace with node_modules/mcp-use>"); process.exit(3); }
const pkgDir = join(ws, "node_modules", "mcp-use");
const facts = JSON.parse(readFileSync(join(root, "data", "api-facts.json"), "utf8"));

const files = [];
(function walk(d) {
  for (const e of readdirSync(d)) {
    const p = join(d, e);
    if (statSync(p).isDirectory()) walk(p);
    else if (p.endsWith(".d.ts")) files.push(p);
  }
})(join(pkgDir, "dist"));
const all = files.map((f) => readFileSync(f, "utf8")).join("\n");
const fails = [];

for (const n of facts.absent) if (all.includes(n)) fails.push(`absent but found: ${n}`);
for (const n of facts.absent_member_calls) {
  const m = n.replace(/^ctx\./, "").replace("(", "");
  if (new RegExp(`(^|\\s)${m}\\s*[(<:?]`, "m").test(readFileSync(join(pkgDir, "dist", "context.d.ts"), "utf8"))) fails.push(`context.d.ts declares ${m}`);
}
const pj = JSON.parse(readFileSync(join(pkgDir, "package.json"), "utf8"));
for (const k of facts.absent_export_keys) if (pj.exports && k in pj.exports) fails.push(`package.json exports has ${k}`);
for (const n of facts.present) if (!all.includes(n)) fails.push(`present but not found: ${n}`);
for (const n of facts.deprecated) {
  // the named symbol is declared directly after a JSDoc block that carries @deprecated
  const re = new RegExp(`/\\*\\*(?:(?!\\*/)[^])*?@deprecated(?:(?!\\*/)[^])*?\\*/\\s*(?:export\\s+)?(?:declare\\s+)?(?:(?:async\\s+)?function\\s+|const\\s+|class\\s+)?${n}\\b`);
  if (!re.test(all)) fails.push(`expected @deprecated: ${n}`);
}
if (fails.length) { console.error(fails.map((f) => "FAIL " + f).join("\n")); process.exit(1); }
console.log(`api facts: ok (${facts.absent.length + facts.absent_member_calls.length + facts.absent_export_keys.length} absent, ${facts.present.length} present, ${facts.deprecated.length} deprecated)`);
