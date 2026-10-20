# Verdicts on the old troubleshooting material (mcp-use 2.11.0, checked 2026-10-20)

Source: commit d83925f7 of skills-by-yigitkonur, `skills/build-mcp-use-server/references/` files `00-symptom-index.md`, `22-validate/*`, `23-debug/*`, `27-troubleshooting/*`.
Format: `old symptom (source file) | VERDICT | evidence`.
Evidence tags as in the other two files. `FX=<node_modules>`. `[A]` = row in troubleshooting-server.md, `[B]` = row in troubleshooting-views.md. "Already covered" means the fact is verified and already written in the plugin, so it is not repeated in A or B.

## Startup, imports, install

Cannot find module 'mcp-use/server' (index, catalog, decision tree) | VERIFIED | [live] Node `ERR_PACKAGE_PATH_NOT_EXPORTED: Package subpath './server' is not defined by "exports"`; `package.json` exports has no `./server`. [A]
require is not defined / CJS build errors, "v2 is ESM-only" (index, catalog, tree) | CONTRADICTED (require of mcp-use works on this Node; the error comes from your own ESM file) | [live] `node -e 'require("mcp-use")'` on Node 26.5.0 printed `require ok function`. The behavior on Node 22 was not testable here.
Syntax/export errors loading mcp-use on an unsupported Node version (catalog) | UNVERIFIABLE (only Node 26.5.0 is installed) | `<node_modules>/mcp-use/package.json` `engines.node` is `>=22.22.2`; no older Node to try.
Zod version conflicts, `_zod` type errors, zod v3 failures (index, catalog, quick table) | VERIFIED, already covered | Given fact 4 and `skills/mcp-use-server/references/tools-and-results.md` (zod >= 4.2.0).
`Schema must conform to Standard Schema specification` / `~standard` missing (index migration table) | UNVERIFIABLE (exact string; zod 3 is not installed to reproduce) | Fact 4 says zod 3 breaks typecheck and tools/list, but I could not produce this string.
Upgrade fix `zod@^4.0.0-alpha` (index) | CONTRADICTED | Fact 4: zod must be >= 4.2.0; an alpha range is not enough.
Server exits before listening, port/env errors (index, quick table, tree) | VERIFIED | [live] dev prints `The server entry must default-export the MCPServer instance ... never call listen() itself`. [A]
EADDRINUSE: stop the owner or pick another port (catalog, quick table, tree) | VERIFIED with a correction (dev auto-picks a free port) | [live] `[mcp-use] port 3718 is taken, using 3720`; `mcp-use start` prints `listen EADDRINUSE: address already in use 127.0.0.1:3717`. [A]
Server unreachable from container or platform, default host 127.0.0.1 (index, catalog, quick table, tree) | VERIFIED | [cli] `--host <host> Bind host (default: $HOST or 127.0.0.1)`; [live] `HOST=0.0.0.0 PORT=3718 mcp-use start` bound `*:3718`. [A]
Installed mcp-use but APIs missing; need 2.8.2 on npm `latest`, v1 is `v1-legacy` (index) | UNVERIFIABLE (npm dist-tags need the registry) | Skipped: third-party network. Version floor is already in `references/versions.md`.
`mcp-use: command not found` / unknown command `serve`, `generate-types` (index, quick table) | VERIFIED | [live] `Unknown command: serve`, `Unknown command: generate-types`. [A]
`mcp-use build` succeeds but TypeScript errors remain; build is transpile-only (index) | VERIFIED | [live] build printed `built index.ts → .mcp-use/build/index.js`, typecheck printed `error TS2345`. [A]
Stale output in production, artifact is `.mcp-use/build/` (index, quick table, view rendering) | VERIFIED | [live] edit after build; `tools/list` unchanged under `mcp-use start`. [A]
`moduleResolution: NodeNext` and `"type": "module"` as the fix for CJS errors (index migration table) | UNVERIFIABLE | Not tested; no CJS project was built.
Deploy fails or 80 MB limit (index) | UNVERIFIABLE (needs a cloud login and uploads; stop rule) | `mcp-use deploy` mutates remote state; not run.
Platform-specific runtime errors (index) | UNVERIFIABLE | No platform available.
`mcp-use login` then `mcp-use deploy`, copy the URL from the dashboard (connect-real-clients) | UNVERIFIABLE (needs a person and a cloud account) | Not run. `mcp-use --help` lists `login` and `deploy`.
`mcp-use deployments logs <id> --follow` follows runtime logs (transport-debugging) | CONTRADICTED | [cli] `deployments logs --help`: `--build  Read build logs instead of runtime logs`, `--follow  Poll build logs until a terminal status`.
Env vars via `mcp-use servers env` (transport-debugging) | VERIFIED | [cli] `servers --help`: `env list`, `env set <server> <KEY=VALUE>`, `env unset <server> <key>`.

