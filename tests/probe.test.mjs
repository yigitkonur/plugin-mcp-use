import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { spawn, spawnSync, execFile } from "node:child_process";
import { mkdtempSync, cpSync, symlinkSync, existsSync, writeFileSync, readFileSync } from "node:fs";
import { createServer } from "node:http";
import { createServer as netServer } from "node:net";
import { join, dirname } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const probe = join(root, "bin", "mcp-use-probe");
const WS = join(process.env.MCP_USE_WORK || process.env.TMPDIR || tmpdir(), "mcp-use-plugin-fixtures");
const haveWs = existsSync(join(WS, "node_modules", "mcp-use"));
const procs = [];

const freePort = () => new Promise((res) => { const s = netServer().listen(0, () => { const p = s.address().port; s.close(() => res(p)); }); });

async function startFixture(name) {
  const dir = mkdtempSync(join(tmpdir(), `px-${name}-`));
  cpSync(join(root, "tests", "fixtures", name), dir, { recursive: true });
  symlinkSync(join(WS, "node_modules"), join(dir, "node_modules"));
  const port = await freePort();
  const p = spawn(join(WS, "node_modules", ".bin", "mcp-use"), ["dev", "--no-open", "--no-inspector", "--port", String(port)], { cwd: dir, stdio: ["ignore", "pipe", "pipe"] });
  procs.push(p);
  await new Promise((res, rej) => {
    const t = setTimeout(() => rej(new Error(`${name}: dev server not ready in 40s`)), 40000);
    const on = (d) => { if (String(d).includes("dev server ready")) { clearTimeout(t); res(); } };
    p.stdout.on("data", on); p.stderr.on("data", on);
  });
  return { url: `http://127.0.0.1:${port}/mcp`, dir };
}
const run = (args) => { const r = spawnSync("node", [probe, ...args, "--json"], { encoding: "utf8" }); return { status: r.status, out: JSON.parse(r.stdout) }; };
const runAsync = (args) => new Promise((res) => execFile("node", [probe, ...args, "--json"], { encoding: "utf8" }, (err, stdout) => res({ status: err ? err.code : 0, out: JSON.parse(stdout) })));
after(() => procs.forEach((p) => p.kill()));

test("F14 via probe: no errors/warnings, one UI resource with the right MIME", { skip: !haveWs && "run scripts/typecheck-fixtures.sh first (installs the workspace)" }, async () => {
  const { url } = await startFixture("f14");
  const calls = join(mkdtempSync(join(tmpdir(), "c-")), "calls.json");
  writeFileSync(calls, JSON.stringify([{ tool: "show-product", arguments: { sku: "PROD-100" } }]));
  const { out } = run(["--url", url, "--host", "chatgpt", "--calls", calls]);
  assert.equal(out.result.ui_resources, 1);
  assert.deepEqual(out.result.findings.filter((f) => f.severity !== "advisory"), []);
  assert.equal(out.result.server.mode, "modern");
});

test("p-defects: the probe reports each seeded live defect", { skip: !haveWs && "workspace missing" }, async () => {
  const { url } = await startFixture("p-defects");
  const calls = join(mkdtempSync(join(tmpdir(), "c-")), "calls.json");
  writeFileSync(calls, JSON.stringify([{ tool: "mismatch", arguments: {} }]));
  const { status, out } = run(["--url", url, "--host", "chatgpt", "--calls", calls]);
  const ids = out.result.findings.map((f) => `${f.rule_id} ${f.target}`);
  assert.ok(ids.includes("CG-T01 tool:no-annotations"));
  assert.ok(ids.includes("CG-T01 tool:half-annotations"));
  assert.ok(ids.includes("CG-T08 tool:long-status"));
  assert.ok(ids.includes("CG-T11 call:mismatch"));
  assert.ok(ids.some((x) => x.startsWith("CG-R03 ui:")));
  assert.equal(status, 2);
  assert.ok(!ids.includes("CG-T01 tool:long-status"), "fully annotated tool must not be flagged");
});

test("p-auth: ChatGPT user agent gets 200 + isError + mcp/www_authenticate (CG-A01 passes)", { skip: !haveWs && "workspace missing" }, async () => {
  const { url } = await startFixture("p-auth");
  const { out } = run(["--url", url, "--host", "chatgpt", "--ua", "chatgpt"]);
  assert.deepEqual(out.result.findings.filter((f) => f.rule_id === "CG-A01"), []);
  assert.ok(out.result.notes.some((n) => n.includes("checkout")));
});

test("CG-A01 fails when a protected tool answers 401 to the ChatGPT user agent (mock server)", async () => {
  const srv = createServer((req, res) => {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      const m = JSON.parse(body || "{}");
      const send = (obj, status = 200) => { res.writeHead(status, { "content-type": "application/json" }); res.end(JSON.stringify(obj)); };
      if (m.method === "server/discover") return send({ jsonrpc: "2.0", id: m.id, result: { supportedVersions: ["2026-07-28"], capabilities: {}, _meta: { "io.modelcontextprotocol/serverInfo": { name: "mock", version: "1" } } } });
      if (m.method === "tools/list") return send({ jsonrpc: "2.0", id: m.id, result: { tools: [{ name: "secret", description: "d", annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false }, securitySchemes: [{ type: "oauth2", scopes: ["x"] }] }] } });
      if (m.method === "tools/call") return send({ error: "invalid_token" }, 401);
      return send({ jsonrpc: "2.0", id: m.id, result: {} });
    });
  });
  await new Promise((r) => srv.listen(0, r));
  const url = `http://127.0.0.1:${srv.address().port}/mcp`;
  const { status, out } = await runAsync(["--url", url, "--host", "chatgpt", "--ua", "chatgpt"]);
  srv.close();
  assert.equal(status, 2);
  assert.ok(out.result.findings.some((f) => f.rule_id === "CG-A01" && f.severity === "error"));
});

test("snapshot + diff: equal when unchanged, reports field-level changes", { skip: !haveWs && "workspace missing" }, async () => {
  const { url } = await startFixture("f14");
  const d = mkdtempSync(join(tmpdir(), "snap-"));
  const a = join(d, "a.json"), b = join(d, "b.json"), c = join(d, "c.json");
  run(["--url", url, "--snapshot", a]); run(["--url", url, "--snapshot", b]);
  assert.equal(run(["--diff", a, b]).out.result.equal, true);
  const snap = JSON.parse(readFileSync(b, "utf8"));
  snap.tools[0].description = "changed";
  snap.tools.push({ name: "extra" });
  writeFileSync(c, JSON.stringify(snap));
  const r = run(["--diff", a, c]);
  assert.equal(r.status, 1);
  assert.ok(r.out.result.differences.some((x) => x.change === "changed" && x.fields[0].field === "description"));
  assert.ok(r.out.result.differences.some((x) => x.change === "added" && x.id === "extra"));
});

test("unreachable server: exit 5 with a connect_failed envelope", () => {
  const { status, out } = run(["--url", "http://127.0.0.1:1/mcp"]);
  assert.equal(status, 5);
  assert.equal(out.error.code, "connect_failed");
});
