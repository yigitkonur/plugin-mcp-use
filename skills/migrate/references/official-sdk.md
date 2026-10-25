# Porting an official MCP TypeScript SDK server to mcp-use

One playbook for every server built on the official SDK: `@modelcontextprotocol/sdk` 1.x (`McpServer`, low-level `Server`), the v2 split (`@modelcontextprotocol/server`, `/node`), either with `@modelcontextprotocol/ext-apps` UI or OpenAI's Apps SDK example pattern (`ui://widget/…`, `window.openai`). Checked against `sdk@1.32.2`, `server@2.4.0`, `node@2.1.2`, `ext-apps@2.0.3` and `mcp-use@2.11.2` (S27; the earlier pass used sdk 1.32.1, server 2.3.1, node 2.1.1, mcp-use 2.11.0); the "before" snippets compile in CI against the SDK, the "after" snippets against mcp-use. mcp-use 2.11.0 is itself built on `@modelcontextprotocol/server` v2, so v2 concepts (`ServerContext`, `AuthInfo`, `inputRequired`) carry over almost unchanged.

## Decide before porting
1. **Transport.** mcp-use 2.11.0 serves Streamable HTTP only (S12). A stdio server becomes an HTTP server: its clients switch from a `command` entry to a URL. Ask; do not promise stdio.
2. **State.** Every request is independent (stateless). Session maps, "current user" globals and per-connection caches move to a database or cache, or stay as process-wide read-only data.
3. **Auth.** None, bearer verifier, or full OAuth server (the last is the one real redesign: `auth.md`).
4. **UI.** Widgets become views (below). Port tools first, widgets second.

## Construct map
| Official SDK | mcp-use 2.11.0 |
|---|---|
| `new McpServer({ name, version })` / `new Server(info, { capabilities })` | `new MCPServer({ name, version, title?, description?, instructions? })`; capabilities are inferred; `export default server` |
| `server.tool(name, desc, shape, cb)`, `registerTool(name, { title, description, inputSchema, outputSchema, annotations }, cb)` | `server.tool({ name, title, description, inputSchema: z.object(…), outputSchema, annotations }, cb)`; `export const x = …` |
| input as a raw shape `{ sku: z.string() }` (v1) | `z.object({ sku: z.string() })`; any Standard Schema works |
| low-level `ListTools`/`CallTool` handlers with hand-written JSON Schema | one `server.tool` per tool; the schema comes from `inputSchema` |
| `isError: true` result | the same; mcp-use also validates `structuredContent` against `outputSchema` (a mismatch returns "Output validation error") |
| annotations (often partial) | set all three: `readOnlyHint`, `destructiveHint`, `openWorldHint` (ChatGPT requires them) |
| `registerResource(name, uri, meta, cb)` | `server.resource({ name, uri, title?, description?, mimeType? }, (uri) => ({ contents }))` |
| `new ResourceTemplate(tpl, { list, complete })` | `server.resourceTemplate({ name, uriTemplate, complete: { var: […] } }, (uri, params) => …)` |
| `registerPrompt(name, { argsSchema: shape }, cb)` | `server.prompt({ name, schema: z.object(…) }, cb)`; prompts keep `schema`; `completable(...)` for suggestions |
| handler `extra`/`ctx`: `signal` | `ctx.signal` |
| `extra.authInfo` (v1), `ctx.http.authInfo` (v2) | `ctx.auth` (verified user, scopes, permissions) |
| `extra.sendNotification`, progress, logging (`ctx.mcpReq.log`) | `ctx.sendNotification`, `ctx.reportProgress`, `ctx.sendLog` |
| `server.server.elicitInput`, `ctx.mcpReq.elicitInput` | return `inputRequired({ inputRequests })`, read `acceptedContent` next round (`elicitation.md`) |
| `server.server.createMessage` / `requestSampling` | removed; no server-side sampling |
| `sendToolListChanged()` and friends | `server.notifyToolsChanged()`; listener-bound, not durable over stateless HTTP |
| `StdioServerTransport` + `connect` | none; `mcp-use dev` / `start` own the HTTP listener |
| `StreamableHTTPServerTransport` + Express glue, `createMcpHandler` + `toNodeHandler` | delete the glue; `export default server`. Own routes: `server.get/post`. Embedding in Express: `toNodeHandler(server)` from `mcp-use/node` |
| `requireBearerAuth({ verifier })`, `OAuthTokenVerifier` | `oauth: oauthCustomProvider({ oauthMetadata, createTokenVerifier: () => verifier, mapAuthInfo })` or a ready provider (`auth.md`) |
| `ui://widget/x.html` + `text/html+skybridge` + `_meta["openai/outputTemplate"]` | `view: { name: "x" }` + `views/x/view.tsx`; mcp-use writes `_meta.ui.resourceUri` and serves `text/html;profile=mcp-app` |
| Skills extension (`@modelcontextprotocol/server/ext/skills`: `SkillsExtension`, `loadSkills`, server 2.4.0) | a `skills/` directory next to the entry, or `skills: { directory }` on `new MCPServer` (`skills-over-mcp.md`); the official schema also wants `size`, `ttlMs` and `cacheScope`, which mcp-use 2.11.x does not emit, so a strict `SkillsClient` may reject the list |
| `registerAppTool` / `registerAppResource` (ext-apps) | the same `view: { name }` binding; `view.csp`, `view.permissions`, `view.prefersBorder`, `view.domain` |