## Connection and transport

Client expects a stdio command (index, catalog, quick table, tree) | VERIFIED, already covered | Fact 4 and `references/config-and-lifecycle.md`. The 404 side is in [A].
404 at `/sse` or `/stdio` (index, catalog, quick table) | VERIFIED | [live] both returned `404 Not Found`. [A]
404 / HTML at the MCP endpoint; default route `/mcp` (index, catalog, quick table) | VERIFIED with a correction | [live] `GET /` is 404 `text/plain`, not HTML; `GET /mcp` with `Accept: text/html` returns the landing page. [A]
406 Not Acceptable ... both application/json and text/event-stream (index, catalog, quick table, tree, curl-handshake, transport-debugging, unit-testing) | VERIFIED | [live] exact message and 406 with no Accept; [src] same string in `index-node.js`. [A]
406 applies only to the legacy wire; the modern `2026-07-28` shape avoids it (index, catalog) | VERIFIED | [live] modern request with `Mcp-Method` and `_meta` keys returned 200 `application/json` without Accept. [A]
GET/HEAD/DELETE on `/mcp` returns 204; GET stream or DELETE teardown not available (index, transport-debugging) | VERIFIED | [live] 204 for GET, HEAD, DELETE. [A]
PUT/PATCH on `/mcp` returns 405 (transport-debugging) | VERIFIED | [live] 405 `Method not allowed.`. [A]
HTML-navigation GET at basePath returns a landing page (transport-debugging) | VERIFIED | [live] `Accept: text/html` gave 200 `text/html`. [A]
Custom routes via `server.get/post/put/patch/delete/all`, `server.app`, `server.use`; there is no `server.route()` (transport-debugging) | VERIFIED, already covered | [types] `<node_modules>/mcp-use/dist/server.d.ts` lines 48-59 and 306-307; no `route(` member. `references/config-and-lifecycle.md`.
CORS off unless `cors` configured; `allowedOrigins` alone emits no CORS headers (index, catalog, quick table, tree) | VERIFIED | [live] OPTIONS without `cors` gave 405, with `cors: {}` gave 204 plus `access-control-*`; [types] `config.d.ts`. [A]
CORS defaults: reflect request Origin; methods `GET, HEAD, POST, OPTIONS`, no DELETE (transport-debugging) | VERIFIED | [live] `access-control-allow-origin: https://inspector.mcp-use.com`, `access-control-allow-methods: GET, HEAD, POST, OPTIONS`. [A]
Fix `cors: {}` or `cors: { origin: [...] }` (transport-debugging, client troubleshooting) | VERIFIED | [live] as above; [types] `CorsOptions`. [A]
403 `Host` validation; fix by adding to `allowedHosts`, not `allowedOrigins` (index, catalog, quick table) | VERIFIED for the 403 and for `mcp-use start` and `server.fetch`; UNDECIDED under `mcp-use dev` | [live] `Invalid Host: evil.example.com`; `allowedHosts: ["myhost.test"]` honored by start and `server.fetch`, but not by dev in my run. [A]
403 Origin rejection with `allowedOrigins` (index) | VERIFIED | [live] `Invalid Origin: evil.example.com`; unset means no check. [A]
Request with `Mcp-Protocol-Version` is optional, unsupported value gives `400 Bad Request: Unsupported protocol version` (curl-handshake) | VERIFIED | [live] exact message and the version list `2025-11-25, 2025-06-18, 2025-03-26, 2024-11-05, 2024-10-07`; omitted header gave 200. [A]
Legacy handshake `initialize` then `tools/list`, no `notifications/initialized` needed, no session header (curl-handshake, transport-debugging) | VERIFIED | [live] `tools/list` without any prior `initialize` returned 200; `initialize` with `protocolVersion: 2024-11-05` returned `serverInfo`.
Expected responses shown as plain JSON bodies with HTTP 200 (curl-handshake) | CONTRADICTED | [live] legacy POST responses are `text/event-stream` with `event: message` / `data: {...}`. Plain JSON only for the modern wire. [A]
Error response `-32602 Invalid params: missing 'location'` for bad arguments (curl-handshake, unit-testing) | CONTRADICTED | [live] bad arguments return HTTP 200 with `result.isError: true` and `Input validation error: Invalid arguments for tool ...`; `-32602` is for an unknown tool name (`Tool nope not found`). [A]
Malformed JSON gives 400; missing field gives `-32700` or `-32602` (transport-debugging) | PARTLY CONTRADICTED | [live] malformed JSON: `400 Invalid JSON`. `{"jsonrpc":"2.0"}`: `400`, code `-32600`, `Bad Request: the request body is not a valid JSON-RPC message`. [A]
Wrong Content-Type (not listed in old material; found while testing) | VERIFIED | [live] 415 `Unsupported Media Type: Content-Type must be application/json`. [A]
Tool call takes over 10 s: Inspector request timeout default 10000 ms (transport-debugging) | UNVERIFIABLE | [inspector] the bundle names "request timeouts" in its Configuration card but has no 10000 default I could find; the only `Request timeout: <method>` string is a 30000 ms view-bridge timer.
`ctx.reportProgress?.(i, 10, msg)` for long tools (transport-debugging) | VERIFIED, already covered | [types] `context.d.ts:220` `reportProgress(progress: number, total?: number, message?: string): Promise<boolean>`; `references/context-and-middleware.md`.
`ctx.sendLog()` bypasses `logging/setLevel` (debugging-workflow) | UNVERIFIABLE | `sendLog` exists (`context.d.ts:222`); the bypass was not tested.
`curl -I` HEAD returns 204 as a listener check; 404 or refused means not listening (transport-debugging) | VERIFIED | [live] HEAD 204. [A]
Unit test with `server.fetch(request)` then `response.json()` (unit-testing) | CONTRADICTED | [live] script: `server.fetch` is correct, but a legacy POST gives SSE and `JSON.parse` of the body threw `Unexpected token 'e', "event: mes"...`. [A]
Unit test: invalid argument type gives `data.error !== undefined` (unit-testing) | CONTRADICTED | [live] it is `result.isError: true` with `Input validation error: ...`, no top-level `error`.
`MCP_URL` stays localhost after `mcp-use dev --tunnel`; tunnel URL printed separately (index) | UNVERIFIABLE (needs the third-party tunnel service) | Not run.
Tunnel output format and limits: 24 h life, 1 h idle, 10 creations per IP per hour, 5 active (connect-real-clients) | UNVERIFIABLE (third-party service) | Not run.
`/mcp/inspector` returns 404 through a tunnel (connect-real-clients) | VERIFIED, already covered | Fact 4; `references/cli.md`.
`mcp-use client connect <name> <url>`, `tools list`, `tools call k=v`; no interactive subcommand (connect-real-clients) | VERIFIED, already covered | [cli] `mcp-use client --help`: connect, list, remove, `<name>`; `references/cli.md`.
Client saved state in `~/.mcp-use/client/servers.json` and `credentials/` (connect-real-clients) | UNVERIFIABLE | I did not inspect the home directory or the CLI's storage code.
`CORS error` on tunnel or deploy, add `cors: {}` (connect-real-clients) | VERIFIED | Same evidence as the CORS rows. [A]
Add the tunnel or deploy URL to ChatGPT; ChatGPT tests the connection (connect-real-clients) | UNVERIFIABLE (needs ChatGPT and a person) | Not run.
Tool succeeds locally, fails in ChatGPT, check CSP (connect-real-clients) | UNVERIFIABLE as a general claim | No ChatGPT. The CSP check path is [B].
Client shows raw JSON instead of readable output (index) | UNVERIFIABLE | Host-specific rendering; no host used.

