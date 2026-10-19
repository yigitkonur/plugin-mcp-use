# Tool and resource metadata for ChatGPT

Sources are OpenAI's reference (O5), plugin guidelines (O4), MCP extensions spec (O6) and the build guide (O1), plus mcp-use 2.11.0 types and observed output (S11). "mcp-use:" lines say how to produce the field.

## Tool annotations (O4, O5)
`readOnlyHint`, `destructiveHint` and `openWorldHint` are **required explicit booleans on every tool**; `idempotentHint` is optional. Automated review can flag missing or wrong values (an appeal is possible). The hints only change how ChatGPT frames the call to the user; the server must still enforce authorization.
- `readOnlyHint: true`: only retrieves or computes; creates, updates, deletes or sends nothing outside the conversation.
- `destructiveHint: true`: may delete or overwrite user data, so the host asks for explicit approval first.
- `openWorldHint: true`: reaches the public internet or open-ended external entities (even read-only, like web search). A bounded private account or workspace is not open-world just because it is hosted elsewhere.

mcp-use: `annotations: { readOnlyHint, destructiveHint, openWorldHint }` on `server.tool({...})`. The official `mcp-server` template sets only two of the three.

<!-- fixture: chatgpt-tool-meta -->
```ts
import { MCPServer } from "mcp-use";
import { z } from "zod";

const server = new MCPServer({ name: "recipes", version: "1.0.0" });

export const searchRecipes = server.tool(
  {
    name: "search-recipes",
    title: "Search recipes",
    description: "Search the user's saved recipes by keyword. Read-only; does not change anything.",
    inputSchema: z.object({ query: z.string().describe("Keyword to search for") }),
    outputSchema: z.object({
      results: z.array(z.object({ id: z.string(), title: z.string() })),
    }),
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
    _meta: {
      "openai/toolInvocation/invoking": "Searching recipes…", // <= 64 chars
      "openai/toolInvocation/invoked": "Recipes found", // <= 64 chars
    },
  },
  async ({ query }) => ({
    content: [{ type: "text", text: `Found 1 recipe for ${query}.` }],
    structuredContent: { results: [{ id: "r1", title: "Pancakes" }] },
  }),
);

export default server;
```

## Tool descriptor `_meta` (O5)
| Key | Meaning |
|---|---|
| `_meta.ui.resourceUri` | the UI template for this tool (standard). mcp-use writes it for `view: { name }`. |
| `_meta.ui.visibility` | `["model","app"]` default; `["app"]` hides a tool from the model. mcp-use: `visibility: "app"` (`mcp-use-server/references/tools-and-results.md`). |
| `_meta["openai/outputTemplate"]` | optional ChatGPT-only alias of `ui.resourceUri`. Not required; mcp-use 2.11.0 does not emit it. It is a **URI in `_meta`**, not a format string in `annotations`. |
| `_meta["openai/toolInvocation/invoking"]`, `…/invoked` | short status text, each **≤ 64 characters** |
| `_meta["openai/fileParams"]` | input fields that carry files |
| `_meta["openai/profile"]` | marks the authenticated read-only profile tool |
| `_meta["openai/widgetAccessible"]`, `["openai/visibility"]` | legacy; prefer `ui.visibility` |
Not in OpenAI's reference: `openai/toolInvocation/ephemeral` (an older note mentioned it); do not use it.

## Resource `_meta` (O5)
| Key | Meaning |
|---|---|
| `_meta.ui.prefersBorder` | bordered card hint. mcp-use: `view.prefersBorder`. |
| `_meta.ui.csp` | `connectDomains`, `resourceDomains`, `frameDomains` (see `csp-and-iframes.md`). mcp-use: `view.csp`, merged with env and server origin. |
| `_meta.ui.domain` | dedicated origin for the hosted component; **required to submit a plugin with UI, unique per plugin**; default `https://web-sandbox.oaiusercontent.com`. mcp-use: `view.domain`. |
| `_meta["openai/ui"].availableDisplayModes` | `inline`, `fullscreen`, `pip` per O5; O6 says ChatGPT supports only `inline` and `fullscreen`. Declaring them lets ChatGPT open a fullscreen-only UI without an inline loading state. mcp-use emits `["inline","fullscreen"]` by default (observed). |
| `_meta["openai/widgetDescription"]` | summary surfaced to the model when the UI loads. mcp-use ≥ 2.10.1 copies `view.description` here (observed). |
| `_meta["openai/widgetCSP"]` | legacy snake_case CSP; still needed for `redirect_domains` |

## The decoupled pattern (O1)
- Data tools return `structuredContent` and carry no template. A separate render tool owns `_meta.ui.resourceUri`: "Only the render tool should include `_meta.ui.resourceUri`." Interactions inside the UI call data tools directly so the component does not remount.
- Every tool must stay useful without the UI.
- The resource URI is a cache key: publish a new URI when the HTML, JS or CSS changes in a breaking way. mcp-use's URI is derived from the view directory name and stays the same across builds (S11), so rename the directory (`product-card-v2`) or have users reconnect the connector.

## Tool results (O5)
`structuredContent` and `content` appear in the transcript and reach the model; `_meta` goes only to the component. `structuredContent` must match `outputSchema`. Keep fields concise; the model reads them verbatim. Do not return session, trace or request IDs or timestamps unless needed (O4).

## Tool descriptions and inputs (O4)
Names unique, human-readable, verb-based. Descriptions accurate, non-empty, state side effects, and never steer the model toward or away from other plugins. Inputs minimal: no full conversation history, transcripts, or precise location.

## Client-sent `_meta` (O5)
`openai/locale`, `openai/userAgent`, `openai/userLocation`, and anonymized `openai/subject`, `openai/session`, `openai/organization` are hints, not identity. In mcp-use they surface through `ctx.client.user()`; never authorize with them.

Sources: O1, O4, O5, O6, M2, S11.
