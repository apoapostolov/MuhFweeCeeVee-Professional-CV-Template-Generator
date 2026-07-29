import {
  ASSISTANT_SCHEMA_VERSION,
  type AssistantApprovalProposal,
  type AssistantContextEnvelope,
  type AssistantEvent,
} from "@muhfweeceevee/schemas";

import {
  hashAssistantApprovalValue,
  issueAssistantApprovalToken,
  verifyAssistantApprovalToken,
} from "./assistantApproval";
import {
  assistantApprovalLedger,
  type AssistantApprovalLedger,
} from "./assistantApprovalLedger";
import { getAssistantApprovalSecret } from "./assistantApprovalSecret";
import {
  assistantMcpClient,
  type AssistantMcpProvider,
} from "./assistantMcpClient";
import {
  isAssistantApprovalContextCurrent,
  isAssistantApprovalTargetCurrent,
} from "./assistantMutationPreview";
import {
  redactAssistantValue,
  wrapUntrustedAssistantToolResult,
} from "./assistantSecurity";
import { assistantHandoffForProposal } from "./assistantHandoff";

export type ResolveAssistantApprovalResult = {
  events: AssistantEvent[];
  replayed: boolean;
};

function base(proposal: AssistantApprovalProposal) {
  return {
    callId: proposal.callId,
    toolName: proposal.toolName,
    targetDescription: proposal.targetDescription,
    timestamp: new Date().toISOString(),
  };
}

function resolutionEvents(
  proposal: AssistantApprovalProposal,
  status: "rejected" | "stale" | "expired" | "failed",
  message: string,
): AssistantEvent[] {
  return [
    {
      type: "approval_resolved",
      ...base(proposal),
      proposalId: proposal.id,
      status,
      message,
    },
    {
      type: "message_delta",
      messageId: `approval_message_${proposal.id}`,
      delta: message,
      timestamp: new Date().toISOString(),
    },
    {
      type: "completed",
      status: status === "failed" ? "partial" : "succeeded",
      timestamp: new Date().toISOString(),
    },
  ];
}

function targetIds(proposal: AssistantApprovalProposal): string[] {
  return proposal.context.records.map((item) => item.id);
}

async function terminal(
  proposal: AssistantApprovalProposal,
  status: "rejected" | "stale" | "expired" | "failed",
  message: string,
  ledger: AssistantApprovalLedger,
): Promise<ResolveAssistantApprovalResult> {
  const events = resolutionEvents(proposal, status, message);
  const stored = await ledger.resolve(proposal.id, status, events);
  if (stored.status !== status) {
    throw new Error(`Assistant approval is already ${stored.status}.`);
  }
  await ledger.appendAudit({
    schema: ASSISTANT_SCHEMA_VERSION,
    sessionId: proposal.sessionId,
    actor: status === "rejected" ? "user" : "system",
    action: "resolve_tool_approval",
    toolName: proposal.toolName,
    targetIds: targetIds(proposal),
    arguments: redactAssistantValue(proposal.arguments) as Record<
      string,
      unknown
    >,
    approvalId: proposal.id,
    result: status,
  });
  return { events: stored.events ?? events, replayed: false };
}

