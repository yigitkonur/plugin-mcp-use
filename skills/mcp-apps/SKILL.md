---
name: mcp-apps
description: "MCP Apps for mcp-use servers: views/<name>/view.tsx, one tool per view, useToolContext/useCallTool/useModelContext, CSP, display modes, ui:// resources. Use when building, changing, or debugging a tool's UI (views/ files)."
user-invocable: false
---

# MCP Apps with mcp-use views

> In Codex: `bin/` is not on PATH and `${CLAUDE_PLUGIN_ROOT}` is unset. The plugin root is two folders above this file: run engines as `node <root>/bin/<name>` and read `${CLAUDE_PLUGIN_ROOT}` as `<root>`. `/mcp-use:<x>` means the skill `<x>`.

An MCP App is a tool plus a UI resource. mcp-use packages `views/<name>/view.tsx` as `ui://views/<name>.html` (MIME `text/html;profile=mcp-app`) and links the tool to it through `_meta.ui.resourceUri`. The host renders it in a sandboxed iframe. The same view can run in ChatGPT, Archestra (installed-server route) and other MCP Apps hosts, because the contract is the open standard, not one host's bridge.

Start from `${CLAUDE_PLUGIN_ROOT}/skills/mcp-use-server/SKILL.md` for server rules. Everything here was checked against the installed `mcp-use` types (2.11.0); the type of an API wins over this text.

## Rules
1. **One view, one tool.** `views/<name>/view.tsx` is bound by exactly one tool with `view: { name: "<name>" }`. Registering two tools on one view throws at startup. Extra actions are viewless tools called with `useCallTool`, or client-side tools from `useViewTool`.
2. **`outputSchema` is required** on a view-bound tool, and the callback returns matching `structuredContent`.
3. **Handle all three states.** `useToolContext<"tool-name">()` returns a union on `status`: `"pending"` (partial `toolInput`, no output), `"ready"` (`toolOutput`, `meta`), `"error"` (`error` is `ToolError` or `ToolCancelledError`). Narrow on `status` before reading `toolOutput`.
4. **Three channels.** `content` → model; `structuredContent` → model and view; result `_meta` → view only.
5. **Hooks:** import from `"mcp-use/react"`. Several older notes are wrong; use `references/hooks.md`: `useModelContext().attachments` is an array and its methods return Promises; `useViewTheme()` returns the string `"light" | "dark"`; `CallToolHandle` has `callTool`, `data`, `error`, `isPending` only; `ToolError` has `.message` and `.result`, no `.code`.
6. **CSP is explicit.** Declare every origin the view touches in `view.csp`; production adds the server's own origin from `MCP_URL`/`MCP_ASSETS_URL` (`references/csp.md`).
7. **Keep the tool useful without the UI.** The model and non-UI hosts only see `content` and `structuredContent`.
8. **Portable first.** Link the UI only through `_meta.ui.resourceUri`; never require `window.openai` or `window.archestra` (`references/portable-core.md`).

## Where to read
| Need | File |
|---|---|
| Binding, `ToolViewConfig`, states, a complete view | `references/views.md` |
| Every hook and component with exact signatures | `references/hooks.md` |
| `viewConfig`, display modes, view state, size | `references/display-and-state.md` |
| CSP buckets, env vars, merge order, `permissions`, `domain` | `references/csp.md` |
| The MCP Apps standard and what mcp-use emits | `references/protocol.md` |
| What works on every host; dual-host rules | `references/portable-core.md` |
| A view is blank or errors, CSP blocks, screenshot errors | `references/troubleshooting-views.md` |
| ChatGPT specifics | `${CLAUDE_PLUGIN_ROOT}/skills/host-chatgpt/SKILL.md` |

## Verify
Typecheck regenerates `mcp-env.d.ts`; `mcp-use screenshot` renders the view (`--delay`, not `--wait-for` inside the view). Static and live host checks: `mcp-use-scan --host chatgpt` and `mcp-use-probe --host chatgpt --url …`. Ask the user to run `/mcp-use:verify` or `/mcp-use:host chatgpt audit`.
