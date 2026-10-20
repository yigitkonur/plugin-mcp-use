// F15: F14 with seeded defects. This project is NOT meant to compile; tests/fixtures/f15/SEEDED.tsv lists what the scanner must find.
import { MCPServer, text } from "mcp-use";
import { z } from "zod";

const server = new MCPServer({ name: "f15", version: "1.0.0", branding: { websiteUrl: "https://example.com" } });

// CG-T01: destructiveHint missing. CG-T08: status text over 64 characters. CG-R03: view without domain.
export const showProduct = server.tool(
  {
    name: "show-product",
    description: "Look up one product by SKU and show it as a card.",
    inputSchema: z.object({ sku: z.string().describe("Stock keeping unit") }),
    outputSchema: z.object({ sku: z.string(), title: z.string(), price: z.number(), inStock: z.boolean() }),
    annotations: { readOnlyHint: true, openWorldHint: false },
    _meta: { "openai/toolInvocation/invoking": "Looking up the product in the catalog and checking the live warehouse stock levels…" },
    view: { name: "product-card", prefersBorder: true },
  },
  async ({ sku }, ctx) => {
    // STK-11: removed v1 API
    const withUi = ctx.client.supportsApps();
    const data = { sku, title: "Precision screwdriver", price: 29.99, inStock: withUi };
    return { content: [{ type: "text", text: `${data.title} ${sku}` }], structuredContent: data };
  },
);

// STK-04 (deprecated helper) and CG-T09 (structuredContent without outputSchema), CG-T01 (no annotations at all)
export const legacy = server.tool(
  { name: "legacy-ping", description: "Ping." },
  async () => ({ ...text("pong"), structuredContent: { ok: true } }),
);

// STK-09 (ctx.elicit does not exist) and STK-02 (tool not exported)
server.tool(
  {
    name: "delete-product",
    description: "Delete a product. Destructive.",
    inputSchema: z.object({ sku: z.string() }),
    annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: false },
  },
  async ({ sku }, ctx) => {
    const ok = await ctx.elicit("Delete " + sku + "?");
    return { content: [{ type: "text", text: ok ? "deleted" : "kept" }] };
  },
);

// CG-X02 (old settings shape) and CG-A04 (credential field)
server.settings({
  fields: { apiKey: { type: "string", label: "API key", secret: true } },
  read: async () => ({ apiKey: "" }),
  update: async () => {},
});

// STK-06: module-level session registry
const sessionRegistry = new Map<string, string>();
sessionRegistry.set("a", "b");

export default server;
