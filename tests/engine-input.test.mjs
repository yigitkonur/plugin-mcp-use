import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, existsSync, readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const bin = (n) => join(root, "bin", n);
const run = (tool, args, { cwd = root, input, env = {} } = {}) => {
  const r = spawnSync("node", [bin(tool), ...args], { cwd, input, encoding: "utf8", timeout: 60000, env: { ...process.env, CLAUDE_PROJECT_DIR: cwd, ...env } });
  return { status: r.status, out: r.stdout, err: r.stderr };
};
const fx = (n) => join(root, "tests", "fixtures", n);
const tmp = (p) => mkdtempSync(join(tmpdir(), p));

// ---- bad input is a usage error (exit 3), never a silent pass -----------------------------------------
const MATRIX = [
  ["scan: file that does not exist", "mcp-use-scan", ["--dir", fx("f14"), "--file", "nope.ts"], /no such file/],
  ["scan: file argument is a directory", "mcp-use-scan", ["--dir", fx("f14"), "--file", "views"], /not a file/],
  ["scan: misspelled host", "mcp-use-scan", ["--dir", fx("f14"), "--host", "chatpgt"], /expected one of/],
  ["scan: directory that does not exist", "mcp-use-scan", ["--dir", "/nonexistent/xyz"], /no such directory/],
  ["scan: unknown flag", "mcp-use-scan", ["--dir", fx("f14"), "--bogus"], /Unknown option/],
  ["scan: flag without its value", "mcp-use-scan", ["--dir"], /argument missing|ambiguous/],
  ["lint: a directory", "archestra-app-lint", [join(fx("f17"), "apps")], /is a directory/],
  ["lint: missing file", "archestra-app-lint", ["nope.html"], /no such file/],
  ["lint: policy that does not exist", "archestra-app-lint", [join(fx("f17"), "apps", "clean.html"), "--policy", "nope.json"], /--policy nope\.json: no such file/],
  ["lint: unknown flag", "archestra-app-lint", [join(fx("f17"), "apps", "clean.html"), "--bogus"], /Unknown option/],
  ["lint: --stdin with a file", "archestra-app-lint", ["--stdin", join(fx("f17"), "apps", "clean.html")], /cannot be combined/],
  ["lint: --stdin with --fix", "archestra-app-lint", ["--stdin", "--fix"], /cannot rewrite standard input/],
  ["probe: --url takes the next flag as its value", "mcp-use-probe", ["--url", "--json"], /ambiguous|argument missing/],
  ["probe: --url that is not a URL", "mcp-use-probe", ["--url", "not-a-url"], /not a URL/],
  ["probe: --url with the wrong scheme", "mcp-use-probe", ["--url", "ftp://localhost/mcp"], /http\(s\)/],
  ["probe: --diff with one file", "mcp-use-probe", ["--diff", join(fx("survey-samples"), "f02.json")], /needs two snapshot files/],
  ["probe: --diff on files that are not snapshots", "mcp-use-probe", ["--diff", join(fx("survey-samples"), "f02.json"), join(fx("survey-samples"), "f03.json")], /not a probe snapshot/],
  ["probe: misspelled host, server unreachable", "mcp-use-probe", ["--url", "http://127.0.0.1:1/mcp", "--host", "bogus"], /expected one of/],
  ["probe: both --url and --stdio", "mcp-use-probe", ["--url", "http://127.0.0.1:1/mcp", "--stdio", "true"], /not both/],
  ["probe: --ua with --stdio", "mcp-use-probe", ["--stdio", "true", "--ua", "chatgpt"], /needs --url/],
  ["probe: --timeout that is not a number", "mcp-use-probe", ["--url", "http://127.0.0.1:1/mcp", "--timeout", "soon"], /positive number/],
  ["probe: --calls file that does not exist", "mcp-use-probe", ["--url", "http://127.0.0.1:1/mcp", "--calls", "nope.json"], /no such file/],
  ["detect: --dir is a file", "mcp-use-detect", ["--preflight", "--dir", join(fx("f14"), "package.json")], /not a directory/],
  ["detect: directory that does not exist", "mcp-use-detect", ["--dir", "/nonexistent/xyz"], /no such directory/],
  ["detect: unknown flag", "mcp-use-detect", ["--dir", fx("f14"), "--bogus"], /Unknown option/],
  ["detect: --format without --brief", "mcp-use-detect", ["--dir", fx("f14"), "--format", "hook"], /together with --brief/],
];
for (const [name, tool, args, message] of MATRIX) {
  test(`usage error (exit 3): ${name}`, () => {
    const r = run(tool, args);
    assert.equal(r.status, 3, `exit code (stdout: ${r.out.slice(0, 200)} stderr: ${r.err.slice(0, 200)})`);
    assert.ok(!/node:fs|at Object\.|at async/.test(r.err + r.out), "no stack trace");
    if (args.includes("--json")) { // the envelope goes to stdout
      const e = JSON.parse(r.out);
      assert.equal(e.ok, false);
      assert.match(e.error.message, message);
    } else {
      assert.match(r.err, message);
      assert.equal(r.out, "", "nothing on stdout without --json");
    }
  });
}

