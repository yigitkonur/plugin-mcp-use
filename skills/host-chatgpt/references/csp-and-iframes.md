# CSP and iframes for ChatGPT

Basis: OpenAI build guide (O1), plugin guidelines (O4), reference (O5). mcp-use produces the standard `_meta.ui.csp` (`${CLAUDE_PLUGIN_ROOT}/skills/mcp-apps/references/csp.md`).

- **Declare exact domains.** `connectDomains` for fetch/XHR/WebSocket, `resourceDomains` for images, fonts, scripts, styles. OpenAI reviews compare the declared CSP with what the UI actually does.
- **Nested frames are blocked by default.** The normal case for `frameDomains` is the server's **own registrable domain** (for example `api.example.com` may embed `app.example.com`); shared hosting is not ownership. Third-party origins are limited to cases where the embedded experience is essential. Submission requires a written justification, and iframe use can trigger extra review (O4 "Iframes and embedded pages", O5).
- **`redirect_domains`** for `window.openai.openExternal` is not part of `_meta.ui.csp`. Set it on the legacy `_meta["openai/widgetCSP"]` (snake_case: `connect_domains`, `resource_domains`, `frame_domains`, `redirect_domains`). mcp-use does not emit this key; add it through the resource's `_meta` if you use `openExternal` with redirects, or use `useOpenExternal()` for plain external links.
- **`_meta.ui.domain`** is required for plugin UI submission and must be unique per plugin (`metadata.md`).
- **Production origin.** mcp-use adds the server origin to `connectDomains`/`resourceDomains` from `MCP_URL`/`MCP_ASSETS_URL`. Without them the resource points at `http://127.0.0.1:<port>` (observed in the resource metadata), which a host that is not on the same machine as the server (ChatGPT in the cloud) cannot load.
- **`CSP_URLS` widens `frame-src` and `base-uri` too** (observed). Prefer `CSP_CONNECT_DOMAINS` / `CSP_RESOURCE_DOMAINS`.
- **Widgets run in an isolated iframe and cannot use the privileged browser APIs `window.alert`, `window.prompt`, `window.confirm` or `navigator.clipboard`** (O11). Build the confirmation or the copy button into the view; for destructive actions use the host's own confirmation prompt (tool annotations). Rule CG-U20 flags these calls.
- **An embedded page keeps its own CSP.** The widget's `connectDomains` and `resourceDomains` do not restrict requests made inside a page you embed through `frameDomains`; keep iframe origins specific and include the embedded experience in your security review (O11).
- Avoid `<iframe>` inside views (CG-U16).

Sources: O1, O4, O5, O11, M2.
