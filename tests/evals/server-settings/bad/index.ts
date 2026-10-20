import { MCPServer } from "mcp-use";

const server = new MCPServer({ name: "prefs", version: "1.0.0" });

server.settings({
  fields: {
    notifications: { type: "boolean", label: "Notifications", default: true },
    units: { type: "select", label: "Units", options: ["metric", "imperial"] },
    apiKey: { type: "string", label: "API key", secret: true },
  },
  read: async () => ({ notifications: true, units: "metric", apiKey: "" }),
  update: async () => {},
});

export default server;