test("usage errors are envelopes under --json", () => {
  const r = run("mcp-use-scan", ["--dir", fx("f14"), "--host", "chatpgt", "--json"]);
  assert.equal(r.status, 3);
  const e = JSON.parse(r.out);
  assert.equal(e.ok, false);
  assert.equal(e.tool, "mcp-use-scan");
  assert.equal(e.error.code, "usage");
});

test("hooks stay silent and exit 0 on bad input", () => {
  for (const [tool, args, input] of [["mcp-use-scan", ["--hook", "--bogus"], "{}"], ["mcp-use-scan", ["--hook"], "not json"], ["mcp-use-detect", ["--brief", "--bogus"]], ["mcp-use-detect", ["--brief", "--dir", "/nonexistent/xyz"]]]) {
    const r = run(tool, args, { input });
    assert.equal(r.status, 0, `${tool} ${args.join(" ")}`);
    assert.equal(r.out + r.err, "");
  }
});

// ---- the probe never leaves a server behind -----------------------------------------------------------
function mockServer(dir) {
  const pidfile = join(dir, "pid");
  const file = join(dir, "server.cjs");
  writeFileSync(file, `
require("node:fs").writeFileSync(${JSON.stringify(pidfile)}, String(process.pid));
const rl = require("node:readline").createInterface({ input: process.stdin });
rl.on("line", (l) => {
  const m = JSON.parse(l);
  if (m.id === undefined) return;
  const result = m.method === "initialize"
    ? { protocolVersion: "2025-06-18", capabilities: {}, serverInfo: { name: "mock", version: "1" } }
    : { tools: [], resources: [], resourceTemplates: [], prompts: [] };
  process.stdout.write(JSON.stringify({ jsonrpc: "2.0", id: m.id, result }) + "\\n");
});
setInterval(() => {}, 1000);`);
  return { pidfile, command: `node ${file}` };
}
const gone = (pid) => new Promise((res) => { const t0 = Date.now(); const tick = () => { try { process.kill(pid, 0); } catch { return res(true); } Date.now() - t0 > 3000 ? res(false) : setTimeout(tick, 50); }; tick(); });

test("probe --stdio validates --host and --calls before it starts the server", () => {
  const d = tmp("orphan-a-");
  const m = mockServer(d);
  assert.equal(run("mcp-use-probe", ["--stdio", m.command, "--host", "bogus"]).status, 3);
  assert.equal(run("mcp-use-probe", ["--stdio", m.command, "--calls", join(d, "missing.json")]).status, 3);
  writeFileSync(join(d, "calls.json"), "{}");
  assert.equal(run("mcp-use-probe", ["--stdio", m.command, "--calls", join(d, "calls.json")]).status, 3);
  assert.ok(!existsSync(m.pidfile), "the server was never started");
});

test("probe --stdio stops the server when the run fails after connecting", async () => {
  const d = tmp("orphan-b-");
  const m = mockServer(d);
  // /dev/null is not a directory, so writing the snapshot fails after the server is up
  const r = run("mcp-use-probe", ["--stdio", m.command, "--snapshot", "/dev/null/x/snap.json", "--timeout", "3000"]);
  assert.equal(r.status, 3, r.err);
  const pid = Number(readFileSync(m.pidfile, "utf8"));
  assert.equal(await gone(pid), true, "no orphan server after a failed run");
});