export async function resolveAssistantApproval(
  input: {
    proposalId: string;
    decision: "approve" | "reject";
    context: AssistantContextEnvelope;
  },
  dependencies: {
    ledger?: AssistantApprovalLedger;
    mcp?: AssistantMcpProvider;
    secret?: string;
    now?: number;
  } = {},
): Promise<ResolveAssistantApprovalResult> {
  const ledger = dependencies.ledger ?? assistantApprovalLedger;
  const mcp = dependencies.mcp ?? assistantMcpClient;
  const item = await ledger.get(input.proposalId);
  if (!item) throw new Error("Assistant approval not found.");
  if (item.events && item.status !== "pending" && item.status !== "executing") {
    return { events: item.events, replayed: true };
  }
  if (item.status === "executing") {
    throw new Error("Assistant approval is already executing.");
  }
  const proposal = item.proposal;

  if (input.decision === "reject") {
    return terminal(
      proposal,
      "rejected",
      "Kept the current data. The proposed operation did not run.",
      ledger,
    );
  }

  const now = dependencies.now ?? Date.now();
  if (now > Date.parse(proposal.expiresAt)) {
    return terminal(
      proposal,
      "expired",
      "This approval expired. Ask MuhFwee AI to prepare a fresh preview.",
      ledger,
    );
  }
  if (!isAssistantApprovalContextCurrent(proposal, input.context)) {
    return terminal(
      proposal,
      "stale",
      input.context.hasUnsavedChanges
        ? "Approval was blocked because the composer has unsaved changes. Save or discard them, then prepare the operation again."
        : "The selected workspace context changed. Prepare the operation again for the current records.",
      ledger,
    );
  }
  if (!(await isAssistantApprovalTargetCurrent(proposal, mcp))) {
    return terminal(
      proposal,
      "stale",
      "The target changed after this preview was prepared. Review a fresh proposal before applying it.",
      ledger,
    );
  }

  const secret = dependencies.secret ?? (await getAssistantApprovalSecret());
  const binding = {
    sessionId: proposal.sessionId,
    toolName: proposal.toolName,
    approvalKind: proposal.approvalKind,
    arguments: proposal.arguments,
    context: proposal.context,
  };
  const token = issueAssistantApprovalToken(binding, secret, {
    now,
    ttlMs: Math.max(1, Date.parse(proposal.expiresAt) - now),
  });
  const verification = verifyAssistantApprovalToken(token, binding, secret, now);
  if (!verification.valid) {
    return terminal(
      proposal,
      "failed",
      `The server could not verify this approval (${verification.code}).`,
      ledger,
    );
  }

  const claim = await ledger.claim(
    proposal.id,
    hashAssistantApprovalValue(token),
  );
  if (claim.action === "replay") {
    return { events: claim.record.events ?? [], replayed: true };
  }
  if (claim.action === "unavailable") {
    throw new Error(`Assistant approval is ${claim.record.status}.`);
  }

  await ledger.appendAudit({
    schema: ASSISTANT_SCHEMA_VERSION,
    sessionId: proposal.sessionId,
    actor: "user",
    action: "approve_tool_call",
    toolName: proposal.toolName,
    targetIds: targetIds(proposal),
    arguments: redactAssistantValue(proposal.arguments) as Record<
      string,
      unknown
    >,
    approvalId: proposal.id,
    result: "approved",
  });

  const running: AssistantEvent = {
    type: "tool_running",
    ...base(proposal),
    arguments: redactAssistantValue(proposal.arguments) as Record<
      string,
      unknown
    >,
  };
  try {
    const result = wrapUntrustedAssistantToolResult(
      await mcp.callTool(proposal.toolName, proposal.arguments),
    );
    const handoff = assistantHandoffForProposal(proposal);
    const events: AssistantEvent[] = [
      running,
      { type: "tool_succeeded", ...base(proposal), result },
      {
        type: "approval_resolved",
        ...base(proposal),
        proposalId: proposal.id,
        status: "approved",
        message: "Approved and applied.",
        result,
      },
      {
        type: "message_delta",
        messageId: `approval_message_${proposal.id}`,
        delta: `Applied ${proposal.targetDescription}.`,
        timestamp: new Date().toISOString(),
      },
      ...(handoff ? [handoff] : []),
      {
        type: "completed",
        status: "succeeded",
        timestamp: new Date().toISOString(),
      },
    ];
    await ledger.resolve(proposal.id, "approved", events);
    await ledger.appendAudit({
      schema: ASSISTANT_SCHEMA_VERSION,
      sessionId: proposal.sessionId,
      actor: "system",
      action: "execute_approved_tool",
      toolName: proposal.toolName,
      targetIds: targetIds(proposal),
      approvalId: proposal.id,
      result: "succeeded",
    });
    return { events, replayed: false };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Approved MCP tool failed.";
    const events: AssistantEvent[] = [
      running,
      {
        type: "tool_failed",
        ...base(proposal),
        code: "APPROVED_TOOL_FAILED",
        message,
        canRetry: false,
      },
      ...resolutionEvents(
        proposal,
        "failed",
        `The approved operation failed: ${message}`,
      ),
    ];
    await ledger.resolve(proposal.id, "failed", events);
    await ledger.appendAudit({
      schema: ASSISTANT_SCHEMA_VERSION,
      sessionId: proposal.sessionId,
      actor: "system",
      action: "execute_approved_tool",
      toolName: proposal.toolName,
      targetIds: targetIds(proposal),
      approvalId: proposal.id,
      result: "failed",
    });
    return { events, replayed: false };
  }
}
