---
name: host-chatgpt
description: "ChatGPT host rules for MCP Apps built with mcp-use: required tool annotations, UI guidelines, @openai/apps-sdk-ui, _meta.ui.domain and CSP, entrypoints, settings, deep links, auth challenge, review checklist. Use when targeting ChatGPT."
user-invocable: false
---

# ChatGPT as a host

> In Codex: `bin/` is not on PATH and `${CLAUDE_PLUGIN_ROOT}` is unset. The plugin root is two folders above this file: run engines as `node <root>/bin/<name>` and read `${CLAUDE_PLUGIN_ROOT}` as `<root>`. `/mcp-use:<x>` means the skill `<x>`.

ChatGPT implements the open MCP Apps standard and adds optional extensions in `window.openai` and `_meta["openai/*"]`. Build the portable core first (`${CLAUDE_PLUGIN_ROOT}/skills/mcp-apps/references/portable-core.md`), then add what ChatGPT specifically needs. Facts here come from OpenAI's docs (O1–O6), the Apps SDK UI package types, and mcp-use's types; each reference ends with its sources. For anything newer, query the `openai-docs` MCP server (`search_openai_docs`, `fetch_openai_doc`). Never call a docs server's feedback tool (`submit_feedback` on the mcp-use docs server).

## The rules that fail reviews and renders
1. **Three explicit annotations on every tool**: `readOnlyHint`, `destructiveHint`, `openWorldHint` as booleans (`references/metadata.md`).
2. **`outputSchema` for any tool that returns `structuredContent`**, and results must match it.
3. **Keep `_meta.ui.resourceUri` on the render tool only (OpenAI's recommended pattern, O1).** Data tools stay separate and useful without UI.
4. **Set `_meta.ui.domain`** (mcp-use: `view.domain`) for a plugin submission, and **declare exact CSP origins**. `frameDomains` normally only for your own registrable domain (third-party only when the embed is essential), with a written justification.
5. **The resource URI is a cache key.** mcp-use's `ui://views/<name>.html` does not change when the view does (S11); rename the view directory or reconnect the connector to ship a breaking UI change.
6. **UI guidelines**: inline card with at most two actions, no nested scrolling, no tabs or drill-ins, carousel of 3 to 8 items, system fonts and colors, no logo, WCAG AA contrast, alt text (`references/ui-guidelines.md`).
7. **`@openai/apps-sdk-ui` is optional.** If you use it: import `@openai/apps-sdk-ui/css` after Tailwind with an `@source` line, `AppsSDKUIProvider` needs `linkComponent`, `Button` needs `color`, and there is no `Card` (`references/apps-sdk-ui.md`).
8. **Never store credentials** (API keys, passwords, one-time codes) in settings, view state or inputs.
9. **Feature-detect `window.openai`.** Prefer the `mcp-use/react` hooks, which use the standard bridge.
10. **ChatGPT reads OAuth challenges from `_meta["mcp/www_authenticate"]` on an error result (O5).** mcp-use 2.11.0 returns that with HTTP 200 for ChatGPT user agents and 401 for others (S18; `${CLAUDE_PLUGIN_ROOT}/skills/mcp-use-server/references/auth.md`).

11. **The widget sandbox has no `window.alert`, `window.prompt`, `window.confirm` or `navigator.clipboard` (O11).** Build dialogs and copy controls into the view (rule CG-U20).
12. **Submission is a portal flow, not just rules.** One MCP server per plugin, domain verification at `/.well-known/openai-apps-challenge`, five positive and three negative review test cases, and a continuous review that holds changed tools until they pass (`references/submission.md`).

## Where to read
| Need | File |
|---|---|
| Layout, inline/fullscreen/carousel/PiP, color, type, accessibility | `references/ui-guidelines.md` |
| Apps SDK UI setup, theme sync, verified component props, inventory | `references/apps-sdk-ui.md` |
| Tool and resource `_meta`, annotations, status text, display modes, data/render split | `references/metadata.md` |
| Entrypoints, `server.settings`, mentions, deep links, platform support | `references/extensions.md` |
| `window.openai` reference and feature detection | `references/window-openai.md` |
| CSP, iframes, `redirect_domains` | `references/csp-and-iframes.md` |
| Review rules, the submission portal flow, domain verification, tool-change review | `references/submission.md` |

## Checking a project
`mcp-use-scan --host chatgpt` (static rules, also run by the edit guard) and `mcp-use-probe --host chatgpt --url http://localhost:3000/mcp` (live protocol checks) implement `data/hosts/chatgpt.checklist.json`. The user can run `/mcp-use:host chatgpt audit`. Live rendering in ChatGPT developer mode is a separate, manual step (`${CLAUDE_PLUGIN_ROOT}/skills/verify/references/ladder.md`, rung 5).
