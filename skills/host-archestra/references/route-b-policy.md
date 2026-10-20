# Route B: sandbox policy, trust, styling

One platform policy applies to every Owned App; authors cannot change it.

## Network and resources
- **No network access.** `fetch`, XHR and WebSocket to any external address fail (the lint also flags EventSource, AD01). Assigned MCP tools are the only way data enters or leaves.
- **CDN allowlist** for scripts, styles, fonts and images: `cdn.jsdelivr.net`, `unpkg.com`, `cdnjs.cloudflare.com`, `fonts.googleapis.com`, `fonts.gstatic.com`. Anything else is blocked (AW02).
- **Pin versions** in CDN URLs (`chart.js@4.4.1`), because a script from a CDN runs inside the app and can call its tools as the viewer (AD13).
- Media (images, audio, video) from hosts outside the allowlist does not load; get the bytes from a tool result's `dataUrl` instead (AD05).
- **No iframes** (AD02). **Native form submit is blocked**; handle `submit` and call `preventDefault()` (AD03). **Popups are blocked**: `target="_blank"` and `window.open` do nothing, use `archestra.ui.openLink(url)` (AD04).
- The data policy file `data/archestra-policy.json` holds the allowlist, SDK members and limits that `archestra-app-lint` reads.

## Device permissions
`camera`, `microphone`, `geolocation` and `clipboardWrite` are declared with the `uiPermissions` argument of `scaffold_app` (AA06 rejects unknown keys; AD11 reminds you when device APIs are used). The browser still asks the viewer on first use. They work only when the sandbox has its own origin (the `ARCHESTRA_MCP_SANDBOX_DOMAIN` setting, or `localhost` in local development).

## Shared-app trust
A team or organization app runs its author's code in each viewer's browser. It can read the viewer's name and email, call tools with the viewer's credentials, and write what it reads into shared storage, which the author can read. The platform's protections work together: the iframe sandbox, the network policy, and permission checks on every call against the viewer, not the author. Review a shared app's code before publishing it, and pin CDN versions.

## Access
Running an app needs `use` on it (granted per item); that covers its storage and LLM calls. File calls also need `agent:read`. Read shows the card in the gallery; Update edits code, settings and tools. Sharing a chat does not share its apps. A locked app refuses automated edits until a user with update permission unlocks it; a disabled app leaves other members' galleries and every agent toolbox (including the owner's chats), while the owner still sees it in their gallery marked Disabled.

## Styling the platform injects
A baseline stylesheet loads before the app's CSS, so app rules win. Do not link it (AA03).
- **Variables** that follow light and dark: `--color-text-primary`, `--color-text-secondary`, `--color-text-danger`, `--color-text-inverse`, `--color-background-primary`, `--color-background-secondary`, `--color-background-inverse`, `--color-border-primary`, `--color-accent`, `--border-radius-sm`, `--border-radius-md`, `--border-radius-lg`, `--font-sans`, `--font-mono`.
- **Element defaults** for `body`, headings, `p`, links, lists, `button`, `input`, `textarea`, `select`.
- **Components**: `.arch-card`, `.arch-btn` (`--primary`, `--ghost`), `.arch-input`, `.arch-tabs` with `.arch-tab`, `.arch-badge`, `.arch-spinner`.
- The `hidden` attribute always hides an element. If app CSS sets `display` on something that has `hidden`, render diagnostics record it (AD10).
Write only the CSS the app needs.

Sources: A1, A2.
