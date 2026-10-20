// Minimal MCP client over Streamable HTTP for probes. Zero dependencies (global fetch, Node >= 18).
// Modern (2026-07-28) stateless requests need `Mcp-Method` (+ `Mcp-Name` for name/uri) headers and a `_meta` client envelope;
// older servers use `initialize` + optional `Mcp-Session-Id`. connect() tries the modern path and falls back.
const MODERN = "2026-07-28";
const LEGACY = "2025-06-18";

async function readJsonRpc(res, id) {
  const ct = res.headers.get("content-type") || "";
  const text = await res.text();
  if (ct.includes("text/event-stream")) {
    let found = null;
    for (const block of text.split(/\n\n+/)) {
      const data = block.split("\n").filter((l) => l.startsWith("data:")).map((l) => l.slice(5).trimStart()).join("\n");
      if (!data) continue;
      try { const m = JSON.parse(data); if (m.id === id || (found === null && m.result !== undefined)) found = m; } catch { /* ignore keep-alives */ }
    }
    return found;
  }
  try { return JSON.parse(text); } catch { return { transportError: `non-JSON response (${res.status}): ${text.slice(0, 200)}` }; }
}

// Page through a list method (tools/list, ...) with whatever transport `request` uses.
export async function listAll(request, method, key) {
  const items = [];
  let cursor;
  for (let i = 0; i < 20; i++) {
    const r = await request(method, cursor ? { cursor } : {});
    if (r.error || !r.result) return { items, error: r.error ?? { message: r.transportError ?? (r.status ? `HTTP ${r.status}` : "no response") } };
    items.push(...(r.result[key] ?? []));
    cursor = r.result.nextCursor;
    if (!cursor) break;
  }
  return { items };
}

export async function connect({ url, ua, token, headers = {}, timeoutMs = 15000, extensions = true }) {
  const base = { "content-type": "application/json", accept: "application/json, text/event-stream", ...headers };
  if (ua) base["user-agent"] = ua;
  if (token) base.authorization = `Bearer ${token}`;
  let nextId = 1;
  const clientCaps = extensions ? { extensions: { "io.modelcontextprotocol/ui": { mimeTypes: ["text/html;profile=mcp-app"] } } } : {};
  const envelope = { "io.modelcontextprotocol/protocolVersion": MODERN, "io.modelcontextprotocol/clientInfo": { name: "mcp-use-probe", version: "0.2.0" }, "io.modelcontextprotocol/clientCapabilities": clientCaps };
  const state = { mode: null, session: null, serverInfo: null, protocolVersion: null, capabilities: null, instructions: null };

  async function post(body, extraHeaders = {}) {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), timeoutMs);
    try {
      const res = await fetch(url, { method: "POST", headers: { ...base, ...extraHeaders }, body: JSON.stringify(body), signal: ctl.signal });
      return { res, msg: await readJsonRpc(res, body.id) };
    } catch (e) {
      return { res: null, msg: { transportError: e.name === "AbortError" ? `timeout after ${timeoutMs} ms` : String(e.message ?? e) } };
    } finally { clearTimeout(timer); }
  }

  async function request(method, params = {}) {
    const id = nextId++;
    if (state.mode === "modern") {
      const h = { "mcp-protocol-version": MODERN, "mcp-method": method };
      const name = params.name ?? params.uri;
      if (typeof name === "string" && (method === "tools/call" || method === "resources/read" || method === "prompts/get")) h["mcp-name"] = name;
      const { res, msg } = await post({ jsonrpc: "2.0", id, method, params: { ...params, _meta: { ...(params._meta || {}), ...envelope } } }, h);
      return { status: res?.status ?? 0, headers: res?.headers, ...msg };
    }
    const h = state.session ? { "mcp-session-id": state.session, "mcp-protocol-version": state.protocolVersion || LEGACY } : {};
    const { res, msg } = await post({ jsonrpc: "2.0", id, method, params }, h);
    return { status: res?.status ?? 0, headers: res?.headers, ...msg };
  }

  // 1. modern discovery
  state.mode = "modern";
  const d = await request("server/discover");
  if (d.result?.supportedVersions) {
    state.protocolVersion = d.result.supportedVersions[0];
    state.capabilities = d.result.capabilities;
    state.instructions = d.result.instructions ?? null;
    state.serverInfo = d.result._meta?.["io.modelcontextprotocol/serverInfo"] ?? null;
  } else {
    // 2. legacy initialize
    state.mode = "legacy";
    const init = await request("initialize", { protocolVersion: LEGACY, capabilities: clientCaps, clientInfo: { name: "mcp-use-probe", version: "0.2.0" } });
    if (!init.result) throw Object.assign(new Error(init.transportError || init.error?.message || `initialize failed (HTTP ${init.status})`), { code: init.status === 401 ? "unauthorized" : "connect_failed", status: init.status });
    state.session = init.headers?.get("mcp-session-id") ?? null;
    state.protocolVersion = init.result.protocolVersion;
    state.capabilities = init.result.capabilities;
    state.serverInfo = init.result.serverInfo;
    state.instructions = init.result.instructions ?? null;
    await post({ jsonrpc: "2.0", method: "notifications/initialized" }, state.session ? { "mcp-session-id": state.session, "mcp-protocol-version": state.protocolVersion } : {});
  }

  return {
    state, request, list: (method, key) => listAll(request, method, key),
    async close() { if (state.session) { try { await fetch(url, { method: "DELETE", headers: { ...base, "mcp-session-id": state.session } }); } catch { /* best effort */ } } },
  };
}
