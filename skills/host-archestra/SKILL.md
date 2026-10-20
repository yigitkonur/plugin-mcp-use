---
name: host-archestra
description: "Archestra host rules: MCP Apps from an installed mcp-use server (Route A: _meta.ui.resourceUri, sandbox, CSP, visibility) and Owned Apps on window.archestra (Route B: no network, CDN allowlist, storage, files, validate_app). Use when targeting Archestra."
user-invocable: false
---

# Archestra as a host

Archestra has **two app routes that share almost nothing at runtime**. Decide which one the task is before applying any rule (`references/routes.md`).

| | Route A: installed MCP server | Route B: Owned App |
|---|---|---|
| What it is | an mcp-use server with views, added to Archestra's MCP registry | one HTML file stored in Archestra, written against `window.archestra` |
| Runtime | standard MCP Apps bridge in a sandbox iframe | injected `window.archestra`; the standard bridge is forbidden |
| Checked with | `mcp-use-probe --host archestra`, `mcp-use-scan --host archestra` | `archestra-app-lint` (user runs `/mcp-use:archestra-app`) |
| Reference | `references/route-a-installed.md` | `references/route-b-sdk.md`, `route-b-policy.md`, `route-b-authoring.md` |

Facts come from Archestra's two public docs pages (A1, A2) and from its source read as behavioral evidence only (A3, AGPL, nothing copied). Anything those do not support is listed in `references/unverified.md`; do not state it as fact. For newer details, query the `archestra` docs MCP server (read-only tools; never call `submit_feedback`).

## Route A: the rules that fail renders
1. **`_meta.ui.resourceUri` on the tool** (mcp-use writes it from `view`). Archestra's source reads that nested key; a legacy `ui/resourceUri` or `openai/outputTemplate` alone is not confirmed to work.
2. **`resources/read` returns `text/html;profile=mcp-app`** and every tool's `inputSchema.type` is `"object"`.
3. **Declare exact CSP origins** in the view config; the host applies the resource's CSP and reports violations as diagnostics.
4. **A tool the view calls must not be `visibility: "model"`**; use `"app"` for helpers.
5. **No hard dependency on `window.openai`**; guard model-context calls (support is unconfirmed).
6. **Archestra cannot be inferred from code.** Declare it: `.mcp-use-plugin/settings.md` with `hosts: [archestra]`.

## Route B: the rules that fail a save or a render
1. **Never set up the host connection yourself**: no SDK script, no `postMessage` wiring, no platform stylesheet link. The save is rejected.
2. **`await archestra.ready`, then use only `ready, user, context, storage, files, llm, tools, ui`.** Storage is `storage.user` or `storage.shared`; values are plain JSON objects, never `JSON.stringify`.
3. **No network.** Data comes only from assigned tools (`archestra.tools.call`, name as `tools.list()` returns it). Libraries load only from the five CDNs, version-pinned; other-host images do not load.
4. **No iframes, native form submits or `target="_blank"`**; use `preventDefault()` and `archestra.ui.openLink(url)`.
5. **HTML up to 512 KB**; `localStorage`, `sessionStorage` and IndexedDB are not available.
6. **`validate_app` and `get_app_diagnostics` are the authority.** `archestra-app-lint` is a pre-flight that mirrors the documented rules (`references/lint-rules.md`).

## Where to read
| Need | File |
|---|---|
| Which route, credential and trust differences, external MCP clients | `references/routes.md` |
| Making an mcp-use server render in Archestra | `references/route-a-installed.md` |
| The `window.archestra` surface, limits, error codes | `references/route-b-sdk.md` |
| Sandbox policy, CDNs, device permissions, shared-app trust, injected styling | `references/route-b-policy.md` |
| The agent authoring loop and how the lint fits in | `references/route-b-authoring.md` |
| Every lint rule: what it flags and how it is fixed | `references/lint-rules.md` |
| Reading `validate_app` and `get_app_diagnostics` results | `references/verify-in-archestra.md` |
| Unconfirmed claims and open questions | `references/unverified.md` |

## Never install Archestra
Live checks need the user's own Archestra. Ask for its URL; do not install, start or configure an Archestra instance (`${CLAUDE_PLUGIN_ROOT}/skills/verify/references/archestra-connect.md`).