## Tools, resources, prompts: before and after
Before, SDK v1 (three registration styles in one file):

<!-- fixture-sdk1: sdk1-inventory -->
```ts
import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const server = new McpServer({ name: "inventory", version: "1.0.0" });

server.registerTool(
  "lookup-sku",
  {
    description: "Return the quantity on hand for one SKU. Read-only.",
    inputSchema: { sku: z.string().describe("Stock keeping unit") },
    outputSchema: { sku: z.string(), qty: z.number() },
    annotations: { readOnlyHint: true },
  },
  async ({ sku }) => ({ content: [{ type: "text", text: `${sku}: 3` }], structuredContent: { sku, qty: 3 } }),
);

server.tool("adjust-stock", "Add or remove units. Changes stored quantities.", { sku: z.string(), delta: z.number().int() }, async ({ sku, delta }) => ({
  content: [{ type: "text", text: `${sku} ${delta >= 0 ? "+" : ""}${delta}` }],
}));

server.registerResource(
  "sku-page",
  new ResourceTemplate("inventory://sku/{sku}", { list: undefined, complete: { sku: () => ["SKU-1", "SKU-2"] } }),
  { title: "SKU page", mimeType: "text/plain" },
  async (uri, { sku }) => ({ contents: [{ uri: uri.href, text: `Page for ${String(sku)}` }] }),
);

server.registerPrompt("restock", { description: "Draft a restock report", argsSchema: { threshold: z.string().optional() } }, ({ threshold }) => ({
  messages: [{ role: "user", content: { type: "text", text: `Restock at or below ${threshold ?? "5"}` } }],
}));

await server.connect(new StdioServerTransport());
```

After, mcp-use (one file, no transport code):

<!-- fixture: migrate-inventory -->
```ts
import { MCPServer, completable } from "mcp-use";
import { z } from "zod";

const server = new MCPServer({ name: "inventory", version: "1.0.0" });

export const lookupSku = server.tool(
  {
    name: "lookup-sku",
    description: "Return the quantity on hand for one SKU. Read-only.",
    inputSchema: z.object({ sku: z.string().describe("Stock keeping unit") }),
    outputSchema: z.object({ sku: z.string(), qty: z.number() }),
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
  },
  async ({ sku }) => ({ content: [{ type: "text", text: `${sku}: 3` }], structuredContent: { sku, qty: 3 } }),
);

export const adjustStock = server.tool(
  {
    name: "adjust-stock",
    description: "Add or remove units. Changes stored quantities.",
    inputSchema: z.object({ sku: z.string(), delta: z.number().int().describe("Positive to add, negative to remove") }),
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  },
  async ({ sku, delta }) => ({ content: [{ type: "text", text: `${sku} ${delta >= 0 ? "+" : ""}${delta}` }] }),
);

server.resourceTemplate(
  { name: "sku-page", uriTemplate: "inventory://sku/{sku}", title: "SKU page", mimeType: "text/plain", complete: { sku: ["SKU-1", "SKU-2"] } },
  async (uri, { sku }) => ({ contents: [{ uri: uri.href, mimeType: "text/plain", text: `Page for ${String(sku)}` }] }),
);

server.prompt(
  { name: "restock", description: "Draft a restock report", schema: z.object({ threshold: completable(z.string().optional(), ["5", "10"]) }) },
  async ({ threshold }) => ({ messages: [{ role: "user", content: { type: "text", text: `Restock at or below ${threshold ?? "5"}` } }] }),
);

export default server;
```
What changed on purpose: raw shapes became `z.object`, partial annotations became all three booleans (decide each from the handler; `adjust-stock` writes, so `readOnlyHint: false`), the transport and `connect` are gone, and every tool is an exported constant.

