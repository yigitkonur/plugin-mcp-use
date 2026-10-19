# Versions, removed APIs, and drift

`data/versions.json` records the versions these references were checked against on 2026-10-20: `mcp-use` 2.11.0 (support floor 2.8.0), `@mcp-use/cli` 4.5.0, `create-mcp-use-app` 2.1.0, `@openai/apps-sdk-ui` 0.2.2, `@modelcontextprotocol/ext-apps` 2.0.3. mcp-use published 2.8.2, 2.9.0, 2.10.0, 2.10.1 and 2.11.0 between 2026-10-09 and 2026-10-19, so check the installed version first (`mcp-use-detect` reports it).

## Removed or changed from v1 (verified absent or deprecated in 2.11.0)
| Old | Now |
|---|---|
| `import … from "mcp-use/server"` | `from "mcp-use"` (no `./server` export key) |
| CommonJS, Node < 22.22.2 | ESM, Node `>=22.22.2` |
| `server.getHandler()` | `server.fetch`; `toNodeHandler(server)` from `mcp-use/node` for Node/Express (`getHandler` still exists, `@deprecated`) |
| `text()`, `object()`, `array()`, `error()`, `mix()` … | raw `CallToolResult` (still exported, `@deprecated`) |
| `widget({ props, output })`, `widget: { name }`, `resources/<n>/widget.tsx`, `ui://widget/<n>.html` | `view: { name }`, `views/<n>/view.tsx`, `ui://views/<n>.html` (`widget()` no longer exists) |
| `useWidget()`, `useWidgetProps()`, `<McpUseProvider>` | `useToolContext<"tool">()`; no aggregate provider (not exported) |
| `ctx.elicit()`, `ctx.sample()` | `inputRequired` round trip (`elicitation.md`); no server-side sampling |
| `ctx.req` | `ctx.request` (`ctx.req` is a deprecated alias) |
| `ctx.log(...)` | `ctx.sendLog(...)` |
| `ctx.client.supportsApps()` | `ctx.client.supportsViews()` |
| tool `schema` | `inputSchema` (`schema` is still accepted on tools; prompts use only `schema`) |
| `server.listen({ stdio: true })` | not available; Streamable HTTP only |

## Added after 2.8.2 (from the changelog; present in 2.11.0 types)
`server.mentions()` (2.9.0), `oauthProxy`/`upstreamToken`, `isBuilding()`, `mcp-use deploy --no-github` (2.10.0), view `description` → `openai/widgetDescription` (2.10.1).

## Drift procedure
1. `npm view mcp-use version` and compare with `known_good`.
2. If newer: install it in a scratch project, run `scripts/typecheck-fixtures.sh` with that version. A failing fixture means a reference is stale; fix the reference, then bump `known_good`.
3. Read the mcp-use changelog through the docs MCP (`query_docs_filesystem_mcp_use`) for breaking changes.
4. Rules that name an API carry `min_mcp_use`/`max_mcp_use` in `data/guard-rules.tsv` so they stop firing on versions where they are wrong.

Sources: M1, M2.
