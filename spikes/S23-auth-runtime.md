# S23 — OAuth behavior of mcp-use 2.11.0, observed

Question: what do the OAuth endpoints and failures really look like, so debugging advice is not from memory?

Setup (2026-10-20, by a read-only subagent, spot-checked by the maintainer): throwaway project from the F13 fixture with `oauthCustomProvider` + `createJwtVerifier` against a local ES256 issuer generated for the run (no third-party service, throwaway tokens), `requiredScopes: ["read"]`, a tool `checkout` with `oauth2` scopes `["orders:write"]`, and `mixedAuth` variants; `mcp-use dev --port 3731`; requests with curl, with and without `User-Agent: ChatGPT/1.0`, and `mcp-use-probe --ua chatgpt`.

Result: the observed request/response table is the section "What the endpoints return" in `skills/mcp-use-server/references/auth-debugging.md`; each checklist row there carries the evidence code of how it was established (T types, J installed JS, R run, D docs).
Maintainer spot-check: 25 error strings and env var names from the draft were searched in the installed `mcp-use/dist`; all present (`MCP_URL must be an absolute origin without a path` is built from a template, `${name} must be an absolute origin without a path`, and prints with `MCP_URL`).

Decision: ship `auth-debugging.md`. 12 claims from the pre-collapse auth material were contradicted by 2.11.0 and are not carried over (for example the bare `/.well-known/oauth-protected-resource` path answers 404; missing scope is 403 not 401; `oauthProxy` is exported; providers do read `MCP_USE_OAUTH_*` env vars).
