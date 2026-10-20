import { MCPServer } from "mcp-use";
import { z } from "zod";

const server = new MCPServer({ name: "orders", version: "1.0.0" });

export const lookupOrder = server.tool(
  {
    name: "lookup-order",
    title: "Look up order",
    description: "Return the status and total of one order. Read-only; no side effects.",
    inputSchema: z.object({ orderId: z.string().describe("Order id, e.g. ORD-100") }),
    outputSchema: z.object({ status: z.string().describe("Order status"), total: z.number().describe("Order total in USD") }),
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
  },
  async ({ orderId }) => ({
    content: [{ type: "text", text: `Order ${orderId} is shipped, total 120.00` }],
    structuredContent: { status: "shipped", total: 120 },
  }),
);

export default server;
