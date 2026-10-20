import { MCPServer } from "mcp-use";
import { z } from "zod";

const server = new MCPServer({ name: "prefs", version: "1.0.0" });

let current = { units: "metric" as "metric" | "imperial", notifications: true };

server.settings({
  fields: {
    units: { schema: z.enum(["metric", "imperial"]), title: "Units", description: "How to show measurements" },
    notifications: { schema: z.boolean(), title: "Notifications" },
  },
  read: () => current,
  update: (set) => {
    current = { ...current, ...set };
    return current;
  },
});

export default server;
