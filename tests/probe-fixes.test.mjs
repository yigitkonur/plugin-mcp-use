import { test } from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { createServer } from "node:http";
import { mkdtempSync, writeFileSync, existsSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { connectStdio } from "../lib/mcp-stdio.mjs";
import { diffSnapshots } from "../lib/probe.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const probe = join(root, "bin", "mcp-use-probe");
const run = (args) => new Promise((res) => execFile("node", [probe, ...args, "--json"], { encoding: "utf8", timeout: 60000 }, (err, stdout) => res({ status: err ? err.code : 0, out: stdout ? JSON.parse(stdout) : null })));

function mockHttp(handler) {
  const seen = [];
  const srv = createServer((req, res) => {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      const m = JSON.parse(body || "{}");
      seen.push({ method: m.method, ua: req.headers["user-agent"] ?? "", auth: req.headers.authorization ?? null });
      const ok = (result, status = 200) => { res.writeHead(status, { "content-type": "application/json" }); res.end(JSON.stringify({ jsonrpc: "2.0", id: m.id, result })); };
      const err = (code, message) => { res.writeHead(200, { "content-type": "application/json" }); res.end(JSON.stringify({ jsonrpc: "2.0", id: m.id, error: { code, message } })); };
      if (m.method === "server/discover") return ok({ supportedVersions: ["2026-07-28"], capabilities: {}, _meta: { "io.modelcontextprotocol/serverInfo": { name: "mock", version: "1" } } });
      if (m.method === "tools/list") return ok({ tools: [{ name: "t", description: "d", inputSchema: { type: "object" }, annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false }, securitySchemes: [{ type: "oauth2", scopes: ["x"] }] }] });
      if (m.method === "tools/call") return handler({ ok, err, req, m, res });
      return ok({});
    });
  });
  return new Promise((r) => srv.listen(0, () => r({ srv, seen, url: `http://127.0.0.1:${srv.address().port}/mcp` })));
}

test("CG-A01 connection never carries the token; the main connection still does", async () => {
  const { srv, seen, url } = await mockHttp(({ ok, req, res, m }) => {
    if (/chatgpt/i.test(req.headers["user-agent"] ?? "")) {
      res.writeHead(200, { "content-type": "application/json" });
      return res.end(JSON.stringify({ jsonrpc: "2.0", id: m.id, result: { isError: true, content: [{ type: "text", text: "sign in" }], _meta: { "mcp/www_authenticate": ["Bearer error=\"invalid_token\""] } } }));
    }
    return ok({ content: [{ type: "text", text: "x" }] });
  });
  const { out } = await run(["--url", url, "--host", "chatgpt", "--ua", "chatgpt", "--token", "SECRET-TOKEN"]);
  srv.close();
  const chat = seen.filter((s) => /chatgpt/i.test(s.ua));
  assert.ok(chat.length > 0, "the ChatGPT-UA connection made requests");
  assert.ok(chat.every((s) => s.auth === null), "no Authorization header on the unauthenticated probe");
  assert.ok(seen.filter((s) => !/chatgpt/i.test(s.ua)).every((s) => s.auth === "Bearer SECRET-TOKEN"), "the main connection sends the token");
  assert.ok(out.result.notes.some((n) => n.includes("CG-A01")));
  assert.ok(!JSON.stringify(out).includes("SECRET-TOKEN"), "the token is never printed");
});

