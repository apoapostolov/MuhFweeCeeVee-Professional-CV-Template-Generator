import {
  ASSISTANT_SCHEMA_VERSION,
  type AssistantContextEnvelope,
} from "@muhfweeceevee/schemas";
import { describe, expect, it, vi } from "vitest";

import type { AssistantMcpProvider } from "./assistantMcpClient";
import {
  buildAssistantApprovalProposal,
  isAssistantApprovalContextCurrent,
  isAssistantApprovalTargetCurrent,
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

  it("invalidates reuse approvals when the linked cover letter changes", async () => {
    let letterBody = "original";
    const mcp: AssistantMcpProvider = {
      listTools: vi.fn(async () => []),
      reconnect: vi.fn(async () => undefined),
      callTool: vi.fn(async (name) => {
        if (name === "application_get") {
          return { application: { id: "app_1", cv_id: "cv_1", cover_letter_id: "letter_1" } };
        }
        if (name === "cover_letters_list") {
          return { items: [{ id: "letter_1", cv_id: "cv_1", body: letterBody }] };
        }
        throw new Error(`Unexpected tool ${name}`);
      }),
    };
    const proposal = await buildAssistantApprovalProposal({
      sessionId: "session_1",
      callId: "call_reuse_1",
      toolName: "application_reuse_packet",
      arguments: { id: "app_1", overrides: { company_name: "New Company" } },
      context,
      mcp,
      now: Date.parse("2026-07-29T12:00:00.000Z"),
    });

    expect(await isAssistantApprovalTargetCurrent(proposal, mcp)).toBe(true);
    letterBody = "changed after preview";
    expect(await isAssistantApprovalTargetCurrent(proposal, mcp)).toBe(false);
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
