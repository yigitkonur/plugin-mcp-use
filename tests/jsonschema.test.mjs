import { test } from "node:test";
import assert from "node:assert/strict";
import { validate } from "../lib/jsonschema.mjs";
import { globToRegex, readSettings } from "../lib/project.mjs";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const ok = (s, v) => assert.deepEqual(validate(s, v), []);
const bad = (s, v, re) => { const e = validate(s, v); assert.ok(e.length > 0 && (!re || re.test(e.join(" "))), `expected an error for ${JSON.stringify(v)}, got ${JSON.stringify(e)}`); };

test("anyOf no longer skips sibling keywords; oneOf needs exactly one match", () => {
  const s = { type: "object", required: ["a"], properties: { a: { type: "number" } }, anyOf: [{ properties: { a: { minimum: 1 } } }, { properties: { a: { maximum: -1 } } }] };
  ok(s, { a: 5 });
  bad(s, {}, /missing required/);
  bad(s, { a: "x" }, /expected number/);
  const one = { oneOf: [{ type: "number" }, { type: "integer" }] };
  bad(one, 3, /matches 2 alternatives/);
  ok(one, 3.5);
});

test("inherited names are not properties", () => {
  const s = { type: "object", required: ["constructor"], properties: { toString: { type: "number" } } };
  bad({ type: "object", required: ["constructor"] }, {}, /missing required property "constructor"/);
  ok({ type: "object", properties: { toString: { type: "number" } } }, {});
  void s;
});

test("pattern, item counts and exclusive bounds are enforced", () => {
  bad({ type: "string", pattern: "^[a-z]+$" }, "ABC", /pattern/);
  ok({ type: "string", pattern: "^[a-z]+$" }, "abc");
  bad({ type: "array", minItems: 2 }, [1], /fewer/);
  bad({ type: "array", maxItems: 1 }, [1, 2], /more than/);
  bad({ type: "number", exclusiveMinimum: 0 }, 0, /not above/);
  ok({ type: "number", exclusiveMinimum: 0 }, 0.1);
});

test("globToRegex: an unmatched { is literal (no hang), * works inside braces", () => {
  assert.equal(globToRegex("owned/{a").test("owned/{a"), true);
  assert.equal(globToRegex("src/{**/*.html,x.md}").test("src/a/b/c.html"), true);
  assert.equal(globToRegex("src/{**/*.html,x.md}").test("src/x.md"), true);
  assert.equal(globToRegex("**/*.{ts,tsx}").test("a/b/c.tsx"), true);
  assert.equal(globToRegex("**/*.{ts,tsx}").test("a/b/c.js"), false);
});

test("readSettings: a scalar value for a list key becomes a one-item list", () => {
  const d = mkdtempSync(join(tmpdir(), "rs-"));
  mkdirSync(join(d, ".mcp-use-plugin"));
  writeFileSync(join(d, ".mcp-use-plugin", "settings.md"), "---\nhosts: archestra\nowned_app_paths: owned/**/*.html\nenabled: true\n---\n");
  const s = readSettings(d);
  assert.deepEqual(s.hosts, ["archestra"]);
  assert.deepEqual(s.owned_app_paths, ["owned/**/*.html"]);
});
