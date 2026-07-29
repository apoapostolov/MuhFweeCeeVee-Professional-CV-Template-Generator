import { describe, expect, it } from "vitest";

import { buildAssistantTimeline } from "./assistant-panel-model";

describe("buildAssistantTimeline", () => {
  it("coalesces message deltas and tool lifecycle updates", () => {
    const timeline = buildAssistantTimeline([
      {
        type: "user_message",
        messageId: "user_1",
        content: "What needs attention?",
        timestamp: "2026-07-29T18:00:00.000Z",
      },
      { type: "message_delta", messageId: "assistant_1", delta: "Two " },
      {
        type: "tool_running",
        callId: "call_1",
        toolName: "applications_list",
        targetDescription: "applications",
        timestamp: "2026-07-29T18:00:01.000Z",
      },
      {
        type: "tool_succeeded",
        callId: "call_1",
        toolName: "applications_list",
        targetDescription: "applications",
        timestamp: "2026-07-29T18:00:02.000Z",
        result: { count: 2 },
      },
      { type: "message_delta", messageId: "assistant_1", delta: "items." },
    ]);

    expect(timeline).toEqual([
      expect.objectContaining({ role: "user", content: "What needs attention?" }),
      expect.objectContaining({ role: "assistant", content: "Two items." }),
      expect.objectContaining({
        kind: "tool",
        status: "succeeded",
        result: { count: 2 },
      }),
    ]);
  });

  it("keeps approval cards stable when their resolution arrives", () => {
    const proposal = {
      schema: "assistant.v1" as const,
      id: "approval_1",
      callId: "call_1",
      sessionId: "session_1",
      toolName: "application_update",
      approvalKind: "write" as const,
      arguments: { applicationId: "app_1", priority: "high" },
      targetDescription: "application: applicationId=app_1",
      context: {
        schema: "assistant.v1" as const,
        activePanel: "applications",
        capturedAt: "2026-07-29T18:00:00.000Z",
        records: [{ type: "application", id: "app_1", revision: "rev-1" }],
        hasUnsavedChanges: false,
      },
      preview: {
        summary: "Update application.",
        affectedRecords: 1,
        changes: [{ path: "priority", before: "normal", after: "high" }],
        reversibility: "The field can be changed again.",
        warnings: [],
      },
      precondition: {
        kind: "content_hash" as const,
        value: "hash",
        capturedAt: "2026-07-29T18:00:00.000Z",
      },
      idempotencyKey: "assistant:approval_1",
      createdAt: "2026-07-29T18:00:00.000Z",
      expiresAt: "2026-07-29T18:05:00.000Z",
    };
    const timeline = buildAssistantTimeline([
      {
        type: "approval_required",
        callId: "call_1",
        toolName: "application_update",
        targetDescription: proposal.targetDescription,
        timestamp: proposal.createdAt,
        proposal,
      },
      {
        type: "approval_resolved",
        callId: "call_1",
        toolName: "application_update",
        targetDescription: proposal.targetDescription,
        timestamp: "2026-07-29T18:01:00.000Z",
        proposalId: proposal.id,
        status: "approved",
        message: "Approved and applied.",
      },
    ]);

    expect(timeline).toEqual([
      expect.objectContaining({
        kind: "approval",
        id: "approval_1",
        status: "approved",
        message: "Approved and applied.",
      }),
    ]);
  });
});
