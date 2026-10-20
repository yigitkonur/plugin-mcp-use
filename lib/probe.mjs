import { validate } from "./jsonschema.mjs";

const VOLATILE_META = new Set(["io.modelcontextprotocol/serverInfo"]);
const stripMeta = (m) => {
  if (!m) return undefined;
  const o = Object.fromEntries(Object.entries(m).filter(([k]) => !VOLATILE_META.has(k)));
  return Object.keys(o).length ? o : undefined;
};
const sortBy = (arr, key) => [...arr].sort((a, b) => String(a[key]).localeCompare(String(b[key])));
const uiUri = (t) => t._meta?.ui?.resourceUri ?? t._meta?.["ui/resourceUri"] ?? t._meta?.["openai/outputTemplate"] ?? null;

export async function takeSnapshot(client, { calls = [] } = {}) {
  const problems = [];
  const tools = await client.list("tools/list", "tools");
  const resources = await client.list("resources/list", "resources");
  const templates = await client.list("resources/templates/list", "resourceTemplates");
  const prompts = await client.list("prompts/list", "prompts");
  for (const [n, r] of [["tools/list", tools], ["resources/list", resources], ["resources/templates/list", templates], ["prompts/list", prompts]]) if (r.error && r.error.code !== -32601) problems.push(`${n}: ${r.error.message ?? JSON.stringify(r.error)}`);
  const snap = {
    server: { name: client.state.serverInfo?.name ?? null, version: client.state.serverInfo?.version ?? null, protocol: client.state.protocolVersion, mode: client.state.mode },
    tools: sortBy(tools.items.map((t) => ({ name: t.name, title: t.title, description: t.description, annotations: t.annotations, inputSchema: t.inputSchema, outputSchema: t.outputSchema, securitySchemes: t.securitySchemes, _meta: stripMeta(t._meta) })), "name"),
    resources: sortBy(resources.items.map((r) => ({ uri: r.uri, name: r.name, title: r.title, mimeType: r.mimeType, description: r.description, _meta: stripMeta(r._meta) })), "uri"),
    resourceTemplates: sortBy(templates.items.map((r) => ({ uriTemplate: r.uriTemplate, name: r.name, mimeType: r.mimeType, description: r.description })), "uriTemplate"),
    prompts: sortBy(prompts.items.map((p) => ({ name: p.name, title: p.title, description: p.description, arguments: p.arguments })), "name"),
    ui: [],
    calls: [],
    problems,
  };
  const uris = [...new Set(snap.tools.map(uiUri).filter(Boolean))];
  for (const uri of uris) {
    const r = await client.request("resources/read", { uri });
    const c = r.result?.contents?.[0];
    snap.ui.push({
      uri, ok: !!c, error: r.error?.message ?? r.transportError ?? (c ? undefined : `HTTP ${r.status}`),
      mimeType: c?.mimeType, meta: stripMeta(c?._meta ?? r.result?._meta), htmlBytes: c?.text ? c.text.length : 0,
      origins: c?.text ? [...new Set([...c.text.matchAll(/\b(?:src|href)\s*=\s*"(https?:\/\/[^"/]+)/g)].map((m) => m[1]))].sort() : [],
    });
  }
  for (const call of calls) {
    const r = await client.request("tools/call", { name: call.tool, arguments: call.arguments ?? {} });
    snap.calls.push({ tool: call.tool, arguments: call.arguments ?? {}, httpStatus: r.status, isError: r.result?.isError === true, error: r.error?.message, structuredContent: r.result?.structuredContent, content: r.result?.content });
  }
  return snap;
}

