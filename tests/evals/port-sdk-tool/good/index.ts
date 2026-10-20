import { MCPServer } from "mcp-use";
import { z } from "zod";

const stock = new Map([["SKU-1", 12], ["SKU-2", 3]]);
const server = new MCPServer({ name: "inventory", version: "1.0.0" });

export const lookupSku = server.tool(
  {
    name: "lookup-sku",
    description: "Return the quantity on hand for one SKU. Read-only.",
    inputSchema: z.object({ sku: z.string().describe("Stock keeping unit") }),
    outputSchema: z.object({ sku: z.string(), qty: z.number() }),
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
  },
  async ({ sku }) => {
    const qty = stock.get(sku);
    if (qty === undefined) return { isError: true, content: [{ type: "text", text: `Unknown SKU ${sku}` }] };
    return { content: [{ type: "text", text: `${sku}: ${qty}` }], structuredContent: { sku, qty } };
  },
);

export const adjustStock = server.tool(
  {
    name: "adjust-stock",
    description: "Add or remove units. Changes stored quantities.",
    inputSchema: z.object({ sku: z.string(), delta: z.number().int() }),
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  },
  async ({ sku, delta }) => {
    stock.set(sku, Math.max(0, (stock.get(sku) ?? 0) + delta));
    return { content: [{ type: "text", text: `${sku} now ${stock.get(sku)}` }] };
  },
);

export default server;
