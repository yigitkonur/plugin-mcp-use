import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdtempSync, existsSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { lintHtml, RULE_IDS } from "../lib/archestra-lint.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const corpus = join(root, "tests", "fixtures", "f17");
const bin = join(root, "bin", "archestra-app-lint");
const lint = (args, opts = {}) => spawnSync("node", [bin, ...args], { encoding: "utf8", timeout: 20000, ...opts });
const expectations = readFileSync(join(corpus, "EXPECT.tsv"), "utf8").trim().split("\n").map((l) => {
  const [file, rules, perms] = l.split("\t");
  return { file, rules: rules === "-" ? [] : rules.split(",").sort(), perms: perms?.split(",") ?? null };
});

for (const e of expectations) {
  test(`corpus ${e.file} -> ${e.rules.join(",") || "clean"}`, () => {
    const text = readFileSync(join(corpus, "apps", e.file), "utf8");
    const got = [...new Set(lintHtml(text, { uiPermissions: e.perms, file: e.file }).map((f) => f.rule_id))].sort();
    assert.deepEqual(got, e.rules);
  });
}

test("every rule has a positive in the corpus", () => {
  const covered = new Set(expectations.flatMap((e) => e.rules));
  covered.add("AA05"); // generated below (too large to commit)
  assert.deepEqual(RULE_IDS.filter((r) => !covered.has(r)), []);
});

test("every file in the corpus has an expectation", () => {
  const listed = new Set(expectations.map((e) => e.file));
  assert.deepEqual(readdirSync(join(corpus, "apps")).filter((f) => !listed.has(f)), []);
});

test("AA05 fires over 512 KB and not at the limit", () => {
  const pad = (n) => `<!DOCTYPE html><html><head><title>t</title></head><body>${"x".repeat(n)}</body></html>`;
  const base = pad(0).length;
  assert.equal(lintHtml(pad(524288 - base)).some((f) => f.rule_id === "AA05"), false);
  assert.equal(lintHtml(pad(524288 - base + 1)).some((f) => f.rule_id === "AA05"), true);
});

test("findings carry severity, fix_mode, line and source", () => {
  const f = lintHtml(readFileSync(join(corpus, "apps", "aw04.html"), "utf8"))[0];
  assert.equal(f.rule_id, "AW04");
  assert.equal(f.severity, "warning");
  assert.equal(f.fix_mode, "auto");
  assert.equal(f.line, 3);
  assert.equal(f.source, "A3");
});

test("AW05 names the nearest member for a typo", () => {
  const f = lintHtml(readFileSync(join(corpus, "apps", "aw05.html"), "utf8")).find((x) => x.rule_id === "AW05");
  assert.equal(f.nearest, "tools");
});

test("exit codes: 0 clean, 1 advisories only, 2 errors, 3 usage", () => {
  assert.equal(lint([join(corpus, "apps", "clean.html")]).status, 0);
  assert.equal(lint([join(corpus, "apps", "ad13.html")]).status, 1);
  assert.equal(lint([join(corpus, "apps", "aw04.html")]).status, 1);
  assert.equal(lint([join(corpus, "apps", "aa02.html")]).status, 2);
  assert.equal(lint([]).status, 3);
  assert.equal(lint(["/nonexistent/app.html"]).status, 3);
});

test("--json envelope lists files and findings", () => {
  const r = lint([join(corpus, "apps", "aa03.html"), "--json"]);
  const j = JSON.parse(r.stdout);
  assert.equal(j.ok, false);
  assert.equal(j.result.files[0].findings[0].rule_id, "AA03");
  assert.equal(j.next_actions[0].cmd, "archestra-app-lint --fix <file>");
});

test("--stdin lints piped HTML", () => {
  const r = lint(["--stdin", "--json"], { input: readFileSync(join(corpus, "apps", "ad02.html"), "utf8") });
  assert.equal(JSON.parse(r.stdout).result.files[0].findings[0].rule_id, "AD02");
});

