import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, cpSync, readFileSync, existsSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { tmpdir, loadavg, cpus } from "node:os";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const hook = join(root, "hooks", "post-edit-guard.sh");
const data = mkdtempSync(join(tmpdir(), "guard-data-"));

function edit(dir, file, session = "s1", env = {}, tool = "Edit") {
  const t0 = process.hrtime.bigint();
  const r = spawnSync("sh", [hook], {
    input: JSON.stringify({ hook_event_name: "PostToolUse", session_id: session, cwd: dir, tool_name: tool, tool_input: { file_path: join(dir, file) } }),
    env: { ...process.env, CLAUDE_PLUGIN_ROOT: root, CLAUDE_PLUGIN_DATA: data, ...env },
    encoding: "utf8",
  });
  return { ...r, ms: Number(process.hrtime.bigint() - t0) / 1e6 };
}
const copy = (n) => { const d = mkdtempSync(join(tmpdir(), "g-")); cpSync(join(root, "tests", "fixtures", n), d, { recursive: true }); return d; };

test("F15 seeded view edit: one nudge, <=600 chars, <=3 rules, JSON shape", () => {
  const d = copy("f15");
  const r = edit(d, "views/product-card/view.tsx", "s-a");
  assert.equal(r.status, 0);
  const o = JSON.parse(r.stdout).hookSpecificOutput;
  assert.equal(o.hookEventName, "PostToolUse");
  assert.ok(o.additionalContext.length <= 600, `len ${o.additionalContext.length}`);
  const rules = o.additionalContext.match(/- ([A-Z]+-[A-Za-z0-9]+) line/g) ?? [];
  assert.ok(rules.length >= 1 && rules.length <= 3);
  assert.match(o.additionalContext, /^mcp-use guard: views\/product-card\/view\.tsx/);
});

test("same (file, rule) is not repeated in one session; new session fires again", () => {
  const d = copy("f15");
  const seen = [];
  for (let i = 0; i < 6; i++) {
    const r = edit(d, "views/product-card/view.tsx", "s-dedupe");
    if (!r.stdout) break;
    seen.push(...(JSON.parse(r.stdout).hookSpecificOutput.additionalContext.match(/[A-Z]+-[A-Za-z0-9]+(?= line)/g) ?? []));
  }
  assert.equal(new Set(seen).size, seen.length, "a rule was repeated: " + seen.join(","));
  assert.ok(seen.length > 3, "should have worked through more than one batch of 3");
  assert.notEqual(edit(d, "legacy.ts", "s-dedupe").stdout, ""); // other file still reports
  assert.notEqual(edit(copy("f15"), "views/product-card/view.tsx", "s-other").stdout, ""); // new session
});

test("clean F14 edits are silent", () => {
  const d = copy("f14");
  for (const f of ["index.ts", "views/product-card/view.tsx", "views/product-card/view.css", "package.json"]) {
    const r = edit(d, f, "s-clean");
    assert.equal(r.status, 0); assert.equal(r.stdout, "", f);
  }
});

test("non-candidate files, control repos, kill switch, and disabled settings are silent", () => {
  const d = copy("f15");
  assert.equal(edit(d, "SEEDED.tsv", "s-x").stdout, "");
  assert.equal(edit(d, "views/product-card/view.tsx", "s-off", { MCP_USE_PLUGIN: "off" }).stdout, "");
  mkdirSync(join(d, ".mcp-use-plugin"), { recursive: true });
  writeFileSync(join(d, ".mcp-use-plugin", "settings.md"), "---\nenabled: false\n---\n");
  assert.equal(edit(d, "views/product-card/view.tsx", "s-dis").stdout, "");
  for (const c of ["c1-vite-react", "c2-express-api", "c3-next-no-mcp", "c5-mcp-use-client-only", "c6-python-fastmcp", "c7-go-mcp"]) {
    const cd = join(root, "tests", "controls", c);
    for (const f of ["src/main.tsx", "server.js", "app/page.tsx", "src/agent.ts", "server.py", "main.go"]) {
      if (!existsSync(join(cd, f))) continue;
      const r = edit(cd, f, "s-ctl-" + c);
      assert.equal(r.status, 0); assert.equal(r.stdout, "", `${c}/${f}`);
    }
  }
});

const overloaded = loadavg()[0] > cpus().length * 2;
test("hook latency: p95 under 150 ms (candidate file, signaled project)", { skip: overloaded && "machine is overloaded (load average above 2x CPUs): timing is not meaningful" }, () => {
  const d = copy("f15");
  const times = [];
  for (let i = 0; i < 20; i++) times.push(edit(d, "views/product-card/view.tsx", "s-time-" + i).ms);
  times.sort((a, b) => a - b);
  assert.ok(times[18] < 150, `p95 ${times[18].toFixed(0)} ms`);
});

test("Write tool and MultiEdit-less payloads are handled the same", () => {
  const d = copy("f15");
  assert.notEqual(edit(d, "legacy.ts", "s-write", {}, "Write").stdout, "");
});
