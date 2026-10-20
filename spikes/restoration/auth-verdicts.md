# Verdicts on the old 11-auth material (commit d83925f7, 15 files) against mcp-use 2.11.0

Format: `claim | verdict | evidence`. Evidence codes: T = installed types, J = installed JS, R = observed run 2026-10-20 (custom provider, local ES256 issuer, port 3731), D = docs.mcp-use.com/v2 provider page, C = changelog. `ALREADY-IN-auth.md` = covered by skills/mcp-use-server/references/auth.md, not restored. "In A" = placed in auth-debugging.md.

## 01-overview, 02-attaching, 06-debugging, 07-oauth-proxy-removed (server behaviour)
1. v2 supports only providers whose AS implements DCR | CONTRADICTED: `oauthProxy`, `github`, `google`, `upstream` are exported from `mcp-use/oauth` for non-DCR providers | T `dist/oauth/index.d.ts`, C 2.10.0 (`oauthProxy()`)
2. "`oauthProxy` is not exported in v2 ... support-boundary decision" (07) | CONTRADICTED (same as 1) | T index.d.ts, C 2.10.0, D `oauth-proxy.md` in llms.txt
3. Migration pointer `references/28-migration/05-v1-to-v2-auth.md` and the broker example in 07 | UNVERIFIABLE: depends on claim 2 being true; not restored | n/a
4. Discovery is served at `/.well-known/oauth-protected-resource` | CONTRADICTED: the bare path is 404; the document is at `/.well-known/oauth-protected-resource/mcp` (path suffix = resource path) | R. In A
5. `/.well-known/oauth-authorization-server` is served publicly with the provider's `oauthMetadata` | VERIFIED (no suffix variant: `.../mcp` is 404) | R. In A
6. Metadata endpoints need no token | VERIFIED | R
7. Metadata endpoints are CORS-open | VERIFIED: `access-control-allow-origin: *`, OPTIONS 204 echoing requested headers | R, J. In A
8. Only the `basePath` route is gated; custom routes stay public | VERIFIED (`/health` 200 with no token) | R. In A
9. `publicLandingPage: true` exposes the landing page; default needs token | VERIFIED default (GET text/html got 401); flag documented, not run | R, T config.d.ts. In A
10. No `mixedAuth`: no token -> 401 with `WWW-Authenticate` pointing at PRM | VERIFIED | R. In A
11. Invalid, expired, wrong-resource token -> 401 | VERIFIED | R
12. Insufficiently scoped token -> 401 | CONTRADICTED: 403 `insufficient_scope`, `scope=` lists required set | R, J gate. In A
13. Token must include all `requiredScopes` or request is rejected "with 401" | CONTRADICTED on the status (403); the all-scopes rule is VERIFIED | R. In A
14. Challenge on a missing token uses `error="invalid_token"` | VERIFIED (not obvious; mcp-use uses it) | R. In A
15. mixedAuth: list methods public | VERIFIED for `tools/list` (observed) and `resources/list`, `prompts/list` (gate method allow-list) | R, J gate
16. mixedAuth: noauth tool + sent token is strictly verified, invalid/expired -> 401 | ALREADY-IN-auth.md (also observed: `JWT verification failed`) | R. In A (as debugging row)
17. Protected tools under mixedAuth: ChatGPT HTTP 200 + `isError` + `_meta["mcp/www_authenticate"]`, others 401/403 | ALREADY-IN-auth.md. New detail observed: invalid token and `insufficient_scope` also return 200 for ChatGPT on `tools/call`; `tools/list` with ChatGPT UA stays 401 | R. In A
18. Resource resolution order: explicit `resource` > `MCP_URL`+`basePath` > localhost fallback only on loopback listen | VERIFIED | J, R
19. `resource` must exactly match `basePath` | VERIFIED: `OAuth resource path must exactly match basePath (/mcp)` | J. In A
20. Error `"OAuth requires an explicit resource or MCP_URL when using server.fetch or listening on a non-local host."` | VERIFIED (printed with `--host 0.0.0.0`) | R. In A
21. `MCP_URL` may be the full endpoint (Scalekit/Convex snippets: `MCP_URL=https://mcp.example.com/mcp`) | CONTRADICTED: `MCP_URL must be an absolute origin without a path` | R, D scalekit/convex. In A
22. `requiredScopes` has no built-in default for any provider | VERIFIED (factories pass none) | J
23. Better Auth is the ONLY provider with a default `scopesSupported` (`openid profile email offline_access`) | CONTRADICTED: Convex has the same default | R (prov.mjs output), J convex.js. In A
24. `jwks_uri` appears only in some providers' metadata (Auth0 omits) | VERIFIED (Auth0, Clerk, WorkOS, Supabase, Keycloak omit; Better Auth, Scalekit, Convex include) | R
25. All 8 built-in factories are thin wrappers around `oauthCustomProvider` | VERIFIED | J provider files
26. Runtime shape of `ctx.auth` (user, payload, accessToken, scopes, permissions, clientId?, expiresAt, resource?) | ALREADY-IN-auth.md (plus `upstream`); `clientId` can be undefined for WorkOS/Supabase | T context.d.ts. In A (one gotcha)
27. Use `ctx.auth.user.id` (not `userId`); every provider's user has `id` | VERIFIED | T all provider .d.ts. Not restored (trivial)
28. `ctx.client` is unverified | ALREADY-IN-auth.md | T context.d.ts
29. Scopes vs permissions; guard patterns by scope/permission/role | ALREADY-IN-auth.md (authorize on permissions or scopes). Per-provider permission sources restored in A | J
30. Debug logging: `logging: { level: "debug" }` "logs include token claims (truncated); trace for full headers" | CONTRADICTED: token claims come from env `MCP_USE_OAUTH_DEBUG`; `MCP_USE_LOG_LEVEL=trace` dumps headers/bodies but `authorization` printed as `[REDACTED]`, no `eyJ` found | R, J, T config.d.ts. In A
31. Debug reason is visible to the client | CONTRADICTED: client gets only `JWT verification failed` for sig/iss/exp; audience errors are specific | R. In A
32. Inspector at `/mcp/inspector` has an Auth panel | UNVERIFIABLE: Inspector disabled in the run (`--no-inspector`, machine loaded) | n/a
33. Token cache "401 after refresh: old token cached" | UNVERIFIABLE: client behaviour, not server | n/a
34. "Decode with jwt.io" and JWKS curl checklist steps | UNVERIFIABLE as claims; generic. Replaced by the debug-log row | n/a