// ---- diff ------------------------------------------------------------------------------------
// Key order never matters in JSON objects, and a top-level `$schema` only names the JSON Schema dialect the
// framework emits (the official SDK writes draft-07, mcp-use 2020-12), so schemas compare without it.
const canon = (v) => (Array.isArray(v) ? v.map(canon) : v && typeof v === "object" ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, canon(v[k])])) : v);
const SCHEMA_FIELDS = new Set(["inputSchema", "outputSchema"]);
const prep = (field, v) => canon(SCHEMA_FIELDS.has(field) && v && typeof v === "object" && !Array.isArray(v) ? Object.fromEntries(Object.entries(v).filter(([k]) => k !== "$schema")) : v);
const same = (field, a, b) => JSON.stringify(prep(field, a)) === JSON.stringify(prep(field, b));
function diffList(kind, a, b, key, fields, ignored = []) {
  const out = [];
  const A = new Map(a.map((x) => [x[key], x])), B = new Map(b.map((x) => [x[key], x]));
  for (const [k, x] of A) {
    if (!B.has(k)) { out.push({ kind, id: k, change: "removed" }); continue; }
    for (const f of fields) if (SCHEMA_FIELDS.has(f) && same(f, x[f], B.get(k)[f]) && x[f]?.$schema !== B.get(k)[f]?.$schema) ignored.push({ kind, id: k, field: f, note: `JSON Schema dialect ${x[f]?.$schema ?? "none"} -> ${B.get(k)[f]?.$schema ?? "none"} ignored` });
    const changed = fields.filter((f) => !same(f, x[f], B.get(k)[f]));
    if (changed.length) out.push({ kind, id: k, change: "changed", fields: changed.map((f) => ({ field: f, before: x[f], after: B.get(k)[f] })) });
  }
  for (const k of B.keys()) if (!A.has(k)) out.push({ kind, id: k, change: "added" });
  return out;
}
export function diffSnapshots(a, b) {
  const ignored = [];
  const differences = [
    ...diffList("tool", a.tools, b.tools, "name", ["title", "description", "annotations", "inputSchema", "outputSchema", "securitySchemes", "_meta"], ignored),
    ...diffList("resource", a.resources, b.resources, "uri", ["name", "mimeType", "description", "_meta"]),
    ...diffList("resourceTemplate", a.resourceTemplates, b.resourceTemplates, "uriTemplate", ["name", "mimeType", "description"]),
    ...diffList("prompt", a.prompts, b.prompts, "name", ["title", "description", "arguments"]),
    ...diffList("ui", a.ui, b.ui, "uri", ["mimeType", "meta"]),
  ];
  const callKey = (c) => `${c.tool}\t${JSON.stringify(c.arguments)}`;
  differences.push(...diffList("call", a.calls.map((c) => ({ ...c, k: callKey(c) })), b.calls.map((c) => ({ ...c, k: callKey(c) })), "k", ["isError", "structuredContent", "content"]));
  return { equal: differences.length === 0, differences, ignored };
}

// ---- ChatGPT checks -------------------------------------------------------------------------
const F = (rule_id, severity, target, message, source, evidence) => ({ rule_id, severity, host: "chatgpt", method: "probe", target, message, source, ...(evidence !== undefined ? { evidence } : {}) });

