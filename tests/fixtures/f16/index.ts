import { MCPServer } from "mcp-use";
import { z } from "zod";

const server = new MCPServer({
  name: "f16",
  title: "Support tickets",
  version: "1.0.0",
  description: "Look up support tickets and show them as a card.",
  instructions: "Use show-ticket to display one ticket by id.",
});

const tickets: Record<string, { subject: string; status: "open" | "pending" | "closed"; assignee: string }> = {
  "T-100": { subject: "Printer jams on tray 2", status: "open", assignee: "Ada" },
  "T-101": { subject: "VPN drops every hour", status: "pending", assignee: "Grace" },
};

export const showTicket = server.tool(
  {
    name: "show-ticket",
    title: "Show ticket",
    description: "Look up one support ticket by id and show it as a card. Read-only.",
    inputSchema: z.object({
      id: z.string().describe("Ticket id, e.g. T-100"),
    }),
    outputSchema: z.object({
      id: z.string().describe("The ticket id that was looked up"),
      subject: z.string().describe("Ticket subject line"),
      status: z.enum(["open", "pending", "closed"]).describe("Current ticket status"),
      assignee: z.string().describe("Person the ticket is assigned to"),
    }),
    annotations: { readOnlyHint: true },
    view: {
      name: "ticket-card",
      description: "Ticket card with status and assignee",
    },
  },
  async ({ id }) => {
    const t = tickets[id] ?? { subject: "Unknown ticket", status: "closed" as const, assignee: "nobody" };
    return {
      content: [{ type: "text", text: `${id}: ${t.subject} (${t.status}, ${t.assignee})` }],
      structuredContent: { id, ...t },
    };
  },
);

// Helper the card calls itself; the model does not need to see it.
export const refreshTicket = server.tool(
  {
    name: "refresh-ticket",
    title: "Refresh ticket",
    description: "Return the latest status of a ticket. Read-only.",
    inputSchema: z.object({ id: z.string().describe("Ticket id, e.g. T-100") }),
    outputSchema: z.object({ id: z.string().describe("Ticket id"), status: z.enum(["open", "pending", "closed"]).describe("Latest status") }),
    annotations: { readOnlyHint: true },
    visibility: "app",
  },
  async ({ id }) => {
    const status = tickets[id]?.status ?? "closed";
    return { content: [{ type: "text", text: `${id} is ${status}` }], structuredContent: { id, status } };
  },
);

export default server;
