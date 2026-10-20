# Asking the user mid-tool (`inputRequired`)

v2 has no `ctx.elicit()`. A tool that needs input returns an `input_required` result; the client collects the answer and calls the tool again with `ctx.inputResponses`. The server keeps no session between the two calls. Verified against `dist/index.d.ts` (re-exports `inputRequired`, `inputResponse`, `acceptedContent`) and the SDK types.

<!-- fixture: elicit-confirm -->
```ts
import { MCPServer, acceptedContent, inputRequired, inputResponse } from "mcp-use";
import { z } from "zod";

const server = new MCPServer({ name: "ops", version: "1.0.0" });

const confirmSchema = z.object({
  approve: z.boolean().describe("Approve the deployment"),
  reason: z.string().optional().describe("Why, for the audit log"),
});

export const deployService = server.tool(
  {
    name: "deploy-service",
    description: "Deploy a service to production after the user confirms. Changes production.",
    inputSchema: z.object({ serviceId: z.string().describe("Service to deploy") }),
    annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: false },
  },
  async ({ serviceId }, ctx) => {
    // 1. A previous round may have been declined or cancelled.
    const response = inputResponse(ctx.inputResponses, "deploy-approval");
    if (response.kind === "elicit" && response.action !== "accept") {
      return { isError: true, content: [{ type: "text", text: "Deployment cancelled by the user." }] };
    }

    // 2. Only accepted, schema-valid content counts as confirmation.
    const confirmation = acceptedContent(ctx.inputResponses, "deploy-approval", confirmSchema);
    if (!confirmation) {
      return inputRequired({
        inputRequests: {
          "deploy-approval": inputRequired.elicit({
            message: `Deploy ${serviceId} to production?`,
            requestedSchema: confirmSchema,
          }),
        },
      });
    }
    if (!confirmation.approve) {
      return { isError: true, content: [{ type: "text", text: "Deployment rejected." }] };
    }

    // 3. Side effects run only after confirmed, validated input.
    return { content: [{ type: "text", text: `Deployed ${serviceId}.` }] };
  },
);

export default server;
```

## URL mode (external authorization)
Use `inputRequired.elicitUrl({ message, url })` to send the user to a page (sign-in, third-party consent) instead of collecting a form.

<!-- fixture: elicit-url -->
```ts
import { MCPServer, inputRequired, inputResponse } from "mcp-use";
import { z } from "zod";

const server = new MCPServer({ name: "connect", version: "1.0.0" });

export const connectAccount = server.tool(
  {
    name: "connect-account",
    description: "Link the user's external account. Sends the user to the provider.",
    inputSchema: z.object({ provider: z.string() }),
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: true },
  },
  async ({ provider }, ctx) => {
    const response = inputResponse(ctx.inputResponses, "authorize");
    if (response.kind === "elicit" && response.action === "accept") {
      return { content: [{ type: "text", text: `Linked ${provider}.` }] };
    }
    if (response.kind === "elicit") {
      // declined or cancelled: do not report success
      return { isError: true, content: [{ type: "text", text: `Linking ${provider} was ${response.action}.` }] };
    }
    return inputRequired({
      inputRequests: {
        authorize: inputRequired.elicitUrl({
          message: `Authorize access to ${provider}`,
          url: `https://${provider}.example.com/oauth/authorize?client_id=app`,
        }),
      },
    });
  },
);

export default server;
```

## Rules
- Validate every retry: `ctx.inputResponses` is client input.
- `ctx.requestState` echoes opaque state across rounds. It is not general storage. Configure `requestState.verify` on the server when that state affects authorization.
- Do not use `ctx.elicit()`: it does not exist in 2.11.0, and the guard rule `STK-09` flags it.
- A client that does not advertise `elicitation` (`ctx.client.can("elicitation")`) cannot answer; return `isError` with instructions instead of waiting.

Sources: M1, M2.
