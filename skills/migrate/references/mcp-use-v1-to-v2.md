# mcp-use v1 to v2

For servers that already import `mcp-use` but use the v1 API (`from "mcp-use/server"`, `widget()` helpers, `resources/<n>/widget.tsx`). The replacement table, checked against the 2.11.0 types, is in `${CLAUDE_PLUGIN_ROOT}/skills/mcp-use-server/references/versions.md` ("Removed or changed from v1"); use it as the mapping and do not restate it. Scenario `LEGACY_V1` in `mcp-use-detect` and rules `STK-01` and `STK-04` find these patterns.

## Order
1. Node `>=22.22.2`, ESM (`"type": "module"`), `mcp-use` at the current release, zod >= 4.2.0.
2. Fix imports (`from "mcp-use"`), then tools: `inputSchema`, exported constants, raw result envelopes, `ctx.sendLog`, `ctx.request`.
3. Remove session and transport assumptions (below).
4. Rebuild each widget as a view (below).
5. `/mcp-use:verify` (typecheck, build, dev server, tool calls, screenshots), then `mcp-use-scan --json` and `mcp-use-probe --url http://localhost:<port>/mcp --json`.

## Rebuild interactive UI, per rendering tool
1. Move the entry component to `views/<name>/view.tsx`; export the tool (`export const myTool = server.tool(…)`).
2. Add `outputSchema` and `view: { name: "<name>" }`.
3. Return model-readable text in `content`, typed data in `structuredContent`, view-only data in `_meta`.
4. Read data with `useToolContext<"tool-name">()` and narrow on `status` (`pending`, `ready`, `error`).
5. For ChatGPT styling use `@openai/apps-sdk-ui` (`${CLAUDE_PLUGIN_ROOT}/skills/host-chatgpt/references/apps-sdk-ui.md`); move CSP to `view.csp`.

## Remove transport and session assumptions
Callbacks are request-scoped, stateless and concurrent. Replace session registries, session affinity, in-memory user maps and post-response client targeting with external storage. `ctx.requestState` echoes opaque state across `input_required` rounds and is not general storage (`elicitation.md`). Read the caller from `ctx.auth`, never from client hints such as `ctx.client.user()`. The MCP path is `basePath` (default `/mcp`).

Sources: M1, M2.
