import { MCPServer } from "mcp-use/server";
import { z } from "zod";

const server = new MCPServer({ name: "orders", version: "1.0.0" });

server.tool(
  {
    name: "lookup-order",
    description: "Look up an order",
    inputSchema: z.object({ orderId: z.string() }),
    annotations: { readOnlyHint: true },
  },
  async ({ orderId }) => ({ content: [{ type: "text", text: JSON.stringify({ orderId, status: "shipped", total: 120 }) }] }),
);

export default new MCPServer({ name: "orders", version: "1.0.0" });
