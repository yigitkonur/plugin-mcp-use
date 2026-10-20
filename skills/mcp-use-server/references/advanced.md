# Advanced features

Checked against `dist/openapi/`, `dist/next/`, `dist/node-bridge.d.ts`, `dist/mcp-proxy.d.ts`, `dist/server.d.ts` (2.11.0).

## OpenAPI to tools (`MCPServer.fromOpenAPI`)
Synchronous static factory; returns the server (do not `await`). The spec must be a parsed OpenAPI 3.x document with no remote `$ref`s; `baseUrl` (or `servers[0].url`) is required when the document has operations. Tool names and schemas should come mechanically from the spec: the spec is the contract.

<!-- fixture: from-openapi -->
```ts
import { MCPServer, type OpenAPIDocument } from "mcp-use";

const spec = {
  openapi: "3.0.3",
  info: { title: "Pets", version: "1.0.0" },
  paths: {
    "/pets": {
      get: {
        operationId: "listPets",
        summary: "List pets",
        responses: { "200": { description: "ok" } },
      },
    },
  },
} satisfies OpenAPIDocument;

const server = MCPServer.fromOpenAPI({
  name: "pets-mcp",
  version: "1.0.0",
  spec,
  baseUrl: "https://api.example.com",
});

export default server;
```

## Node `http` / Express (`mcp-use/node`)
<!-- fixture: node-bridge -->
```ts
import { createServer } from "node:http";
import { toNodeHandler } from "mcp-use/node";
import server from "./server.js";

createServer(toNodeHandler(server)).listen(3000);
```

## Next.js App Router (`mcp-use/next`)
Not compiled in CI (needs the `next` package). Use an optional catch-all route so view asset requests under `/api/mcp/_mcp-use/views/...` resolve; a single-segment `[path]` returns 404 for view bundles.
```ts
// app/api/mcp/[[...path]]/route.ts
import server from "@/mcp-server";
import { createNextHandler } from "mcp-use/next";

export const { GET, POST, DELETE, OPTIONS } = createNextHandler(server);
```
```ts
// next.config.ts
import type { NextConfig } from "next";
import { withMcpUse } from "mcp-use/next";

export default withMcpUse({} satisfies NextConfig, { entry: "./mcp-server.ts", basePath: "/api/mcp" });
```

## Proxy upstream MCP servers (`server.proxy`)
Needs the optional package `@mcp-use/client`. Call it before the first request. Upstream tools are namespaced `<key>_<tool>`, resources `<key>://…`. Resource templates, completions, subscriptions and upstream list-change re-sync are not proxied.

<!-- fixture: proxy -->
```ts
import { MCPServer } from "mcp-use";

const server = new MCPServer({ name: "gateway", version: "1.0.0" });

await server.proxy({
  weather: { url: "https://weather.example.com/mcp", authToken: process.env.WEATHER_MCP_TOKEN! },
});

export default server;
```

## Notifications and subscriptions
- Request-scoped: `ctx.reportProgress`, `ctx.sendLog`, `ctx.sendNotification` (`context-and-middleware.md`). They are delivered on the request's response stream before the final result; `await` them.
- Cross-request: `server.notifyToolsChanged()`, `notifyPromptsChanged()`, `notifyResourcesChanged()`, `notifyResourceUpdated(uri)`. They reach only clients currently listening and are not replayed after a reconnect, because the server keeps no session queue.

Sources: M1, M2.
