import {
  ASSISTANT_SCHEMA_VERSION,
  type AssistantContextEnvelope,
  type AssistantSession,
} from "@muhfweeceevee/schemas";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { AssistantMcpProvider } from "./assistantMcpClient";
import { AssistantApprovalLedger } from "./assistantApprovalLedger";
import {
  runAssistantTurn,
  type AssistantModelClient,
} from "./assistantRuntime";

const context: AssistantContextEnvelope = {
  schema: ASSISTANT_SCHEMA_VERSION,
  activePanel: "applications",
  capturedAt: "2026-07-29T18:00:00.000Z",
  records: [{ type: "cv", id: "cv_en_john_doe" }],
  hasUnsavedChanges: false,
};
const temporaryDirectories: string[] = [];

async function ledger(): Promise<AssistantApprovalLedger> {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "mfcv-approvals-"));
  temporaryDirectories.push(directory);
  return new AssistantApprovalLedger(path.join(directory, "approvals.json"));
}

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) =>
      fs.rm(directory, { recursive: true, force: true }),
    ),
  );
});

function session(): AssistantSession {
  return {
    schema: ASSISTANT_SCHEMA_VERSION,
    id: "assistant_test",
    title: "Test",
    status: "active",
    createdAt: context.capturedAt,
    updatedAt: context.capturedAt,
    context,
    events: [],
  };
}

function mcpProvider(): AssistantMcpProvider & {
  callTool: ReturnType<typeof vi.fn>;
} {
  return {
    listTools: vi.fn(async () => [
      {
        name: "applications_list",
        description: "List applications",
        inputSchema: { type: "object", properties: {} },
      },
      {
        name: "save_cv",
        description: "Save CV",
        inputSchema: {
          type: "object",
          properties: { cvId: { type: "string" } },
        },
      },
    ]),
    callTool: vi.fn(async () => ({
      applications: [{ id: "app_1", company_name: "Acme" }],
    })),
    reconnect: vi.fn(async () => undefined),
  };
}

describe("runAssistantTurn", () => {
  it("turns the internal planning tool into a visible plan without calling MCP", async () => {
    const mcp = mcpProvider();
    let completion = 0;
    const model: AssistantModelClient = {
      complete: vi.fn(async () => {
        completion += 1;
        return completion === 1
          ? {
              message: {
                content: null,
                tool_calls: [
                  {
                    id: "call_plan",
                    type: "function" as const,
                    function: {
                      name: "assistant_create_plan",
                      arguments: JSON.stringify({
                        title: "Prepare application",
                        summary: "Review then prepare.",
                        steps: [
                          { title: "Review the application" },
                          { title: "Prepare its documents" },
                        ],
                      }),
                    },
                  },
                ],
              },
              usage: { inputTokens: 8, outputTokens: 4 },
              model: "test",
            }
          : {
              message: { content: "The two-step plan is ready." },
              usage: { inputTokens: 4, outputTokens: 3 },
              model: "test",
            };
      }),
    };

    const result = await runAssistantTurn(
      { session: session(), message: "Prepare this application", context },
      { mcp, model, ledger: await ledger() },
    );

    expect(result.status).toBe("succeeded");
    expect(mcp.callTool).not.toHaveBeenCalled();
    expect(result.events).toContainEqual(
      expect.objectContaining({
        type: "plan_created",
        plan: expect.objectContaining({ title: "Prepare application" }),
      }),
    );
  });

  it("discovers only allowed tools and shows read-tool activity", async () => {
    const mcp = mcpProvider();
    let completion = 0;
    const model: AssistantModelClient = {
      complete: vi.fn(async ({ tools }) => {
        const toolNames = tools.map((tool: { name: string }) => tool.name);
        expect(toolNames).toContain("applications_list");
        expect(toolNames).toContain("save_cv");
        completion += 1;
        return completion === 1
          ? {
              message: {
                content: null,
                tool_calls: [
                  {
                    id: "call_1",
                    type: "function" as const,
                    function: {
                      name: "applications_list",
                      arguments: "{}",
                    },
                  },
                ],
              },
              usage: { inputTokens: 10, outputTokens: 3 },
              model: "test",
            }
          : {
              message: { content: "Acme is the only active application." },
              usage: { inputTokens: 12, outputTokens: 8 },
              model: "test",
            };
      }),
    };

    const result = await runAssistantTurn(
      { session: session(), message: "What is active?", context },
      { mcp, model, ledger: await ledger() },
    );

    expect(result.status).toBe("succeeded");
    expect(mcp.callTool).toHaveBeenCalledWith(
      "applications_list",
      {},
      expect.any(AbortSignal),
    );
    expect(result.events.map((event) => event.type)).toEqual(
      expect.arrayContaining([
        "user_message",
        "tool_preparing",
        "tool_running",
        "tool_succeeded",
        "message_delta",
        "usage",
        "completed",
      ]),
    );
  });

  it("turns a guarded mutation into an approval without executing it", async () => {
    const mcp = mcpProvider();
    let completion = 0;
    const model: AssistantModelClient = {
      complete: vi.fn(async () => {
        completion += 1;
        return completion === 1
          ? {
              message: {
                content: null,
                tool_calls: [
                  {
                    id: "call_write",
                    type: "function" as const,
                    function: {
                      name: "save_cv",
                      arguments: '{"cvId":"cv_en_john_doe"}',
                    },
                  },
                ],
              },
              usage: { inputTokens: 10, outputTokens: 3 },
              model: "test",
            }
          : {
              message: { content: "Unexpected second completion." },
              usage: { inputTokens: 10, outputTokens: 7 },
              model: "test",
            };
      }),
    };

    const result = await runAssistantTurn(
      { session: session(), message: "Save my CV", context },
      { mcp, model, ledger: await ledger() },
    );

    expect(result.status).toBe("awaiting_approval");
    expect(mcp.callTool).not.toHaveBeenCalledWith(
      "save_cv",
      expect.anything(),
      expect.anything(),
    );
    expect(result.events).toContainEqual(
      expect.objectContaining({
        type: "approval_required",
        toolName: "save_cv",
      }),
    );
  });
});
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
