import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const server = new McpServer({ name: "inventory", version: "1.0.0" });
server.tool("lookup-sku", "Return the quantity", { sku: z.string() }, async ({ sku }) => ({ content: [{ type: "text", text: sku }] }));
await server.connect(new StdioServerTransport());
