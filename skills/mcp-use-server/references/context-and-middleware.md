# Request context, middleware, observers

Checked against `dist/context.d.ts` and `dist/middleware/mcp-middleware.d.ts` (2.11.0).

## `ctx` in tool, resource, and prompt callbacks
| Member | Meaning |
|---|---|
| `ctx.request?` | Hono request for the HTTP exchange (`ctx.request.raw` is the Web `Request`). `ctx.req` is a deprecated alias. |
| `ctx.signal` | `AbortSignal`, aborted when the client cancels or disconnects. |
| `ctx.client.supportsViews()` | `true` when this request's client advertises MCP Apps (`io.modelcontextprotocol/ui` with `text/html;profile=mcp-app`). `supportsApps()` is the removed v1 name. |
| `ctx.client.can(name)`, `.capabilities()`, `.extension(id)`, `.info()` | Per-request client capability and implementation data. |
| `ctx.client.user()` | Client-reported hints (locale, location, `conversationId`, …). Unverified: never use for authorization. |
| `ctx.auth` | Verified OAuth identity (`user`, `scopes`, `permissions`, `payload`, `accessToken`, `clientId`, `expiresAt`, `resource`, `upstream`). Present when OAuth is configured; optional on tools that accept `noauth`. |
| `ctx.inputResponses`, `ctx.requestState` | Elicitation retry data (`elicitation.md`). `requestState` is not general storage. |
| `ctx.sendNotification(method, params?)`, `ctx.reportProgress(progress, total?, message?)`, `ctx.sendLog(level, data, logger?)` | Request-scoped notifications. `await` them before returning. `reportProgress` resolves `false` when the caller sent no progress token. `ctx.log` does not exist. |

<!-- fixture: ctx-usage -->
```ts
import { MCPServer } from "mcp-use";
import { z } from "zod";

const server = new MCPServer({ name: "jobs", version: "1.0.0" });

export const runImport = server.tool(
  {
    name: "run-import",
    description: "Import rows from a source. Writes to the database.",
    inputSchema: z.object({ rows: z.number().int().min(1).describe("How many rows to import") }),
    outputSchema: z.object({ imported: z.number().int() }),
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  },
  async ({ rows }, ctx) => {
    for (let i = 1; i <= rows; i++) {
      if (ctx.signal.aborted) return { isError: true, content: [{ type: "text", text: "Cancelled" }] };
      await ctx.reportProgress(i, rows, `Imported ${i} of ${rows}`);
    }
    await ctx.sendLog("info", { rows }, "importer");
    const withUi = ctx.client.supportsViews();
    return {
      content: [{ type: "text", text: withUi ? `Imported ${rows} rows (see the card).` : `Imported ${rows} rows.` }],
      structuredContent: { imported: rows },
    };
  },
);

export default server;
```

## Middleware (`server.use`)
Patterns are `mcp:*` or one of `mcp:tools/call`, `mcp:tools/list`, `mcp:resources/read`, `mcp:resources/list`, `mcp:prompts/get`, `mcp:prompts/list`.
- `mcp:*` is pass-through: inspect, `await next()`, or throw. It cannot replace the result.
- An exact method pattern may inspect `ctx.params`, call `next()`, and return a transformed result.
- `ctx.method`, `ctx.params`, `ctx.state` (a `Map` for per-request data), `ctx.auth` (SDK `AuthInfo`) are available. Authorization that depends on mcp-use's typed `ctx.auth.permissions` belongs in the tool callback.

<!-- fixture: middleware -->
```ts
import { MCPServer } from "mcp-use";

const server = new MCPServer({ name: "audited", version: "1.0.0" });

server.use("mcp:*", async (ctx, next) => {
  const started = Date.now();
  await next();
  console.log(`[mcp] ${ctx.method} ${Date.now() - started}ms`);
});

server.use("mcp:tools/call", async (ctx, next) => {
  if (ctx.params.name.startsWith("admin-") && !ctx.auth?.scopes.includes("admin")) {
    throw new Error("Forbidden: admin scope required");
  }
  return next();
});

export default server;
```

## Observers (`server.on`)
`server.on("mcp:tools/call:complete", handler)` observes after the response is prepared. Observers cannot change results; their errors are logged and ignored. Patterns also accept `tools/*`, `resources/*`, `prompts/*`.

Sources: M1, M2.
