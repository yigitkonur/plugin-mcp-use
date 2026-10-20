// Minimal MCP client over stdio for probes: spawns the server command, speaks newline-delimited JSON-RPC with the
// 2025 `initialize` handshake (understood by every stdio server), and exposes the same surface as mcp-http.mjs.
import { spawn } from "node:child_process";
import { listAll, CLIENT_INFO } from "./mcp-http.mjs";

const LEGACY = "2025-06-18";

export async function connectStdio({ command, cwd, env = {}, timeoutMs = 20000 }) {
  // Own process group, so a wrapper command (npm run start, sh -c "a; b") and every descendant can be stopped together.
  const child = spawn("sh", ["-c", command], { cwd, env: { ...process.env, ...env }, stdio: ["pipe", "pipe", "pipe"], detached: true });
  const killTree = (sig) => { try { process.kill(-child.pid, sig); } catch { try { child.kill(sig); } catch { /* already gone */ } } };
  const pending = new Map();
  const state = { mode: "stdio", session: null, serverInfo: null, protocolVersion: null, capabilities: null, instructions: null, noise: [], stderr: "", exited: null };
  let buf = "";
  let nextId = 1;
  child.stdout.setEncoding("utf8"); // multi-byte characters can straddle chunks
  child.stdin.on("error", () => { /* the server exited early; the exit handler reports it */ });

  const failAll = (why) => { for (const [id, p] of pending) { p.resolve({ status: 0, transportError: why }); pending.delete(id); } };
  child.stdout.on("data", (d) => {
    buf += d;
    let i;
    while ((i = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, i).replace(/\r$/, "");
      buf = buf.slice(i + 1);
      if (!line.trim()) continue;
      let m;
      try { m = JSON.parse(line); } catch { state.noise.push(line.slice(0, 120)); continue; }
      if (m.id !== undefined && (m.result !== undefined || m.error !== undefined) && pending.has(m.id)) {
        const p = pending.get(m.id); pending.delete(m.id); p.resolve({ status: 200, ...m });
      } else if (m.method === "ping" && m.id !== undefined) child.stdin.write(JSON.stringify({ jsonrpc: "2.0", id: m.id, result: {} }) + "\n");
    }
  });
  child.stderr.on("data", (d) => { if (state.stderr.length < 4000) state.stderr += d; });
  child.on("error", (e) => { state.exited = `spawn failed: ${e.message}`; failAll(state.exited); });
  child.on("exit", (code, sig) => { state.exited = `exited with ${sig ?? code}`; failAll(`server ${state.exited}${state.stderr ? `: ${state.stderr.trim().slice(0, 200)}` : ""}`); });

  function request(method, params = {}) {
    if (state.exited) return Promise.resolve({ status: 0, transportError: `server ${state.exited}` });
    const id = nextId++;
    return new Promise((resolve) => {
      const timer = setTimeout(() => { pending.delete(id); resolve({ status: 0, transportError: `timeout after ${timeoutMs} ms` }); }, timeoutMs);
      pending.set(id, { resolve: (r) => { clearTimeout(timer); resolve(r); } });
      child.stdin.write(JSON.stringify({ jsonrpc: "2.0", id, method, params }) + "\n");
    });
  }

  const caps = { extensions: { "io.modelcontextprotocol/ui": { mimeTypes: ["text/html;profile=mcp-app"] } } };
  const init = await request("initialize", { protocolVersion: LEGACY, capabilities: caps, clientInfo: CLIENT_INFO });
  if (!init.result) {
    killTree("SIGKILL");
    throw Object.assign(new Error(init.transportError || init.error?.message || "initialize failed"), { code: "connect_failed" });
  }
  state.protocolVersion = init.result.protocolVersion;
  state.capabilities = init.result.capabilities;
  state.serverInfo = init.result.serverInfo;
  state.instructions = init.result.instructions ?? null;
  child.stdin.write(JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }) + "\n");

  return {
    state, request, list: (method, key) => listAll(request, method, key),
    async close() {
      if (state.exited) { killTree("SIGKILL"); return; }
      try { child.stdin.end(); } catch { /* already closed */ }
      await new Promise((r) => { const t = setTimeout(() => { killTree("SIGKILL"); r(); }, 1000); child.on("exit", () => { clearTimeout(t); killTree("SIGKILL"); r(); }); });
      killTree("SIGKILL");
    },
  };
}
