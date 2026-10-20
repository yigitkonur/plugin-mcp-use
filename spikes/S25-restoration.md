# S25 — restoring the deleted troubleshooting, deploy and auth knowledge

Question: the pre-collapse skill (`d83925f7`) had troubleshooting, deployment, security and OAuth-debugging material that was removed. Which of it is still true for mcp-use 2.11.0?

Method (2026-10-20): three read-only subagents (`sonnet`, high effort), one per area, each reading the old files with `git show d83925f7:…` and verifying every candidate claim against the installed `mcp-use@2.11.0` / `@mcp-use/cli@4.5.0` types and JS, live runs on copies of the plugin's fixtures (dev and production servers, `curl`, `mcp-use-probe`, a local ES256 issuer for OAuth, no third-party accounts) and the docs.mcp-use.com markdown pages. Each wrote a verdict for every old claim; only VERIFIED claims were allowed into the drafts. The maintainer reviewed the drafts, re-checked the riskiest claims himself and cleaned the text.

| Area | Old claims examined | VERIFIED | CONTRADICTED | UNVERIFIABLE | Result |
|---|---|---|---|---|---|
| Troubleshooting (server + views) | ~135 | 83 (25 already in the plugin) | 13 | 35 | `references/troubleshooting.md` (25 rows), `mcp-apps/references/troubleshooting-views.md` (8 rows) |
| Deploy, production, server-config security | 176 | 106 | 18 | 52 | `references/deploy.md` |
| OAuth debugging | 73 | 43 (+8 already in auth.md) | 12 | 8 | `references/auth-debugging.md` (S23) |

Verdict files (one line per old claim, with its evidence): `spikes/restoration/`. Claims that were contradicted or could not be verified are not in the references.

Maintainer re-checks: 25 error strings and provider env var names from the auth draft exist in `mcp-use/dist`; a non-exported tool is listed and callable and bad arguments return HTTP 200 + `isError` + `Input validation error: …` (probe, `fx-bg`); `allowedOrigins` with a URL is rejected (S24).

Findings that changed this plugin: `allowedOrigins`/`allowedHosts` take hostnames (the config reference was wrong; rule STK-14, S24); the old "tool must be exported to be listed" is false (only the generated types need the export); `oauthProxy` is exported; missing scope is 403; the bare `/.well-known/oauth-protected-resource` is 404; `mcp-use dev` moves to another port when busy; `mcp-use build` does not typecheck.

Unresolved (kept out of the references): `allowedHosts` under `mcp-use dev` still returned 403 for a custom Host in one test while `start` and `server.fetch` honored it; the browser CSP console string; Inspector UI details; the Node 22.22.2 floor (only Node 26.5.0 was available); every hosted-platform target other than the docs-stated ones.

Process note: one of the agents ran a command that printed another process's environment into its own transcript (a local proxy token among other values). It is not in any deliverable or the repository (searched for the value itself); the transcript stays in the local temp directory. The value was shown to a model transcript, so treat that token as exposed and rotate it.
