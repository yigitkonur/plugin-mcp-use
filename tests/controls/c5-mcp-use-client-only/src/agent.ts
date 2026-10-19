import { MCPAgent, MCPClient } from "mcp-use";
// mcp-use used as a client/agent library only: no MCPServer is constructed here.
const client = new MCPClient({ mcpServers: { docs: { url: "https://docs.mcp-use.com/mcp" } } });
export const agent = new MCPAgent({ client });