## v2 split: handler and factory
The v2 `McpServer` has only `registerTool`, `registerResource`, `registerPrompt` (no `tool()`); schemas are Standard Schema objects; callbacks take `(args, ctx)`. It is served by `createMcpHandler(factory)` through `toNodeHandler` (HTTP) or `serveStdio(factory)` (stdio). The factory runs per request, so state cannot live in it.

<!-- fixture-sdk2: sdk2-handler -->
```ts
import { createServer } from "node:http";
import { McpServer, createMcpHandler } from "@modelcontextprotocol/server";
import { toNodeHandler } from "@modelcontextprotocol/node";
import { z } from "zod";

const handler = toNodeHandler(
  createMcpHandler(() => {
    const server = new McpServer({ name: "inventory", version: "1.0.0" });
    server.registerTool(
      "lookup-sku",
      { description: "Return the quantity on hand. Read-only.", inputSchema: z.object({ sku: z.string() }), annotations: { readOnlyHint: true } },
      async ({ sku }, ctx) => ({ content: [{ type: "text", text: `${sku} requested by ${ctx.http?.authInfo?.clientId ?? "anonymous"}` }] }),
    );
    return server;
  }),
);

createServer((req, res) => void handler(req, res)).listen(3000);
```
Port it exactly like v1: `registerTool(name, config, cb)` becomes `server.tool({ name, …config }, cb)`; `ctx.http.authInfo` becomes `ctx.auth`; the `createServer` block is deleted. Because the factory is per request, there is nothing to unpick for sessions.

## Auth
A bearer verifier is the same shape on both sides:

<!-- fixture-sdk1: sdk1-verifier -->
```ts
import type { OAuthTokenVerifier } from "@modelcontextprotocol/sdk/server/auth/provider.js";

export const verifier: OAuthTokenVerifier = {
  async verifyAccessToken(token) {
    if (token !== "demo-token") throw new Error("invalid token");
    return { token, clientId: "demo-client", scopes: ["read"], expiresAt: Math.floor(Date.now() / 1000) + 3600 };
  },
};
```
<!-- fixture: migrate-verifier -->
```ts
import { MCPServer } from "mcp-use";
import { oauthCustomProvider } from "mcp-use/oauth";

const server = new MCPServer({
  name: "inventory",
  version: "1.0.0",
  oauth: oauthCustomProvider<{ id: string }>({
    oauthMetadata: {
      issuer: "https://auth.example.com",
      authorization_endpoint: "https://auth.example.com/oauth/authorize",
      token_endpoint: "https://auth.example.com/oauth/token",
      response_types_supported: ["code"],
    },
    createTokenVerifier: () => ({
      async verifyAccessToken(token: string) {
        if (token !== "demo-token") throw new Error("invalid token");
        return { token, clientId: "demo-client", scopes: ["read"], expiresAt: Math.floor(Date.now() / 1000) + 3600 };
      },
    }),
    mapAuthInfo: (info) => ({ user: { id: info.clientId }, payload: info.extra ?? {}, permissions: info.scopes }),
  }),
});

export default server;
```
Keep the verification logic, move it into `createTokenVerifier`, and read the result from `ctx.auth`. If the old server hosted its own authorization server (`mcpAuthRouter`, `ProxyOAuthServerProvider`), choose a ready provider or `oauthProxy` instead (`auth.md`), and tell the user that is a design change.

