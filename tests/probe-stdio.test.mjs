import { test, after } from "node:test";
import assert from "node:assert/strict";
import { spawn, spawnSync, execFile } from "node:child_process";
import { mkdtempSync, writeFileSync, existsSync, readFileSync } from "node:fs";
import { createServer as netServer } from "node:net";
import { join, dirname } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const probe = join(root, "bin", "mcp-use-probe");
const WS = join(process.env.MCP_USE_WORK || process.env.TMPDIR || tmpdir(), "mcp-use-plugin-migration");
const haveWs = existsSync(join(WS, "node_modules", "@modelcontextprotocol", "sdk")) && existsSync(join(WS, "fixtures", "f02"));
const procs = [];
after(() => procs.forEach((p) => p.kill()));

const run = (args) => new Promise((res) => execFile("node", [probe, ...args, "--json"], { encoding: "utf8", timeout: 60000 }, (err, stdout) => res({ status: err ? err.code : 0, out: stdout ? JSON.parse(stdout) : null })));
const freePort = () => new Promise((res) => { const s = netServer().listen(0, () => { const p = s.address().port; s.close(() => res(p)); }); });

// A stdio MCP server in 40 lines of plain Node, so these tests need no SDK.
const mock = (extra = "") => `
const rl = require("node:readline").createInterface({ input: process.stdin });
${extra}
const send = (m) => process.stdout.write(JSON.stringify(m) + "\\n");
rl.on("line", (l) => {
  const m = JSON.parse(l);
  if (m.method === "initialize") return send({ jsonrpc: "2.0", id: m.id, result: { protocolVersion: "2025-06-18", capabilities: { tools: {} }, serverInfo: { name: "mock-stdio", version: "9" } } });
  if (m.method === "tools/list") return send({ jsonrpc: "2.0", id: m.id, result: { tools: [{ name: "echo", description: "d", inputSchema: { type: "object", properties: { s: { type: "string" } } }, annotations: { readOnlyHint: true } }] } });
  if (m.method === "tools/call") return send({ jsonrpc: "2.0", id: m.id, result: { content: [{ type: "text", text: m.params.arguments.s }], structuredContent: { s: m.params.arguments.s } } });
  if (m.id !== undefined) send({ jsonrpc: "2.0", id: m.id, error: { code: -32601, message: "Method not found" } });
});`;
function script(body) { const f = join(mkdtempSync(join(tmpdir(), "stdio-")), "server.cjs"); writeFileSync(f, body); return f; }

test("stdio: initialize, lists and a tool call work; unsupported lists are not problems", async () => {
  const calls = join(mkdtempSync(join(tmpdir(), "c-")), "calls.json");
  writeFileSync(calls, JSON.stringify([{ tool: "echo", arguments: { s: "hi" } }]));
  const { status, out } = await run(["--stdio", `node ${script(mock())}`, "--calls", calls]);
  assert.equal(status, 0);
  assert.equal(out.result.server.mode, "stdio");
  assert.equal(out.result.server.name, "mock-stdio");
  assert.equal(out.result.tools, 1);
  assert.deepEqual(out.result.findings, []);
});

test("stdio: non-JSON on stdout is reported (it corrupts the protocol)", async () => {
  const { status, out } = await run(["--stdio", `node ${script(mock('console.log("starting up…");'))}`]);
  assert.equal(status, 1);
  assert.ok(out.result.findings.some((f) => f.target === "stdout" && /stderr/.test(f.message)));
});

test("stdio: a server that exits on start gives exit 5 with its stderr", async () => {
  const { status, out } = await run(["--stdio", `node ${script('console.error("boom: missing config"); process.exit(3);')}`]);
  assert.equal(status, 5);
  assert.equal(out.error.code, "connect_failed");
  assert.match(out.error.message, /boom: missing config|exited/);
});

test("stdio: a server that never answers times out instead of hanging", async () => {
  const t0 = Date.now();
  const { status, out } = await run(["--stdio", `node ${script("setInterval(() => {}, 1000);")}`, "--timeout", "1500"]);
  assert.equal(status, 5);
  assert.match(out.error.message, /timeout after 1500 ms/);
  assert.ok(Date.now() - t0 < 10000);
});

test("F02 (official SDK v1, stdio): 3 tools, 1 resource, 1 prompt, calls succeed", { skip: !haveWs && "run scripts/migration-workspace.sh first" }, async () => {
  const { status, out } = await run(["--stdio", "node src/index.ts", "--cwd", join(WS, "fixtures", "f02"), "--calls", join(root, "tests", "fixtures", "f02", "migration-calls.json")]);
  assert.equal(status, 0);
  assert.deepEqual([out.result.tools, out.result.resources, out.result.prompts, out.result.calls], [3, 1, 1, 2]);
});

