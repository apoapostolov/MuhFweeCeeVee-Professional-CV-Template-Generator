import { readFileSync } from "node:fs";
import path from "node:path";

import { ASSISTANT_TOOL_CATALOG } from "@muhfweeceevee/schemas";
import { describe, expect, it, vi } from "vitest";

import {
  decideAssistantToolPolicy,
  describeAssistantToolTarget,
  gateAssistantToolCall,
} from "./assistantToolPolicy";

describe("assistant MCP tool policy", () => {
  it("classifies every registered MCP tool exactly once", () => {
    const source = readFileSync(
      path.join(process.cwd(), "packages/mcp-wrapper/src/tools.mjs"),
      "utf8",
    );
    const registered = [...source.matchAll(/server\.tool\(\s*["']([^"']+)["']/g)]
      .map((match) => match[1])
      .sort();
    const classified = Object.keys(ASSISTANT_TOOL_CATALOG).sort();

    expect(registered).toEqual(classified);
    expect(registered).toHaveLength(73);
  });

  it("allows read and derived tools", () => {
    expect(decideAssistantToolPolicy("get_cv").action).toBe("allow");
    expect(decideAssistantToolPolicy("analysis_ats_check").action).toBe("allow");
  });

  it("requires proportional approval for paid, write, and destructive tools", () => {
    expect(decideAssistantToolPolicy("analysis_cv")).toMatchObject({
      action: "require_approval",
      approvalKind: "cost",
    });
    expect(decideAssistantToolPolicy("save_cv")).toMatchObject({
      action: "require_approval",
      approvalKind: "write",
    });
    expect(decideAssistantToolPolicy("photo_delete")).toMatchObject({
      action: "require_approval",
      approvalKind: "destructive",
    });
  });

  it("blocks sensitive, bulk, retired, and unknown tools", () => {
    expect(decideAssistantToolPolicy("openrouter_settings_update").action).toBe(
      "block",
    );
    expect(decideAssistantToolPolicy("session_backup_import").action).toBe(
      "block",
    );
    expect(decideAssistantToolPolicy("keyword_manage").action).toBe("block");
    expect(decideAssistantToolPolicy("future_unclassified_tool")).toMatchObject({
      action: "block",
      code: "UNKNOWN_TOOL",
    });
  });

  it("does not expose an executor for guarded model tool calls", async () => {
    const executor = vi.fn(async () => ({ ok: true }));
    const gated = gateAssistantToolCall(
      "save_cv",
      { cvId: "cv-en-product" },
      executor,
    );

    expect(gated).toEqual({
      action: "require_approval",
      approvalKind: "write",
      targetDescription: "cv: cvId=cv-en-product",
    });
    expect("execute" in gated).toBe(false);
    expect(executor).not.toHaveBeenCalled();
  });

  it("produces a structured, human-readable target description", () => {
    const decision = decideAssistantToolPolicy("cover_letter_save");
    expect(decision.action).toBe("require_approval");
    if (decision.action !== "require_approval") return;

    expect(
      describeAssistantToolTarget(decision.definition, {
        id: "letter-7",
        companyId: "acme",
        title: "Acme Product Lead",
      }),
    ).toBe(
      "cover_letter: Acme Product Lead · id=letter-7 · companyId=acme",
    );
  });
});