test("probe --stdio stops the server after a normal run", async () => {
  const d = tmp("orphan-c-");
  const m = mockServer(d);
  const r = run("mcp-use-probe", ["--stdio", m.command, "--json", "--timeout", "3000"]);
  assert.equal(JSON.parse(r.out).result.server.name, "mock");
  assert.equal(await gone(Number(readFileSync(m.pidfile, "utf8"))), true);
});

// ---- scan: paths, ok, size notice ------------------------------------------------------------------------
test("scan --file accepts ./path and finds root-anchored rules", () => {
  const r = JSON.parse(run("mcp-use-scan", ["--dir", fx("f15"), "--file", "./package.json", "--json"]).out);
  assert.ok(r.result.findings.some((f) => f.rule_id === "STK-07" && f.file === "package.json"));
});

test("scan --file is found relative to the current directory too", () => {
  const r = JSON.parse(run("mcp-use-scan", ["--dir", fx("f14"), "--file", join("tests", "fixtures", "f14", "index.ts"), "--json"]).out);
  assert.deepEqual(r.result.findings.map((f) => f.file), ["index.ts"]);
});

test("scan --json says ok:false when there are errors and ok:true when there are none", () => {
  assert.equal(JSON.parse(run("mcp-use-scan", ["--dir", fx("f15"), "--json"]).out).ok, false);
  assert.equal(JSON.parse(run("mcp-use-scan", ["--dir", fx("f14"), "--json"]).out).ok, true);
});

function project(files) {
  const d = tmp("scan-");
  for (const [rel, text] of Object.entries(files)) { mkdirSync(dirname(join(d, rel)), { recursive: true }); writeFileSync(join(d, rel), text); }
  return d;
}

test("scan lists files it does not read because of their size", () => {
  const d = project({
    "package.json": JSON.stringify({ name: "p", dependencies: { "mcp-use": "2.11.0" } }),
    "index.ts": 'import { MCPServer } from "mcp-use/server";\n' + "// padding\n".repeat(40000),
  });
  const r = JSON.parse(run("mcp-use-scan", ["--dir", d, "--json"]).out);
  assert.deepEqual(r.result.skipped.map((s) => s.file), ["index.ts"]);
  assert.ok(r.result.skipped[0].bytes > 300000);
  assert.ok(!r.result.findings.some((f) => f.rule_id === "STK-01"), "not read, so no finding");
  assert.match(run("mcp-use-scan", ["--dir", d]).out, /not read \(over 300 KB\): index\.ts/);
});

test("scan reports AA05 for a declared Owned App over 512 KB", () => {
  const d = project({
    "package.json": JSON.stringify({ name: "p", dependencies: { "mcp-use": "2.11.0" } }),
    ".mcp-use-plugin/settings.md": "---\nowned_app_paths: [owned/big.html]\n---\n",
    "owned/big.html": "<!DOCTYPE html><html><head></head><body><script>await archestra.ready;</script>" + "<p>x</p>\n".repeat(70000) + "</body></html>",
  });
  const r = JSON.parse(run("mcp-use-scan", ["--dir", d, "--host", "archestra", "--json"]).out);
  assert.ok(r.result.findings.some((f) => f.rule_id === "AA05" && f.file === "owned/big.html"));
});

// ---- settings written with CRLF line endings are read like any other ---------------------------------------
test("settings.md with CRLF line endings is honoured", () => {
  const d = project({
    "package.json": JSON.stringify({ name: "p", dependencies: { "mcp-use": "2.11.0" } }),
    ".mcp-use-plugin/settings.md": "---\r\nhosts: [archestra]\r\nenabled: true\r\n---\r\nbody\r\n",
  });
  const r = JSON.parse(run("mcp-use-detect", ["--dir", d]).out);
  assert.deepEqual(r.result.hosts.declared, ["archestra"]);
});