export function chatgptChecks(snap, { submit = false } = {}) {
  const f = [];
  for (const t of snap.tools) {
    const a = t.annotations ?? {};
    const missing = ["readOnlyHint", "destructiveHint", "openWorldHint"].filter((k) => typeof a[k] !== "boolean");
    if (missing.length) {
      const generated = /^settings\./.test(t.name);
      f.push(F("CG-T01", generated ? "warning" : "error", `tool:${t.name}`, `Missing explicit boolean ${missing.join(", ")}${generated ? " (tool generated by server.settings)" : ""}.`, "O4"));
    }
    for (const k of ["openai/toolInvocation/invoking", "openai/toolInvocation/invoked"]) {
      const v = t._meta?.[k];
      if (typeof v === "string" && v.length > 64) f.push(F("CG-T08", "warning", `tool:${t.name}`, `${k} is ${v.length} characters (limit 64).`, "O5"));
    }
    const ru = uiUri(t);
    if (ru && !t.outputSchema) f.push(F("STK-05", "error", `tool:${t.name}`, "View-bound tool has no outputSchema.", "M1"));
    if (!t.description) f.push(F("CG-T05", "warning", `tool:${t.name}`, "Tool has no description.", "O4"));
  }
  for (const u of snap.ui) {
    if (!u.ok) { f.push(F("CG-R02", "error", `ui:${u.uri}`, `resources/read failed: ${u.error}`, "O1")); continue; }
    if (u.mimeType !== "text/html;profile=mcp-app") f.push(F("CG-R01", "error", `ui:${u.uri}`, `MIME is ${u.mimeType}, expected text/html;profile=mcp-app.`, "O1"));
    if (!u.htmlBytes) f.push(F("CG-R02", "error", `ui:${u.uri}`, "UI resource returned no HTML.", "O1"));
    const ui = u.meta?.ui ?? {};
    if (!ui.domain) f.push(F("CG-R03", submit ? "error" : "advisory", `ui:${u.uri}`, "No _meta.ui.domain (required to submit a plugin with UI; unique per plugin).", "O5"));
    const csp = ui.csp ?? {};
    const declared = new Set([...(csp.connectDomains ?? []), ...(csp.resourceDomains ?? []), ...(csp.frameDomains ?? [])].map((d) => d.replace(/\/$/, "")));
    const undeclared = u.origins.filter((o) => !declared.has(o));
    if (undeclared.length) f.push(F("CG-R04", "warning", `ui:${u.uri}`, `HTML loads from origin(s) not in _meta.ui.csp: ${undeclared.join(", ")}.`, "O1"));
    if ((csp.frameDomains ?? []).length) f.push(F("CG-R05", "advisory", `ui:${u.uri}`, "frameDomains set: normally your own registrable domain; third-party embeds only when essential. Either needs a written justification and may trigger extra review.", "O4"));
    const modes = u.meta?.["openai/ui"]?.availableDisplayModes ?? [];
    if (modes.includes("pip")) f.push(F("CG-R07", "warning", `ui:${u.uri}`, "availableDisplayModes includes pip, which OpenAI's extensions spec says ChatGPT does not support (unconfirmed).", "O6"));
    if (!u.meta?.["openai/widgetDescription"]) f.push(F("CG-R08", "advisory", `ui:${u.uri}`, "No openai/widgetDescription (mcp-use >= 2.10.1 copies view.description).", "O5"));
  }
  const modelData = snap.tools.filter((t) => !uiUri(t));
  void modelData;
  for (const c of snap.calls) {
    const t = snap.tools.find((x) => x.name === c.tool);
    if (!t) { f.push(F("CG-T11", "warning", `call:${c.tool}`, "Called tool is not in tools/list.", "O5")); continue; }
    if (c.isError) {
      const text = c.content?.map((x) => x.text).join(" ") ?? "";
      if (/Output validation error/i.test(text)) f.push(F("CG-T11", "error", `call:${c.tool}`, `Server rejected the tool's own structuredContent: ${text.slice(0, 160)}`, "O5"));
      continue;
    }
    if (c.structuredContent !== undefined && !t.outputSchema) f.push(F("CG-T09", "warning", `call:${c.tool}`, "Result has structuredContent but the tool declares no outputSchema.", "O5"));
    if (t.outputSchema && c.structuredContent !== undefined) {
      const errs = validate(t.outputSchema, c.structuredContent);
      if (errs.length) f.push(F("CG-T11", "error", `call:${c.tool}`, `structuredContent does not match outputSchema: ${errs.slice(0, 3).join("; ")}`, "O5"));
    } else if (t.outputSchema && c.structuredContent === undefined) f.push(F("CG-T11", "error", `call:${c.tool}`, "Tool declares outputSchema but the result has no structuredContent.", "O5"));
  }
  return f;
}

const FA = (rule_id, severity, target, message, source, evidence) => ({ rule_id, severity, host: "archestra", method: "probe", target, message, source, ...(evidence !== undefined ? { evidence } : {}) });

