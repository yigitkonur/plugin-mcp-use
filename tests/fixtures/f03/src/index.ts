import { createServer } from "node:http";
import { McpServer, createMcpHandler } from "@modelcontextprotocol/server";
import { toNodeHandler } from "@modelcontextprotocol/node";
import { z } from "zod";

const stock = new Map<string, { name: string; qty: number }>([
  ["SKU-1", { name: "Precision screwdriver", qty: 12 }],
  ["SKU-2", { name: "Hex key set", qty: 3 }],
  ["SKU-3", { name: "Cable tester", qty: 0 }],
]);

function buildServer() {
  const server = new McpServer({ name: "inventory", version: "1.0.0" });

  server.registerTool(
    "lookup-sku",
    {
      title: "Look up SKU",
      description: "Return the name and quantity on hand for one SKU. Read-only.",
      inputSchema: z.object({ sku: z.string().describe("Stock keeping unit, e.g. SKU-1") }),
      outputSchema: z.object({ sku: z.string(), name: z.string(), qty: z.number() }),
      annotations: { readOnlyHint: true },
    },
    async ({ sku }) => {
      const item = stock.get(sku);
      if (!item) return { isError: true, content: [{ type: "text", text: `Unknown SKU ${sku}` }] };
      const out = { sku, name: item.name, qty: item.qty };
      return { content: [{ type: "text", text: `${item.name}: ${item.qty} on hand` }], structuredContent: out };
    },
  );

  server.registerTool(
    "adjust-stock",
    {
      description: "Add or remove units of a SKU. Changes stored quantities.",
      inputSchema: z.object({ sku: z.string(), delta: z.number().int().describe("Positive to add, negative to remove") }),
    },
    async ({ sku, delta }) => {
      const item = stock.get(sku);
      if (!item) return { isError: true, content: [{ type: "text", text: `Unknown SKU ${sku}` }] };
      item.qty = Math.max(0, item.qty + delta);
      return { content: [{ type: "text", text: `${sku} now ${item.qty}` }] };
    },
  );

  server.registerTool(
    "list-low-stock",
    {
      title: "List low stock",
      description: "List SKUs at or below a threshold. Read-only.",
      inputSchema: z.object({ threshold: z.number().int().min(0).default(5).describe("Quantity at or below which a SKU is low") }),
      outputSchema: z.object({ items: z.array(z.object({ sku: z.string(), name: z.string(), qty: z.number() })) }),
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ threshold }) => {
      const items = [...stock].filter(([, v]) => v.qty <= threshold).map(([sku, v]) => ({ sku, name: v.name, qty: v.qty }));
      return { content: [{ type: "text", text: `${items.length} low` }], structuredContent: { items } };
    },
  );

  server.registerResource(
    "inventory-summary",
    "inventory://summary",
    { title: "Inventory summary", description: "Quantities for every SKU as JSON", mimeType: "application/json" },
    async (uri) => ({
      contents: [{ uri: uri.href, mimeType: "application/json", text: JSON.stringify(Object.fromEntries([...stock].map(([k, v]) => [k, v.qty]))) }],
    }),
  );

  server.registerPrompt(
    "restock-report",
    {
      title: "Restock report",
      description: "Ask the model to draft a restock report",
      argsSchema: z.object({ threshold: z.string().optional().describe("Quantity at or below which a SKU is low") }),
    },
    ({ threshold }) => ({
      messages: [{ role: "user", content: { type: "text", text: `Draft a restock report for SKUs at or below ${threshold ?? "5"} units.` } }],
    }),
  );

  return server;
}

const handler = toNodeHandler(createMcpHandler(() => buildServer()));
const port = Number(process.env.PORT ?? 3000);
createServer((req, res) => {
  if (req.url?.startsWith("/mcp")) void handler(req, res);
  else { res.writeHead(404); res.end("not found"); }
}).listen(port, () => console.error(`inventory MCP server on http://localhost:${port}/mcp`));
