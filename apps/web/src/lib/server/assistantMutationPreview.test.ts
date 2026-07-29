import {
  ASSISTANT_SCHEMA_VERSION,
  type AssistantContextEnvelope,
} from "@muhfweeceevee/schemas";
import { describe, expect, it, vi } from "vitest";

import type { AssistantMcpProvider } from "./assistantMcpClient";
import {
  buildAssistantApprovalProposal,
  isAssistantApprovalContextCurrent,
} from "./assistantMutationPreview";

const context: AssistantContextEnvelope = {
  schema: ASSISTANT_SCHEMA_VERSION,
  activePanel: "applications",
  capturedAt: "2026-07-29T12:00:00.000Z",
  records: [{ type: "application", id: "app_1", revision: "rev-1" }],
  hasUnsavedChanges: false,
};

describe("assistant mutation previews", () => {
  it("captures field changes and a target-content precondition", async () => {
    const mcp: AssistantMcpProvider = {
      listTools: vi.fn(async () => []),
      reconnect: vi.fn(async () => undefined),
      callTool: vi.fn(async () => ({
        application: {
          id: "app_1",
          priority: "normal",
          updated_at: "rev-1",
        },
      })),
    };
    const proposal = await buildAssistantApprovalProposal({
      sessionId: "session_1",
      callId: "call_1",
      toolName: "application_update",
      arguments: { applicationId: "app_1", priority: "high" },
      context,
      mcp,
      now: Date.parse("2026-07-29T12:00:00.000Z"),
    });

    expect(proposal.preview.changes).toContainEqual({
      path: "priority",
      before: "normal",
      after: "high",
    });
    expect(proposal.precondition.value).toBeTruthy();
    expect(proposal.expiresAt).toBe("2026-07-29T12:05:00.000Z");
  });

  it("invalidates approvals for a changed scope or unsaved draft", () => {
    const proposalContext = {
      ...context,
      capturedAt: "2026-07-29T12:00:01.000Z",
    };
    const proposal = {
      context,
    } as Parameters<typeof isAssistantApprovalContextCurrent>[0];
    expect(isAssistantApprovalContextCurrent(proposal, proposalContext)).toBe(
      true,
    );
    expect(
      isAssistantApprovalContextCurrent(proposal, {
        ...proposalContext,
        hasUnsavedChanges: true,
      }),
    ).toBe(false);
  });
});
