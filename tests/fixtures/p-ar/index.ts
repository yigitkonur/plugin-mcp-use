import { MCPServer } from "mcp-use";
import { z } from "zod";

const server = new MCPServer({ name: "p-ar", version: "1.0.0" });

export const listNotes = server.tool(
  {
    name: "list-notes",
    description: "List notes. Read-only.",
    inputSchema: z.object({}),
    outputSchema: z.object({ notes: z.array(z.string()).describe("Note texts") }),
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
    view: { name: "notes" },
  },
  async () => ({ content: [{ type: "text", text: "none" }], structuredContent: { notes: [] } }),
);

// AR-A06: the notes view calls this tool, but visibility "model" keeps it from the view.
export const saveNote = server.tool(
  {
    name: "save-note",
    description: "Save a note.",
    inputSchema: z.object({ text: z.string().describe("Note text") }),
    outputSchema: z.object({ ok: z.boolean().describe("Saved") }),
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
    visibility: "model",
  },
  async () => ({ content: [{ type: "text", text: "saved" }], structuredContent: { ok: true } }),
);

// Model-only on purpose and never called by a view: must not be flagged.
export const audit = server.tool(
  {
    name: "audit-log",
    description: "Read the audit log. Read-only.",
    inputSchema: z.object({}),
    outputSchema: z.object({ lines: z.number().describe("Line count") }),
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
    visibility: "model",
  },
  async () => ({ content: [{ type: "text", text: "0" }], structuredContent: { lines: 0 } }),
);

export default server;