// ---- --fix ------------------------------------------------------------------------------------
const sh = (cwd, ...a) => spawnSync("git", a, { cwd, encoding: "utf8" });
function gitDir(name, html) {
  const d = mkdtempSync(join(tmpdir(), "archestra-fix-"));
  sh(d, "init", "-q"); sh(d, "config", "user.email", "t@t"); sh(d, "config", "user.name", "t");
  writeFileSync(join(d, name), html); sh(d, "add", "."); sh(d, "commit", "-qm", "init");
  return d;
}
const mixed = `<div id="a">fragment</div>
<link rel="stylesheet" href="/static/archestra-app-base.css">
<script src="https://app.archestra.ai/archestra-app-sdk.js"></script>
<script>
(async () => { await archestra.ready; const v = await archestra.storage.get("k"); await archestra.storage.set("k", { v }); })();
</script>
`;

test("--fix applies only auto rules, writes a report first, and the rescan is clean of them", () => {
  const d = gitDir("app.html", mixed);
  const r = lint([join(d, "app.html"), "--fix", "--json"]);
  const j = JSON.parse(r.stdout).result.files[0];
  assert.equal(j.fix.applied, true);
  assert.ok(existsSync(join(d, j.report)), "report file exists");
  assert.equal(j.before.error, 2, "AA02 + AA03 before the fix");
  assert.equal(j.after.error, 0);
  const after = readFileSync(join(d, "app.html"), "utf8");
  assert.ok(!after.includes("archestra-app-sdk"));
  assert.ok(!after.includes("archestra-app-base"));
  assert.ok(after.includes("archestra.storage.user.get(") && after.includes("archestra.storage.user.set("));
  assert.ok(/<html>[\s\S]*<head>/.test(after), "document skeleton added");
  const left = lintHtml(after).map((f) => f.rule_id);
  for (const id of ["AA02", "AA03", "AW04", "AW01"]) assert.ok(!left.includes(id), `${id} gone`);
});

test("--fix is idempotent", () => {
  const d = gitDir("app.html", mixed);
  lint([join(d, "app.html"), "--fix"]);
  sh(d, "add", "."); sh(d, "commit", "-qm", "fixed");
  const once = readFileSync(join(d, "app.html"), "utf8");
  const r = lint([join(d, "app.html"), "--fix", "--json"]);
  assert.equal(JSON.parse(r.stdout).result.files[0].fix.applied, false);
  assert.equal(readFileSync(join(d, "app.html"), "utf8"), once);
});

test("--fix refuses a dirty tree without --force", () => {
  const d = gitDir("app.html", mixed);
  writeFileSync(join(d, "app.html"), mixed + "<!-- edit -->\n");
  const r = JSON.parse(lint([join(d, "app.html"), "--fix", "--json"]).stdout).result.files[0];
  assert.equal(r.fix.applied, false);
  assert.match(r.fix.reason, /uncommitted/);
  assert.equal(readFileSync(join(d, "app.html"), "utf8").includes("archestra-app-sdk"), true);
  const forced = JSON.parse(lint([join(d, "app.html"), "--fix", "--force", "--json"]).stdout).result.files[0];
  assert.equal(forced.fix.applied, true);
});

test("--fix never touches suggest/manual rules", () => {
  const d = gitDir("app.html", readFileSync(join(corpus, "apps", "ad01.html"), "utf8"));
  const before = readFileSync(join(d, "app.html"), "utf8");
  const r = JSON.parse(lint([join(d, "app.html"), "--fix", "--json"]).stdout).result.files[0];
  assert.equal(r.fix.applied, false);
  assert.equal(readFileSync(join(d, "app.html"), "utf8"), before);
});

test("--fix on a fragment keeps the body and adds a document", () => {
  const d = gitDir("frag.html", `<p id="x">hi</p>\n<script>(async()=>{await archestra.ready;})();</script>\n`);
  lint([join(d, "frag.html"), "--fix"]);
  const out = readFileSync(join(d, "frag.html"), "utf8");
  assert.ok(out.startsWith("<!DOCTYPE html>"));
  assert.ok(out.includes('<p id="x">hi</p>'));
  assert.equal(lintHtml(out).length, 0);
});

test("solidus-fused <script/src> is fixed too", () => {
  const d = gitDir("s.html", readFileSync(join(corpus, "apps", "edge-solidus-script.html"), "utf8"));
  lint([join(d, "s.html"), "--fix"]);
  assert.ok(!readFileSync(join(d, "s.html"), "utf8").includes("archestra-app-sdk"));
});
