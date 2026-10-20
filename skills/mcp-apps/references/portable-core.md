# Portable core: UI that runs on more than one host

ChatGPT and Archestra's installed-server route both consume the open standard; neither requires its own bridge for the basics. Build the portable core first, then add host extensions behind feature detection.

1. **Link the UI only through `_meta.ui.resourceUri`** (mcp-use does this). Never require `window.openai` or `window.archestra` for correctness.
2. **Feature-detect host extensions**, not host names: `window.openai?.requestModal`, `useHostContext().hostCapabilities`, `useDisplayMode().availableDisplayModes`.
3. **Keep tools useful without the UI.** Put the facts in `content` and `structuredContent`; split a data tool from a render tool when other hosts or the model need the data without a card.
4. **Declare the narrowest CSP** and list every origin the code touches (`csp.md`).
5. **Take theme and locale from the host** (`useViewTheme`, `useHostContext`), not `prefers-color-scheme`.
6. **Report size through the host** (`autoResize`); never assume a frame height.
7. **Use `@openai/apps-sdk-ui` for ChatGPT visual parity**, but do not make correctness depend on it, and do not import it in a view that must run on a host without Tailwind setup unless the build includes it.
8. **No credentials in views.** Tokens belong on the server; the view calls tools.
9. **Handle `pending`, `error` and cancellation** in every view (`views.md`).

Hosts differ in display modes (`pip` support is disputed for ChatGPT), review requirements (ChatGPT has a public submission review, O4; Archestra has per-organization gates such as new apps being disabled or locked by default, and no public approval criteria were found), and extensions (ChatGPT entrypoints, settings, deep links; Archestra credential and visibility behavior). Those live in the host skills, with checklists the plugin can run.

Sources: M2, O1, O6, A3.
