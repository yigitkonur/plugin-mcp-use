---
name: mcp-use-server
description: "mcp-use v2 TypeScript MCP server rules: MCPServer, server.tool with explicit annotations, outputSchema/structuredContent, raw result envelopes, auth, elicitation, resources/prompts, CLI. Use when creating, changing, or debugging an mcp-use server."
user-invocable: false
---

# mcp-use v2 server (TypeScript)

## Source of truth, in this order
1. The installed package: `node_modules/mcp-use/dist/**/*.d.ts`, the generated `mcp-env.d.ts`, and `package.json` `exports`. Read the declaration before using an API you are not certain of.
2. The docs MCP servers this plugin ships. `mcp-use-docs` has `search_mcp_use` and `query_docs_filesystem_mcp_use`; `openai-docs` and `archestra-docs` cover the hosts. Never call `submit_feedback`.
3. The references below. If one disagrees with the installed types, the types win: say so, and fix the code to match the types.

mcp-use moved from 2.8.2 to 2.11.0 in ten days. Do not trust memory for signatures. `data/versions.json` records the version these references were checked against (`known_good`).

## Invariants
1. Import everything from `"mcp-use"`. The `mcp-use/server` subpath is gone (v1); other subpaths are `mcp-use/react`, `mcp-use/node`, `mcp-use/next`, `mcp-use/oauth/*`.
2. `export const x = server.tool(...)` for every tool, and `export default server`. The CLI owns the listener and the view pipeline, and `mcp-env.d.ts` types come from exported tool refs.
3. `server.tool(definition, callback)`. Tool arguments use `inputSchema`; prompt arguments use `schema`. Describe every model-filled field.
4. Set **all three** annotations on every tool: `readOnlyHint`, `destructiveHint`, `openWorldHint`. ChatGPT review requires explicit booleans, and the official `mcp-server` template sets only two.
5. Return raw `CallToolResult` envelopes. `content` is a short summary for the model, `structuredContent` matches `outputSchema`, `_meta` is for the view only. Expected failures return `isError: true`; unexpected ones throw.
6. A view belongs to exactly one tool: `views/<name>/view.tsx` ↔ `view: { name: "<name>" }`, and that tool needs `outputSchema`.
7. Requests are stateless and concurrent. No module-level maps for per-user state; use an external store.
8. Node `>=22.22.2`, ESM (`"type": "module"`). mcp-use 2.11.0 serves Streamable HTTP only; there is no server-side stdio.
9. Prove it by running it: `/mcp-use:verify`.

## Guardrails (each one has bitten real code)
- `useModelContext()` returns `attachments` as a **readonly array** of `{ key, block }`, and `add`/`remove`/`clearAttachments` return **Promises**. The Record/synchronous version in older notes is wrong (`mcp-apps/references/hooks.md`).
- `server.settings(...)` fields are `{ schema, title, description? }` and `read`/`update` both return the values. There is no `type`, `label`, `default` or `secret`, and credentials must not be stored there (`host-chatgpt/references/extensions.md`).
- `useViewTheme()` returns the string `"light" | "dark"`, not `{ theme }`.
- `<AppsSDKUIProvider>` requires `linkComponent`. `Card` does not exist in `@openai/apps-sdk-ui`.
- There is no `ctx.elicit()`, `ctx.sample()`, `ctx.log()` or `supportsApps()` in v2, and `ctx.req`, `widget()`, `text()`, `object()` and the other response helpers are deprecated. See `references/elicitation.md` and `references/versions.md`.
- `server.fetch` is a function reference. Never call it with no arguments.
- `websiteUrl`, `icons`, `favicon`, `logging` are top-level `MCPServer` options. Do not nest them in `branding`.
- `cors: { origin: "*", credentials: true }` is invalid; list origins.
- Boolean CLI flags take no value (`--tunnel`, not `--tunnel=false`).
- `mcp-use screenshot` and `mcp-use client` need `@mcp-use/client` installed; `--wait-for` cannot see inside the view's iframe (`references/cli.md`).

## Where to read
| Need | File |
|---|---|
| Tools, annotations, result envelope, errors, visibility | `references/tools-and-results.md` |
| `MCPServer` options, lifecycle, runtimes, transport | `references/config-and-lifecycle.md` |
| `ctx` members, middleware, observers | `references/context-and-middleware.md` |
| Resources, templates, prompts, completion | `references/resources-and-prompts.md` |
| OAuth providers, `mixedAuth`, ChatGPT challenge, `ctx.auth` | `references/auth.md` |
| Asking the user mid-tool (`inputRequired`) | `references/elicitation.md` |
| OpenAPI, Next.js, Node bridge, proxy, notifications | `references/advanced.md` |
| Serving skills from the server | `references/skills-over-mcp.md` |
| `mcp-use` CLI: dev, build, client, screenshot, deploy | `references/cli.md` |
| Versions, removed v1 APIs, drift | `references/versions.md` |
| Views, hooks, CSP, display modes | `${CLAUDE_PLUGIN_ROOT}/skills/mcp-apps/SKILL.md` |
| ChatGPT rules | `${CLAUDE_PLUGIN_ROOT}/skills/host-chatgpt/SKILL.md` |

## Workflows (the user types these; you cannot start them)
`/mcp-use:start` (what applies here) · `/mcp-use:new` (scaffold a server) · `/mcp-use:apps` (add views to a server) · `/mcp-use:host <chatgpt> <add|audit|fix>` (check or improve a host integration) · `/mcp-use:verify` (typecheck, run, call tools, screenshot). Engines the model can run directly: `mcp-use-detect`, `mcp-use-scan` (static rules), `mcp-use-probe` (live protocol checks).
When one fits, tell the user which command to type and why.