## Tools, results

Tool missing from `tools/list` because it is not exported (index, catalog, debugging-workflow table) | CONTRADICTED | [live] a non-exported tool was listed and callable; only the generated types need the export. [A]
Tool appears in source but not in View/useCallTool typing; export the `ToolRef`, run typecheck (catalog, quick table, view rendering) | VERIFIED | [live] `mcp-env.d.ts` is `typeof import("./index.js")`. [A]
`McpError: Method not found (-32601) on tools/call` for a missing static ToolRef export (index migration) | CONTRADICTED | [live] unknown tool is `-32602 Tool nope not found`; an unexported tool is still called. [A]
Call rejected before callback; input validation (index, catalog, quick table, tree, debugging-workflow "Invalid params") | VERIFIED with a correction | [live] HTTP 200, `isError: true`, `Input validation error: Invalid arguments for tool fetch-weather: city: ...`. [A]
Output validation failure after callback (index, catalog, tree) | VERIFIED | [live] `Output validation error: Invalid structured content for tool bad-out: ...`, `... has an output schema but no structured content was provided`. [A]
Client treats `"Error: ..."` text as success; return `isError: true` (catalog) | VERIFIED, already covered | `references/tools-and-results.md`; [live] `isError` results arrive as errors in `mcp-use screenshot` (`tool_failed`).
Throw a standard Error for crashes vs return `isError` for expected failures (index migration) | VERIFIED | [live] a thrown `Error("boom")` became `{"content":[{"type":"text","text":"boom"}],"isError":true}`. [A]
v1 helpers `text()`, `object()`, `widget()` deprecated; `TypeError: ctx.text is not a function` (index, catalog) | VERIFIED for the deprecation, already covered; the quoted TypeError string UNVERIFIED | `references/tools-and-results.md` (helpers `@deprecated` in 2.11.0 types).
`server.setRequestHandler is not a function` (index migration) | VERIFIED that the method is absent; exact TypeError string not run | [types] `grep -c setRequestHandler <node_modules>/mcp-use/dist/server.d.ts` gives 0.
`ctx.sample is not a function` (index, catalog, quick table) | VERIFIED, already covered | [types] no `sample` member in `context.d.ts`; `skills/mcp-use-server/SKILL.md`.
`ctx.elicit is not a function`; replaced by `inputRequired` / `inputResponse` / `acceptedContent` (index, debugging-workflow) | VERIFIED, already covered | [types] `index.d.ts:38` exports `acceptedContent, createRequestStateCodec, inputRequired, inputResponse`; `references/elicitation.md`.
`ctx.elicit` removed in v2.4.3 (#2409) (index migration) | UNVERIFIABLE (issue number, version) | Absence is verified; the history is not.
`createRequestStateCodec({ secret })` fails; use `{ key, ttlSeconds }`, `.mint()`, `ctx.requestState<T>()` (index) | VERIFIED | [src] `createRequestStateCodec(options)` reads `options.key`, `options.ttlSeconds??600`, and has `mint`; [types] `requestState: RequestStateAccessor`. [A]
`ctx.requestState` returns a string unless `requestState: { verify }` is configured (index migration) | VERIFIED | [types] `config.d.ts` ~line 201: "Without a verifier, RequestContext.requestState returns the raw, attacker-controlled wire string." [A]
`RequestState verification failed: signature mismatch or TTL expired` (index migration) | CONTRADICTED | [src] that string is absent from `index-node.js` (0 matches for "verification failed"); the codec throws `Error("mac")`, `Error("expired")`, `Error("malformed")`, `Error("bind")`. End-to-end client text was not tested.
Key at least 32 bytes (transport-debugging snippet) | VERIFIED | [src] `RangeError: createRequestStateCodec: key must be at least 32 bytes (got <n>)`. [A]
`resources/subscribe` returns `-32601 Method Not Found`; use `subscriptions/listen` (index) | VERIFIED for the error and for the existence of `subscriptions/listen`; the "exact URIs in `resourceSubscriptions`" detail UNVERIFIED | [live] `-32601 Method not found`; [src] `literal("subscriptions/listen")`. [A]
Elicitation never returns / handler re-runs; infinite elicitation loop (index) | UNVERIFIABLE | Not reproduced; the re-entry pattern is in `references/elicitation.md`.
Notifications not reaching the client (index) | UNVERIFIABLE as stated | Not reproduced; stateless delivery limits are in `references/advanced.md`.
Session state disappears between calls; `ctx.session` undefined; `sessionStore` removed (index) | VERIFIED, already covered | Fact 4 (stateless); `references/config-and-lifecycle.md`.
`Hot reload`: server entry edits (debugging-workflow "npm run dev") | VERIFIED | [live] `[mcp-use] reloaded server entry`. [A]
Inspector at `http://localhost:3000/mcp/inspector` while `npm run dev` runs (debugging-workflow, inspector-walkthrough) | VERIFIED with conditions | [live] 200 only without `--no-inspector`; `start` needs `--with-inspector`. [A]
`/mcp/inspector` not mounted for direct `listen()`/`fetch()` or embedded Next.js (index) | PARTLY VERIFIED | [live] dev and start behavior; direct `listen()` and Next.js not run (UNVERIFIABLE).

## Auth

401 before the tool callback (index, catalog, oauth-issues, tree) | VERIFIED | [live] `www-authenticate: Bearer error="invalid_token", error_description="Authentication is required for this request."`. [A]
Token checks: expiry, issuer, audience, signature, scopes (oauth-issues) | VERIFIED in part | [live] invalid token gives `error_description="JWT verification failed"`; per-claim messages were not exercised (needs a real issuer).
`tools/list` returns 401 or public discovery needs auth; fix `mixedAuth: true` plus `securitySchemes: [{ type: "noauth" }]` (index migration) | VERIFIED | [live] p-auth with and without `mixedAuth`; startup error `noauth requires mixedAuth: true on the server`. [A]
OAuth discovery metadata is public; only the exact basePath is bearer-gated (index) | VERIFIED for "metadata is public" | [live] `GET /.well-known/oauth-protected-resource/mcp` returned 200 with no token. The "exact basePath only" detail was not tested.
`ctx.auth.user.userId` undefined; use `user.id` (index, catalog, oauth-issues, quick table) | VERIFIED | [types] provider user types have `id: string`, none has `userId`. [A]
`Property 'userId' does not exist on type 'User'` (index migration) | VERIFIED (type has no `userId`); exact TS text not run | [types] as above.
`oauthProxy is not exported from 'mcp-use/oauth'`; "removed in v2" (index, catalog, oauth-issues, tree) | CONTRADICTED | [types] `<node_modules>/mcp-use/dist/oauth/index.d.ts` line 15 exports `oauthProxy`, `github`, `google`, `upstream`, `upstreamToken`. Already noted in `references/auth.md` and `references/versions.md`.
Provider factories are subpath imports `mcp-use/oauth/<provider>` (index, catalog, oauth-issues) | VERIFIED, already covered | [types] `package.json` exports list; `references/auth.md`.
Provider required values: Clerk `frontendApiUrl`, Auth0 `domain`, WorkOS `subdomain`, Supabase `projectId` or `supabaseUrl`, Keycloak `serverUrl` and `realm`, Better Auth `authURL` (oauth-issues) | VERIFIED | [types] `oauth/clerk.d.ts:37`, `auth0.d.ts:33`, `workos.d.ts:39`, `supabase.d.ts:44,50`, `keycloak.d.ts:37,43`, `better-auth.d.ts:33`. Not a symptom, so not in A.
Supabase: `supabaseUrl` overrides `projectId`; audience default `authenticated`; omit `jwtSecret` for ES256 (catalog, oauth-issues) | UNVERIFIABLE in full | [types] `supabase.d.ts` has `projectId`, `supabaseUrl`, `jwtSecret`, `audience` fields; the override order and default were not exercised (needs a Supabase project).
Provider setup fails for a hosted provider (index) | UNVERIFIABLE | Needs a real provider and network.
Custom provider needs `createTokenVerifier`, `oauthMetadata`, `mapAuthInfo` (catalog, oauth-issues) | VERIFIED, already covered | `references/auth.md` custom-provider section.
Custom provider sample uses `createJwtVerifier({ audience: resource.href, mapUser })` (oauth-issues) | CONTRADICTED | [types] `oauth/jwt.d.ts` `JwtVerifierOptions` has `issuer`, `jwksUrl`, `resource: URL` (required), `audience?`, `issuerBoundAccessTokens?`; no `mapUser`.
Pass the caller token downstream with `ctx.auth?.token` (index migration) | CONTRADICTED | [types] `context.d.ts:136-137` the field is `accessToken`. [A]
Scopes versus permissions; do not authorize from `ctx.client.user()` (oauth-issues) | VERIFIED, already covered | `references/auth.md`.
Inspector `pending_auth` state and Authenticate button (inspector-walkthrough, connect-real-clients) | UNVERIFIABLE as written | [inspector] the string `pending_auth` and "awaiting manual authentication" exist in code; the button label and flow were not driven.
Inspector connection modes: Auto, direct then proxy (inspector-walkthrough) | UNVERIFIABLE | [inspector] only the card text "Connection mode, protocol, proxy, and request timeouts" was found.
Inspector tabs: Dashboard, Tools, Prompts, Resources, Chat; Add Connection; Copy Client Setup (inspector-walkthrough) | UNVERIFIABLE (UI not driven; `Add Connection` and `Copy Client Setup` strings not found in the bundle) | [inspector] grep of the unzipped bundle.
`fromOpenAPI failed: Cannot resolve remote $ref` (index migration) | UNVERIFIABLE | Not run; would need a spec and possibly network.
Downstream REST API returns 401 (index migration) | UNVERIFIABLE as a symptom | Only the token-field correction above was checked.

## Views, CSP, display

View not discovered; folder deeper than `views/<name>/view.tsx` (index, catalog, view rendering) | VERIFIED | [live] nested folder gave the "not in the primed views registry" error. [B]
`view.name` must match the folder (catalog, tree) | VERIFIED | [live] mismatch gave the same error. [B]
View tool requires `outputSchema` (catalog, quick table, tree) | VERIFIED | [live] startup error. [B]
View is discovered but blank or fails at runtime (index, view rendering, tree) | VERIFIED | [live] `View error` panel and `[mcp-use] View error:` log line. [B]
View loads forever or reads undefined output; branch on `useToolContext().status` (catalog, tree, view rendering) | VERIFIED, already covered | `skills/mcp-apps/references/views.md`; [live] early `toolOutput` read produced `Cannot read properties of undefined`. [B]
`Cannot find module '@mcp-use/react'` (index, catalog, tree) | VERIFIED | [live] `ERR_MODULE_NOT_FOUND`; the claim "no such package exists" itself needs the npm registry and is not made. [B]
`useWidget` / `useWidgetProps` / `McpUseProvider` not found (index, catalog) | VERIFIED | [types] absent from `react/index.d.ts`. [B]
`window.openai is not defined` in an MCP Apps host (index migration) | UNVERIFIABLE (needs a host or browser) | Rule to feature-detect is in `skills/host-chatgpt/references/window-openai.md`.
`Failed to load resource: unsupported MIME text/html+skybridge` (index migration) | UNVERIFIABLE (exact error string) | The fix half is VERIFIED: [src] `MIME_TYPE="text/html;profile=mcp-app"`, no `skybridge` string in the 2.11.0 JS; covered in `skills/migrate/references/official-sdk.md`.
`@openai/apps-sdk-ui` components render unstyled; `@source` and `@import ".../css"` (index migration) | VERIFIED, already covered | `skills/host-chatgpt/references/apps-sdk-ui.md` (not re-run).
Apps SDK UI component fails in `mcp-use dev` (not in old index) | VERIFIED, already covered | Fact 4; `apps-sdk-ui.md` CG-U18.
View dark mode ignores ChatGPT theme; `useViewTheme()` plus `applyDocumentTheme` (index migration) | VERIFIED, already covered | `apps-sdk-ui.md` theme fixture.
`openai/fileParams` deprecation; use `view.entrypoints` (index migration) | VERIFIED for the type; ChatGPT behavior UNVERIFIABLE | [types] `tools.d.ts:58-66` `entrypoints?: readonly ToolViewEntrypoint[]`; `skills/host-chatgpt/references/extensions.md`.
Model or host cannot act on the View; use `useViewTool` (index) | VERIFIED for the export only | [types] `react/index.d.ts` exports `useViewTool`. Behavior not run.
CSP violation text `Refused to connect to ... violates "connect-src ..."` and the directive-to-bucket map (csp-violations, view-debugging) | Map VERIFIED and already covered; the console string UNVERIFIABLE | `skills/mcp-apps/references/csp.md`; the console line was not reproduced (see note in the views file).
CSP environment variables `CSP_CONNECT_DOMAINS`, `CSP_RESOURCE_DOMAINS`, `CSP_URLS` merge (csp-violations) | VERIFIED, already covered | `csp.md` "observed merge" (not re-run).
Dev CSP adds a `ws://` origin for HMR (csp-violations) | VERIFIED | [live] f14 `connectDomains` included `ws://localhost:3717`, plus `scriptDirectives: ["'unsafe-eval'"]`. Covered in `csp.md`.
Inspector shows "Permissive CSP" and "Declared CSP" renderings (view-debugging) | VERIFIED with different labels | [inspector] the modes are `Permissive` and `Widget-Declared`. [B]
Loosen CSP with `connectDomains: ["*"]` (view-debugging) | UNVERIFIABLE | Not tested; `csp.md` recommends exact hosts and the old 27/05 file says not to widen.
Inspector "Debug Panels" with props, output, metadata, state (view-debugging, debugging-workflow, inspector-walkthrough) | UNVERIFIABLE | [inspector] zero matches for `Debug Panels` in the unzipped bundle.
Inspector "Protocol" toggle between MCP Apps and ChatGPT Apps (view-debugging) | UNVERIFIABLE | [inspector] `ChatGPT Apps` has zero matches; `mcp-apps` exists only as an internal protocol key.
Inspector display modes dropdown with Inline, Picture-in-Picture, Fullscreen, device, locale, timezone (view-debugging) | UNVERIFIABLE | [inspector] `Picture-in-Picture` zero matches; `Fullscreen`, `Locale` and `Timezone` strings exist but the dropdown layout was not driven.
Only `viewConfig.displayModes` are offered to the host (view-debugging) | VERIFIED, already covered | `skills/mcp-apps/references/display-and-state.md`.
`mcp-use screenshot` flags and defaults: `--mcp`, `--server`, `--tool`, `--output`, `--width` 768, `--height` 720, `--device-scale-factor` max 4, `--theme`, `--wait-for`, `--delay`, `--timeout` 30000, `--inspector`, `--cdp-url`, `--json` (view-debugging) | VERIFIED | [cli] `mcp-use screenshot --help`; [live] `--delay 1500 --json` returned `{"path":...,"width":768,"height":119,...}`. Mostly already covered in `references/cli.md`.
No `--arguments` flag; arguments are `key=value`, `key:=json` or one JSON object (view-debugging) | VERIFIED | [cli] `Pass one JSON object or key=value/key:=<json> pairs after the options.`
`screenshot --wait-for` evaluated outside the iframe (not in old material) | VERIFIED, already covered | Fact 4; `references/cli.md`.
View shows only text because the host does not advertise MCP Apps; View works in Inspector but not another host (index, catalog, quick table, tree, view rendering) | VERIFIED as a diagnosis path | [live] probe, `resources/read`, tool `_meta`; host side UNVERIFIABLE without a host. [B]
ChatGPT-specific rendering differences, dual protocol (index) | UNVERIFIABLE (needs ChatGPT) | Not run.
View state resets; wrap in `ThemeProvider`; no `useWidget` (view-debugging) | UNVERIFIABLE (the `ThemeProvider` cause); `useWidget` absence VERIFIED | [types] `react/index.d.ts`.
`structuredContent` is the props object, not nested under `props` (view-debugging) | VERIFIED | [live] f14 view read `toolOutput.title` straight from a flat `structuredContent`; [types] `useToolContext` typed from `outputSchema`.
Hot reload of view edits via HMR; refresh or restart if not (view-debugging) | VERIFIED for dev reload | [live] screenshot reflected an edit about 3 s later without a restart. [B]
Relative asset paths work in dev; production needs assets in `.mcp-use/build/views/<name>/` and `MCP_ASSETS_URL` at build time (view-debugging) | PARTLY VERIFIED | [live] `.mcp-use/build/views/product-card/assets` and `.mcp-use/build/views/public` exist after `mcp-use build`; "set at build time" and the 404-on-images claim were not tested; origin handling is in `csp.md`.
Production view issues: `MCP_URL`, `MCP_ASSETS_URL`, CSP origins (view rendering, csp-violations) | VERIFIED, already covered | `skills/mcp-apps/references/csp.md` production checklist.
Host interactions (`useSendFollowUp`, `useFiles`, display-mode requests) depend on host capabilities (view rendering) | VERIFIED for exports | [types] `react/index.d.ts`; capability behavior needs a host.

## Method pages with no new symptoms

Debugging order Inspector, then logs, then curl (debugging-workflow "tiers", "When stuck") | VERIFIED as method | [live] dev prints one line per request (`tools/call bad-out /mcp 200 client=unknown 5ms`, and `ERROR Invalid Origin: ...` on rejections), which is the "logs" tier.
Decision tree order: cannot start, cannot connect, tools fail, auth fails, views fail (decision-tree) | VERIFIED as a reading order; every leaf is judged in the rows above | No separate claim.
"Hand the repro to `test-by-mcpc-cli` skill" (debugging-workflow, connect-real-clients) | UNVERIFIABLE | Refers to a skill outside this plugin.
Do not add a fake fallback secret for missing env (decision-tree) | UNVERIFIABLE | Advice, not a checkable fact.
