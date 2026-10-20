# Deploy / production / server-config verdicts (mcp-use 2.11.0, @mcp-use/cli 4.5.0)

Source: old skill `skills/build-mcp-use-server/references/{24-production,25-deploy,08-server-config,03-cli}` at commit d83925f7.
Format: `claim | VERDICT | evidence`. Only VERIFIED claims were carried into `deploy.md`.

Evidence keys
- RAN: live run on a copy of fixture f13 (tools only) or f14 (view), `mcp-use build` then `mcp-use start --port 37xx`, probed with curl and `mcp-use-probe` (work dir /tmp/fx-run-deploy, /tmp/fx-run-deploy-v). Servers stopped afterwards.
- HELP: `<fixtures>/node_modules/.bin/mcp-use <command> --help` (CLI 4.5.0).
- CODE / TYPES: installed `mcp-use@2.11.0` and `@mcp-use/cli@4.5.0` dist `.js` / `.d.ts`.
- DOCS: https://docs.mcp-use.com/... pages fetched 2026-10-20.
- EXISTING: plugin reference already covering it (`skills/mcp-use-server/references/`).
- No docker, gcloud, vercel, wrangler, supabase, railway, deno, bun, kubectl were run. Nothing was deployed, no login, no cloud resource.

## 24-production/01-env-config
1. PORT default 3000; precedence flag > PORT env > server config port > 3000 | VERIFIED | CODE cli chunk-F6ENE4MX.js + start-QYSKMF6H.js; TYPES listen-address.d.ts; RAN `PORT=3728 mcp-use start` listened on 3728
2. HOST default 127.0.0.1; precedence flag > HOST env > config host > default | VERIFIED | same code; RAN `HOST=0.0.0.0 mcp-use start` printed the public-bind warning
3. Localhost-class binds get Host-header (DNS rebinding) protection by default | VERIFIED | RAN 127.0.0.1 bind, `Host: evil.example` -> 403 on /mcp and /health
4. `mcp-use start` sets NODE_ENV=production only if unset (`??=`) | VERIFIED | CODE start-QYSKMF6H.js; RAN tool returned `NODE_ENV=production`
5. NODE_ENV does not change log level | VERIFIED | CODE `resolveLogLevel` reads only MCP_USE_LOG_LEVEL then config then "info"
6. NODE_ENV controls "only" favicon/View dev branding | UNVERIFIABLE | CODE shows branding dev flag uses NODE_ENV, but telemetry also checks `NODE_ENV==="test"`; "only" not provable
7. MCP_URL read at runtime and used for CSP connect/resource origin and view assets | VERIFIED | RAN `MCP_URL=https://api.example.com` -> csp connectDomains/resourceDomains contain it (also ground truth #4)
8. MCP_URL is an origin only, any path is ignored | VERIFIED | RAN `MCP_URL=https://api.example.com/some/path` -> csp shows `https://api.example.com`
9. MCP_URL unset: falls back to request origin | VERIFIED | RAN no MCP_URL -> csp contained `http://127.0.0.1:3721`
10. MCP_URL has a build-time synthetic `http://localhost:3000` default for OAuth entry inspection | UNVERIFIABLE | internal build detail, not observed
11. MCP_ASSETS_URL rewrites the asset manifest at `mcp-use build` and sets view asset origin | VERIFIED | RAN build with `MCP_ASSETS_URL=https://cdn.example.com/mcp-assets` -> manifest.json entries are absolute CDN URLs
12. Provider env vars CLERK_PUBLISHABLE_KEY, CLERK_SECRET_KEY, SUPABASE_URL, SUPABASE_ANON_KEY | CONTRADICTED (provider factories read `MCP_USE_OAUTH_CLERK_FRONTEND_API_URL`, `MCP_USE_OAUTH_SUPABASE_URL`, `MCP_USE_OAUTH_SUPABASE_PROJECT_ID`, `MCP_USE_OAUTH_SUPABASE_JWT_SECRET`, `MCP_USE_OAUTH_AUTH0_DOMAIN`, ...) | CODE mcp-use dist/oauth/*.js; TYPES oauth/clerk.d.ts `@defaultValue MCP_USE_OAUTH_CLERK_FRONTEND_API_URL`
13. Keep secrets in the platform secret manager, never in git | UNVERIFIABLE | policy advice; platform-specific. Verified part: template .gitignore lists .env, .env.local, .env.*.local (RAN cat .gitignore)
14. Constructor `host`/`port` from env are honoured | VERIFIED | CODE start passes `server.port`/`server.host` as the fallback after flag and env
15. No built-in health endpoint or health variable | VERIFIED | CODE grep for "/health" in mcp-use dist = 0; RAN /healthz /ready /livez / -> 404
16. MCP_USE_LOG_LEVEL accepts info, debug, trace and overrides config | VERIFIED | CODE `resolveLogLevel`; TYPES logging.d.ts; EXISTING config-and-lifecycle.md
17. info = one summary line per request, debug = compact payloads, trace = full headers/body | UNVERIFIABLE | only the info-level line was seen (`tools/list /mcp 200 client=unknown 14ms`); debug/trace not run
18. v2 builds a fresh MCP server per request, no persistent session | VERIFIED | RAN no `mcp-session-id` header on tools/list or legacy initialize; every request worked without a handshake (ground truth #4)
19. Env vars must not change while running, no reload hooks | UNVERIFIABLE | not tested
20. `docker run -e PORT=8080 -e NODE_ENV=production -e MCP_URL=... image` | UNVERIFIABLE | docker not installed here
21. Blue-green, PM2, systemd advice | UNVERIFIABLE | generic ops advice

## 24-production/02-error-strategy
22. Return `{isError:true, content}` for expected failures | VERIFIED | RAN a throwing tool came back as `result.isError:true`; EXISTING tools-and-results.md
23. A thrown error is caught by the SDK and returned as isError with the raw message, not an HTTP 500 | VERIFIED | RAN tool `throw new Error("db password=hunter2 failed at /srv/app/db.ts")` -> HTTP 200, `isError:true`, text = full message (leaks secret-looking text and a path)
24. `:complete` works only on `server.on()`, result is 2nd parameter; observers cannot mutate | VERIFIED | EXISTING context-and-middleware.md (types)
25. Exact-method `server.use()` can read and return `next()`'s result | VERIFIED | EXISTING context-and-middleware.md
26. HTTP transport errors are 400/401/413/500 with MCP envelope or plain text | UNVERIFIABLE | only 400 seen (request without Accept); 413/500 not triggered
27. Custom route error via `ctx.status(500)` + `ctx.text()` / Hono `c.json(data, status)` | UNVERIFIABLE | Hono behavior, 503 path not run
28. MCP transport has no built-in timeout; platform timeouts Vercel 25s, Cloud Run default 900s | UNVERIFIABLE | vendor limits; the old files disagree (this file 900s, 05-scaling says 300s)
29. `ctx.signal` fires on client cancel/disconnect | VERIFIED | EXISTING context-and-middleware.md; "Ctrl+C triggers it" UNVERIFIABLE
30. `ctx.sendLog` sends a notification to the client, not a server log | VERIFIED | TYPES context.d.ts "Send a log message notification to the client"
31. `ctx.sendLog` ignores the client's log-level threshold | UNVERIFIABLE | not run
32. Sanitize/regex-redact error text, or log server-side and return a generic message | UNVERIFIABLE | practice; the leak it guards against is VERIFIED (claim 23)

## 24-production/03-health-and-custom-routes
33. `server.get("/health", c => c.json({...}))` registers a root-level route outside basePath | VERIFIED | RAN `/health` -> 200 `{"ok":true}`
34. Cloud Run `gcloud run deploy --health-check-path --health-check-interval ...` | UNVERIFIABLE | gcloud not run; flags not in mcp-use docs
35. Kubernetes readiness/liveness YAML | UNVERIFIABLE | no cluster
36. Serverless needs no graceful shutdown; Node processes may close on SIGTERM | VERIFIED (partly) | RAN SIGTERM to `mcp-use start` -> port closed, no handler needed; TYPES server.d.ts `close()` aborts in-flight exchanges and stops the listener, cannot be revived
37. "No session or stream state exists in v2.8.2" | CONTRADICTED (stale version label; the behavior holds for 2.11.0) | RAN no session header on 2.11.0
38. Cold start adds 100-2000 ms | UNVERIFIABLE | vendor figure
39. Health endpoint should answer in <100 ms, avoid DB in readiness | UNVERIFIABLE | advice
40. HTTP middleware `server.use("*", async (c,next)=>...)` sets headers | UNVERIFIABLE | not run

## 24-production/04-security-hardening
41. Localhost binds reject mismatched Host | VERIFIED | RAN 403 (claim 3)
42. Public bind (0.0.0.0) has no Host validation by default and logs a warning | VERIFIED | RAN `--host 0.0.0.0`: `Host: evil.example` -> 200; stderr `[mcp-use] listen() is serving on 0.0.0.0 without Host validation. Behind a platform edge ... set allowedHosts`
43. `allowedHosts` rejects other Hosts, is port-agnostic | VERIFIED | RAN allowedHosts `["api.example.com"]`: evil -> 403, `api.example.com` -> 200, `api.example.com:8443` -> 200; localhost-class stays allowed
44. `allowedHosts` accepts URLs like `https://api.example.com` | CONTRADICTED (hostnames only; a URL entry matches nothing and every request incl. the real host gets 403) | RAN allowedHosts `["https://api.example.com"]` -> `Host: api.example.com` 403; TYPES config.d.ts "Extra allowed hostnames ... e.g. [\"api.example.com\"]"
45. Platform edge hostname must be listed in allowedHosts (Vercel example) | UNVERIFIABLE | mechanism verified (43), platform behavior not
46. CORS is off by default | VERIFIED | RAN no `cors` option: OPTIONS preflight -> 405, no `access-control-*` headers
47. `cors: {}` enables CORS and reflects the request Origin | VERIFIED | RAN `cors:{}`: preflight 204, `access-control-allow-origin: https://example.com`, `vary: Origin`
48. CORS default methods GET,HEAD,POST,OPTIONS; default allowed headers include Content-Type, Authorization, mcp-protocol-version, mcp-method, mcp-name; credentials default false | VERIFIED | RAN response headers; TYPES CorsOptions
49. `cors.origin` accepts string, string[] or function; `enabled` flag | VERIFIED | TYPES config.d.ts CorsOptions
50. Preflight is answered by CORS middleware with 204 and no MCP handler | VERIFIED | RAN 204 with ACA headers (allowed origin)
51. ChatGPT origin is `https://chatgpt.openai.com` | UNVERIFIABLE | not testable here; EXISTING config-and-lifecycle.md uses chatgpt.com
52. `allowedOrigins` validates Origin on non-GET/HEAD only; unset = off | VERIFIED | RAN unset: evil Origin POST -> 200. Set: POST evil -> 403, GET /health with evil Origin -> 200; TYPES config.d.ts
53. `allowedOrigins: ["https://app.example.com"]` (full origin URL) | CONTRADICTED (entries are hostnames, e.g. `app.example.com`; the URL form rejects the very origin it names) | RAN URL form: `Origin: https://app.example.com` POST -> 403; hostname form -> 200; TYPES "Extra allowed origin hostnames"; TYPES example `allowedOrigins: ["app.example.com"]`. NOTE: EXISTING config-and-lifecycle.md line 22 shows `allowedOrigins: ["https://chatgpt.com"]` and has the same defect
54. Localhost-class origins (`http://localhost:<any port>`) stay allowed once allowedOrigins is set | VERIFIED | RAN POST `Origin: http://localhost:3000` -> 200
55. Localhost-class binds automatically allow `Origin: null` POSTs | CONTRADICTED | RAN 127.0.0.1 bind with allowedOrigins set: POST `Origin: null` -> 403
56. Requests without an Origin header always pass | VERIFIED | RAN POST without Origin -> 200 with allowedOrigins set; TYPES config.d.ts
57. Origin validation also covers custom (non-MCP) routes and preflight | VERIFIED | RAN POST /hook (no such route) evil Origin -> 403, allowed Origin -> 404 (past validation); OPTIONS preflight from a non-listed origin -> 403
58. Pair `cors` with `allowedOrigins`; CORS lets the browser read, Origin validation decides acceptance | VERIFIED | TYPES config.d.ts doc comment on `cors`
59. View asset routes (`<basePath>/_mcp-use/...`) are public with `access-control-allow-origin: *` | VERIFIED | RAN GET /mcp/_mcp-use/views/product-card/assets/*.js with `Origin: null` -> 200, `access-control-allow-origin: *` (no cors option set); public/icon.svg -> 200 image/svg+xml
60. CSP merge order view.csp > CSP_* env > MCP_URL auto-append | UNVERIFIABLE | env vs MCP_URL order seen (CSP_URLS entry first), view.csp precedence is covered by mcp-apps/references/csp.md, not re-run
61. `CSP_URLS` adds to connect, resource, frame and base-uri | VERIFIED | RAN `CSP_URLS=https://x.example.com` -> all four lists contain it (ground truth #4)
62. `CSP_CONNECT_DOMAINS`, `CSP_RESOURCE_DOMAINS`, `CSP_FRAME_DOMAINS`, `CSP_BASE_URI_DOMAINS` exist | VERIFIED | CODE strings in dist; RAN `CSP_CONNECT_DOMAINS` set -> connectDomains = that value + request origin, other lists unaffected
63. Secrets in `structuredContent`/`_meta`/results are visible to the client | VERIFIED | RAN tool result text returned verbatim in the response body. "Views read it via useToolContext" UNVERIFIABLE (not tested)
64. `createRequestStateCodec`, `requestState: { verify }` exist; without a verifier `ctx.requestState` is the raw attacker-controlled wire string | VERIFIED | TYPES index.d.ts export, config.d.ts `requestState` doc
65. Codec: key 32+ bytes, ttlSeconds default 600, signed not encrypted, `verify` error reasons | UNVERIFIABLE | SDK internals not read
66. Always serve over HTTPS; platform/reverse proxy terminates TLS | VERIFIED (self-hosted) | DOCS https://docs.mcp-use.com/v2/typescript/server/deployment/self-hosted.md "Your platform is responsible for TLS, a public domain, authentication, and routing requests to the container."
67. npm audit / SCA in CI | UNVERIFIABLE | generic, not mcp-use specific
68. Never log raw bodies at info | UNVERIFIABLE | advice

## 24-production/05-scaling-stateless
69. Any instance can serve any request, no sticky sessions | VERIFIED | RAN no session id, tools/list and initialize both answered without a prior handshake; ground truth #4
70. Module-scope code runs once per process, not per request ("const db = await connectDatabase() initializes on every request") | CONTRADICTED | RAN module-level `let calls` and `bootId`: three requests gave `boot=05ykkr calls=1,2,3`. State at module scope persists per instance but is not shared across instances
71. Module-level Maps as session/user registries break across instances | VERIFIED | EXISTING config-and-lifecycle.md; follows from claim 70
72. `subscriptions/listen` is a long-lived exception with instance-local delivery | UNVERIFIABLE | my guessed request got "Method not found"; EXISTING advanced.md says cross-request notifications reach only listening clients and are not replayed
73. kubectl scale/set image examples | UNVERIFIABLE | no cluster
74. requestState codec survives instance hops if all share the same key | UNVERIFIABLE | not run
75. oauthProxy needs shared storage and a secret outside localhost | VERIFIED (NEW, not in old text) | TYPES oauth/proxy/index.d.ts "storage ... Required unless the server runs with listen() on a localhost resource ... in-memory store"; "secret ... Defaults to MCP_USE_OAUTH_SECRET"
76. Resource-limit table for Vercel, Cloud Run, Lambda, Railway | UNVERIFIABLE | vendor-controlled numbers
77. Timing via `server.use("mcp:*")`, `ctx.request?.header`, `HOSTNAME` as instance id | VERIFIED (middleware part) / UNVERIFIABLE (HOSTNAME) | EXISTING context-and-middleware.md
78. Serverless: calling `server.close()` on SIGTERM optional | UNVERIFIABLE | platform behavior

## 25-deploy/01-decision-matrix
79. mcp-use Cloud: `mcp-use deploy`, managed builds, logs, GitHub or source upload | VERIFIED | HELP `mcp-use deploy --help`; DOCS https://docs.mcp-use.com/v2/typescript/server/deployment/mcp-use.md "Manufact deploys a GitHub-backed `mcp-use` server and provides its hosted MCP URL, deployments, logs, environment variables" (not run: needs account)
80. Product name "mcp-use Cloud" | CONTRADICTED (current name is Manufact / Manufact Cloud) | HELP "Deploy an MCP server to Manufact Cloud."
81. Branch previews have a documented URL scheme | UNVERIFIABLE | DOCS say copy the URL from the dashboard
82. Vercel Function: `export default server` from `api/mcp.ts` | UNVERIFIABLE | no Vercel account/CLI; docs.mcp-use.com/v2/.../deployment/vercel.md is 404
83. Vercel + Next.js via `withMcpUse` / `createNextHandler` | VERIFIED (exports) / UNVERIFIABLE (Vercel) | EXISTING advanced.md (types `dist/next`, "Not compiled in CI")
84. Cloudflare Workers with `[assets]` binding and `run_worker_first` | UNVERIFIABLE | wrangler not run
85. Google Cloud Run: container running `npm start` (`mcp-use start`), IAM with `--no-allow-unauthenticated` | VERIFIED (docs only) | DOCS https://docs.mcp-use.com/typescript/server/deployment/google.md "Use the `--no-allow-unauthenticated` flag to require authentication."; not run
86. Supabase Edge Functions need a Storage bucket for views, `supabase storage cp`, import map `npm:mcp-use@beta` | CONTRADICTED | DOCS https://docs.mcp-use.com/typescript/server/deployment/supabase.md: views are bundled with Supabase `static_files`, "without Docker, a Storage bucket, project configuration mutation". Rest of the Supabase walkthrough UNVERIFIABLE (account)
87. Deno Deploy, Bun, Hono, Railway wiring (`Deno.serve`, Bun auto-serve of default export, `app.all("/mcp/*")`) | UNVERIFIABLE | runtimes/accounts not available; the old files themselves say mcp-use has no first-party guide for them
88. `server.fetch(Request)` returns a Web `Response` and is the portable boundary | VERIFIED | RAN node script: `await server.fetch(new Request(...))` -> status 200/403 (no listener)
89. Filesystem runtimes: `MCP_URL=... mcp-use build`, ship `.mcp-use/build`, serve the `_mcp-use` subtree | VERIFIED | RAN build + start serves `/mcp/_mcp-use/views/...` and `/mcp/_mcp-use/public/...`
90. Edge with external assets: publish `.mcp-use/build/views/<name>/` at `${MCP_ASSETS_URL}<basePath>/_mcp-use/views/<name>/` | VERIFIED | RAN manifest URL `https://cdn.example.com/mcp-assets/mcp/_mcp-use/views/product-card/assets/product-card-<hash>.js`
91. The CLI does not print a complete destination URL | CONTRADICTED | RAN build printed `MCP_ASSETS_URL set - publish .mcp-use/build/views/ at https://cdn.example.com/mcp-assets/mcp/_mcp-use/views/<view-name>/` and the same for `.mcp-use/build/landing/ ... /_mcp-use/landing/`
92. Co-located edge mapping `<basePath>/_mcp-use/views/...` -> `/views/...`, `/public/...` -> `/views/public/...` | UNVERIFIABLE | on-disk layout confirmed (`.mcp-use/build/views/<name>`, `views/public`), Workers routing not run
93. `npx mcp-use@beta screenshot --mcp <url> --tool <name> --output file.png` | CONTRADICTED (`screenshot` is a subcommand of the installed CLI 4.5.0, no `@beta` needed) | HELP top-level command list; EXISTING cli.md. Not run (needs @mcp-use/client and Chrome)

## 25-deploy/02-pre-deploy-checklist
94. Template scripts build, dev, start, deploy, typecheck | VERIFIED | RAN f13 package.json
95. `.mcp-use/build/` exists after build, with views when present | VERIFIED | RAN `ls .mcp-use/build` = index.js, landing, manifest.json, views
96. `npm run typecheck` before build; `mcp-use build` does not typecheck | VERIFIED | RAN seeded `const bad: number = "x"`: `mcp-use build` exit 0, `mcp-use typecheck` exit 1 `TS2322`
97. `.env.example` documented, no secrets in repo, `.env*` ignored | UNVERIFIABLE | project hygiene; template .gitignore does ignore `.env*` variants (claim 13)
98. Zod on every input, no `z.any()` | UNVERIFIABLE | style advice
99. CORS with explicit origins, no `"*"` in production | VERIFIED (reason) | RAN `cors:{}` reflects any origin and `cors.origin:"*"`+credentials is invalid per EXISTING config-and-lifecycle.md
100. `mcp-use start` needs the default export to expose `listen()` | VERIFIED | CODE start-QYSKMF6H.js: "The default export of ... is not an MCPServer: it has no listen() method."
101. Serverless exports must not call `listen()`; Node platforms call it | UNVERIFIABLE | platform specifics
102. Health endpoint at the root, not under basePath | VERIFIED | RAN (claim 33)
103. Staging smoke test: list tools and call one via Inspector, `mcp-use client` or curl | VERIFIED | RAN curl tools/list and tools/call 200; `mcp-use-probe --url ... --json` -> `protocol 2026-07-28, mode modern, tools 3, errors 0`; client command per EXISTING cli.md
104. Git state clean, pushed, GitHub App access before a GitHub deploy | VERIFIED | DOCS deployment/mcp-use.md "Push the branch you intend to deploy. Install the Manufact GitHub App with access to that repository."
105. Post-deploy: `curl <origin>/health` | UNVERIFIABLE | only exists if the app registers it (claim 15)

## 25-deploy/03-docker
106. Multi-stage Dockerfile (node:22-slim, `npm ci`, `typecheck && build`, `npm ci --omit=dev`, `CMD npm start`, `ENV HOST=0.0.0.0`, `ENV PORT=3000`) | VERIFIED (docs only) | DOCS https://docs.mcp-use.com/v2/typescript/server/deployment/self-hosted.md shows this Dockerfile; image not built here (no docker)
107. Runtime image needs only `.mcp-use/build/` plus prod dependencies | VERIFIED | RAN copied only `.mcp-use/build`, package.json and node_modules into a clean dir; `mcp-use start` served /health 200. (Docs copy the whole `.mcp-use` from the build stage; both work)
108. `USER node`, tini, `docker run --init` | UNVERIFIABLE | docker not available
109. `.dockerignore` should exclude `.mcp-use/cache|state|generated`; `.mcp-use` has build, generated, cache, state, cloud; no sessions dir | VERIFIED (layout) | CODE cli chunk-L7QOY23P.js path map = generated, cache, state, cloud, build manifest, state/tunnel.json. DOCS `.dockerignore` excludes `.mcp-use` whole (safe because the image builds inside)
110. EXPOSE/`docker run -p` local verification | UNVERIFIABLE | docker

## 25-deploy/04-cli-and-org-management and 03-cli/06 (deploy, cloud)
111. `mcp-use login` flags `--api-key`, `--device-code`, `--org`, `--no-open`, `--json` | VERIFIED | HELP login
112. Credentials stored in `~/.mcp-use/config.json` | VERIFIED | CODE homedir + ".mcp-use" + "config.json"
113. `MCP_USE_API_KEY` is read by login when neither `--api-key` nor `--device-code` is given | VERIFIED | CODE commands/identity.js `n["api-key"]??process.env.MCP_USE_API_KEY`
114. Other cloud commands also use `MCP_USE_API_KEY` ahead of the stored key | VERIFIED (NEW) | CODE chunk-ZNWJOBFW.js `process.env.MCP_USE_API_KEY??stored.apiKey`
115. `mcp-use whoami`, `org list|current|use <id>` (no `switch`) | VERIFIED | HELP whoami, org
116. `mcp-use deploy` flags `[path] --org --name --branch --root-dir --region --env --env-file --build-command --start-command --dockerfile --watch-paths --wait-for-ci --new --open --yes/-y --json` | VERIFIED | HELP deploy
117. Managed upload is the positional `hub` (`mcp-use deploy hub`, `--jsonhub`) | CONTRADICTED (the flag is `--no-github`; `deployhub`/`--jsonhub` in the old text are broken renderings) | HELP deploy "Pass --no-github on the first deploy"; CHANGELOG 2.10.0 `mcp-use deploy --no-github`
118. `--json` alone does not authorize mutations; use `--json --yes` (GitHub) or `--json --no-github` (upload) | VERIFIED | HELP deploy "Automation"
119. `--open` cannot combine with `--json`; `--new` needs `--yes` non-interactively; `--watch-paths`/`--wait-for-ci` GitHub-only | VERIFIED | HELP deploy "Incompatible combinations"
120. `--no-github` cannot replace a linked GitHub server; add `--new --yes` | VERIFIED | HELP deploy
121. Archive limit 80 MB; excludes .git, dependencies, build output, .mcp-use, .env*, caches, coverage, OS metadata, symlinks | VERIFIED | HELP deploy "Managed archive"; CODE commands/deploy.js `80*1024*1024`
122. Root `.gitignore` rules also exclude files from the archive | VERIFIED (NEW) | HELP deploy "Paths matched by the project root's .gitignore are also excluded; nested .gitignore files are not read."
123. `--name`, `--region`, `--env` apply only at creation, so use `servers update` / `servers env set` for existing servers | CONTRADICTED | DOCS deployment/mcp-use.md "Flags also apply when redeploying a linked server ... `--name`, `--branch` ..., `--region`, ... update the server's configuration. `--env` and `--env-file` values are written to the server's production variables"
124. `--env` repeats override duplicate keys from `--env-file`; CLI never echoes uploaded values | VERIFIED (docs only) | DOCS deployment/mcp-use.md
125. First deploy writes `.mcp-use/cloud/link.json`; redeploy reuses it; `--new` creates another server | VERIFIED | CODE commands/deploy.js path `.mcp-use/cloud/link.json`; DOCS "`.mcp-use/cloud/link.json` is the only project-local cloud linkage."
126. "Commit link.json with `git add -f`" so CI reuses the server | UNVERIFIABLE | docs do not say to commit it; verified fact: the template .gitignore ignores `.mcp-use/` (RAN)
127. `deploy` starts the deployment and does not wait for the build | VERIFIED (docs) | DOCS deployment/mcp-use.md "The command starts the deployment; it does not wait for the build to finish."
128. `mcp-use deployments list|get|logs|restart|stop|delete`; `logs --build --follow` | VERIFIED | HELP deployments, `deployments logs --help`
129. `mcp-use servers list|get|update|delete|env list|env set|env unset`; `env set --secret` | VERIFIED | HELP servers; CODE commands/servers.js (`--secret` boolean, usage `servers env set <server> <KEY=VALUE> [options]`)
130. Env list never returns values | UNVERIFIABLE | needs an account
131. Do not infer the hostname from the slug; copy the URL from the dashboard | VERIFIED (docs) | DOCS deployment/mcp-use.md "Do not infer a hostname from the server slug; the dashboard is authoritative"
132. Cloud build is independent of local build output | VERIFIED (docs) | DOCS archive excludes build output and `.mcp-use`; `--build-command`/`--start-command` overrides exist (HELP)
133. v1 `.mcp-use/project.json` is ignored by CLI 4, deploy may create a new server | UNVERIFIABLE | no `project.json` string in the CLI dist (consistent with "ignored"), but the new-server outcome needs an account
134. Cloud REST API base `https://cloud.mcp-use.com/api/v1` | CONTRADICTED | CODE default `https://cloud.manufact.com/api/v1`, overridable by `MCP_USE_CLOUD_API_URL` then `MCP_API_URL`
135. `MCP_WEB_URL` overrides the web base | CONTRADICTED (`MCP_USE_CLOUD_WEB_URL`, default `https://manufact.com`) | CODE chunk-ZNWJOBFW.js
136. CI pattern `mcp-use login --api-key "$MCP_USE_API_KEY"` then `mcp-use deploy --org ... --yes`; `MCP_USE_ORG` is not reserved | VERIFIED (syntax) | HELP login/deploy; no `MCP_USE_ORG` string in CLI dist. Not run
137. Device-flow details (30 min poll, stderr text, TTY org prompt) and `logout` not revoking the key | UNVERIFIABLE | needs an account

## 03-cli (build/start/dev/flags/env)
138. `mcp-use build` flags `--entry --mcp-dir --views-dir --source-maps --inline --path` (+ new `--no-views-config`) | VERIFIED | HELP build
139. Build output `index.js`, `manifest.json` {buildId, entryPoint, createdAt, views}, `views/` | VERIFIED | RAN manifest.json; also a `landing/` directory (not in old text)
140. Old tree `views/assets/chart-<hash>.js` | CONTRADICTED (layout is `views/<name>/assets/<name>-<hash>.js` plus `views/public/`) | RAN `ls .mcp-use/build/views` = product-card, public; manifest URL path
141. `mcp-env.d.ts` is written at the project root | VERIFIED | RAN build printed `created mcp-env.d.ts`; ls showed it in the project root
142. `mcp-use start` flags `-p/--port --host --tunnel --with-inspector --path`; exit codes 0/1/2 | VERIFIED | HELP start
143. `start` requires a prior build and says so | VERIFIED | CODE "No production build found (missing .../manifest.json). Run `mcp-use build` first"
144. `start --with-inspector` mounts the Inspector at `/mcp/inspector`; absent otherwise | VERIFIED | RAN with flag 200, without 404
145. `start` prints `http://localhost:<port>/mcp` even when bound to 0.0.0.0 | VERIFIED | RAN `HOST=0.0.0.0` run printed `mcp-use server running at http://localhost:3722/mcp`
146. `mcp-use dev` flags | VERIFIED | HELP dev (EXISTING cli.md)
147. `dev` sets NODE_ENV=development | CONTRADICTED (the old 10-environment-variables says dev never sets it; CLI dist references NODE_ENV only in `start`) | CODE grep over @mcp-use/cli dist
148. `dev --tunnel` sets MCP_URL to the tunnel URL | UNVERIFIABLE | tunnel is a third-party service, not run; old files contradict each other (03-dev vs 10-env)
149. `start --tunnel` output / tunnel.mcp-use.run | UNVERIFIABLE | third-party service
150. `LOG_LEVEL=debug` as a logging switch | CONTRADICTED (only `MCP_USE_LOG_LEVEL`) | CODE no `LOG_LEVEL` string in dist
151. Other CLI env vars: MCP_USE_CLOUD_API_URL / MCP_API_URL, MCP_USE_API_KEY, MANUFACT_CHAT_URL, MCP_USE_TUNNEL_DEBUG, MCP_USE_OAUTH_DEBUG, MCP_USE_CHROME_PATH, PUPPETEER_EXECUTABLE_PATH, CHROME_PATH, npm_config_user_agent | VERIFIED (present) | CODE strings in cli/client/inspector dist
152. `MCP_USE_API` overrides tunnel control plane | UNVERIFIABLE | string not found in any installed package
153. Telemetry switch | VERIFIED (NEW) | CODE `MCP_USE_ANONYMIZED_TELEMETRY==="false"` disables telemetry
154. `create-mcp-use-app` flags, `client`, `screenshot` flags | VERIFIED where already in cli.md | EXISTING cli.md (not re-run)

## 08-server-config
155. Constructor option names (name, version, title, instructions, basePath, host, port, allowedHosts, allowedOrigins, legacy, publicLandingPage, logging, requestState, cors, mixedAuth, skills, oauth) | VERIFIED | EXISTING config-and-lifecycle.md; TYPES config.d.ts
156. basePath must be an absolute pathname, no trailing slash (except `/`) | VERIFIED | RAN `mcp` and `/mcp/` throw; `/api/mcp` and `/` accepted
157. GET/HEAD on basePath with `Accept: text/html` returns the landing page; other GET returns 204 | VERIFIED | RAN 200 text/html; GET without Accept -> 204
158. `listen()` returns `{port,url}` with url using literal `localhost` | VERIFIED | RAN start output
159. `server.fetch` applies no Host validation unless `allowedHosts` is set, and then checks the Host header (missing Host = 403) | VERIFIED | RAN node script: no allowedHosts -> 200 for any host; with allowedHosts: `host: evil.example` 403, `host: api.example.com` 200, no Host header 403
160. OAuth + `server.fetch` or public-host `listen()` without `resource`/`MCP_URL` throws | VERIFIED | RAN fetch: "OAuth requires an explicit resource or MCP_URL when using server.fetch or listening on a non-local host"; listen 0.0.0.0: "OAuth listen() on a public or wildcard host requires an explicit provider resource or valid MCP_URL." (old text quoted only the first); with `MCP_URL` set both work
161. OAuth localhost listen derives `http://localhost:<port>/mcp` | VERIFIED | RAN `listen(3721)` ok without MCP_URL
162. Provider factory `oauthWorkosProvider` | CONTRADICTED (`oauthWorkOSProvider`) | EXISTING auth.md import table
163. `hostValidationMiddleware`, `originValidationMiddleware`, `composeFetch`, `jsonBodyMiddleware`, `getRequestBag` exports; Fetch signature not Hono | VERIFIED (exports) | TYPES index.d.ts line 12; `jsonBodyMiddleware` answers invalid JSON with 400 "Invalid JSON" (CODE)
164. Middleware ctx has `session?: {sessionId}` | VERIFIED | TYPES middleware/mcp-middleware.d.ts:80
165. `server.use` patterns, `mcp:*` pass-through, `server.on` group wildcards | VERIFIED | EXISTING context-and-middleware.md
166. Custom routes: `server.get/post/put/patch/delete/all`, `server.app` | VERIFIED | RAN `server.get("/health")`; EXISTING config-and-lifecycle.md
167. Custom routes sit behind the same Host/Origin/CORS stack | VERIFIED | RAN `/health` with bad Host -> 403 and with CORS enabled got `access-control-allow-origin`; POST custom path with bad Origin -> 403
168. `server.all("*", ...)` breaks the lazily mounted MCP route; use `server.app.notFound`; `server.app.route("/api/admin", router)` | UNVERIFIABLE | not run
169. Lifecycle: construct does not bind; `close()` aborts in-flight and cannot be revived | VERIFIED | TYPES server.d.ts lines 97-98, 400-406
170. `export default server.fetch` / `toNodeHandler(server)` / Next handler | VERIFIED (fetch, node) | RAN server.fetch call; EXISTING advanced.md, config-and-lifecycle.md
171. Kubernetes `terminationGracePeriodSeconds: 30`, "Docker + Railway" Dockerfile with `EXPOSE $PORT` | UNVERIFIABLE | platforms not available

## Platform-specific walkthroughs not carried over
172. Vercel setup (`basePath: "/api/mcp"` matching function path, `includeFiles`, `vercel deploy`) | UNVERIFIABLE | no account
173. `server.fetch` applies no Host validation by default (Vercel page) | VERIFIED | RAN (claim 159)
174. Cloud Run: service account roles, `gcloud run deploy --source`, ID-token curl, "host must be set in `new MCPServer({host:'0.0.0.0'})`" | UNVERIFIABLE (account steps) / CONTRADICTED (host claim) | RAN `HOST=0.0.0.0` env works without touching the constructor; DOCS Dockerfile in self-hosted.md sets `ENV HOST=0.0.0.0`
175. Supabase `basePath: "/functions/v1/mcp-server/mcp"`, `verify_jwt`, `deno.json` imports, `Deno.serve` | UNVERIFIABLE | no account
176. Railway / Bun / Deno / Hono sections | UNVERIFIABLE | claim 87
