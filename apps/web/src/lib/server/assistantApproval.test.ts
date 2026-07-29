import type { AssistantContextEnvelope } from "@muhfweeceevee/schemas";
import { describe, expect, it } from "vitest";

import {
  hashAssistantApprovalValue,
  issueAssistantApprovalToken,
  verifyAssistantApprovalToken,
} from "./assistantApproval";

const SECRET = "test-only-assistant-approval-secret-32-bytes";
const NOW = Date.parse("2026-07-29T12:00:00.000Z");

function context(revision = "rev-7"): AssistantContextEnvelope {
  return {
    schema: "assistant.v1",
    activePanel: "editor",
    capturedAt: "2026-07-29T11:59:58.000Z",
    records: [{ type: "cv", id: "cv-en-product", revision }],
    hasUnsavedChanges: false,
  };
}

function binding() {
  return {
    sessionId: "session-1",
    toolName: "save_cv",
    approvalKind: "write" as const,
    arguments: { cvId: "cv-en-product", cv: { headline: "Product Lead" } },
    context: context(),
  };
}

describe("assistant approval tokens", () => {
  it("binds approval to session, tool, normalized arguments, and context", () => {
    const token = issueAssistantApprovalToken(binding(), SECRET, {
      now: NOW,
      ttlMs: 60_000,
    });

    expect(
      verifyAssistantApprovalToken(token, binding(), SECRET, NOW + 1_000),
    ).toMatchObject({ valid: true });
    expect(
      verifyAssistantApprovalToken(
        token,
        { ...binding(), sessionId: "session-2" },
        SECRET,
        NOW + 1_000,
      ),
    ).toEqual({ valid: false, code: "STALE" });
    expect(
      verifyAssistantApprovalToken(
        token,
        {
          ...binding(),
          arguments: { ...binding().arguments, cvId: "different-cv" },
        },
        SECRET,
        NOW + 1_000,
      ),
    ).toEqual({ valid: false, code: "STALE" });
  });

  it("invalidates approval when the selected record revision changes", () => {
    const token = issueAssistantApprovalToken(binding(), SECRET, { now: NOW });
    const changed = { ...binding(), context: context("rev-8") };

    expect(
      verifyAssistantApprovalToken(token, changed, SECRET, NOW + 1_000),
    ).toEqual({ valid: false, code: "STALE" });
  });

  it("rejects expired and tampered approvals", () => {
    const token = issueAssistantApprovalToken(binding(), SECRET, {
      now: NOW,
      ttlMs: 1_000,
    });
    const [payload, signature] = token.split(".");

    expect(
      verifyAssistantApprovalToken(token, binding(), SECRET, NOW + 1_001),
    ).toEqual({ valid: false, code: "EXPIRED" });
    expect(
      verifyAssistantApprovalToken(
        `${payload}.${signature.slice(0, -1)}x`,
        binding(),
        SECRET,
        NOW + 500,
      ),
    ).toEqual({ valid: false, code: "INVALID_SIGNATURE" });
  });

  it("canonicalizes object key order before hashing", () => {
    expect(hashAssistantApprovalValue({ b: 2, a: 1 })).toBe(
      hashAssistantApprovalValue({ a: 1, b: 2 }),
    );
  });

  it("requires a server-strength signing secret", () => {
    expect(() =>
      issueAssistantApprovalToken(binding(), "too-short", { now: NOW }),
    ).toThrow(/at least 32 characters/);
  });
});