test("F03 (official SDK v2 split, HTTP) and F11 (SDK + OpenAI widget): probe sees the same shape", { skip: !haveWs && "run scripts/migration-workspace.sh first" }, async () => {
  const start = async (dir, file) => {
    const port = await freePort();
    const p = spawn("node", [file], { cwd: join(WS, "fixtures", dir), env: { ...process.env, PORT: String(port) }, stdio: ["ignore", "ignore", "pipe"] });
    procs.push(p);
    await new Promise((res, rej) => { const t = setTimeout(() => rej(new Error(`${dir} not ready`)), 15000); p.stderr.on("data", (d) => { if (String(d).includes("MCP server on")) { clearTimeout(t); res(); } }); });
    return `http://127.0.0.1:${port}/mcp`;
  };
  const u3 = await start("f03", "src/index.ts");
  const r3 = await run(["--url", u3, "--calls", join(root, "tests", "fixtures", "f03", "migration-calls.json")]);
  assert.deepEqual([r3.out.result.tools, r3.out.result.resources, r3.out.result.prompts, r3.out.result.calls], [3, 1, 1, 2]);
  assert.equal(r3.out.result.server.mode, "modern");
  const u11 = await start("f11", "src/server.ts");
  const r11 = await run(["--url", u11, "--calls", join(root, "tests", "fixtures", "f11", "migration-calls.json")]);
  assert.equal(r11.out.result.ui_resources, 1);
  assert.equal(r11.out.result.server.mode, "legacy");
  assert.deepEqual(r11.out.result.findings, []);
});

test("diff of an unchanged stdio snapshot is empty; a changed one reports the field", { skip: !haveWs && "run scripts/migration-workspace.sh first" }, async () => {
  const d = mkdtempSync(join(tmpdir(), "snap-"));
  const a = join(d, "a.json"), b = join(d, "b.json");
  const args = (o) => ["--stdio", "node src/index.ts", "--cwd", join(WS, "fixtures", "f02"), "--snapshot", o];
  await run(args(a)); await run(args(b));
  const same = spawnSync("node", [probe, "--diff", a, b, "--json"], { encoding: "utf8" });
  assert.equal(JSON.parse(same.stdout).result.equal, true);
  const snap = JSON.parse(readFileSync(b, "utf8"));
  snap.tools.find((t) => t.name === "adjust-stock").annotations = { destructiveHint: true };
  writeFileSync(b, JSON.stringify(snap));
  const diff = spawnSync("node", [probe, "--diff", a, b, "--json"], { encoding: "utf8" });
  assert.equal(diff.status, 1);
  assert.ok(JSON.parse(diff.stdout).result.differences.some((x) => x.id === "adjust-stock" && x.fields[0].field === "annotations"));
});

test("diff ignores JSON Schema dialect and key order but still reports a real schema change", () => {
  const d = mkdtempSync(join(tmpdir(), "canon-"));
  const base = { server: {}, resources: [], resourceTemplates: [], prompts: [], ui: [], calls: [], problems: [] };
  const tool = (inputSchema) => ({ name: "t", description: "d", inputSchema });
  const a = { ...base, tools: [tool({ $schema: "http://json-schema.org/draft-07/schema#", type: "object", properties: { x: { type: "string", description: "n" } }, required: ["x"] })] };
  const b = { ...base, tools: [tool({ required: ["x"], properties: { x: { description: "n", type: "string" } }, $schema: "https://json-schema.org/draft/2020-12/schema", type: "object" })] };
  const c = { ...base, tools: [tool({ type: "object", properties: { x: { type: "number" } }, required: ["x"] })] };
  const [fa, fb, fc] = ["a", "b", "c"].map((n, i) => { const f = join(d, `${n}.json`); writeFileSync(f, JSON.stringify([a, b, c][i])); return f; });
  const same = JSON.parse(spawnSync("node", [probe, "--diff", fa, fb, "--json"], { encoding: "utf8" }).stdout).result;
  assert.equal(same.equal, true);
  assert.equal(same.ignored.length, 1);
  const diff = spawnSync("node", [probe, "--diff", fa, fc, "--json"], { encoding: "utf8" });
  assert.equal(diff.status, 1);
  assert.equal(JSON.parse(diff.stdout).result.differences[0].fields[0].field, "inputSchema");
});
