# Which Archestra route

An "app" in Archestra can come from two places. The gallery at `/apps` lists both, and an apps table tells them apart (owned versus an installed MCP server's app).

## Route A: an installed MCP server that serves MCP Apps
This is what an mcp-use server with views produces. The host calls the server's `tools/list`, finds `_meta.ui.resourceUri` (a `ui://` URI), reads that resource, and renders its HTML in a sandbox iframe through the MCP Apps bridge. CSP and permissions come from the resource content item's `_meta.ui`. Calls from the view pass through to the upstream server; the host enforces the tool allowlist and `visibility`.

Choose it when the app is part of a real MCP server that other hosts (ChatGPT, Claude, others) also use, when the data lives behind your own tools, or when the code should be versioned in your repo.

## Route B: an Owned App
One HTML document stored in Archestra and edited with its authoring tools or by an agent. It talks to Archestra through the injected `window.archestra` (state, files, tools, LLM, host UI) and may not set up any connection itself. Calls run as the viewer.

Choose it for a quick internal dashboard, form or tracker that only needs Archestra's assigned tools and its own storage, and that nobody else needs to host. The code lives in Archestra, so the repo copy is the thing to lint and keep.

## Differences that change the code
| Dimension | Route A | Route B |
|---|---|---|
| Bridge | standard MCP Apps (`ui/*` messages) | injected `window.archestra`; own bridge setup is rejected on save |
| Data | your server's tools, any network your server can reach | assigned MCP tools only; the page itself has no network |
| Styling | any CSS you bundle (ChatGPT-styled libraries such as Apps SDK UI are untested here) | injected variables and `.arch-*` classes, then your CSS |
| Libraries | bundled by `mcp-use build` | load from the five CDNs and pin versions (recommended); no bundler |
| State | your server | `storage.user` / `storage.shared`, `files` |
| Credentials | **unconfirmed** (`unverified.md`) | the viewer's own MCP credentials, never held by the app |
| Gate | host diagnostics at render time | save gate, `validate_app`, then render diagnostics |

## One app, many hosts
An app can also be reached from outside: each Owned App is itself an MCP server at `POST /api/mcp/app/<app-id>` (OAuth or a personal token; organization and team tokens are rejected). A client that advertises `io.modelcontextprotocol/ui` can render the HTML, and Archestra's network policy travels with it. Route A servers go the other way: Archestra is the client.

For an mcp-use project that must work in both ChatGPT and Archestra, build the portable core first (`${CLAUDE_PLUGIN_ROOT}/skills/mcp-apps/references/portable-core.md`) and treat the ChatGPT-only parts as optional.

Sources: A1, A2, A3.
