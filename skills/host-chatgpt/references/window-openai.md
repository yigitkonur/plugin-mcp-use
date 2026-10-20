# `window.openai` (optional bridge)

OpenAI's guidance (O1, O5): start with the open MCP Apps bridge; use `window.openai` only for ChatGPT-specific capabilities, and **feature-detect each one**. mcp-use's hooks (`mcp-use/react`) cover the standard parts, so most views never touch `window.openai`.

| Need | Standard / mcp-use | `window.openai` extension |
|---|---|---|
| Tool arguments and result | `useToolContext` | `toolInput`, `toolOutput`, `toolResponseMetadata` |
| Call another tool | `useCallTool` | `callTool(name, args)` |
| Post a follow-up message | `useSendFollowUp` | `sendFollowUpMessage({ prompt, scrollToBottom })` |
| UI state across renders | `useViewState` | `widgetState`, `setWidgetState(state)` (a snapshot, not a source of truth) |
| Theme, locale, size, safe area | `useViewTheme`, `useHostContext` | `theme`, `locale`, `maxHeight`, `safeArea`, `view`, `userAgent` |
| Display mode | `useDisplayMode` | `requestDisplayMode({ mode })` (on mobile PiP may become fullscreen) |
| Open a link | `useOpenExternal` | `openExternal({ href, redirectUrl })`; redirect targets need `redirect_domains` |
| Files | `useFiles` | `uploadFile(file, { library? })`, `selectFiles()` (feature-detect: the library may be unavailable), `getFileDownloadUrl({ fileId })` |
| Modal, close, height | — | `requestModal({ template? })`, `requestClose()`, `notifyIntrinsicHeight(...)`, `setOpenInAppUrl({ href })` |
| Checkout | — | `requestCheckout` is a private beta for select marketplaces (O1); commerce rules are in `submission.md` |

Rules:
1. `window.openai?.method` or `typeof window.openai?.method === "function"` before use. Never branch on a host or product name.
2. Never make core behavior depend on it; the same view must work on other hosts.
3. `localStorage`/`sessionStorage` are not a place for core state; keep business data on the server (O1).
4. Locale: read `document.documentElement.lang`.
5. For tools that need approval, treat a missing initial `toolInput` as normal; the host delivers it through `ui/notifications/tool-input` after approval (O5). `useToolContext` handles this as `pending`.

Sources: O1, O5, M2.
