# The MCP Apps standard and what mcp-use emits

MCP Apps (SEP-1865, extension id `io.modelcontextprotocol/ui`) lets a tool declare a UI resource that a host renders in a sandboxed iframe.

## Wire elements
| Element | Value |
|---|---|
| UI resource | URI `ui://…`, read with `resources/read`, MIME `text/html;profile=mcp-app` |
| Tool → UI link | `tools/list` entry `_meta.ui.resourceUri` (mcp-use also writes the legacy-style key `ui/resourceUri`) |
| Client capability | `extensions["io.modelcontextprotocol/ui"].mimeTypes` includes `text/html;profile=mcp-app` (`ctx.client.supportsViews()` reads it) |
| Visibility | `tools/list` `_meta.ui.visibility`: `["app"]` hides a tool from the model; omitted means model and app (`tools-and-results.md`) |
| Resource metadata | `_meta.ui.csp`, `_meta.ui.permissions`, `_meta.ui.domain`, `_meta.ui.prefersBorder` on the resource content |
| Bridge | JSON-RPC 2.0 over `window.parent.postMessage`: `ui/initialize`, then `ui/notifications/tool-input` and `ui/notifications/tool-result` to the view; from the view `tools/call`, `ui/message`, `ui/update-model-context`, `ui/request-display-mode` |
| Result channels | `structuredContent` (model and view, matches `outputSchema`), `content` (model and view), `_meta` (view only) |

mcp-use implements the bridge for you: `useToolContext`, `useCallTool`, `useSendFollowUp`, `useModelContext`, `useDisplayMode` and the others wrap these messages. Do not write raw `postMessage` code in a view.

## What mcp-use emits for `server.tool({ view: { name } })`
- Resource `ui://views/<name>.html`, MIME `text/html;profile=mcp-app`, listed by `resources/list`.
- On the tool: `_meta.ui.resourceUri`.
- On the resource: `ui.csp` (merged, `csp.md`), `ui.prefersBorder`, `openai/widgetDescription`, `openai/ui.availableDisplayModes`.
- Not emitted by default: `openai/outputTemplate`, `ui.domain`, `ui.permissions`.
- Assets under `<basePath>/_mcp-use/views/<name>/…` and `public/` files under `<basePath>/_mcp-use/public/…`.

## Hosts
The standard is portable; each host adds rules and extensions. ChatGPT: `${CLAUDE_PLUGIN_ROOT}/skills/host-chatgpt/SKILL.md`. Archestra's installed-server route is the same standard, and its Owned Apps are a different runtime (`${CLAUDE_PLUGIN_ROOT}/skills/host-archestra/SKILL.md`; both ship in later versions).

Sources: M1, M2, O1, A3.
