import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import {
  ASSISTANT_SCHEMA_VERSION,
  type AssistantApprovalProposal,
  type AssistantContextEnvelope,
} from "@muhfweeceevee/schemas";
import { afterEach, describe, expect, it, vi } from "vitest";

import { hashAssistantApprovalValue } from "./assistantApproval";
import { resolveAssistantApproval } from "./assistantApprovalExecution";
import { AssistantApprovalLedger } from "./assistantApprovalLedger";
import type { AssistantMcpProvider } from "./assistantMcpClient";

const SECRET = "test-only-assistant-approval-secret-32-bytes";
const temporaryDirectories: string[] = [];

const context: AssistantContextEnvelope = {
  schema: ASSISTANT_SCHEMA_VERSION,
  activePanel: "editor",
  capturedAt: "2026-07-29T12:00:00.000Z",
  records: [{ type: "cv", id: "cv_en_john_doe", revision: "rev-1" }],
  hasUnsavedChanges: false,
};
const before = { metadata: { internal_name: "John Doe", revision: "rev-1" } };

function proposal(): AssistantApprovalProposal {
  return {
    schema: ASSISTANT_SCHEMA_VERSION,
    id: "approval_test",
    callId: "call_test",
    sessionId: "session_test",
    toolName: "save_cv",
    approvalKind: "write",
    arguments: {
      cvId: "cv_en_john_doe",
      cv: { metadata: { internal_name: "John Doe", revision: "rev-2" } },
    },
    targetDescription: "cv: cvId=cv_en_john_doe",
    context,
    preview: {
      summary: "Save CV.",
      affectedRecords: 1,
      changes: [
        {
          path: "metadata.revision",
          before: "rev-1",
          after: "rev-2",
        },
      ],
      reversibility: "Version history is available.",
      warnings: [],
    },
    precondition: {
      kind: "content_hash",
      value: hashAssistantApprovalValue(before),
      capturedAt: "2026-07-29T12:00:00.000Z",
    },
    idempotencyKey: "assistant:approval_test",
    createdAt: "2026-07-29T12:00:00.000Z",
    expiresAt: "2026-07-29T12:05:00.000Z",
  };
}

async function ledger(): Promise<AssistantApprovalLedger> {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "mfcv-approval-"));
  temporaryDirectories.push(directory);
  return new AssistantApprovalLedger(path.join(directory, "approvals.json"));
}

function mcp(current: unknown = before): AssistantMcpProvider & {
  callTool: ReturnType<typeof vi.fn>;
} {
  return {
    listTools: vi.fn(async () => []),
    reconnect: vi.fn(async () => undefined),
    callTool: vi.fn(async (name: string) =>
      name === "get_cv" ? { cv: current } : { ok: true, saved: true },
    ),
  };
}

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) =>
      fs.rm(directory, { recursive: true, force: true }),
    ),
  );
});

describe("resolveAssistantApproval", () => {
  it("executes an approved mutation once and replays the stored result", async () => {
    const store = await ledger();
    const tools = mcp();
    await store.create(proposal());

    const first = await resolveAssistantApproval(
      { proposalId: "approval_test", decision: "approve", context },
      {
        ledger: store,
        mcp: tools,
        secret: SECRET,
        now: Date.parse("2026-07-29T12:01:00.000Z"),
      },
    );
    const second = await resolveAssistantApproval(
      { proposalId: "approval_test", decision: "approve", context },
      {
        ledger: store,
        mcp: tools,
        secret: SECRET,
        now: Date.parse("2026-07-29T12:01:01.000Z"),
      },
    );

    expect(first.events).toContainEqual(
      expect.objectContaining({
        type: "approval_resolved",
        status: "approved",
      }),
    );
    expect(second.replayed).toBe(true);
    expect(tools.callTool).toHaveBeenCalledTimes(2);
    expect(tools.callTool).toHaveBeenLastCalledWith(
      "save_cv",
      proposal().arguments,
    );
    expect(await store.listAudit("session_test")).toHaveLength(2);
  });

  it("rejects without executing and invalidates a changed target", async () => {
    const rejectedStore = await ledger();
    const rejectedTools = mcp();
    await rejectedStore.create(proposal());
    const rejected = await resolveAssistantApproval(
      { proposalId: "approval_test", decision: "reject", context },
      { ledger: rejectedStore, mcp: rejectedTools, secret: SECRET },
    );
    expect(rejected.events).toContainEqual(
      expect.objectContaining({
        type: "approval_resolved",
        status: "rejected",
      }),
    );
    expect(rejectedTools.callTool).not.toHaveBeenCalled();

    const staleStore = await ledger();
    const staleTools = mcp({ metadata: { revision: "rev-2" } });
    await staleStore.create(proposal());
    const stale = await resolveAssistantApproval(
      { proposalId: "approval_test", decision: "approve", context },
      {
        ledger: staleStore,
        mcp: staleTools,
        secret: SECRET,
        now: Date.parse("2026-07-29T12:01:00.000Z"),
      },
    );
    expect(stale.events).toContainEqual(
      expect.objectContaining({ type: "approval_resolved", status: "stale" }),
    );
    expect(staleTools.callTool).toHaveBeenCalledTimes(1);
  });
});
