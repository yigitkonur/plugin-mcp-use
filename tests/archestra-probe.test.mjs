import { test, after } from "node:test";
import assert from "node:assert/strict";
import { spawn, execFile } from "node:child_process";
import { mkdtempSync, cpSync, symlinkSync, existsSync } from "node:fs";
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
after(() => procs.forEach((p) => p.kill()));

const runAsync = (args) => new Promise((res) => execFile("node", [probe, ...args, "--json"], { encoding: "utf8", timeout: 60000 }, (err, stdout) => res({ status: err ? err.code : 0, out: JSON.parse(stdout) })));
const freePort = () => new Promise((res) => { const s = netServer().listen(0, () => { const p = s.address().port; s.close(() => res(p)); }); });

test("mock server with Route A defects: every AR probe rule fires, the clean tool does not", async () => {
  const html = '<!DOCTYPE html><html><head><script src="https://cdn.example.com/x.js"></script></head><body>x</body></html>';
  const srv = createServer((req, res) => {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      const m = JSON.parse(body || "{}");
      const ok = (result) => { res.writeHead(200, { "content-type": "application/json" }); res.end(JSON.stringify({ jsonrpc: "2.0", id: m.id, result })); };
      const err = (message) => { res.writeHead(200, { "content-type": "application/json" }); res.end(JSON.stringify({ jsonrpc: "2.0", id: m.id, error: { code: -32002, message } })); };
      if (m.method === "server/discover") return ok({ supportedVersions: ["2026-07-28"], capabilities: {}, _meta: { "io.modelcontextprotocol/serverInfo": { name: "mock", version: "1" } } });
      if (m.method === "tools/list") return ok({ tools: [
        { name: "a-legacy", description: "d", inputSchema: { type: "object" }, _meta: { "openai/outputTemplate": "ui://w/a.html" } },
        { name: "b-badschema", description: "d", inputSchema: {} },
        { name: "c-good", description: "d", inputSchema: { type: "object" }, _meta: { ui: { resourceUri: "ui://w/c.html" } } },
      ] });
      if (m.method === "resources/list") return ok({ resources: [{ uri: "ui://w/c.html", name: "c" }, { uri: "ui://w/orphan.html", name: "orphan" }] });
      if (m.method === "resources/read") {
        if (m.params.uri === "ui://w/c.html") return ok({ contents: [{ uri: m.params.uri, mimeType: "text/html", text: html, _meta: { ui: { csp: { connectDomains: ["*"] }, permissions: { camera: {} } } } }] });
        return err("resource not found");
      }
      return ok({});
    });
  });
  await new Promise((r) => srv.listen(0, r));
  const { status, out } = await runAsync(["--url", `http://127.0.0.1:${srv.address().port}/mcp`, "--host", "archestra"]);
  srv.close();
  const got = out.result.findings.map((f) => `${f.rule_id} ${f.severity} ${f.target}`);
  for (const want of [
    "AR-A01 error tool:a-legacy",
    "AR-A01 warning resource:ui://w/orphan.html",
    "AR-A03 error tool:b-badschema",
    "AR-A02 error ui:ui://w/a.html",
    "AR-A02 error ui:ui://w/c.html",
    "AR-A04 warning ui:ui://w/c.html",
    "AR-A05 advisory ui:ui://w/c.html",
  ]) assert.ok(got.includes(want), `missing: ${want}\n${got.join("\n")}`);
  assert.ok(!got.some((g) => g.includes("tool:c-good")), "clean tool is not flagged");
  assert.ok(out.result.findings.every((f) => f.host === "archestra"));
  assert.ok(out.result.findings.some((f) => /cdn\.example\.com/.test(f.message)), "undeclared origin named");
  assert.ok(out.result.findings.some((f) => /wildcard/.test(f.message)), "wildcard named");
  assert.equal(status, 2);
  assert.ok(out.result.notes.some((n) => n.includes("AR-A08")), "unverifiable rules are listed as a note");
});

test("F16 (Archestra-only views) passes the Archestra probe with no findings", { skip: !haveWs && "run scripts/typecheck-fixtures.sh first (installs the workspace)" }, async () => {
  const dir = mkdtempSync(join(tmpdir(), "px-f16-"));
  cpSync(join(root, "tests", "fixtures", "f16"), dir, { recursive: true });
  symlinkSync(join(WS, "node_modules"), join(dir, "node_modules"));
  const port = await freePort();
  const p = spawn(join(WS, "node_modules", ".bin", "mcp-use"), ["dev", "--no-open", "--no-inspector", "--port", String(port)], { cwd: dir, stdio: ["ignore", "pipe", "pipe"] });
  procs.push(p);
  await new Promise((res, rej) => {
    const t = setTimeout(() => rej(new Error("f16: dev server not ready in 40s")), 40000);
    const on = (d) => { if (String(d).includes("dev server ready")) { clearTimeout(t); res(); } };
    p.stdout.on("data", on); p.stderr.on("data", on);
  });
  const { status, out } = await runAsync(["--url", `http://127.0.0.1:${port}/mcp`, "--host", "archestra"]);
  assert.deepEqual(out.result.findings, []);
  assert.equal(status, 0);
  assert.equal(out.result.ui_resources, 1);
  // the same server fails the ChatGPT checklist on annotations, which is the gap host chatgpt add has to close
  const gpt = await runAsync(["--url", `http://127.0.0.1:${port}/mcp`, "--host", "chatgpt"]);
  assert.deepEqual(gpt.out.result.findings.filter((f) => f.severity === "error").map((f) => `${f.rule_id} ${f.target}`).sort(), ["CG-T01 tool:refresh-ticket", "CG-T01 tool:show-ticket"]);
});
