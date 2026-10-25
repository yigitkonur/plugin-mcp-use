# Versions, removed APIs, and drift

**Use the latest versions.** A new project installs `mcp-use`, `@mcp-use/cli` and `@mcp-use/client` at npm `latest` and upgrades them when they move (`/mcp-use:upgrade`); pin only when the user deploys to an environment that needs it. `data/versions.json` `known_good` is what these references were **last verified** against, not a pin: `mcp-use` 2.11.2 (support floor 2.8.0), `@mcp-use/cli` 4.5.2, `@mcp-use/inspector` 20.3.24, `@mcp-use/client` 2.4.5, `create-mcp-use-app` 2.1.0, `@openai/apps-sdk-ui` 0.2.2, `@modelcontextprotocol/ext-apps` 2.0.3 (as of 2026-10-25). Pages that say "2.11.0" were written against it; the 2.11.0 and 2.11.2 `.d.ts` files are byte-identical (all 120), so they hold for 2.11.2 (S27). mcp-use published 2.8.2 to 2.11.2 between 2026-10-09 and 2026-10-24; check the installed version first (`mcp-use-detect` reports it).

## Removed or changed from v1 (verified absent or deprecated in 2.11.0)
| Old | Now |
|---|---|
| `import … from "mcp-use/server"` | `from "mcp-use"` (no `./server` export key) |
| CommonJS, Node < 22.22.2 | ESM, Node `>=22.22.2` |
| `server.getHandler()` | `server.fetch`; `toNodeHandler(server)` from `mcp-use/node` for Node/Express (`getHandler` still exists, `@deprecated`) |
| `text()`, `object()`, `array()`, `error()`, `mix()`, `widget()` … | raw `CallToolResult` (all still exported, `@deprecated` in `response-helpers.d.ts`) |
| `widget({ props, output })` (deprecated helper), tool `widget: { name }`, `resources/<n>/widget.tsx`, `ui://widget/<n>.html` | `view: { name }` on the tool, `views/<n>/view.tsx`, `ui://views/<n>.html`; return `structuredContent` directly |
| `useWidget()`, `useWidgetProps()`, `<McpUseProvider>` | `useToolContext<"tool">()`; no aggregate provider (not exported) |
| `ctx.elicit()`, `ctx.sample()` | `inputRequired` round trip (`elicitation.md`); no server-side sampling |
| `ctx.req` | `ctx.request` (`ctx.req` still exists as a deprecated alias) |
| `ctx.log(...)` | `ctx.sendLog(...)` |
| `ctx.client.supportsApps()` | `ctx.client.supportsViews()` |
| tool `schema` | `inputSchema` (`schema` is still accepted on tools; prompts use only `schema`) |
| `server.listen({ stdio: true })` | not available; Streamable HTTP only |

## Added after 2.8.2 (from the changelog; present in 2.11.0 types)
`server.mentions()` (2.9.0), `oauthProxy`/`upstreamToken`, `isBuilding()`, `mcp-use deploy --no-github` (2.10.0), view `description` → `openai/widgetDescription` (2.10.1).

## Upcoming (2.12.0-canary, not released; S27)
Version-gated notes live in `${CLAUDE_PLUGIN_ROOT}/skills/mcp-apps/references/csp.md` and `${CLAUDE_PLUGIN_ROOT}/skills/mcp-use-server/references/deploy.md`: `view.domain` is normalized to its origin; the Claude `*.claudemcpcontent.com` host is the sha256 of the public MCP endpoint (a path in `MCP_URL` is kept for that hash); a sampled `landing.viewed` telemetry event (opt out with `MCP_USE_ANONYMIZED_TELEMETRY=false`). Recheck when `npm view mcp-use dist-tags` shows them under `latest`.

## Drift procedure
The full method is `AGENTS.md`, "Keeping up with upstream"; the weekly job (`scripts/weekly-update.sh`) runs it.
1. `node scripts/drift.mjs`: npm latest against `known_good`, vendor pages against `data/doc-hashes.json`.
2. Compare the two tarballs (`npm pack mcp-use@<old> mcp-use@<new>`): `.d.ts` bytes, `package.json` exports, dependencies and engines. Release notes are often empty stubs; the tarball is the evidence.
3. Run `sh scripts/typecheck-fixtures.sh --latest` and `sh scripts/migration-workspace.sh --check --latest`. A failing fixture means a reference is stale; fix it, then set `known_good` to what you verified.
4. Rules that name an API carry `min_mcp_use`/`max_mcp_use` in `data/guard-rules.tsv` (unused until a rule needs a bound).

Sources: M1, M2, S27.
