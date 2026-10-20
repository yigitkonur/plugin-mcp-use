# Views

Checked against `dist/tools.d.ts`, `dist/react/**/*.d.ts`, `dist/views/types.d.ts` (2.11.0); behavior marked "observed" was run on 2026-10-20 (S11, S16).

## Bind a view to a tool
<!-- fixture: view-bound-tool -->
```ts
import { MCPServer } from "mcp-use";
import { z } from "zod";

const server = new MCPServer({ name: "shop", version: "1.0.0" });

export const showProduct = server.tool(
  {
    name: "show-product",
    title: "Show product",
    description: "Look up one product by SKU and show it as a card. Read-only.",
    inputSchema: z.object({ sku: z.string().describe("Stock keeping unit") }),
    outputSchema: z.object({
      sku: z.string(),
      title: z.string(),
      price: z.number(),
      inStock: z.boolean(),
    }),
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
    view: {
      name: "product-card", // views/product-card/view.tsx
      description: "Product card with price and stock status",
      prefersBorder: true,
      csp: { connectDomains: ["https://api.example.com"], resourceDomains: ["https://cdn.example.com"] },
      permissions: { clipboardWrite: {} },
    },
  },
  async ({ sku }) => {
    const data = { sku, title: "Precision screwdriver", price: 29.99, inStock: true };
    return {
      content: [{ type: "text", text: `${data.title} (${sku}) costs $${data.price}.` }],
      structuredContent: data,
      _meta: { warehouse: "wh-4" }, // view only
    };
  },
);

export default server;
```

`ToolViewConfig` fields: `name`, `description`, `prefersBorder`, `csp` (`connectDomains`, `resourceDomains`, `frameDomains`, `baseUriDomains`), `permissions` (an **object**: `camera`, `microphone`, `geolocation`, `clipboardWrite`, each `{}`), `domain` (the app's own domain; ChatGPT submission wants `ui.domain`), `entrypoints` (ChatGPT launch surfaces; see `host-chatgpt`).

Observed emitted metadata for a bound tool: `tools/list` has `_meta.ui.resourceUri = "ui://views/product-card.html"` (also under the key `ui/resourceUri`); the resource has `_meta.ui.csp`, `prefersBorder`, `openai/widgetDescription` (from `view.description`) and `openai/ui.availableDisplayModes`. No `openai/outputTemplate` and no `ui.domain` are emitted unless you set them.

## Read the call in the view
<!-- fixture: view-states -->
```tsx
import { ToolCancelledError, useToolContext } from "mcp-use/react";

export default function ProductCard() {
  const context = useToolContext<"show-product">();

  if (context.status === "pending") {
    return <div data-status="pending">Loading {context.toolInput?.sku ?? "…"}</div>;
  }

  if (context.status === "error") {
    if (context.error instanceof ToolCancelledError) {
      return <div data-status="error">Cancelled{context.error.reason ? `: ${context.error.reason}` : ""}</div>;
    }
    return <div data-status="error">Something went wrong: {context.error.message}</div>;
  }

  const { title, price, inStock } = context.toolOutput;
  const warehouse = context.meta?.warehouse as string | undefined;
  return (
    <div data-status="ready">
      <h2>{title}</h2>
      <p>${price.toFixed(2)} · {inStock ? "In stock" : "Backorder"}</p>
      {warehouse ? <small>{warehouse}</small> : null}
    </div>
  );
}
```
- `pending`: `toolInput` is a deep-partial of the arguments while the model is still streaming them; `toolOutput` is `undefined`.
- `ready`: `toolOutput` is typed from `outputSchema`; `meta` is `Record<string, unknown> | undefined`; `content` holds the text blocks.
- `error`: `error` is `ToolError` (has `.message` and `.result`, the failed `CallToolResult`) or `ToolCancelledError` (`.reason?: string`). There is no `.code`.
- Destructuring still narrows in TypeScript ≥ 4.6, so `const { status, toolOutput } = useToolContext()` followed by `if (status === "ready")` is fine:

<!-- fixture: view-destructured -->
```tsx
import { useToolContext } from "mcp-use/react";

export default function Price() {
  const { status, toolOutput } = useToolContext<"show-product">();
  if (status !== "ready") return null;
  return <span>${toolOutput.price}</span>;
}
```

## Files and conventions
- `views/<name>/view.tsx` default-exports the component. An optional `export const viewConfig` sets size and display modes (`display-and-state.md`). CSS imported next to the view is bundled.
- Binding a second tool to the same view fails at startup: `View "product-card" is already bound to tool "show-product"; tool "dup" cannot bind the same view. Each view may be bound to one tool.` (observed).
- Typecheck once after adding a tool or a view so `mcp-env.d.ts` includes it; the generic name in `useToolContext<"show-product">()` is the wire name.
- Observed: the resource text is a ~1.2 KB HTML shell that loads hashed JS/CSS from `<MCP_ASSETS_URL or server origin>/mcp/_mcp-use/views/<name>/assets/…`. Its URI does not change when the view changes (S11), so a host that caches by URI can serve a stale view. See `host-chatgpt` for the guidance.
- Return concise `content` and typed `structuredContent`; keep large or private render data in `_meta`.

Sources: M1, M2, S11, S16.
