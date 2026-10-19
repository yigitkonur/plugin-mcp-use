---
name: apps
description: Add MCP Apps (React views) to an existing mcp-use server: decide which tools deserve a UI, build the views, and verify them.
argument-hint: "[tool names…]"
disable-model-invocation: true
---

# /mcp-use:apps

Arguments: `$ARGUMENTS` (tool names to give a UI; empty = decide with the user). Scenario: an mcp-use v2 server whose tools have no views yet (or a few).

1. **Scope.** `mcp-use-detect --json`: continue only for `M-USE-SRV` in a Node project (else the scope notice from `/mcp-use:start`). Read the server entry and list every tool with its `inputSchema`, `outputSchema`, annotations and handler.
2. **Decide.** Read `references/decide-ui.md`. For each tool say UI or tools-only, and whether a data tool and a render tool should be split. Show the table and let the user adjust (AskUserQuestion). Do not add a UI where the answer is plain text.
3. **Hosts.** Take them from `.mcp-use-plugin/settings.md` or ask: ChatGPT, Archestra (0.3.0), both, not yet. The portable core comes first (`${CLAUDE_PLUGIN_ROOT}/skills/mcp-apps/references/portable-core.md`).
4. **Build, one view per chosen tool**, following `${CLAUDE_PLUGIN_ROOT}/skills/mcp-apps/references/views.md`: `outputSchema` and matching `structuredContent`; `export const` the tool ref; `view: { name }` bound to exactly one tool; `views/<name>/view.tsx` handling `pending`, `error` (including cancellation) and `ready`; minimal `view.csp`; `viewConfig` (inline first). Add `react`, `react-dom` if missing. For ChatGPT visual parity read `${CLAUDE_PLUGIN_ROOT}/skills/host-chatgpt/references/apps-sdk-ui.md` (CSS with `@source`, the `vite.config.ts` that excludes the package from `optimizeDeps` so `mcp-use dev` renders it, `AppsSDKUIProvider linkComponent`, theme sync) and follow its UI rules.
5. **Verify.** Read `${CLAUDE_PLUGIN_ROOT}/skills/verify/references/ladder.md` and run rungs 1 to 4 (light and dark screenshots; open the PNGs and describe them). Then run `mcp-use-probe --host <host> --json` and `mcp-use-scan --host <host>`; fix errors and warnings (`/mcp-use:host <host> audit` does this with the reviewer agent).
6. **Report** which tools got views, what each screenshot shows, probe and scan counts, and anything UNVERIFIED (no host access).
