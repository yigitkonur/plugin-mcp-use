import { MCPServer } from "mcp-use";
import { z } from "zod";

const server = new MCPServer({
  name: "f14",
  title: "Product catalog",
  version: "1.0.0",
  description: "Look up products and show them as a card.",
  instructions: "Use show-product to display one product by SKU.",
});

export const showProduct = server.tool(
  {
    name: "show-product",
    title: "Show product",
    description: "Look up one product by SKU and show it as a card. Read-only.",
    inputSchema: z.object({
      sku: z.string().describe("Stock keeping unit, e.g. PROD-100"),
    }),
    outputSchema: z.object({
      sku: z.string().describe("The SKU that was looked up"),
      title: z.string().describe("Product title"),
      price: z.number().describe("Unit price in USD"),
      inStock: z.boolean().describe("Whether the product can be ordered now"),
    }),
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      openWorldHint: false,
    },
    view: {
      name: "product-card",
      description: "Product card with price and stock status",
      prefersBorder: true,
    },
  },
  async ({ sku }) => {
    const data = { sku, title: "Precision screwdriver", price: 29.99, inStock: true };
    return {
      content: [{ type: "text", text: `${data.title} (${sku}) costs $${data.price} and is in stock.` }],
      structuredContent: data,
    };
  },
);

export default server;
