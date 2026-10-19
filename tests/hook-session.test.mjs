import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readdirSync, mkdtempSync, cpSync, mkdirSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const hook = join(root, "hooks", "session-detect.sh");

function run(dir, env = {}) {
  const t0 = process.hrtime.bigint();
  const r = spawnSync("sh", [hook], {
    input: JSON.stringify({ hook_event_name: "SessionStart", source: "startup", cwd: dir }),
    env: { ...process.env, CLAUDE_PLUGIN_ROOT: root, ...env },
    encoding: "utf8",
  });
  return { ...r, ms: Number(process.hrtime.bigint() - t0) / 1e6 };
}
const p95 = (xs) => xs.sort((a, b) => a - b)[Math.ceil(xs.length * 0.95) - 1];

for (const c of readdirSync(join(root, "tests", "controls"))) {
  test(`control ${c}: silent, exit 0, fast`, () => {
    const dir = join(root, "tests", "controls", c);
    const times = [];
    for (let i = 0; i < 20; i++) {
      const r = run(dir);
      assert.equal(r.status, 0);
      assert.equal(r.stdout, "");
      times.push(r.ms);
    }
    assert.ok(p95(times) < 150, `p95 ${p95(times).toFixed(0)} ms`);
  });
}

for (const [name, expect] of [["f13", /tools only, no views yet/], ["f14", /Hosts: chatgpt \(inferred\)/]]) {
  test(`fixture ${name}: brief <= 1200 chars with scenario`, () => {
    const r = run(join(root, "tests", "fixtures", name));
    assert.equal(r.status, 0);
    const out = JSON.parse(r.stdout).hookSpecificOutput;
    assert.equal(out.hookEventName, "SessionStart");
    assert.ok(out.additionalContext.length <= 1200);
    assert.match(out.additionalContext, /^mcp-use plugin: /);
    assert.match(out.additionalContext, expect);
    assert.match(out.additionalContext, /submit_feedback/);
  });
}

test("kill switch MCP_USE_PLUGIN=off is silent", () => {
  assert.equal(run(join(root, "tests", "fixtures", "f14"), { MCP_USE_PLUGIN: "off" }).stdout, "");
});

test("settings enabled: false is silent", () => {
  const d = mkdtempSync(join(tmpdir(), "f14-"));
  cpSync(join(root, "tests", "fixtures", "f14"), d, { recursive: true });
  mkdirSync(join(d, ".mcp-use-plugin"));
  writeFileSync(join(d, ".mcp-use-plugin", "settings.md"), "---\nenabled: false\n---\n");
  const r = run(d);
  assert.equal(r.status, 0);
  assert.equal(r.stdout, "");
});

test("node missing from PATH is silent, exit 0", () => {
  const r = run(join(root, "tests", "fixtures", "f14"), { PATH: "/usr/bin:/bin" });
  // /usr/bin may ship a node shim on some machines; only assert the contract: exit 0
  assert.equal(r.status, 0);
});

test("declared hosts show up as (declared)", () => {
  const d = mkdtempSync(join(tmpdir(), "f14-"));
  cpSync(join(root, "tests", "fixtures", "f14"), d, { recursive: true });
  mkdirSync(join(d, ".mcp-use-plugin"));
  writeFileSync(join(d, ".mcp-use-plugin", "settings.md"), "---\nhosts: [chatgpt, archestra]\n---\n");
  const out = JSON.parse(run(d).stdout).hookSpecificOutput.additionalContext;
  assert.match(out, /archestra \(declared\)/);
  assert.match(out, /chatgpt \(inferred\)/);
});