// Archestra Route A (an installed MCP server serving MCP Apps). The host reads _meta.ui.resourceUri from tools/list,
// reads that resource, and renders it in a sandbox iframe with the CSP and permissions of the resource content item (A3).
// Credential model (AR-A08) and model-context support (AR-A12) are unverified and stay manual.
export function archestraChecks(snap) {
  const f = [];
  const linked = new Set();
  for (const t of snap.tools) {
    const ui = t._meta?.ui;
    if (ui?.resourceUri) linked.add(ui.resourceUri);
    else if (t._meta?.["ui/resourceUri"] || t._meta?.["openai/outputTemplate"]) {
      f.push(FA("AR-A01", "error", `tool:${t.name}`, "UI is linked only through a legacy key (ui/resourceUri or openai/outputTemplate); Archestra's host code reads _meta.ui.resourceUri from tools/list; legacy keys alone are not confirmed, so add it.", "A3"));
    }
    if (t.inputSchema?.type !== "object") f.push(FA("AR-A03", "error", `tool:${t.name}`, `inputSchema.type is ${JSON.stringify(t.inputSchema?.type)}; Archestra's proxy requires "object".`, "A3"));
  }
  for (const r of snap.resources) {
    if (r.uri.startsWith("ui://") && !linked.has(r.uri)) f.push(FA("AR-A01", "warning", `resource:${r.uri}`, "UI resource is not referenced by any tool's _meta.ui.resourceUri, so the host never renders it.", "A3"));
  }
  for (const u of snap.ui) {
    if (!u.ok) { f.push(FA("AR-A02", "error", `ui:${u.uri}`, `resources/read failed: ${u.error}`, "A3")); continue; }
    if (u.mimeType !== "text/html;profile=mcp-app") f.push(FA("AR-A02", "error", `ui:${u.uri}`, `MIME is ${u.mimeType}, expected text/html;profile=mcp-app.`, "A3"));
    if (!u.htmlBytes) f.push(FA("AR-A02", "error", `ui:${u.uri}`, "UI resource returned no HTML.", "A3"));
    const ui = u.meta?.ui ?? {};
    const csp = ui.csp ?? {};
    const all = [...(csp.connectDomains ?? []), ...(csp.resourceDomains ?? []), ...(csp.frameDomains ?? [])];
    const declared = new Set(all.map((d) => d.replace(/\/$/, "")));
    const undeclared = u.origins.filter((o) => !declared.has(o));
    if (undeclared.length) f.push(FA("AR-A04", "warning", `ui:${u.uri}`, `HTML loads from origin(s) not in _meta.ui.csp: ${undeclared.join(", ")}. Archestra applies the resource's CSP and reports violations as diagnostics.`, "A3"));
    if (all.some((d) => d === "*" || d.includes("*"))) f.push(FA("AR-A04", "warning", `ui:${u.uri}`, "CSP lists a wildcard origin; list the exact origins the view touches.", "A3"));
    const perms = ui.permissions && typeof ui.permissions === "object" ? Object.keys(ui.permissions) : [];
    if (perms.length) f.push(FA("AR-A05", "advisory", `ui:${u.uri}`, `_meta.ui.permissions requests ${perms.join(", ")}; keep only what the view uses.`, "A3"));
  }
  return f;
}

// CG-A01: an unauthenticated call to a protected tool with ChatGPT's user agent must answer HTTP 200 + isError + _meta["mcp/www_authenticate"].
export async function authChallengeCheck(snap, clientWithUa) {
  const protectedTools = snap.tools.filter((t) => {
    const s = t.securitySchemes ?? t._meta?.securitySchemes ?? [];
    return s.length > 0 && !s.some((x) => x.type === "noauth");
  });
  if (!protectedTools.length) return { findings: [], note: "no protected tools declared (securitySchemes without noauth): CG-A01 not applicable" };
  const findings = [];
  for (const t of protectedTools) {
    const r = await clientWithUa.request("tools/call", { name: t.name, arguments: {} });
    const challenge = r.result?._meta?.["mcp/www_authenticate"];
    if (r.status === 401) findings.push(F("CG-A01", "error", `tool:${t.name}`, "Unauthenticated call with a ChatGPT user agent returned HTTP 401; ChatGPT expects HTTP 200 with isError and _meta[\"mcp/www_authenticate\"].", "O5"));
    else if (!(r.result?.isError === true && challenge)) findings.push(F("CG-A01", "error", `tool:${t.name}`, `Unauthenticated call returned HTTP ${r.status} without isError + _meta["mcp/www_authenticate"].`, "O5", JSON.stringify(r.result ?? r.error ?? r.transportError).slice(0, 200)));
  }
  return { findings, tested: protectedTools.map((t) => t.name) };
}
