# Deploying an mcp-use server

Verified for mcp-use 2.11.0 and `@mcp-use/cli` 4.5.0 on 2026-10-20 (S25). Evidence tags: `ran` = observed on a fixture copy built with `mcp-use build` and served with `mcp-use start`; `help` = the installed CLI's `--help`; `types` / `code` = installed package files; `docs` = a docs.mcp-use.com page; `existing` = another reference in this plugin. **Nothing here was deployed**: cloud, Docker and platform steps were not run (no account, no Docker), so those rows carry `docs` tags only. Deploying changes remote state: run `mcp-use deploy` only when the user asks.

## Which target

| Target | How | Evidence |
|---|---|---|
| Your own Node host or VM | `npx mcp-use build` then `npx mcp-use start --port <n> --host <h>` | [ran: build then start, probe answered tools/list 200] [help: mcp-use start --help] |
| Docker, your own infrastructure | Dockerfile from the docs: `npm ci`, `npm run typecheck && npm run build`, then a runtime stage with `ENV HOST=0.0.0.0`, `ENV PORT=3000`, `CMD ["npm","start"]` | [docs: https://docs.mcp-use.com/v2/typescript/server/deployment/self-hosted.md] (image not built here) |
| Manufact Cloud (hosted) | `npx mcp-use deploy`; `--no-github` uploads local source instead of using GitHub | [help: mcp-use deploy --help] [docs: https://docs.mcp-use.com/v2/typescript/server/deployment/mcp-use.md "Manufact deploys a GitHub-backed `mcp-use` server and provides its hosted MCP URL, deployments, logs, environment variables"] |
| Google Cloud Run | container running `npm start`, deployed with `gcloud run deploy ... --no-allow-unauthenticated` | [docs: https://docs.mcp-use.com/typescript/server/deployment/google.md "Use the `--no-allow-unauthenticated` flag to require authentication."] (not run) |
| Supabase Edge Functions | function forwards to `server.fetch`; views bundled with Supabase `static_files` | [docs: https://docs.mcp-use.com/typescript/server/deployment/supabase.md "without Docker, a Storage bucket, project configuration mutation"] (not run) |
| Next.js app | `withMcpUse()` plus `createNextHandler()` | [existing: advanced.md] |
| Existing Node `http`/Express app | `toNodeHandler(server)` from `mcp-use/node` | [existing: advanced.md] |
| Any host that calls a Web fetch handler | `await server.fetch(new Request(url))` returns a `Response`, no listener involved | [ran: node script, `server.fetch(...)` -> status 200/403] |

Not covered because they were not verifiable here: Vercel Functions, Cloudflare Workers, Deno Deploy, Bun, Hono, Railway. Treat them as the `server.fetch` row and check the host's own docs. [docs: https://docs.mcp-use.com/v2/typescript/server/deployment/vercel.md returns 404]

Rules that decide the target:
- `mcp-use start` needs the built entry to `export default` the `MCPServer` (an object with `listen()`); otherwise it stops with "The default export of ... is not an MCPServer: it has no listen() method." [code: cli dist]
- `mcp-use deploy` mutates remote state (creates a server, may create a GitHub repository, commit and push with `--yes`). Run it only when the user asks. [help: mcp-use deploy --help] [docs: deployment/mcp-use.md]
- Hosted Manufact URLs are not predictable: copy the MCP URL from the dashboard. [docs: deployment/mcp-use.md "Do not infer a hostname from the server slug"]
- Self-hosting means you provide TLS, domain and authentication. [docs: self-hosted.md "Your platform is responsible for TLS, a public domain, authentication, and routing requests to the container."]

## Pre-deploy checklist

1. Types pass: `npx mcp-use typecheck` (exit 1 and `TS2322` on a seeded type error). `mcp-use build` does not typecheck: same error, build exit 0. So run `npm run typecheck && npm run build`. [ran: both commands on a copy with `const bad: number = "x"`]
2. Build works and produces the layout: `npx mcp-use build`, then `ls .mcp-use/build` shows `index.js`, `landing`, `manifest.json`, `views`. [ran: f13 and f14 copies]
3. Views are built with the public origin: `MCP_URL=https://api.example.com npx mcp-use build` (origin only; a path in `MCP_URL` is dropped). [ran: csp showed `https://api.example.com` for `MCP_URL=https://api.example.com/some/path`]
4. Default export is the server: last line `export default server;`. [code: cli dist]
5. It starts from the build alone: copy only `.mcp-use/build`, `package.json` and `node_modules` to a clean directory, run `PORT=3721 npx mcp-use start`, `curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3721/health` -> 200 (the `/health` route is the app's own, see Health). [ran]
6. Protocol is reachable: `node bin/mcp-use-probe --url http://127.0.0.1:<port>/mcp --json` -> `"protocol":"2026-07-28","mode":"modern","tools":3,"counts":{"error":0,...}`; or `curl -X POST -H 'Content-Type: application/json' -H 'Accept: application/json, text/event-stream' -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' http://127.0.0.1:<port>/mcp` -> 200. [ran]
7. The listener binds where the host expects: `--host`/`HOST` and `--port`/`PORT`; default is `127.0.0.1:3000`. Behind a container or proxy use `HOST=0.0.0.0`. [help: mcp-use start --help] [ran: `HOST=0.0.0.0 mcp-use start` printed the public-bind warning]
8. Errors do not leak: a tool that throws returns HTTP 200 with `isError:true` and the raw message, so catch and return a generic message. Proof: call the tool and read the text. [ran: thrown `db password=hunter2 failed at /srv/app/db.ts` came back verbatim]
9. Host/Origin/CORS policy is set and probed, see Security hardening. [ran: probe matrix]
10. Health route exists if the platform needs one: add `server.get("/health", (c) => c.json({ ok: true }))`; mcp-use has no built-in health path (`/health`, `/healthz`, `/ready`, `/livez` and `/` were 404 without it). [ran] [code: no "/health" string in mcp-use dist]
11. Secrets are not in git: the generated template ignores `.env`, `.env.local`, `.env.*.local` and `.mcp-use/`. [ran: `cat .gitignore` in the f13 copy]
12. Cloud deploy only: `git remote get-url origin`, `git branch --show-current`, `git status --short`; push the branch; the Manufact GitHub App must have access. [docs: deployment/mcp-use.md "Push the branch you intend to deploy."]
13. After a cloud deploy, do not trust the public URL until the deployment succeeded: `npx mcp-use deployments get <id>` and `npx mcp-use deployments logs <id> --build --follow`. `deploy` starts a deployment and does not wait for the build. [docs: deployment/mcp-use.md] [help: mcp-use deployments logs --help]
14. A view renders from the public URL: `npx mcp-use screenshot --mcp <url> --tool <name> --output out.png` (needs `@mcp-use/client` and Chrome). [help: top-level command list] [existing: cli.md]

### Cloud deploy flags (Manufact)
- `mcp-use deploy [path] --org --name --branch --root-dir --region --env KEY=VALUE --env-file --build-command --start-command --dockerfile --watch-paths --wait-for-ci --no-github --new --open -y/--yes --json`. [help: mcp-use deploy --help]
- `--json` never prompts and does not authorize mutations: use `--json --yes` (GitHub) or `--json --no-github` (upload). `--open` cannot be combined with `--json`. `--new` needs `--yes` when non-interactive. `--watch-paths` and `--wait-for-ci` are GitHub-only. [help: mcp-use deploy --help]
- The managed upload is capped at 80 MB compressed and excludes `.git`, dependencies, build output, `.mcp-use`, `.env*`, caches, coverage, OS metadata, symlinks and anything matched by the root `.gitignore` (nested ones are not read). [help: mcp-use deploy --help] [code: cli dist `80*1024*1024`]
- The first deploy writes `.mcp-use/cloud/link.json`, which later deploys reuse; `--new` ignores it. The template `.gitignore` ignores `.mcp-use/`. [code: cli dist] [docs: deployment/mcp-use.md "the only project-local cloud linkage"] [ran: .gitignore]
- Flags also apply when redeploying a linked server: `--name`, `--branch`, `--region`, `--root-dir`, `--build-command`, `--start-command`, `--dockerfile` update its configuration and `--env`/`--env-file` write production variables (or preview variables with `--branch`). [docs: deployment/mcp-use.md]
- Server settings without deploying: `mcp-use servers list|get|update|delete` and `mcp-use servers env list|set|unset <server> [KEY=VALUE]` (`env set` has `--secret`). [help: mcp-use servers --help] [code: cli dist]
- Sign-in: `mcp-use login --api-key <key> --org <org>` or `--device-code <code>`; `MCP_USE_API_KEY` is read by `login` when neither is passed and by the other cloud commands before the stored key. Credentials live in `~/.mcp-use/config.json`. [help: mcp-use login --help] [code: cli dist, dist]
- Account commands: `whoami`, `org list|current|use <id-or-slug>` (no `switch`), `logout --yes`. [help: mcp-use org --help, logout --help]

## Environment variables

| Name | Effect | Seen |
|---|---|---|
| `PORT` | listener port for `dev`/`start`; order: `--port`, `PORT`, server config `port`, 3000 | [ran: `PORT=3728 mcp-use start`] [code: cli dist] [types: listen-address.d.ts] |
| `HOST` | bind host; order: `--host`, `HOST`, server config `host`, `127.0.0.1` | [ran: `HOST=0.0.0.0`] [code: cli dist] |
| `NODE_ENV` | `mcp-use start` sets `production` if unset (never overrides). It does not change the log level | [ran: tool printed `NODE_ENV=production`] [code: cli dist; `resolveLogLevel`] |
| `MCP_URL` | public origin of the server (scheme and host only). Used for view CSP `connectDomains`/`resourceDomains`; falls back to the request origin when unset. OAuth on `server.fetch` or a public host needs it (or a provider `resource`) | [ran: csp with and without it] [ran: OAuth `fetch` and `listen(0.0.0.0)` threw without it, worked with it] |
| `MCP_ASSETS_URL` | origin (optionally with path) that hosts view assets. At build it rewrites `manifest.json` to absolute URLs and prints where to publish `views/` and `landing/` | [ran: build with `https://cdn.example.com/mcp-assets`] |
| `CSP_URLS` | adds the origin to connect, resource, frame and base-uri | [ran: all four lists contained it] [existing: mcp-apps/references/csp.md] |
| `CSP_CONNECT_DOMAINS`, `CSP_RESOURCE_DOMAINS`, `CSP_FRAME_DOMAINS`, `CSP_BASE_URI_DOMAINS` | per-category additions | [ran: `CSP_CONNECT_DOMAINS` changed only connectDomains] [code: strings in mcp-use dist] |
| `MCP_USE_LOG_LEVEL` | `info`, `debug` or `trace`; overrides `logging.level`; default `info` | [code: `resolveLogLevel`] [types: logging.d.ts] [existing: config-and-lifecycle.md] |
| `MCP_USE_ANONYMIZED_TELEMETRY` | the value `false` disables mcp-use telemetry | [code: mcp-use dist `env("MCP_USE_ANONYMIZED_TELEMETRY")==="false"`] |
| `MCP_USE_OAUTH_<PROVIDER>_*` | provider settings, e.g. `MCP_USE_OAUTH_CLERK_FRONTEND_API_URL`, `MCP_USE_OAUTH_AUTH0_DOMAIN`, `MCP_USE_OAUTH_AUTH0_AUDIENCE`, `MCP_USE_OAUTH_SUPABASE_URL`, `MCP_USE_OAUTH_KEYCLOAK_REALM`. Not `CLERK_SECRET_KEY`-style names | [types: oauth/clerk.d.ts, oauth/auth0.d.ts `@defaultValue`] [code: mcp-use dist/oauth] |
| `MCP_USE_OAUTH_SECRET` | secret for `oauthProxy` (32+ characters; array to rotate). Required outside a localhost `listen()` | [types: oauth/proxy/index.d.ts] |
| `MCP_USE_OAUTH_DEBUG` | verbose OAuth logging | [code: mcp-use dist `process.env.MCP_USE_OAUTH_DEBUG`] |
| `MCP_USE_API_KEY` | cloud API key for the CLI (CI) | [code: cli dist, dist] |
| `MCP_USE_CLOUD_API_URL`, `MCP_API_URL` | cloud API base; first wins; default `https://cloud.manufact.com/api/v1` | [code: cli dist] |
| `MCP_USE_CLOUD_WEB_URL` | cloud web base, default `https://manufact.com` | [code: cli dist] |
| `MANUFACT_CHAT_URL` | chat endpoint passed to the Inspector when `start --with-inspector` | [code: cli dist] |

App secrets and database URLs are plain `process.env` values read in your code; the platform (container env, `mcp-use deploy --env`, `mcp-use servers env set`) supplies them. [help: mcp-use deploy --help] There is no `LOG_LEVEL` switch. [code: no such string in dist]

## Security hardening

Host header (DNS rebinding)
- Bound to `127.0.0.1`, any `Host` that is not localhost-class gets 403, on `/mcp` and on custom routes. [ran: `Host: evil.example` -> 403 on POST /mcp and GET /health]
- Bound to `0.0.0.0` there is no Host validation by default and `listen()` warns: `listen() is serving on 0.0.0.0 without Host validation ... set allowedHosts to restrict it`. [ran: evil Host -> 200]
- `allowedHosts: ["api.example.com"]` takes hostnames, not URLs, ignores the port, and keeps localhost allowed. [ran: evil -> 403, `api.example.com` -> 200, `api.example.com:8443` -> 200] [types: config.d.ts]
- A URL entry such as `https://api.example.com` matches nothing: the real host gets 403. [ran: allowedHosts `["https://api.example.com"]`]
- `server.fetch` does no Host check unless `allowedHosts` is set; with it, the `Host` header is checked and a missing header is 403. [ran: node script on the built server]

Origin
- `allowedOrigins` is off by default (any Origin accepted). [ran: evil Origin POST -> 200] [types: config.d.ts]
- Entries are origin hostnames: `allowedOrigins: ["app.example.com"]`. With `["https://app.example.com"]` the matching `Origin: https://app.example.com` is rejected (403). [ran: both forms] [types: config.d.ts "Extra allowed origin hostnames"]
- Once set, only non-GET/HEAD requests are checked: POST from an unlisted origin 403, GET `/health` with the same Origin 200, preflight from an unlisted origin 403. [ran]
- `http://localhost:<any port>` stays allowed, a request without `Origin` passes, and `Origin: null` POST is rejected (403) even on a 127.0.0.1 bind. [ran]
- It also guards custom routes: POST to an unknown path with an unlisted Origin gives 403, with a listed one 404. [ran]

CORS
- Off by default: preflight is 405 and no `access-control-*` header is sent. [ran]
- `cors: {}` reflects whatever Origin the browser sends (preflight 204, `access-control-allow-origin: <that origin>`, `vary: Origin`). List origins instead. [ran]
- With `cors: { origin: ["https://app.example.com"], credentials: true }` the allowed origin gets 204 with `access-control-allow-credentials: true`, methods `GET, HEAD, POST, OPTIONS`, headers `Content-Type, Authorization, mcp-protocol-version, mcp-method, mcp-name`. [ran]
- CORS only lets the browser read the response; `allowedOrigins` decides acceptance, so configure both. [types: config.d.ts doc on `cors`]
- `cors.origin: "*"` with `credentials: true` is invalid. [existing: config-and-lifecycle.md]
- View asset routes under `<basePath>/_mcp-use/` are public and send `access-control-allow-origin: *` even without a `cors` option. [ran: GET .../views/product-card/assets/*.js with `Origin: null` -> 200]

Auth and secrets
- OAuth with a public host or `server.fetch` requires `MCP_URL` (or a provider `resource`), otherwise startup throws "OAuth requires an explicit resource or MCP_URL ..." / "OAuth listen() on a public or wildcard host requires an explicit provider resource or valid MCP_URL." [ran: both throws, both fixed by `MCP_URL`]
- `oauthProxy` needs a `secret` and a shared `storage` anywhere except a localhost `listen()`. [types: oauth/proxy/index.d.ts]
- Provider setup, `ctx.auth`, noauth tools: [existing: auth.md].
- Without `requestState.verify`, `ctx.requestState` is the raw, attacker-controlled string. [types: config.d.ts] [existing: elicitation.md]
- Anything in a tool result, including `structuredContent` and `_meta`, is sent to the client in plain form, and a thrown error message is returned unredacted. Keep secrets and stack paths out of both. [ran: boom tool]
- `mcp-use start` does not mount the Inspector unless `--with-inspector` is passed (`/mcp/inspector` 404 without, 200 with); do not pass it on a public listener. [ran]
- `mcp-use dev --tunnel` / `start --tunnel` publish a local server on a public URL; do not use with real data. [existing: cli.md] [help: mcp-use start --help]
- Telemetry can be turned off with `MCP_USE_ANONYMIZED_TELEMETRY=false`. [code]

Safe production skeleton (verified option names):
<!-- fixture: deploy-skeleton -->
```ts
import { MCPServer } from "mcp-use";

const server = new MCPServer({
  name: "catalog", version: "1.0.0",
  allowedHosts: ["api.example.com"],            // hostnames only
  allowedOrigins: ["app.example.com"],          // hostnames only
  cors: { origin: ["https://app.example.com"], credentials: true },
});
server.get("/health", (c) => c.json({ ok: true }));
export default server;
```
[ran: this combination, plus `Host`/`Origin` matrix] [types: config.d.ts]

## Scaling and statelessness
- No session: tools/list and a legacy `initialize` both succeed on a fresh connection and no `mcp-session-id` header is returned, so any instance can serve any request and a load balancer needs no stickiness. [ran: curl -i on both] [existing: config-and-lifecycle.md]
- Responses to POST are `text/event-stream` with `x-accel-buffering: no`; a proxy must not buffer them. [ran: response headers]
- Module-scope code runs once per process and survives across requests (`calls=1,2,3` with the same `boot` id), so module state is per instance, not shared. Put shared state in a database or cache. [ran: counter tool] [existing: config-and-lifecycle.md]
- `mcp-use start` stops on SIGTERM without custom code (port closed within 2 s). In a custom listener, `server.close()` aborts in-flight exchanges and stops the listener; a closed server cannot be reused. [ran: `kill -TERM`] [types: server.d.ts]
- Cross-request notifications (`notifyToolsChanged`, ...) reach only clients currently listening and are not replayed. [existing: advanced.md]
- `oauthProxy` state lives in `storage`; use a shared store when running more than one instance. [types: oauth/proxy/index.d.ts]
- `requestState` is not storage; verify it with a codec if it affects authorization. [existing: elicitation.md, context-and-middleware.md]
- Request timing: wrap with `server.use("mcp:*", ...)`; observers via `server.on("mcp:tools/call:complete", (ctx, result) => ...)` cannot change results. [existing: context-and-middleware.md]

Sources: M2, S24, S25.
