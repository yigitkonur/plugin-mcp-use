import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const evals = join(root, "evals");
const samples = join(root, "tests", "evals");
const require = createRequire(import.meta.url);
let YAML = null;
try { YAML = require("yaml"); } catch { /* optional: falls back to a tiny frontmatter reader */ }

// Frontmatter reader for the shapes the grader files use: scalars and one nested `target` mapping.
function frontmatter(text) {
  const m = text.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) throw new Error("no frontmatter");
  const out = {};
  let cur = null;
  for (const line of m[1].split("\n")) {
    const nested = line.match(/^  (\w+):\s*(.*)$/);
    if (nested && cur) { out[cur][nested[1]] = nested[2]; continue; }
    const kv = line.match(/^(\w+):\s*(.*)$/);
    if (!kv) continue;
    if (kv[2] === "") { cur = kv[1]; out[cur] = {}; continue; }
    cur = null;
    let v = kv[2];
    if (v.startsWith("'") && v.endsWith("'")) v = v.slice(1, -1).replace(/''/g, "'");
    else if (v.startsWith('"') && v.endsWith('"')) v = JSON.parse(v);
    out[kv[1]] = /^\d+$/.test(v) ? Number(v) : v;
  }
  return { fm: out, body: m[2] };
}

const cases = readdirSync(evals, { withFileTypes: true }).filter((d) => d.isDirectory() && existsSync(join(evals, d.name, "prompt.md"))).map((d) => d.name);

test("six cases exist, each with a prompt and at least three graders", () => {
  assert.equal(cases.length, 6);
  for (const c of cases) assert.ok(readdirSync(join(evals, c, "graders")).length >= 3, c);
});

// expected failures of each bad sample, by grader file name
const EXPECT_BAD = {
  "chatgpt-ready-tool": ["root-import", "no-v1-import", "three-annotations", "typed-output", "default-export"],
  "apps-sdk-ui-view": ["provider-link", "no-card", "button-color", "tool-context", "narrow-status"],
  "server-settings": ["schema-and-title", "no-label-secret", "no-credentials"],
  "view-attachments": ["not-a-record", "async-calls"],
  "port-sdk-tool": ["mcp-use-tools", "z-object", "no-sdk-left", "all-annotations", "default-export"],
  "fix-owned-app": ["no-platform-sdk", "storage-partition", "no-browser-storage", "no-network", "no-blank-target", "prevent-default", "no-stringify-in-storage"],
};

for (const c of cases) {
  test(`${c}: every regex grader passes the good sample and the bad sample fails exactly the expected ones`, () => {
    const gdir = join(evals, c, "graders");
    const results = { good: {}, bad: {} };
    for (const f of readdirSync(gdir)) {
      const { fm } = frontmatter(readFileSync(join(gdir, f), "utf8"));
      if (fm.type !== "regex") continue;
      const name = f.replace(/\.md$/, "");
      const re = new RegExp(fm.pattern, fm.flags ?? "");
      for (const kind of ["good", "bad"]) {
        const file = join(samples, c, kind, fm.target.path);
        assert.ok(existsSync(file), `missing sample ${kind}/${fm.target.path} for ${c}`);
        const found = re.test(readFileSync(file, "utf8"));
        results[kind][name] = fm.match === "not_contains" ? !found : found;
      }
    }
    const goodFails = Object.entries(results.good).filter(([, ok]) => !ok).map(([n]) => n);
    assert.deepEqual(goodFails, [], `${c}: good sample fails ${goodFails.join(", ")}`);
    const badFails = Object.entries(results.bad).filter(([, ok]) => !ok).map(([n]) => n).sort();
    assert.deepEqual(badFails, [...EXPECT_BAD[c]].sort(), `${c}: bad sample failing graders`);
  });
}

test("every skill-fired grader names a skill that exists", () => {
  const skills = new Set(readdirSync(join(root, "skills")));
  for (const c of cases) for (const f of readdirSync(join(evals, c, "graders"))) {
    const { fm } = frontmatter(readFileSync(join(evals, c, "graders", f), "utf8"));
    if (fm.type !== "tool_used") continue;
    const alts = fm.input_match.match(/\(\?:([\w|-]+)\)"$|\?(?:)([\w-]+)"$/);
    const names = (alts?.[1] ?? alts?.[2] ?? "").split("|").filter(Boolean);
    assert.ok(names.length > 0, `${c}/${f}: could not read skill names from ${fm.input_match}`);
    for (const n of names) assert.ok(skills.has(n), `${c}/${f}: skill ${n} does not exist`);
  }
});

test("apps-sdk-ui-view provider-link: no provider passes, provider with linkComponent passes, provider without it fails", () => {
  const { fm } = frontmatter(readFileSync(join(evals, "apps-sdk-ui-view", "graders", "provider-link.md"), "utf8"));
  const re = new RegExp(fm.pattern, fm.flags ?? "");
  assert.equal(re.test('export default function V() { return <Badge color="info">x</Badge>; }'), true);
  assert.equal(re.test('<AppsSDKUIProvider linkComponent="a"><Badge color="info">x</Badge></AppsSDKUIProvider>'), true);
  assert.equal(re.test('<AppsSDKUIProvider\n  linkComponent="a"\n>x</AppsSDKUIProvider>'), true);
  assert.equal(re.test("<AppsSDKUIProvider><Badge>x</Badge></AppsSDKUIProvider>"), false);
});
