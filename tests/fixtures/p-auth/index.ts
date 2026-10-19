// Runnable mixed-auth server: a public tool and a protected one. The probe's ChatGPT-user-agent check hits `checkout` without a token.
import { MCPServer } from "mcp-use";
import { createJwtVerifier, oauthCustomProvider } from "mcp-use/oauth";
import { z } from "zod";

const provider = oauthCustomProvider<{ id: string }>({
  oauthMetadata: { issuer: "https://auth.example.com", authorization_endpoint: "https://auth.example.com/oauth/authorize", token_endpoint: "https://auth.example.com/oauth/token", response_types_supported: ["code"] },
  createTokenVerifier: (resource) => createJwtVerifier({ issuer: "https://auth.example.com", jwksUrl: new URL("https://auth.example.com/.well-known/jwks.json"), resource }),
  mapAuthInfo: (a) => ({ user: { id: a.clientId }, payload: a.extra ?? {}, permissions: a.scopes }),
});

const server = new MCPServer({ name: "p-auth", version: "1.0.0", oauth: provider, mixedAuth: true });

export const search = server.tool(
  { name: "search", description: "Public search. Read-only.", inputSchema: z.object({ q: z.string() }), securitySchemes: [{ type: "noauth" }], annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false } },
  async ({ q }) => ({ content: [{ type: "text", text: `results for ${q}` }] }),
);

export const checkout = server.tool(
  { name: "checkout", description: "Place an order. Writes an order.", inputSchema: z.object({}), securitySchemes: [{ type: "oauth2", scopes: ["orders:write"] }], annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false } },
  async (_a, ctx) => ({ content: [{ type: "text", text: `ordered by ${ctx.auth.user.id}` }] }),
);

export default server;