test("a failed sample call is a finding, is recorded in the snapshot, and shows up in a diff", async () => {
  const { srv, url } = await mockHttp(({ err }) => err(-32603, "internal boom"));
  const d = mkdtempSync(join(tmpdir(), "fc-"));
  const calls = join(d, "calls.json"); writeFileSync(calls, JSON.stringify([{ tool: "t", arguments: { a: 1 } }]));
  const snapA = join(d, "a.json");
  const { status, out } = await run(["--url", url, "--calls", calls, "--snapshot", snapA]);
  srv.close();
  assert.equal(status, 1);
  assert.ok(out.result.findings.some((f) => f.rule_id === "PROBE" && /sample call t\(.*failed: internal boom/.test(f.message)));
  assert.equal(JSON.parse(readFileSync(snapA, "utf8")).calls[0].error, "internal boom");
  // a baseline that failed must not look "identical" to a working server
  const good = JSON.parse(readFileSync(snapA, "utf8")); good.calls[0] = { ...good.calls[0], error: undefined, structuredContent: undefined, content: [{ type: "text", text: "ok" }] };
  const snapB = join(d, "b.json"); writeFileSync(snapB, JSON.stringify(good));
  const diff = await run(["--diff", snapA, snapB]);
  assert.equal(diff.status, 1);
  assert.ok(diff.out.result.differences.some((x) => x.kind === "call" && x.fields.some((f) => f.field === "error")));
});

test("--snapshot creates a missing parent directory", async () => {
  const { srv, url } = await mockHttp(({ ok }) => ok({ content: [] }));
  const target = join(mkdtempSync(join(tmpdir(), "sd-")), "a", "b", "before.json");
  await run(["--url", url, "--snapshot", target]);
  srv.close();
  assert.ok(existsSync(target));
});

test("stdio: closing stops the whole process tree of a wrapped command", async () => {
  const d = mkdtempSync(join(tmpdir(), "tree-"));
  const pidfile = join(d, "pid");
  const server = join(d, "server.cjs");
  writeFileSync(server, `
require("node:fs").writeFileSync(${JSON.stringify(pidfile)}, String(process.pid));
const rl = require("node:readline").createInterface({ input: process.stdin });
rl.on("line", (l) => { const m = JSON.parse(l); if (m.method === "initialize") process.stdout.write(JSON.stringify({ jsonrpc: "2.0", id: m.id, result: { protocolVersion: "2025-06-18", capabilities: {}, serverInfo: { name: "tree", version: "1" } } }) + "\\n"); });
setInterval(() => {}, 1000);`);
  // two commands force a real wrapper shell, so the node server is a grandchild of the spawned sh
  let c, pid;
  try {
    c = await connectStdio({ command: `node ${server}; echo wrapper-done`, cwd: d, timeoutMs: 10000 });
    pid = Number(readFileSync(pidfile, "utf8"));
    assert.doesNotThrow(() => process.kill(pid, 0), "server is running before close");
    await c.close();
    const dead = await new Promise((res) => { const t0 = Date.now(); const tick = () => { try { process.kill(pid, 0); } catch { return res(true); } Date.now() - t0 > 3000 ? res(false) : setTimeout(tick, 50); }; tick(); });
    assert.equal(dead, true, "grandchild server process is gone after close()");
  } finally {
    // a failed assertion must not leave the detached server running
    await c?.close();
    if (pid) { try { process.kill(pid, "SIGKILL"); } catch { /* already gone */ } }
  }
});

test("drift workflow records the exit status of drift.mjs, not of tee", () => {
  const y = readFileSync(join(root, ".github", "workflows", "drift.yml"), "utf8");
  assert.match(y, /shell: bash/);
  assert.match(y, /code=\$\{PIPESTATUS\[0\]\}/);
  assert.ok(!/code=\$\?/.test(y));
});

// ---- snapshot diff: list endpoint failures and server changes -------------------------------------------
const snap = (over = {}) => ({ server: { name: "inv", version: "1.0.0", protocol: "2025-06-18", mode: "stdio" }, tools: [], resources: [], resourceTemplates: [], prompts: [], ui: [], calls: [], problems: [], ...over });

test("diff reports a list endpoint that started failing, and one that was fixed", () => {
  const worse = diffSnapshots(snap(), snap({ problems: ["resources/list: Internal error"] }));
  assert.equal(worse.equal, false);
  assert.deepEqual(worse.differences, [{ kind: "problem", id: "resources/list: Internal error", change: "added" }]);
  const better = diffSnapshots(snap({ problems: ["prompts/list: boom"] }), snap());
  assert.deepEqual(better.differences, [{ kind: "problem", id: "prompts/list: boom", change: "removed" }]);
});

test("diff leaves sample-call failures to the call diff", () => {
  const d = diffSnapshots(snap(), snap({ problems: ["sample call t({}) failed: HTTP 500"] }));
  assert.equal(d.equal, true);
});

test("a changed server block is a note, not a difference", () => {
  const d = diffSnapshots(snap(), snap({ server: { name: "inventory", version: "2.0.0", protocol: "2026-07-28", mode: "modern" } }));
  assert.equal(d.equal, true);
  assert.equal(d.ignored.length, 1);
  assert.match(d.ignored[0].note, /server changed/);
});

test("the CLI exits 1 and names the new failure; the server note carries no schema count", async () => {
  const d = mkdtempSync(join(tmpdir(), "diff-"));
  writeFileSync(join(d, "a.json"), JSON.stringify(snap()));
  writeFileSync(join(d, "b.json"), JSON.stringify(snap({ problems: ["resources/list: Internal error"], server: { name: "x", version: "2", protocol: "p", mode: "m" } })));
  const r = await new Promise((res) => execFile("node", [probe, "--diff", join(d, "a.json"), join(d, "b.json")], { encoding: "utf8" }, (err, stdout) => res({ status: err ? err.code : 0, stdout })));
  assert.equal(r.status, 1);
  assert.match(r.stdout, /ADDED problem resources\/list: Internal error/);
  assert.match(r.stdout, /note: server changed/);
  assert.ok(!/schema\)/.test(r.stdout), "no '(1 schema)' suffix on the server note");
});
