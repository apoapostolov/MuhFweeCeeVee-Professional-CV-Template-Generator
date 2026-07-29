import type {
  AssistantApprovalProposal,
  AssistantEvent,
  AssistantHandoff,
  AssistantPlan,
} from "@muhfweeceevee/schemas";

export type AssistantTimelineItem =
  | {
      kind: "message";
      id: string;
      role: "user" | "assistant";
      content: string;
    }
  | {
      kind: "tool";
      id: string;
      toolName: string;
      targetDescription: string;
      status: "preparing" | "running" | "succeeded" | "failed";
      result?: unknown;
      message?: string;
      canRetry?: boolean;
    }
  | {
      kind: "error";
      id: string;
      message: string;
      canRetry: boolean;
    }
  | {
      kind: "approval";
      id: string;
      proposal: AssistantApprovalProposal;
      status:
        | "pending"
        | "approved"
        | "rejected"
        | "stale"
        | "expired"
        | "failed";
      message?: string;
      result?: unknown;
    }
  | { kind: "plan"; id: string; plan: AssistantPlan }
  | { kind: "handoff"; id: string; handoff: AssistantHandoff };

export function buildAssistantTimeline(
  events: AssistantEvent[],
): AssistantTimelineItem[] {
  const timeline: AssistantTimelineItem[] = [];
  const messageIndex = new Map<string, number>();
  const toolIndex = new Map<string, number>();
  const approvalIndex = new Map<string, number>();
  const planIndex = new Map<string, number>();

  for (const event of events) {
    if (event.type === "user_message") {
      timeline.push({
        kind: "message",
        id: event.messageId,
        role: "user",
        content: event.content,
      });
    } else if (event.type === "message_delta") {
      const existingIndex = messageIndex.get(event.messageId);
      if (existingIndex === undefined) {
        messageIndex.set(event.messageId, timeline.length);
        timeline.push({
          kind: "message",
          id: event.messageId,
          role: "assistant",
          content: event.delta,
        });
      } else {
        const existing = timeline[existingIndex];
        if (existing?.kind === "message") existing.content += event.delta;
      }
    } else if (
      event.type === "tool_preparing" ||
      event.type === "tool_running" ||
      event.type === "tool_succeeded" ||
      event.type === "tool_failed"
    ) {
      const status = event.type.replace("tool_", "") as
        | "preparing"
        | "running"
        | "succeeded"
        | "failed";
      const item: AssistantTimelineItem = {
        kind: "tool",
        id: event.callId,
        toolName: event.toolName,
        targetDescription: event.targetDescription,
        status,
        ...(event.type === "tool_succeeded" ? { result: event.result } : {}),
        ...(event.type === "tool_failed"
          ? { message: event.message, canRetry: event.canRetry }
          : {}),
      };
      const existingIndex = toolIndex.get(event.callId);
      if (existingIndex === undefined) {
        toolIndex.set(event.callId, timeline.length);
        timeline.push(item);
      } else {
        timeline[existingIndex] = item;
      }
    } else if (event.type === "approval_required") {
      approvalIndex.set(event.proposal.id, timeline.length);
      timeline.push({
        kind: "approval",
        id: event.proposal.id,
        proposal: event.proposal,
        status: "pending",
      });
    } else if (event.type === "approval_resolved") {
      const existingIndex = approvalIndex.get(event.proposalId);
      const existing =
        existingIndex === undefined ? undefined : timeline[existingIndex];
      if (existingIndex !== undefined && existing?.kind === "approval") {
        timeline[existingIndex] = {
          ...existing,
          status: event.status,
          message: event.message,
          result: event.result,
        };
      }
    } else if (event.type === "turn_error") {
      timeline.push({
        kind: "error",
        id: `${event.code}-${timeline.length}`,
        message: event.message,
        canRetry: event.canRetry,
      });
    } else if (event.type === "plan_created" || event.type === "plan_updated") {
      const existingIndex = planIndex.get(event.plan.id);
      const item: AssistantTimelineItem = {
        kind: "plan",
        id: event.plan.id,
        plan: event.plan,
      };
      if (existingIndex === undefined) {
        planIndex.set(event.plan.id, timeline.length);
        timeline.push(item);
      } else {
        timeline[existingIndex] = item;
      }
    } else if (event.type === "handoff_available") {
      timeline.push({
        kind: "handoff",
        id: event.handoff.id,
        handoff: event.handoff,
      });
    }
  }
  return timeline;
}
