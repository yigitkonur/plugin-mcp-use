# Route A: making an mcp-use server render in Archestra

An mcp-use server with a `view` already speaks the contract Archestra reads. What is left is metadata hygiene, CSP, and a few host-specific cautions. The engines implement this as checklist items `AR-A01` to `AR-A12` (`data/hosts/archestra.checklist.json`).

## What the host reads (A3, behavioral evidence)
1. `tools/list` on the server-scoped MCP endpoint; each UI tool must expose `_meta.ui.resourceUri`.
2. `resources/read` on that `ui://` URI: HTML with MIME `text/html;profile=mcp-app`.
3. Every tool's `inputSchema.type` must be `"object"` (the host's proxy relies on it).
4. The resource content item's `_meta.ui.csp` and `_meta.ui.permissions` are applied to the sandbox iframe; violations surface as diagnostics.
5. Tool calls from the view go back through the host, which enforces the allowlist and each tool's `visibility`.

## Checklist, in the order failures show up
| ID | Check | Engine |
|---|---|---|
| AR-A01 | the UI tool carries `_meta.ui.resourceUri`; every `ui://` resource is linked by a tool | probe |
| AR-A02 | resource MIME is `text/html;profile=mcp-app` and the HTML is non-empty | probe |
| AR-A03 | `inputSchema.type === "object"` on every tool | probe |
| AR-A04 | `_meta.ui.csp` lists exactly the origins the HTML loads from, no wildcards | probe, manual |
| AR-A05 | `_meta.ui.permissions` only for what the view uses | probe, manual |
| AR-A06 | no tool the view calls is `visibility: "model"` | scan |
| AR-A09 | size comes from the host size notification (`autoResize`, on by default in mcp-use) | manual |
| AR-A10 | theme from `useViewTheme()`, not `prefers-color-scheme` | manual |
| AR-A11 | `window.openai` is feature-detected | scan |
| AR-A07, A08, A12 | viewer access, credential model, model context | **unverified**, see `unverified.md` |

## In mcp-use terms
- The tool/view binding writes `_meta.ui.resourceUri` for you (`ui://views/<name>.html`); a hand-written `_meta` should use the nested `ui.resourceUri` form, not a flat key.
- Declare origins with `view.csp` (`${CLAUDE_PLUGIN_ROOT}/skills/mcp-apps/references/csp.md`); the probe compares them with the `src`/`href` origins in the HTML text it reads, so it cannot see origins added by scripts at runtime. Read Archestra's diagnostics for those.
- A helper the view calls (refresh, save) is a tool with `visibility: "app"`. A tool the model should call but the view never does can be `"model"`; the scan only complains when a view calls a model-only tool by a literal name (`useCallTool("name")`, `callTool("name")`).
- Keep tools useful without UI. Route A servers are also used by chat agents.
- Do not make correctness depend on `@openai/apps-sdk-ui`; it works but is ChatGPT-styled.

## Declaring the host
Nothing in an mcp-use project identifies Archestra, so declare it in `.mcp-use-plugin/settings.md`:
```
---
hosts: [archestra]
---
```
After that, `mcp-use-scan` runs the `AR-*` rules and `/mcp-use:host archestra audit` becomes available.

## Live check
Ask the user for their Archestra URL, add the server to the registry from its dashboard (a tunnel URL for a local dev server), open the app, then read the app card and diagnostics (`verify-in-archestra.md`).

Sources: A1, A3, M2.
