# Tools and results

Checked against `mcp-use@2.11.0` declarations (`dist/tools.d.ts`, `dist/server.d.ts`). Every TS block here compiles in CI (`scripts/typecheck-fixtures.sh`).

## A tool, end to end
<!-- fixture: tool-basic -->
```ts
import { MCPServer } from "mcp-use";
import { z } from "zod";

const server = new MCPServer({ name: "catalog", version: "1.0.0" });

export const lookupInventory = server.tool(
  {
    name: "lookup-inventory",
    title: "Look up inventory",
    description: "Return available stock for one SKU. Read-only; no side effects.",
    inputSchema: z.object({
      sku: z.string().describe("Stock keeping unit, e.g. SKU-100"),
    }),
    outputSchema: z.object({
      sku: z.string().describe("The SKU that was looked up"),
      available: z.number().int().describe("Units available now"),
    }),
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
  },
  async ({ sku }) => {
    if (!sku.startsWith("SKU-")) {
      // Expected failure: report it as a result, do not throw.
      return { isError: true, content: [{ type: "text", text: `Invalid SKU format: ${sku}` }] };
    }
    const data = { sku, available: 42 };
    return {
      content: [{ type: "text", text: `${sku}: ${data.available} available` }],
      structuredContent: data,
    };
  },
);

export default server;
```

## Rules
- **Schemas.** Any Standard Schema validator works (Zod, ArkType, Valibot). `inputSchema` is the tool argument schema (`schema` is also accepted on tools, but prompts use only `schema`; write `inputSchema` for tools). Put `.describe()` on every field the model fills.
- **Annotations.** Always set `readOnlyHint`, `destructiveHint` and `openWorldHint` explicitly. `idempotentHint` is optional. ChatGPT review requires the first three as explicit booleans (OpenAI plugin guidelines, O4). `openWorldHint: true` means the tool reaches systems outside the user's own data (the web, third-party APIs).
- **Description.** Say what the tool does, what it changes, and when not to use it. Side effects belong here, not only in annotations.
- **`outputSchema` is typed.** When it is set, the callback must return `structuredContent` that matches it, or `{ isError: true, ... }` (`ToolResult` in `tools.d.ts`). A tool with a `view` must have one.
- **Channels.** `content` is a short text for the model. `structuredContent` is the typed payload (model and view). Result `_meta` is for the view only and never reaches the model. Do not duplicate the whole payload as JSON inside `content`.
- **Failures.** Expected problems (not found, refused input) return `isError: true` with explanatory `content`. Throw only for unexpected failures.
- **Helpers.** `text()`, `object()`, `array()`, `error()`, `mix()`, `widget()` and the others (`markdown`, `html`, `xml`, `css`, `javascript`, `image`, `audio`, `binary`, `resource`) are `@deprecated` in 2.11.0. Return raw envelopes. `widget()` is deprecated too (use `view:` on the tool and return `structuredContent`).
- **Names.** Tool names are the wire id (`lookup-inventory`). `export const lookupInventory` is the TypeScript handle; views and `useCallTool` resolve tools by the wire name through `mcp-env.d.ts`.

## Export and register
- `export const x = server.tool(...)` for every tool a view or `useCallTool` uses, and `export default server`. `mcp-use typecheck` writes `mcp-env.d.ts` from those exports.
- `server.tool()` returns a `ToolRef`. Do not chain `.tool().tool()`.

## Visibility
`visibility?: "model" | "app"` is emitted as `_meta.ui.visibility: [value]` on `tools/list`. Omitted means the host default (the model may call it and the view may call it). `"app"` marks a helper that views call through `useCallTool` and that the host hides from the model. The server always lists every tool; hosts filter.

## Binding a view
`view: { name: "product-card" }` links the tool to `views/product-card/view.tsx` and emits `_meta.ui.resourceUri` = `ui://views/product-card.html`. One view, one tool. See `${CLAUDE_PLUGIN_ROOT}/skills/mcp-apps/references/views.md`.

## Result with structured data and a private `_meta`
<!-- fixture: tool-meta-result -->
```ts
import { MCPServer } from "mcp-use";
import { z } from "zod";

const server = new MCPServer({ name: "orders", version: "1.0.0" });

export const getOrder = server.tool(
  {
    name: "get-order",
    description: "Fetch one order by id. Read-only.",
    inputSchema: z.object({ id: z.string().describe("Order id") }),
    outputSchema: z.object({ id: z.string(), total: z.number() }),
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
  },
  async ({ id }) => ({
    content: [{ type: "text", text: `Order ${id} total 120.00` }],
    structuredContent: { id, total: 120 },
    _meta: { internalRowId: "row_981" }, // view-only; never shown to the model
  }),
);

export default server;
```

## Wrong: structured output missing (rejected by the compiler)
<!-- fixture-bad: tool-missing-structured -->
```ts
import { MCPServer } from "mcp-use";
import { z } from "zod";

const server = new MCPServer({ name: "bad", version: "1.0.0" });

export const broken = server.tool(
  {
    name: "broken",
    inputSchema: z.object({ id: z.string() }),
    outputSchema: z.object({ id: z.string() }),
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
  },
  async ({ id }) => ({ content: [{ type: "text", text: id }] }),
);

export default server;
```

Sources: M1, M2.
