# Server configuration and lifecycle

Checked against `dist/config.d.ts` and `dist/server.d.ts` (2.11.0).

<!-- fixture: server-config -->
```ts
import { MCPServer } from "mcp-use";

const server = new MCPServer({
  name: "catalog-server",
  version: "1.0.0",
  title: "Product catalog",
  description: "Look up products and stock.",
  instructions: "Call lookup-inventory before creating an order.",
  websiteUrl: "https://example.com",
  icons: [{ src: "icons/logo.svg", mimeType: "image/svg+xml", sizes: ["512x512"] }],
  favicon: "icons/logo.svg",
  basePath: "/mcp", // default endpoint path
  legacy: "stateless", // or "reject" for pre-2026 protocol traffic
  logging: { enabled: true, level: "info" }, // MCP_USE_LOG_LEVEL overrides
  allowedHosts: ["catalog.internal"], // extra Host headers (DNS-rebinding protection)
  allowedOrigins: ["https://chatgpt.com"], // extra Origins on non-GET/HEAD requests
  skills: true, // serve ./skills; see skills-over-mcp.md
  cors: { origin: ["https://chatgpt.com", "https://claude.ai"], credentials: true },
});

export default server;
```

## Options that matter
- `name`, `version` are required. `title`, `description`, `instructions` are model-facing; keep `instructions` short and concrete.
- `websiteUrl`, `icons`, `favicon`, `logging` are top-level options. There is no `branding` option; `server.branding` is a read-only getter.
- `host`, `port` are accepted, but `mcp-use dev|start` own the listener and read `--port`, `--host`, `$PORT`, `$HOST`.
- `basePath` sets the MCP endpoint (default `/mcp`).
- `cors.origin: "*"` with `credentials: true` is invalid; list origins.
- `publicLandingPage`, `oauth`, `mixedAuth` are covered in `auth.md`. `requestState` configures verification of state echoed across `input_required` rounds (`elicitation.md`).

## Lifecycle and runtimes
- Default-export the server. `mcp-use dev`, `build` and `start` import it and own the HTTP listener and the view build.
- `server.fetch` is a Web-standard `(request) => Promise<Response>` handler. Pass the reference (`export default { fetch: server.fetch }`); never call it with no arguments.
- Node `http` or Express: `toNodeHandler(server)` from `"mcp-use/node"` (`advanced.md`). Next.js App Router: `createNextHandler` and `withMcpUse` from `"mcp-use/next"` (`advanced.md`).
- `server.listen(port?)` exists for a standalone Node program; the CLI path is preferred.
- `server.getHandler()` is deprecated; use `server.fetch`.
- Custom HTTP routes: `server.get/post/put/patch/delete/all` and `server.app` are the underlying Hono app.

## Transport and state
- mcp-use 2.11.0 serves **Streamable HTTP only**. There is no `StdioServerTransport` in the 2.11.0 package (spike S12). A client that launches the server with a `command` must switch to the server URL.
- Every request is handled independently (stateless). Module-level `Map`s used as session or user registries break under concurrency and across instances. Keep state in a database or cache, and read the caller from `ctx.auth`.
- `legacy: "stateless"` (default) accepts older protocol traffic without sessions; `"reject"` refuses it.

## Wrong: nested branding (rejected by the compiler)
<!-- fixture-bad: server-config-branding -->
```ts
import { MCPServer } from "mcp-use";

const server = new MCPServer({
  name: "bad",
  version: "1.0.0",
  branding: { websiteUrl: "https://example.com" },
});

export default server;
```

Sources: M1, M2, S12.