// ---- lint --fix: where the report goes --------------------------------------------------------------------
const git = (cwd, ...a) => spawnSync("git", a, { cwd, encoding: "utf8" });
function gitProject(rel, html) {
  const d = tmp("lintfix-");
  git(d, "init", "-q"); git(d, "config", "user.email", "t@t"); git(d, "config", "user.name", "t");
  mkdirSync(dirname(join(d, rel)), { recursive: true });
  writeFileSync(join(d, rel), html); git(d, "add", "."); git(d, "commit", "-qm", "init");
  return d;
}
const fixable = '<div>x</div>\n<script src="https://app.archestra.ai/archestra-app-sdk.js"></script>\n<script>archestra.ready;</script>\n';

test("lint --fix writes its report at the repository root, not in the app folder", () => {
  const d = gitProject("public/apps/board.html", fixable);
  const other = tmp("elsewhere-"); // run from an unrelated directory
  const r = JSON.parse(run("archestra-app-lint", [join(d, "public/apps/board.html"), "--fix", "--json"], { cwd: other }).out).result.files[0];
  assert.equal(r.fix.applied, true);
  assert.ok(existsSync(join(d, r.report)), "report in the repository root");
  assert.ok(!existsSync(join(d, "public", "apps", ".mcp-use-plugin")), "none beside the HTML file");
  assert.ok(!existsSync(join(other, ".mcp-use-plugin")), "none in the current directory");
});

test("lint --fix on a dirty file refuses and writes no report", () => {
  const d = gitProject("app.html", fixable);
  writeFileSync(join(d, "app.html"), fixable + "<!-- edit -->\n");
  const r = JSON.parse(run("archestra-app-lint", [join(d, "app.html"), "--fix", "--json"], { cwd: d }).out).result.files[0];
  assert.equal(r.fix.applied, false);
  assert.ok(!existsSync(join(d, ".mcp-use-plugin")), "no report directory");
});


// ---- --file and the hook path: symlinks and names that start with dots ----------------------------------------
import { symlinkSync } from "node:fs";
const V1 = 'import { MCPServer } from "mcp-use/server";\n';
function linkedProject() {
  const base = tmp("symlink-");
  const real = join(base, "real");
  mkdirSync(join(real, "src"), { recursive: true });
  writeFileSync(join(real, "package.json"), JSON.stringify({ name: "p", dependencies: { "mcp-use": "2.11.0" } }));
  writeFileSync(join(real, "src", "index.ts"), V1);
  writeFileSync(join(real, "..dots.ts"), V1);
  symlinkSync(real, join(base, "link"));
  return { real, link: join(base, "link") };
}

test("scan --file accepts an absolute path that reaches the project through a symlink", () => {
  const { link } = linkedProject();
  // no CLAUDE_PROJECT_DIR: the project directory is process.cwd(), which the OS reports with symlinks resolved
  const r = JSON.parse(run("mcp-use-scan", ["--file", join(link, "src", "index.ts"), "--json"], { cwd: link, env: { CLAUDE_PROJECT_DIR: "" } }).out);
  assert.deepEqual(r.result.findings.map((f) => `${f.rule_id} ${f.file}`), ["STK-01 src/index.ts"]);
});

test("scan --file accepts a file whose name starts with dots, and still rejects a path outside the project", () => {
  const { link } = linkedProject();
  const ok = JSON.parse(run("mcp-use-scan", ["--file", "..dots.ts", "--json"], { cwd: link }).out);
  assert.deepEqual(ok.result.findings.map((f) => f.file), ["..dots.ts"]);
  const out = run("mcp-use-scan", ["--file", "/etc/hosts"], { cwd: link });
  assert.equal(out.status, 3);
  assert.match(out.err, /outside the project directory/);
});

test("the edit guard finds the file when its path and the session directory differ only by a symlink", () => {
  const { real, link } = linkedProject();
  const data = tmp("guard-data-");
  const r = spawnSync("sh", [join(root, "hooks", "post-edit-guard.sh")], {
    input: JSON.stringify({ hook_event_name: "PostToolUse", session_id: "s-link", cwd: real, tool_name: "Edit", tool_input: { file_path: join(link, "src", "index.ts") } }),
    env: { ...process.env, CLAUDE_PLUGIN_ROOT: root, CLAUDE_PLUGIN_DATA: data }, encoding: "utf8",
  });
  assert.equal(r.status, 0);
  assert.match(JSON.parse(r.stdout).hookSpecificOutput.additionalContext, /STK-01/);
});
