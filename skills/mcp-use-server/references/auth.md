# Authentication

Checked against `dist/oauth/*.d.ts`, `dist/context.d.ts`, `dist/tools.d.ts` (2.11.0). ChatGPT behavior is from OpenAI's reference (O5) and has not been run by this plugin unless stated.

## Providers
Import a provider from its subpath and pass it as `oauth`. Each factory reads its settings from options or environment variables and returns a provider typed with the user shape it produces.

| Provider | Import |
|---|---|
| Auth0 | `import { oauthAuth0Provider } from "mcp-use/oauth/auth0"` |
| Clerk | `import { oauthClerkProvider } from "mcp-use/oauth/clerk"` |
| WorkOS | `import { oauthWorkOSProvider } from "mcp-use/oauth/workos"` |
| Supabase | `import { oauthSupabaseProvider } from "mcp-use/oauth/supabase"` |
| Keycloak | `import { oauthKeycloakProvider } from "mcp-use/oauth/keycloak"` |
| Better Auth | `import { oauthBetterAuthProvider } from "mcp-use/oauth/better-auth"` |
| Scalekit | `import { oauthScalekitProvider } from "mcp-use/oauth/scalekit"` |
| Convex | `import { oauthConvexProvider } from "mcp-use/oauth/convex"` |
| Custom | `import { oauthCustomProvider, createJwtVerifier } from "mcp-use/oauth"` |
| OAuth proxy (GitHub, Google upstream) | `oauthProxy`, `github`, `google`, `upstream`, `upstreamToken` from `"mcp-use/oauth"` |

Common options (`OAuthResourceOptions`): `resource`, `requiredScopes`, `scopesSupported`, `resourceName`, `serviceDocumentationUrl`.

## Mixed auth: public discovery, protected tools
`mixedAuth: true` lets unauthenticated clients connect and list tools, while each tool declares how it may be called with `securitySchemes`.

<!-- fixture: mixed-auth -->
```ts
import { MCPServer } from "mcp-use";
import { oauthAuth0Provider } from "mcp-use/oauth/auth0";
import { z } from "zod";

const server = new MCPServer({
  name: "store",
  version: "1.0.0",
  oauth: oauthAuth0Provider({ domain: "example.us.auth0.com", requiredScopes: ["read:data"] }),
  mixedAuth: true,
});

// Anyone may call. ctx.auth is set only when a valid token was sent.
export const searchProducts = server.tool(
  {
    name: "search-products",
    description: "Search the public catalog. Read-only.",
    inputSchema: z.object({ query: z.string().describe("Search text") }),
    securitySchemes: [{ type: "noauth" }],
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
  },
  async ({ query }, ctx) => ({
    content: [{ type: "text", text: `Results for ${query}${ctx.auth ? ` (signed in as ${ctx.auth.user.id})` : ""}` }],
  }),
);

// Sign-in required. ctx.auth is guaranteed and typed.
export const checkout = server.tool(
  {
    name: "checkout",
    description: "Place an order for the signed-in user. Writes an order.",
    inputSchema: z.object({ cartId: z.string() }),
    securitySchemes: [{ type: "oauth2", scopes: ["orders:write"] }],
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  },
  async ({ cartId }, ctx) => {
    if (!ctx.auth.permissions.includes("orders:write")) {
      return { isError: true, content: [{ type: "text", text: "Forbidden: orders:write required" }] };
    }
    return { content: [{ type: "text", text: `Order placed for ${ctx.auth.user.id} (cart ${cartId})` }] };
  },
);

export default server;
```

Rules on a `mixedAuth` server (from the mcp-use docs, M1):
- A tool without `securitySchemes` requires the provider's `requiredScopes`.
- Resources, templates and prompts always require sign-in.
- A token that is sent is always verified. An invalid or expired token yields HTTP 401, even on a `noauth` tool.
- Views load signed out so ChatGPT can preview them while the connector is created.