## 05 custom provider
35. `createTokenVerifier` returns an object with `verifyAccessToken`, not a bare function | ALREADY-IN-auth.md | J (`must return an OAuthTokenVerifier`)
36. `mapAuthInfo` returns `{ user, payload, permissions }`; claims at `authInfo.extra`, not `claims` | ALREADY-IN-auth.md | T
37. Framework validates returned AuthInfo (string token/clientId, string[] scopes, future `expiresAt`) and the `resource` | VERIFIED; exact messages restored | J. In A
38. Only `issuer` of `oauthMetadata` is validated (secure HTTP(S)) | VERIFIED: `oauthMetadata must include a string issuer` | J. Not restored
39. `createJwtVerifier` options (issuer, jwksUrl, resource, audience, issuerBoundAccessTokens, algorithms, key) | VERIFIED; `audience`+`issuerBoundAccessTokens` throws | T jwt.d.ts. Not restored (type file is the source)
40. `createJwtVerifier` requires `exp` and `sub` | VERIFIED (`requiredClaims`) | J
41. Old snippets use `jwtVerify`/`createRemoteJWKSet` without importing them | CONTRADICTED as written (does not compile); not restored | J
42. Inherited options `resource, requiredScopes, scopesSupported, resourceName, serviceDocumentationUrl` | ALREADY-IN-auth.md | T provider.d.ts
43. `oauthMetadata` may be a function of the resource; `setup(host)` hook | VERIFIED but not in old material; missing from auth.md | T provider.d.ts, C (setup hook #2405; host.route 2.10.0). Not restored (out of scope)
44. HS256 and introspection verifier examples | UNVERIFIABLE: not run | n/a

## Providers
45. Providers read no env vars (all 8 files) | CONTRADICTED: every factory falls back to `MCP_USE_OAUTH_<PROVIDER>_*` | T `@defaultValue`, R, C 2.2.0. In A
46. Env names: `MCP_USE_OAUTH_AUTH0_DOMAIN`, `_CLERK_FRONTEND_API_URL`, `_WORKOS_SUBDOMAIN`, `_SUPABASE_PROJECT_ID/_URL/_JWT_SECRET`, `_KEYCLOAK_SERVER_URL/_REALM`, `_BETTER_AUTH_URL`, `_SCALEKIT_ENVIRONMENT_URL/_RESOURCE_ID`, `_CONVEX_AUTH_URL` | VERIFIED (old files only named the last three; the rest used app-convention names) | T, J. In A
47. Auth0: `domain` must include `https://` | CONTRADICTED: bare host accepted | R. In A
48. Auth0: no `audience` option | VERIFIED, but `MCP_USE_OAUTH_AUTH0_AUDIENCE` becomes `resource` | R, D. In A
49. Auth0 dashboard steps (Resource Parameter Compatibility Profile, domain-level connections, API identifier = resource, `rfc9068_profile_authz`) | VERIFIED against docs only | D auth0. In A
50. Auth0 "Roles must be enabled in Applications -> Roles" | UNVERIFIABLE (dashboard UI path) | n/a
51. Auth0 roles from `roles`, permissions from `permissions` claim | VERIFIED | J. In A
52. Clerk: `audience` vs issuer-bound verification mutually exclusive | VERIFIED | J. In A
53. Clerk: `roles` = `[org_role]` or `[]`; `permissions` from `org_permissions` | VERIFIED | J. In A
54. Clerk: "Frontend API URL, not API key; safe to embed" / DCR enable / `user:org:read` | DCR + scope VERIFIED (D); "safe to embed" UNVERIFIABLE | D clerk
55. WorkOS: bare host or https origin; path throws | VERIFIED (`WorkOS subdomain must be a hostname or HTTPS origin`) | R. In A
56. WorkOS: dashboard DCR, CIMD, resource indicator | VERIFIED against docs only | D workos. In A
57. WorkOS: no clientId/secret, no audience | VERIFIED | T workos.d.ts
58. Supabase: projectId regex, `supabaseUrl` precedence, `jwtSecret` >= 32 bytes, default audience `authenticated`, ES256 JWKS default | VERIFIED | J, T, R. In A
59. Supabase: permissions = `aal:<level>`; `role` is the Postgres role; no `roles` array | VERIFIED | J, T
60. Supabase: RLS via per-request client with `Authorization: Bearer ${ctx.auth.accessToken}` | VERIFIED against docs only | D supabase. Not restored (recipe)
61. Supabase: dashboard OAuth 2.1 server, Dynamic OAuth Apps, consent route | VERIFIED against docs only | D supabase. In A
62. Keycloak: issuer `<serverUrl>/realms/<realm>`; trailing slash fine; realm with `/?#` throws | VERIFIED | R. In A
63. Keycloak: `roles` realm only; client roles -> `resource:role` permissions | VERIFIED | J. In A
64. Keycloak: no `audience` option; Initial Access Token / DCR advice | no option VERIFIED; advice VERIFIED against docs only; env `MCP_USE_OAUTH_KEYCLOAK_AUDIENCE` (missing from old) overrides `resource` | T, D keycloak. In A
65. Better Auth: `authURL` includes base path; derives `oauth2/authorize|token|register`, `jwks` | VERIFIED | R. In A
66. Better Auth: claims mapped (`email, name, picture, email_verified, sid, is_anonymous/isAnonymous, roles, permissions`), `customAccessTokenClaims` | VERIFIED (mapper in J; `customAccessTokenClaims` from D) | J, D. In A
67. Better Auth: separate Hono app needs CORS, `trustedOrigins`, path-insertion metadata route; memory adapter resets | VERIFIED against docs only | D better-auth. In A (first two)
68. Scalekit: options, `res_` prefix, extra `audience`, dual issuer, machine `subjectType` | VERIFIED | R, J, T. In A
69. Scalekit: "secret-less resource server" | VERIFIED (docs sentence) | D scalekit
70. Convex: `authURL` = issuer incl. mount path, `userinfo_endpoint` advertised; `permissions: []`; `clientId` from `cid` | VERIFIED | J. In A
71. Convex: DCR must be enabled in the component; "Convex Auth alone is not sufficient" | VERIFIED (T says DCR off by default; sentence from D) | T convex.d.ts, D convex. In A
72. Convex: "authURL must have no trailing slash" | UNVERIFIABLE as a rule: code strips a trailing slash; not run for Convex | J convex.js
73. Provider decision table (Best For column) | UNVERIFIABLE (marketing judgment) | n/a
