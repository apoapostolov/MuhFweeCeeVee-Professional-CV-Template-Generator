import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { baseUrl } from "./http.mjs";
import { registerTools } from "./tools.mjs";

const server = new McpServer(
  {
    name: "muhfweeceevee-api-mcp",
    version: "0.3.0",
  },
  {
    instructions: [
      "MCP wrapper for the MuhFweeCeeVee web API.",
      `API base: ${baseUrl}`,
      "Set MFCV_API_TOKEN (or CV_API_TOKEN) when the server requires auth.",
      "Keyword Studio tools are retired; use research_* and analysis_* tools.",
    ].join(" "),
  },
);

registerTools(server);

const transport = new StdioServerTransport();
await server.connect(transport);
