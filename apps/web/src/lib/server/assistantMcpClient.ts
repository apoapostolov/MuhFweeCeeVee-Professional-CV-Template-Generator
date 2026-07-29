import path from "node:path";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import {
  getDefaultEnvironment,
  StdioClientTransport,
} from "@modelcontextprotocol/sdk/client/stdio.js";

import {
  decideAssistantToolPolicy,
  isAssistantConfirmedManagementTool,
} from "./assistantToolPolicy";
import { resolveRepoRoot } from "./repoPaths";

export type AssistantMcpTool = {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
};

export type AssistantMcpProvider = {
  listTools: () => Promise<AssistantMcpTool[]>;
  callTool: (
    name: string,
    arguments_: Record<string, unknown>,
    signal?: AbortSignal,
  ) => Promise<unknown>;
  reconnect: () => Promise<void>;
};

function internalApiBaseUrl(): string {
  const configured =
    process.env.MFCV_ASSISTANT_API_BASE_URL?.trim() ||
    process.env.CV_API_BASE_URL?.trim();
  if (configured) return configured.replace(/\/+$/, "");
  const port =
    process.env.PORT?.trim() ||
    (process.env.NODE_ENV === "development" ? "10004" : "3000");
  return `http://127.0.0.1:${port}/api`;
}

function toolResultToValue(result: unknown): unknown {
  if (!result || typeof result !== "object") return result;
  const record = result as Record<string, unknown>;
  if (record.structuredContent !== undefined) return record.structuredContent;
  const content = Array.isArray(record.content) ? record.content : [];
  const textParts = content
    .filter(
      (item): item is { type: "text"; text: string } =>
        Boolean(item) &&
        typeof item === "object" &&
        (item as { type?: unknown }).type === "text" &&
        typeof (item as { text?: unknown }).text === "string",
    )
    .map((item) => item.text);
  if (textParts.length === 1) {
    try {
      return JSON.parse(textParts[0]);
    } catch {
      return textParts[0];
    }
  }
  return textParts.length > 0 ? textParts : result;
}

export class AssistantMcpClientManager implements AssistantMcpProvider {
  private client: Client | null = null;
  private transport: StdioClientTransport | null = null;
  private connecting: Promise<Client> | null = null;

  private async connect(): Promise<Client> {
    if (this.client) return this.client;
    if (this.connecting) return this.connecting;

    this.connecting = (async () => {
      const repoRoot = resolveRepoRoot();
      const transport = new StdioClientTransport({
        command: process.execPath,
        args: [path.join(repoRoot, "packages", "mcp-wrapper", "src", "server.mjs")],
        cwd: repoRoot,
        stderr: "pipe",
        env: {
          ...getDefaultEnvironment(),
          CV_API_BASE_URL: internalApiBaseUrl(),
          ...(process.env.MFCV_API_TOKEN
            ? { MFCV_API_TOKEN: process.env.MFCV_API_TOKEN }
            : {}),
        },
      });
      const client = new Client(
        { name: "muhfweeceevee-assistant", version: "0.1.0" },
        { capabilities: {} },
      );
      transport.onclose = () => {
        this.client = null;
        this.transport = null;
      };
      transport.onerror = () => {
        this.client = null;
        this.transport = null;
      };
      await client.connect(transport);
      this.client = client;
      this.transport = transport;
      return client;
    })().finally(() => {
      this.connecting = null;
    });

    return this.connecting;
  }

  async reconnect(): Promise<void> {
    const client = this.client;
    this.client = null;
    const transport = this.transport;
    this.transport = null;
    await client?.close().catch(() => undefined);
    await transport?.close().catch(() => undefined);
    await this.connect();
  }

  async listTools(): Promise<AssistantMcpTool[]> {
    const client = await this.connect();
    const response = await client.listTools();
    return response.tools
      .filter((tool) => {
        const decision = decideAssistantToolPolicy(tool.name);
        return (
          decision.action === "allow" ||
          (decision.action === "require_approval" &&
            isAssistantConfirmedManagementTool(tool.name))
        );
      })
      .map((tool) => ({
        name: tool.name,
        description: tool.description ?? tool.name,
        inputSchema: tool.inputSchema as Record<string, unknown>,
      }))
      .sort((left, right) => left.name.localeCompare(right.name));
  }

  async callTool(
    name: string,
    arguments_: Record<string, unknown>,
    signal?: AbortSignal,
  ): Promise<unknown> {
    const client = await this.connect();
    const result = await client.callTool(
      { name, arguments: arguments_ },
      undefined,
      signal ? { signal } : undefined,
    );
    return toolResultToValue(result);
  }
}

export const assistantMcpClient = new AssistantMcpClientManager();
