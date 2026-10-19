// Tool registry used by the view fixtures: `useToolContext<"show-product">()` and `useCallTool("update-stock")`
// resolve against the tools exported here (through the generated mcp-env.d.ts).
import { MCPServer } from "mcp-use";
import { z } from "zod";

const server = new MCPServer({ name: "fixtures", version: "1.0.0" });

export const showProduct = server.tool(
  {
    name: "show-product",
    description: "Show one product as a card. Read-only.",
    inputSchema: z.object({ sku: z.string().describe("Stock keeping unit") }),
    outputSchema: z.object({ sku: z.string(), title: z.string(), price: z.number(), inStock: z.boolean() }),
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
    view: { name: "product-card" },
  },
  async ({ sku }) => {
    const data = { sku, title: "Screwdriver", price: 29.99, inStock: true };
    return { content: [{ type: "text", text: `${data.title} ${sku}` }], structuredContent: data };
  },
);

export const updateStock = server.tool(
  {
    name: "update-stock",
    description: "Set the stock level of one SKU. Writes to inventory.",
    inputSchema: z.object({ sku: z.string(), quantity: z.number().int().min(0) }),
    outputSchema: z.object({ sku: z.string(), quantity: z.number().int() }),
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  },
  async ({ sku, quantity }) => ({
    content: [{ type: "text", text: `${sku} now ${quantity}` }],
    structuredContent: { sku, quantity },
  }),
);

export default server;