## The ChatGPT challenge (HTTP 200)
OpenAI's reference lists `_meta["mcp/www_authenticate"]` as the way a tool result asks ChatGPT to start sign-in. mcp-use answers a call to a protected tool without a token in one of two ways depending on the `User-Agent` (its matcher is `/chatgpt|openai/i`). **Observed on mcp-use 2.11.0 (2026-10-20, fixture `tests/fixtures/p-auth`):**
- `User-Agent: ChatGPT/1.0` → HTTP **200**, `isError: true`, text "Authentication is required for this request.", and `_meta["mcp/www_authenticate"]` = `["Bearer error=\"invalid_token\", …, scope=\"orders:write\", resource_metadata=\"…/.well-known/oauth-protected-resource/mcp\""]`.
- any other user agent (`curl/8`) → HTTP **401** with a `WWW-Authenticate: Bearer …` header.
Check it with `mcp-use-probe --url <mcp url> --host chatgpt --ua chatgpt` (rule CG-A01; it fails if a protected tool answers 401 to ChatGPT's user agent).

## Verified identity vs client hints
- `ctx.auth` is verified: `user`, `scopes`, `permissions`, `payload`, `accessToken`, `clientId`, `expiresAt`, `resource`, `upstream`. Authorize on `permissions` or `scopes`, not on "a user exists".
- `ctx.client.user()` and `ctx.client.info()` are self-reported. Never authorize with them.
- `ctx.auth.upstream` is the upstream provider's token on an OAuth proxy. Never return it in results, views or `_meta`.

## Custom provider
`createTokenVerifier(resource)` must return an object with `verifyAccessToken(token): Promise<AuthInfo>`, which `createJwtVerifier` builds for you. `mapAuthInfo` must return `{ user, payload, permissions }`. `AuthInfo` has `token`, `clientId`, `scopes`, `expiresAt?`, `resource?`, `resourceMetadataUrl?`, `extra?` (no `claims`). The verifier rejects tokens with no `expiresAt`.

<!-- fixture: custom-oauth -->
```ts
import { MCPServer } from "mcp-use";
import { createJwtVerifier, oauthCustomProvider, type OAuthAuthInfo } from "mcp-use/oauth";

interface AppUser {
  id: string;
}

const provider = oauthCustomProvider<AppUser>({
  oauthMetadata: {
    issuer: "https://auth.example.com",
    authorization_endpoint: "https://auth.example.com/oauth/authorize",
    token_endpoint: "https://auth.example.com/oauth/token",
    response_types_supported: ["code"],
  },
  createTokenVerifier: (resource) =>
    createJwtVerifier({
      issuer: "https://auth.example.com",
      jwksUrl: new URL("https://auth.example.com/.well-known/jwks.json"),
      resource,
    }),
  mapAuthInfo: (authInfo: OAuthAuthInfo) => ({
    user: { id: authInfo.clientId },
    payload: authInfo.extra ?? {},
    permissions: authInfo.scopes,
  }),
});

const server = new MCPServer({ name: "custom-auth", version: "1.0.0", oauth: provider });

export default server;
```

## Wrong: a verifier that is a bare function (rejected by the compiler)
<!-- fixture-bad: custom-oauth-function-verifier -->
```ts
import { oauthCustomProvider } from "mcp-use/oauth";

export const provider = oauthCustomProvider<{ id: string }>({
  oauthMetadata: {
    issuer: "https://auth.example.com",
    authorization_endpoint: "https://auth.example.com/oauth/authorize",
    token_endpoint: "https://auth.example.com/oauth/token",
    response_types_supported: ["code"],
  },
  createTokenVerifier: () => async (token: string) => ({ token, clientId: "x", scopes: [] }),
  mapAuthInfo: (a) => ({ user: { id: a.clientId }, payload: {}, permissions: [] }),
});
```

## Security
- Do not log, echo or store bearer tokens or client secrets.
- Keep checks next to the sensitive operation or in narrow `mcp:tools/call` middleware.
- Do not put credentials in `server.settings` or in view state (`${CLAUDE_PLUGIN_ROOT}/skills/host-chatgpt/references/extensions.md`).

Sources: M1, M2, O5, S18.