## Widgets (OpenAI Apps SDK pattern and ext-apps)
Old pattern: a `ui://widget/<name>.html` resource (`text/html+skybridge`), `_meta["openai/outputTemplate"]` on the tool, a hand-written HTML/JS widget reading `window.openai.toolOutput`. Port in this order, after the tools pass parity:
1. Add `outputSchema` to the tool and `view: { name }` (and `view.description`, `prefersBorder`, `domain`, `csp` from the old `openai/widget*` keys). Delete the hand-written resource and `_meta` keys.
2. Create `views/<name>/view.tsx`. Replace `window.openai` calls with hooks: `toolOutput` → `useToolContext`, `callTool` → `useCallTool`, `widgetState`/`setWidgetState` → `useViewState`, `theme` → `useViewTheme`, `notifyIntrinsicHeight` → nothing (`autoResize`). Full table: `${CLAUDE_PLUGIN_ROOT}/skills/host-chatgpt/references/window-openai.md`.
3. `openai/widgetAccessible: true` only lets the widget call the tool; it does not hide the tool from the model. `openai/visibility: "private"` does, and becomes `visibility: "app"` on helper tools (a tool the model should still call keeps the default).

<!-- fixture: migrate-widget-view -->
```tsx
import { useCallTool, useToolContext, useViewState, useViewTheme } from "mcp-use/react";

export default function ProductCard() {
  const context = useToolContext<"show-product">();
  const theme = useViewTheme();
  const update = useCallTool("update-stock");
  const [last, setLast] = useViewState<{ updated?: string }>({});

  if (context.status === "pending") return <p>Loading…</p>;
  if (context.status === "error") return <p>{context.error.message}</p>;
  const { sku, title } = context.toolOutput;
  return (
    <div data-theme={theme}>
      <h2>{title}</h2>
      <button
        type="button"
        disabled={update.isPending}
        onClick={async () => {
          await update.callTool({ sku, quantity: 1 });
          setLast({ updated: sku });
        }}
      >
        {last.updated === sku ? "Updated" : "Add one"}
      </button>
    </div>
  );
}
```
The old widget usually styled one theme only: set text and background colors for both `light` and `dark` (or use the Apps SDK UI tokens) instead of relying on the host's backdrop, then check light and dark screenshots (`/mcp-use:apps`, `${CLAUDE_PLUGIN_ROOT}/skills/mcp-apps/references/display-and-state.md`).

## Traps
- **stdout in stdio servers.** The old server may log to stdout; that corrupts stdio but is harmless over HTTP. The probe reports it (`mcp-use-probe --stdio`).
- **Zod 3.** SDK v1 accepts zod 3.25 or 4; mcp-use needs **zod >= 4.2.0**: with zod 3 `mcp-use typecheck` fails and `tools/list` returns nothing (S20, rule STK-13). Upgrade zod first, then re-run the old server's own tests if it has any.
- **Positional `tool(name, description, shape, cb)`** puts the description first; do not lose it when building the definition object.
- **Default values and optionals** survive as JSON Schema `default`/`required`; compare them in the snapshot diff, not by eye.
- **Error semantics.** A thrown error becomes a protocol error in some SDK paths and `isError` in others; port expected failures as `isError: true` results.
- **Module-level singletons** (db clients, caches) are fine; per-session ones are not.
- **Two copies of the v2 packages.** mcp-use 2.11.2 depends on `@modelcontextprotocol/server`, `core` and `client` at exactly 2.3.1. A project that keeps `@modelcontextprotocol/server@^2.4.0` as a direct dependency (and `node@2.1.2`, which needs server ^2.4.0; bump the two together) installs both. Remove the direct dependency after parity passes.
- **A ported `outputSchema` with a root `$ref`** (zod `z.object().meta({ id })`): server 2.4.0 adds `type: "object"` to it, mcp-use 2.11.2 (on 2.3.1) does not, so the diff can show a benign `CHANGED outputSchema` line (`parity.md`).
- **SDK 1.32.2 behaves differently from 1.32.1** in ways a baseline can show: `registerTool` after `connect()` now works; a declared capability with nothing registered answers an empty list instead of `-32601`. Take the baseline on the version the project actually runs.
- **Server 2.4.0 rejects what 2.3.1 accepted:** `x-mcp-header` on a `number` parameter (tool not listed, `-32020` on call), and `$id`/`$ref` with an invalid scheme such as `my_tool:output`. grep before porting.
- **Leftover dependencies.** Remove `@modelcontextprotocol/sdk` / `server` / `node` / `ext-apps` only after parity passes; `mcp-use` brings its own copy of what it needs.

Sources: M1, M2, S12, S20, O5, S27.
