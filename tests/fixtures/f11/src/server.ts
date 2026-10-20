import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

const tickets: Record<string, { subject: string; status: "open" | "pending" | "closed" }> = {
  "T-100": { subject: "Printer jams on tray 2", status: "open" },
  "T-101": { subject: "VPN drops every hour", status: "pending" },
};

const WIDGET_URI = "ui://widget/ticket.html";
const widgetHtml = readFileSync(new URL("../public/ticket-widget.html", import.meta.url), "utf8");

const showInput = z.object({ id: z.string().describe("Ticket id, e.g. T-100") });
const showOutput = z.object({ id: z.string(), subject: z.string(), status: z.enum(["open", "pending", "closed"]) });

const widgetMeta = {
  "openai/outputTemplate": WIDGET_URI,
  "openai/widgetAccessible": true,
  "openai/toolInvocation/invoking": "Looking up the ticket",
  "openai/toolInvocation/invoked": "Ticket ready",
};

function buildServer() {
  const server = new Server({ name: "tickets", version: "1.0.0" }, { capabilities: { tools: {}, resources: {} } });

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
      {
        name: "show-ticket",
        title: "Show ticket",
        description: "Show one support ticket as a card. Read-only.",
        inputSchema: z.toJSONSchema(showInput) as { type: "object" },
        outputSchema: z.toJSONSchema(showOutput) as { type: "object" },
        annotations: { readOnlyHint: true },
        _meta: widgetMeta,
      },
      {
        name: "refresh-ticket",
        title: "Refresh ticket",
        description: "Return the latest status of a ticket. Read-only.",
        inputSchema: z.toJSONSchema(showInput) as { type: "object" },
        annotations: { readOnlyHint: true },
        _meta: { "openai/widgetAccessible": true, "openai/visibility": "private" },
      },
    ],
  }));

  server.setRequestHandler(CallToolRequestSchema, async (req) => {
    const { id } = showInput.parse(req.params.arguments);
    const t = tickets[id];
    if (!t) return { isError: true, content: [{ type: "text", text: `Unknown ticket ${id}` }] };
    if (req.params.name === "show-ticket") {
      return { content: [{ type: "text", text: `${id}: ${t.subject}` }], structuredContent: { id, ...t }, _meta: widgetMeta };
    }
    if (req.params.name === "refresh-ticket") {
      return { content: [{ type: "text", text: `${id} is ${t.status}` }], structuredContent: { id, status: t.status } };
    }
    return { isError: true, content: [{ type: "text", text: `Unknown tool ${req.params.name}` }] };
  });

  server.setRequestHandler(ListResourcesRequestSchema, async () => ({
    resources: [{ uri: WIDGET_URI, name: "Ticket widget", mimeType: "text/html+skybridge", _meta: { "openai/widgetPrefersBorder": true } }],
  }));

  server.setRequestHandler(ReadResourceRequestSchema, async (req) => {
    if (req.params.uri !== WIDGET_URI) throw new Error(`Unknown resource ${req.params.uri}`);
    return { contents: [{ uri: WIDGET_URI, mimeType: "text/html+skybridge", text: widgetHtml, _meta: { "openai/widgetPrefersBorder": true, "openai/widgetDomain": "https://tickets.example.com" } }] };
  });

  return server;
}

const port = Number(process.env.PORT ?? 3000);
createServer(async (req, res) => {
  if (!req.url?.startsWith("/mcp")) { res.writeHead(404); res.end("not found"); return; }
  const chunks: Buffer[] = [];
  for await (const c of req) chunks.push(c as Buffer);
  const body = chunks.length ? JSON.parse(Buffer.concat(chunks).toString("utf8")) : undefined;
  const server = buildServer();
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
  res.on("close", () => { void transport.close(); void server.close(); });
  await server.connect(transport);
  await transport.handleRequest(req, res, body);
}).listen(port, () => console.error(`tickets MCP server on http://localhost:${port}/mcp`));
