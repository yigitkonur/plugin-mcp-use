// Runnable server with defects the live probe must find (tests/probe.test.mjs). Not for compile checks.
import { MCPServer } from "mcp-use";
import { z } from "zod";

const server = new MCPServer({ name: "p-defects", version: "1.0.0" });
const out = z.object({ ok: z.boolean() });

export const noAnnotations = server.tool(
  { name: "no-annotations", description: "A tool with no annotations.", inputSchema: z.object({}), outputSchema: out },
  async () => ({ content: [{ type: "text", text: "ok" }], structuredContent: { ok: true } }),
);

export const halfAnnotations = server.tool(
  { name: "half-annotations", description: "Two of three annotations.", inputSchema: z.object({}), outputSchema: out, annotations: { readOnlyHint: true, openWorldHint: false } },
  async () => ({ content: [{ type: "text", text: "ok" }], structuredContent: { ok: true } }),
);

export const longStatus = server.tool(
  {
    name: "long-status", description: "Status strings over 64 chars.", inputSchema: z.object({}), outputSchema: out,
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
    _meta: { "openai/toolInvocation/invoking": "Working on a very long status message that goes well beyond the sixty-four character limit" },
  },
  async () => ({ content: [{ type: "text", text: "ok" }], structuredContent: { ok: true } }),
);

// Declares outputSchema {ok: boolean} but returns {ok: "yes"} (the cast hides it from the compiler).
export const mismatch = server.tool(
  { name: "mismatch", description: "Returns structuredContent that violates its outputSchema.", inputSchema: z.object({}), outputSchema: out, annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false } },
  async () => ({ content: [{ type: "text", text: "ok" }], structuredContent: { ok: "yes" } as unknown as { ok: boolean } }),
);

export const pipCard = server.tool(
  {
    name: "pip-card", description: "A view that advertises pip.", inputSchema: z.object({}), outputSchema: out,
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
    view: { name: "pip-card", description: "pip demo" },
  },
  async () => ({ content: [{ type: "text", text: "ok" }], structuredContent: { ok: true } }),
);

export default server;
