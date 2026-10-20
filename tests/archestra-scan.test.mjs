import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, cpSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const scan = join(root, "bin", "mcp-use-scan");
const hook = join(root, "hooks", "post-edit-guard.sh");
const data = mkdtempSync(join(tmpdir(), "ar-data-"));
const fx = (n) => join(root, "tests", "fixtures", n);
const copy = (n) => { const d = mkdtempSync(join(tmpdir(), "ar-")); cpSync(fx(n), d, { recursive: true }); return d; };
const runScan = (dir, args = []) => {
  const r = spawnSync("node", [scan, "--json", ...args], { cwd: dir, encoding: "utf8", env: { ...process.env, CLAUDE_PROJECT_DIR: dir } });
  return { status: r.status, out: JSON.parse(r.stdout) };
};
const edit = (dir, file, session) => spawnSync("sh", [hook], {
  input: JSON.stringify({ hook_event_name: "PostToolUse", session_id: session, cwd: dir, tool_name: "Edit", tool_input: { file_path: join(dir, file) } }),
  env: { ...process.env, CLAUDE_PLUGIN_ROOT: root, CLAUDE_PLUGIN_DATA: data }, encoding: "utf8",
});
const ids = (out) => out.result.findings.map((f) => `${f.rule_id} ${f.file}`).sort();

test("p-ar --host archestra: AR static rules and declared Owned-App HTML are found, nothing else", () => {
  const { status, out } = runScan(fx("p-ar"), ["--host", "archestra"]);
  assert.deepEqual(ids(out), [
    "AA02 owned/board.html",
    "AR-A06 index.ts",
    "AR-A11 views/notes/view.tsx",
    "AR-A12 views/notes/view.tsx",
    "AW04 owned/board.html",
  ]);
  assert.equal(status, 2);
  const a06 = out.result.findings.find((f) => f.rule_id === "AR-A06");
  assert.match(a06.evidence, /save-note/);
  assert.equal(out.result.findings.find((f) => f.rule_id === "AR-A11").line, 7, "the unguarded window.openai call");
});

test("p-ar --host chatgpt: no Archestra rules, no Owned-App lint", () => {
  const { out } = runScan(fx("p-ar"), ["--host", "chatgpt"]);
  assert.ok(!out.result.findings.some((f) => f.rule_id.startsWith("AR-") || f.host === "archestra-owned"));
});

test("undeclared HTML without the archestra signature is not linted", () => {
  const { out } = runScan(fx("p-ar"), ["--host", "archestra"]);
  assert.ok(!out.result.findings.some((f) => f.file === "public/other.html"));
});

test("F16 (Archestra-only, clean) has no findings under --host archestra", () => {
  const { status, out } = runScan(fx("f16"), ["--host", "archestra"]);
  assert.deepEqual(out.result.findings, []);
  assert.equal(status, 0);
});

test("scan --fix leaves Owned-App HTML alone and points to archestra-app-lint --fix", () => {
  const d = copy("p-ar");
  const before = readFileSync(join(d, "owned/board.html"), "utf8");
  const { out } = runScan(d, ["--host", "archestra", "--fix", "--force"]);
  assert.equal(readFileSync(join(d, "owned/board.html"), "utf8"), before);
  assert.ok(out.next_actions.some((a) => a.cmd === "archestra-app-lint --fix owned/board.html"));
});

test("H2 on a declared Owned-App file: one nudge naming the rules, once per (file, rule)", () => {
  const d = copy("p-ar");
  const r1 = edit(d, "owned/board.html", "s-own");
  const o = JSON.parse(r1.stdout).hookSpecificOutput;
  assert.match(o.additionalContext, /owned\/board\.html/);
  assert.match(o.additionalContext, /AA02/);
  assert.match(o.additionalContext, /AW04/);
  assert.ok(o.additionalContext.length <= 600);
  assert.equal(edit(d, "owned/board.html", "s-own").stdout, "", "second edit, same findings: silent");
});

test("H2 stays silent on a clean Owned App and on undeclared HTML", () => {
  const d = copy("p-ar");
  assert.equal(edit(d, "owned/ok.html", "s-quiet").stdout, "");
  assert.equal(edit(d, "public/other.html", "s-quiet").stdout, "");
});
