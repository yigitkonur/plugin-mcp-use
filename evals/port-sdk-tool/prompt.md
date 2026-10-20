---
name: port-sdk-tool
description: Port an official-SDK v1 stdio server to mcp-use, with the stdio and zod caveats
tags:
- migrate
max_turns: 14
timeout_seconds: 420
allowed_tools:
- Read
- Glob
- Grep
- Skill
---

Port this MCP server to mcp-use and write the result to `index.ts`. Its package.json has `"@modelcontextprotocol/sdk": "1.32.1"` and `"zod": "^3.25.76"`, and clients start it with `node src/index.ts` over stdio.

```ts
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const stock = new Map([["SKU-1", 12], ["SKU-2", 3]]);
const server = new McpServer({ name: "inventory", version: "1.0.0" });

server.registerTool(
  "lookup-sku",
  {
    description: "Return the quantity on hand for one SKU. Read-only.",
    inputSchema: { sku: z.string().describe("Stock keeping unit") },
    outputSchema: { sku: z.string(), qty: z.number() },
    annotations: { readOnlyHint: true },
  },
  async ({ sku }) => {
    const qty = stock.get(sku);
    if (qty === undefined) return { isError: true, content: [{ type: "text", text: `Unknown SKU ${sku}` }] };
    return { content: [{ type: "text", text: `${sku}: ${qty}` }], structuredContent: { sku, qty } };
  },
);

server.tool("adjust-stock", "Add or remove units. Changes stored quantities.", { sku: z.string(), delta: z.number().int() }, async ({ sku, delta }) => {
  stock.set(sku, Math.max(0, (stock.get(sku) ?? 0) + delta));
  return { content: [{ type: "text", text: `${sku} now ${stock.get(sku)}` }] };
});

await server.connect(new StdioServerTransport());
```
