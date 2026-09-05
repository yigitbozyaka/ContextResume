import { startMcpServer } from "../mcp/server.js";

export function mcpCommand(): Promise<void> {
  return startMcpServer();
}
