# Content Security Policy, permissions, domain

Observed on mcp-use 2.11.0 (2026-10-20) by reading `resources/read` metadata from a running dev server and a production build (`mcp-use build` + `start`).

## The four buckets
`view.csp` accepts (type `McpUiResourceCsp` from `@modelcontextprotocol/ext-apps` 2.0.3):
| Bucket | CSP directive | Use |
|---|---|---|
| `connectDomains` | `connect-src` | `fetch`, XHR, WebSocket, EventSource |
| `resourceDomains` | `img-src`, `script-src`, `style-src`, `font-src`, `media-src` | images, fonts, CDN assets |
| `frameDomains` | `frame-src` | nested iframes (ChatGPT review needs a justification) |
| `baseUriDomains` | `base-uri` | allowed `<base>` URLs |
Empty or omitted means nothing beyond the server's own origin. List every origin the view's code touches and nothing else. Wildcard subdomains (`https://*.example.com`) are allowed by the spec; prefer exact hosts.

## Where domains come from (observed merge)
1. **The tool's `view.csp`**, listed first.
2. **Environment variables** on the server process: `CSP_CONNECT_DOMAINS`, `CSP_RESOURCE_DOMAINS`, `CSP_FRAME_DOMAINS`, `CSP_BASE_URI_DOMAINS`. **`CSP_URLS` is added to all four buckets** (connect, resource, frame *and* base-uri), not only connect and resource.
3. **System defaults:** the server's own origin goes into `connectDomains` and `resourceDomains`. `MCP_URL` replaces the origin used for connect; `MCP_ASSETS_URL` sets where view JS/CSS is served from and goes into `resourceDomains`. With both set to public URLs, the resource's script and stylesheet tags point at `<MCP_ASSETS_URL>/mcp/_mcp-use/views/<name>/assets/…`.
4. Dev mode (`mcp-use dev`) additionally allows the local origin over `ws://` for hot reload and adds `scriptDirectives: ["'unsafe-eval'"]`. Production output has neither.

Domains are normalized to origins and de-duplicated. A request from a view to an origin not in the final list is blocked by the host, which shows up as a blank or half-rendered view.

## Production checklist
- Set `MCP_URL` (and `MCP_ASSETS_URL` if assets live elsewhere) to the public origin. Without them the resource points at `http://127.0.0.1:<port>`, which a host that is not on the same machine as the server cannot reach.
- Prefer `view.csp` for origins specific to one view and env vars for deploy-wide ones. `CSP_URLS` widens `frame-src` and `base-uri`: use the specific variables instead.
- After a change, read the resource metadata back: `mcp-use client <name> resources read ui://views/<name>.html` (or `mcp-use-probe`, Phase 2) and compare against the origins in the view code.

## Permissions
`view.permissions` is an **object**, not a list: `{ camera: {}, microphone: {}, geolocation: {}, clipboardWrite: {} }`. Hosts may honor it by setting the iframe `allow` attribute; a view must feature-detect and cope with a denial.

## `domain`
`view.domain` sets the app's own domain for hosts that need it (ChatGPT submission requires `_meta.ui.domain`; see `host-chatgpt`). Mcp-use emits it only when you set it.

Sources: M2, S11, O1, O5, S25.
