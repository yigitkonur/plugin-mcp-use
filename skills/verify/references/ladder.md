# Verification ladder (rungs 1–4)

Replace `<port>` with a free port (3000 by default; use another such as 3511 if 3000 is taken). Run commands from the project root. Verified against `@mcp-use/cli@4.5.0`.

## Rung 1 — static (limit 3 minutes each)
```sh
npx mcp-use typecheck   # refreshes mcp-env.d.ts, runs tsc; expect "no type errors", exit 0
npx mcp-use build       # writes .mcp-use/build/index.js and bundles views; expect exit 0
```
Fail: fix the reported file and line. If a view hook reports a tool name that "is not exported from the server entry", export the tool (`export const x = server.tool(...)`) and rerun typecheck.

## Rung 2 — server (limit 30 seconds to ready)
Start the dev server in the background and wait for it:
```sh
npx mcp-use dev --no-open --no-inspector --port <port> > .mcp-use-plugin/dev.log 2>&1 &
```
Poll `.mcp-use-plugin/dev.log` until it contains `dev server ready` and `MCP endpoint:  http://localhost:<port>/mcp`. If `--tunnel` or another boolean flag is needed, pass it without a value. Keep the process id (`DEV_PID=$!` right after the command) and stop the server at the end with `kill $DEV_PID`. If you lost the id, `pkill -f "mcp-use dev.*--port <port>"` with your exact port. Never use a broader pattern such as `pkill -f "mcp-use dev"` or `pkill -f "node src/index.ts"`: it also kills other people's servers and other Claude sessions on the same machine.

## Rung 3 — protocol (limit 30 seconds per call)
`mcp-use client` and `mcp-use screenshot` need `@mcp-use/client`. Check `npm ls @mcp-use/client`; if missing, **ask the user**, then `npm install -D @mcp-use/client`.
```sh
npx mcp-use client connect dev http://localhost:<port>/mcp
npx mcp-use client dev tools list --json            # every tool, with annotations, inputSchema, outputSchema, _meta
npx mcp-use client dev tools call <tool> key=value --json
npx mcp-use client dev resources list               # views appear as ui://views/<name>.html
npx mcp-use client dev resources read ui://views/<name>.html   # MIME text/html;profile=mcp-app, _meta.ui.csp
npx mcp-use client remove dev                       # cleanup
```
Check and quote:
- each tool lists `readOnlyHint`, `destructiveHint` and `openWorldHint` as explicit booleans;
- `tools call` returns `structuredContent` that matches `outputSchema`, and `isError` is absent or false;
- each view-bound tool has `_meta.ui.resourceUri` and that URI appears in `resources list` with MIME `text/html;profile=mcp-app`;
- for a view, the resource's `_meta.ui.csp` lists every origin the view's code uses.
Optional second harness: `mcpc connect 127.0.0.1:<port>/mcp @v` then `mcpc @v tools-list`, `tools-call` (needs mcpc 0.7.x).

## Rung 4 — views (only if the server has views; limit 60 seconds per capture)
```sh
npx mcp-use screenshot --mcp http://localhost:<port>/mcp --tool <tool> key=value --theme light --delay 2500 --output <dir>/<tool>-light.png --json
npx mcp-use screenshot --mcp http://localhost:<port>/mcp --tool <tool> key=value --theme dark  --delay 2500 --output <dir>/<tool>-dark.png  --json
```
Open both PNGs: the harness draws a black backdrop in both themes (S22), so a view that does not paint its own colors for each theme shows unreadable text; fix the view, not the harness. Use `--delay`, not `--wait-for` with a selector inside the view (the selector is evaluated in the outer page and times out; checked against the production build too). If every capture times out with `View did not become ready in time.`, read the dev log: a line `…does not provide an export named 't'` means the apps-sdk-ui dev-mode problem; add the `vite.config.ts` from `${CLAUDE_PLUGIN_ROOT}/skills/host-chatgpt/references/apps-sdk-ui.md`, or capture against `mcp-use build` + `mcp-use start --port <port>` instead. Then **open each PNG with the Read tool and say what it shows**: the real data from `structuredContent` (not "Loading…"), nothing clipped, readable text. A light-theme PNG of a view that paints no background shows the capture host's black backdrop; say so instead of calling it a bug, and judge contrast in the dark one.

## Rung 5 — host (guided; only with the user's go-ahead)
ChatGPT: `${CLAUDE_PLUGIN_ROOT}/skills/verify/references/chatgpt-dev-mode.md` (tunnel, custom MCP server, call the tool, look at the card, clean up). Archestra: `${CLAUDE_PLUGIN_ROOT}/skills/verify/references/archestra-connect.md` (ask for the user's own Archestra URL; never install one). Without access, report the rung as UNVERIFIED with the reason.

## Cleanup
Stop the dev server, run `mcp-use client remove dev`, and leave `.mcp-use-plugin/` out of version control.

Sources: M2, S16, S19, S22.
