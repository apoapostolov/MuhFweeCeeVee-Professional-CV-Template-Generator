import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import {
  ASSISTANT_SCHEMA_VERSION,
  type AssistantContextEnvelope,
  type AssistantSession,
} from "@muhfweeceevee/schemas";
import { afterEach, describe, expect, it, vi } from "vitest";

import { gateAssistantToolCall } from "./assistantToolPolicy";
import { boundAssistantValueForModel } from "./assistantSecurity";
import type { AssistantMcpProvider, AssistantMcpTool } from "./assistantMcpClient";
import { AssistantApprovalLedger } from "./assistantApprovalLedger";
import { runAssistantTurn, selectAssistantToolsForTurn, type AssistantModelClient } from "./assistantRuntime";

const context: AssistantContextEnvelope = {
  schema: ASSISTANT_SCHEMA_VERSION,
  activePanel: "applications",
  capturedAt: "2026-09-18T12:00:00.000Z",
  records: [{ type: "cv", id: "cv_en_john_doe" }],
  hasUnsavedChanges: false,
};

const temporaryDirectories: string[] = [];

function session(index: number): AssistantSession {
  return {
    schema: ASSISTANT_SCHEMA_VERSION,
    id: `matrix_session_${index}`,
    title: `Capability test ${index}`,
    status: "active",
    createdAt: context.capturedAt,
    updatedAt: context.capturedAt,
    context,
    events: [],
  };
}

async function ledger(): Promise<AssistantApprovalLedger> {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "mfcv-assistant-matrix-"));
  temporaryDirectories.push(directory);
  return new AssistantApprovalLedger(path.join(directory, "approvals.json"));
}

const toolNames = [
  "applications_list",
  "application_get",
  "get_cv",
  "list_cvs",
  "list_templates",
  "preview_html_url",
  "research_company_get",
  "research_job_get",
  "cover_letters_list",
  "career_evidence_list",
  "save_cv",
  "create_cv",
  "application_upsert",
  "application_update",
  "research_company_put",
  "cover_letter_save",
];

function tools(): AssistantMcpTool[] {
  return toolNames.map((name) => ({
    name,
    description: `Test contract for ${name}`,
    inputSchema: {
      type: "object",
      properties: {
        cvId: { type: "string" },
        applicationId: { type: "string" },
        id: { type: "string" },
        company_name: { type: "string" },
        job_title: { type: "string" },
        summary: { type: "string" },
        ...(name === "save_cv" ? { cv: { type: "object" } } : {}),
        ...(name === "list_cvs" ? { limit: { type: "integer" }, language: { type: "string" } } : {}),
        },
        ...(name === "save_cv" ? { required: ["cvId", "cv"] } : {}),
        additionalProperties: true,
    },
  }));
}

function mcpProvider(options: { fail?: boolean } = {}): AssistantMcpProvider & {
  callTool: ReturnType<typeof vi.fn>;
} {
  return {
    listTools: vi.fn(async () => tools()),
    reconnect: vi.fn(async () => undefined),
    callTool: vi.fn(async (name: string) => {
      if (options.fail) throw new Error(`Synthetic failure from ${name}`);
      return { ok: true, tool: name, records: [{ id: "record_1" }] };
    }),
  };
}

function response(content: string, toolCalls?: Array<{ name: string; arguments: string }>) {
  return {
    message: {
      content: content || null,
      tool_calls: toolCalls?.map((call, index) => ({
        id: `matrix_call_${index + 1}`,
        type: "function" as const,
        function: call,
      })),
    },
    usage: { inputTokens: 10, outputTokens: 5 },
    model: "matrix-model",
  };
}

function scriptedModel(responses: ReturnType<typeof response>[]): AssistantModelClient {
  let index = 0;
  return {
    complete: vi.fn(async () => responses[index++] ?? response("The scripted model ran out of responses.")),
  };
}

const readCases = Array.from({ length: 30 }, (_, index) => {
  const name = toolNames[index % 9];
  const prompts = [
    `Inspect the workspace and summarize ${name}; if it is empty, say so clearly.`,
    `Compare the current ${name} records with the active CV and report only verified differences.`,
    `Find ${name} entries matching a senior analytics role, then explain the evidence.`,
    `Read ${name} and tell me what needs attention before I apply.`,
    `If ${name} has stale records, identify them without changing anything.`,
  ];
  return { kind: "read" as const, prompt: prompts[index % prompts.length], tool: name };
});

const approvalCases = Array.from({ length: 30 }, (_, index) => {
  const names = ["save_cv", "create_cv", "application_upsert", "application_update", "research_company_put", "cover_letter_save"];
  const name = names[index % names.length];
  const prompt = [
    `Update ${name} only if the current record is stale, then show me the proposed change.`,
    `Create a tailored record for ${name}, but preserve all unrelated fields and wait for approval.`,
    `If the target exists, update it; otherwise create it, and explain the condition before execution.`,
    `Prepare ${name} as part of a job application workflow. Do not execute without approval.`,
  ][index % 4];
  return { kind: "approval" as const, prompt, tool: name };
});

const invalidCases = Array.from({ length: 20 }, (_, index) => ({
  kind: "invalid" as const,
  prompt: `Attempt a deliberately malformed ${index % 2 ? "CV" : "application"} operation and report the contract failure.`,
}));

const planCases = Array.from({ length: 20 }, (_, index) => ({
  kind: "plan" as const,
  prompt: `First inspect the CV and applications, then conditionally prepare step ${index + 1}; keep the plan visible and execute reads only.`,
}));

const failureCases = Array.from({ length: 10 }, (_, index) => ({
  kind: "failure" as const,
  prompt: `Read the application, tolerate a tool failure, and explain a safe next step for case ${index + 1}.`,
}));

const unknownCases = Array.from({ length: 10 }, (_, index) => ({
  kind: "unknown" as const,
  prompt: `Try to use an unavailable private tool for conditional request ${index + 1}, then explain why it was blocked.`,
}));

const cases = [...readCases, ...approvalCases, ...invalidCases, ...planCases, ...failureCases, ...unknownCases];

afterEach(async () => {
  vi.unstubAllEnvs();
  await Promise.all(temporaryDirectories.splice(0).map((directory) => fs.rm(directory, { recursive: true, force: true })));
});

describe("assistant capability matrix", () => {
  it("allows packet import only behind destructive approval", () => {
    const decision = gateAssistantToolCall(
      "application_import_packet",
      { packet: { format: "muhfweeceevee.application_packet", version: 1 } },
      async () => ({ ok: true }),
    );
    expect(decision).toEqual(expect.objectContaining({ action: "require_approval", approvalKind: "destructive" }));
  });

  it.each(readCases)("read capability $prompt", async (testCase) => {
    const mcp = mcpProvider();
    const model = scriptedModel([
      response("", [{ name: testCase.tool, arguments: "{}" }]),
      response("The requested records were inspected without mutation."),
    ]);
    const result = await runAssistantTurn({ session: session(1), message: testCase.prompt, context }, { mcp, model, ledger: await ledger() });
    expect(result.status).toBe("succeeded");
    expect(mcp.callTool).toHaveBeenCalledWith(testCase.tool, {}, expect.any(AbortSignal));
    expect(result.events.some((event) => event.type === "tool_succeeded")).toBe(true);
  });

  it.each(approvalCases)("approval capability $prompt", async (testCase) => {
    const mcp = mcpProvider();
    const model = scriptedModel([response("", [{ name: testCase.tool, arguments: JSON.stringify(testCase.tool === "save_cv" ? { cvId: "cv_en_john_doe", cv: { summary: "conditional update" }, id: `record_matrix`, summary: "conditional update" } : { cvId: "cv_en_john_doe", id: `record_matrix`, summary: "conditional update" }) }])]);
    const result = await runAssistantTurn({ session: session(2), message: testCase.prompt, context }, { mcp, model, ledger: await ledger() });
    expect(result.status).toBe("awaiting_approval");
    expect(mcp.callTool).not.toHaveBeenCalledWith(testCase.tool, expect.anything(), expect.anything());
    expect(result.events.some((event) => event.type === "approval_required")).toBe(true);
  });

  it.each(invalidCases)("invalid contract capability $prompt", async (testCase) => {
    const mcp = mcpProvider();
    const model = scriptedModel([response("", [{ name: "save_cv", arguments: "not-json" }]), response("The malformed request was rejected safely.")]);
    const result = await runAssistantTurn({ session: session(3), message: testCase.prompt, context }, { mcp, model, ledger: await ledger() });
    expect(result.status).toBe("partial");
    expect(result.events).toContainEqual(expect.objectContaining({ type: "turn_error", code: "ASSISTANT_TURN_FAILED", canRetry: true }));
    expect(mcp.callTool).not.toHaveBeenCalled();
  });

  it.each(planCases)("multi-step planning capability $prompt", async (testCase) => {
    const mcp = mcpProvider();
    const model = scriptedModel([
      response("", [{ name: "assistant_create_plan", arguments: JSON.stringify({ title: "Conditional CV workflow", summary: testCase.prompt, steps: [{ title: "Inspect records" }, { title: "Prepare a guarded change" }] }) }]),
      response("", [{ name: "applications_list", arguments: "{}" }]),
      response("The plan completed its read-only inspection."),
    ]);
    const result = await runAssistantTurn({ session: session(4), message: testCase.prompt, context }, { mcp, model, ledger: await ledger() });
    expect(result.status).toBe("succeeded");
    expect(result.events.some((event) => event.type === "plan_created")).toBe(true);
    expect(mcp.callTool).toHaveBeenCalledWith("applications_list", {}, expect.any(AbortSignal));
  });

  it.each(failureCases)("tool failure recovery capability $prompt", async (testCase) => {
    const mcp = mcpProvider({ fail: true });
    const model = scriptedModel([response("", [{ name: "applications_list", arguments: "{}" }]), response("The read failed safely, so no changes were made.")]);
    const result = await runAssistantTurn({ session: session(5), message: testCase.prompt, context }, { mcp, model, ledger: await ledger() });
    expect(result.status).toBe("succeeded");
    expect(result.events).toContainEqual(expect.objectContaining({ type: "tool_failed", code: "MCP_TOOL_FAILED", canRetry: true }));
  });

  it.each(unknownCases)("unknown tool blocking capability $prompt", async (testCase) => {
    const mcp = mcpProvider();
    const model = scriptedModel([response("", [{ name: "private_secret_tool", arguments: "{}" }]), response("That unavailable tool was blocked.")]);
    const result = await runAssistantTurn({ session: session(6), message: testCase.prompt, context }, { mcp, model, ledger: await ledger() });
    expect(result.status).toBe("succeeded");
    expect(result.events).toContainEqual(expect.objectContaining({ type: "tool_failed", code: "READ_ONLY_TOOL_BLOCKED", canRetry: false }));
    expect(mcp.callTool).not.toHaveBeenCalled();
  });

  it("rejects valid JSON with missing mutation identifiers before execution", async () => {
    const mcp = mcpProvider();
    const model = scriptedModel([
      response("", [{ name: "save_cv", arguments: JSON.stringify({ cv: { summary: "bad" } }) }]),
      response("The mutation payload was rejected safely."),
    ]);
    const result = await runAssistantTurn(
      { session: session(7), message: "Apply this malformed CV update.", context },
      { mcp, model, ledger: await ledger() },
    );
    expect(result.status).toBe("succeeded");
    expect(result.events).toContainEqual(expect.objectContaining({ type: "tool_failed", code: "INVALID_TOOL_ARGUMENTS", canRetry: false }));
    expect(mcp.callTool).not.toHaveBeenCalled();
  });
  it.each([
    { label: "numeric cvId", arguments: { cvId: 42, cv: { summary: "bad" } } },
    { label: "string cv", arguments: { cvId: "cv_en_john_doe", cv: "bad" } },
  ])("rejects wrong tool field types before execution: $label", async (testCase) => {
    const mcp = mcpProvider();
    const model = scriptedModel([
      response("", [{ name: "save_cv", arguments: JSON.stringify(testCase.arguments) }]),
      response("The malformed field type was rejected safely."),
    ]);
    const result = await runAssistantTurn(
      { session: session(8), message: "Apply this malformed CV update.", context },
      { mcp, model, ledger: await ledger() },
    );
    expect(result.status).toBe("succeeded");
    expect(result.events).toContainEqual(expect.objectContaining({ type: "tool_failed", code: "INVALID_TOOL_ARGUMENTS", canRetry: false }));
    expect(mcp.callTool).not.toHaveBeenCalled();
  });
  it("recovers from a malformed read call by correcting the arguments", async () => {
    const mcp = mcpProvider();
    const model = scriptedModel([
      response("", [{ name: "list_cvs", arguments: JSON.stringify({ limit: "three" }) }]),
      response("", [{ name: "list_cvs", arguments: JSON.stringify({ limit: 3 }) }]),
      response("The corrected read completed successfully."),
    ]);
    const result = await runAssistantTurn(
      { session: session(9), message: "List the first three CVs.", context },
      { mcp, model, ledger: await ledger() },
    );
    expect(result.status).toBe("succeeded");
    expect(result.events).toContainEqual(expect.objectContaining({ type: "tool_failed", code: "INVALID_TOOL_ARGUMENTS", canRetry: false }));
    expect(mcp.callTool).toHaveBeenCalledWith("list_cvs", { limit: 3 }, expect.any(AbortSignal));
    expect(mcp.callTool).toHaveBeenCalledTimes(1);
  });
  it("stops safely when malformed read arguments remain uncorrected", async () => {
    const mcp = mcpProvider();
    const malformed = JSON.stringify({ limit: "still-not-an-integer" });
    const model = scriptedModel([
      response("", [{ name: "list_cvs", arguments: malformed }]),
      response("", [{ name: "list_cvs", arguments: malformed }]),
      response("I could not produce a valid read request; no data was changed."),
    ]);
    const result = await runAssistantTurn(
      { session: session(10), message: "List CVs with an invalid limit.", context },
      { mcp, model, ledger: await ledger() },
    );
    expect(result.status).toBe("succeeded");
    expect(result.events.filter((event) => event.type === "tool_failed")).toHaveLength(2);
    expect(mcp.callTool).not.toHaveBeenCalled();
  });
  it("treats a semantically missing CV ID as a tool 404 and recovers", async () => {
    const base = mcpProvider();
    const mcp = { ...base, callTool: vi.fn(async (name: string, args: Record<string, unknown>) => {
      if (name === "get_cv") throw new Error(`404 CV not found: ${String(args.cvId)}`);
      return { ok: true, items: [{ id: "cv_en_john_doe" }] };
    }) };
    const model = scriptedModel([
      response("", [{ name: "get_cv", arguments: JSON.stringify({ cvId: "cv_missing_semantic_404" }) }]),
      response("", [{ name: "list_cvs", arguments: JSON.stringify({ limit: 3 }) }]),
      response("The CV ID was validly formed but does not exist; I recovered with the available CV list."),
    ]);
    const result = await runAssistantTurn(
      { session: session(11), message: "Inspect cv_missing_semantic_404, then recover if it is missing.", context },
      { mcp, model, ledger: await ledger() },
    );
    expect(result.status).toBe("succeeded");
    expect(result.events).toContainEqual(expect.objectContaining({ type: "tool_failed", code: "MCP_TOOL_FAILED", canRetry: true }));
    expect(mcp.callTool).toHaveBeenCalledWith("list_cvs", { limit: 3 }, expect.any(AbortSignal));
  });
  it("does not create a record for a semantically missing mutation target", async () => {
    const base = mcpProvider();
    const mcp = { ...base, callTool: vi.fn(async (name: string) => {
      if (name === "get_cv") throw new Error("404 CV target not found");
      return { ok: true };
    }) };
    const model = scriptedModel([
      response("", [{ name: "save_cv", arguments: JSON.stringify({ cvId: "cv_missing_mutation_404", cv: { summary: "should not save" } }) }]),
      response("The target CV does not exist, so no mutation was prepared."),
    ]);
    const result = await runAssistantTurn(
      { session: session(12), message: "Update the missing CV only if it exists.", context },
      { mcp, model, ledger: await ledger() },
    );
    expect(result.status).toBe("awaiting_approval");
    expect(result.events.some((event) => event.type === "approval_required")).toBe(true);
    expect(mcp.callTool).not.toHaveBeenCalledWith("save_cv", expect.anything(), expect.anything());
  });
  it("stops a multi-tool mutation plan at the first approval boundary", async () => {
    const mcp = mcpProvider();
    const model = scriptedModel([
      response("", [
        { name: "save_cv", arguments: JSON.stringify({ cvId: "cv_en_john_doe", cv: { summary: "first" } }) },
        { name: "application_update", arguments: JSON.stringify({ applicationId: "app_1", status: "ready" }) },
      ]),
    ]);
    const result = await runAssistantTurn(
      { session: session(13), message: "Update the CV and then update the application.", context },
      { mcp, model, ledger: await ledger() },
    );
    expect(result.status).toBe("awaiting_approval");
    expect(result.events.filter((event) => event.type === "approval_required")).toHaveLength(1);
    expect(mcp.callTool).not.toHaveBeenCalledWith("save_cv", expect.anything(), expect.anything());
    expect(mcp.callTool).not.toHaveBeenCalledWith("application_update", expect.anything(), expect.anything());
  });
  it("requires approval when keyword extraction requests persistence", () => {
    const decision = gateAssistantToolCall("research_extract_keywords", { jobId: "job_1", replace: true }, async () => ({ ok: true }));
    expect(decision).toMatchObject({ action: "require_approval", approvalKind: "write" });
  });
  it("bounds oversized tool results before the next model round", () => {
    const bounded = boundAssistantValueForModel({ payload: "x".repeat(60_000) }) as { truncated?: boolean; originalCharacters?: number; preview?: string };
    expect(bounded.truncated).toBe(true);
    expect(bounded.originalCharacters).toBeGreaterThan(50_000);
    expect(bounded.preview?.length).toBe(50_000);
  });
  it("prioritizes a directly requested list tool before the 16-tool cap", () => {
    const selected = selectAssistantToolsForTurn(
      Array.from({ length: 50 }, (_, index) => ({
        name: index === 49 ? "list_cvs" : `application_tool_${index}`,
        description: "selection test",
        inputSchema: { type: "object", properties: {}, additionalProperties: true },
      })),
      "List my CVs and summarize verified IDs.",
      context,
    );
    expect(selected.map((tool) => tool.name)).toContain("list_cvs");
  });
  it("prioritizes research reads over guarded research mutations", () => {
    const selected = selectAssistantToolsForTurn(
      ["research_job_get", "research_extract_keywords", "research_keyword_gap", "research_job_delete", "research_job_put", "research_company_run", "research_company_put", "research_field_refine", "research_company_delete", "research_company_enrich", "research_job_run", "research_catalog_put", "research_catalog_get", "get_cv", "save_cv", "create_cv"].map((name) => ({
        name,
        description: "selection test",
        inputSchema: { type: "object", properties: {}, additionalProperties: true },
      })),
      "Inspect the researched job, extract keywords, and identify keyword gaps. Do not modify anything.",
      { ...context, activePanel: "research" },
    );
    expect(selected.map((tool) => tool.name)).toEqual(expect.arrayContaining(["research_job_get", "research_extract_keywords", "research_keyword_gap"]));
  });
  it("writes a redacted request-to-action debug trace", async () => {
    const directory = await fs.mkdtemp(path.join(os.tmpdir(), "mfcv-assistant-debug-"));
    temporaryDirectories.push(directory);
    const debugPath = path.join(directory, "assistant.jsonl");
    vi.stubEnv("MFCV_ASSISTANT_DEBUG_LOG", debugPath);
    const mcp = mcpProvider();
    const model = scriptedModel([response("", [{ name: "applications_list", arguments: JSON.stringify({ token: "secret-value" }) }]), response("Done.")]);
    await runAssistantTurn({ session: session(999), message: "Inspect applications", context }, { mcp, model, ledger: await ledger() });
    const trace = await fs.readFile(debugPath, "utf-8");
    expect(trace).toContain('"phase":"turn_start"');
    expect(trace).toContain('"phase":"model_request"');
    expect(trace).toContain('"phase":"tool_decision"');
    expect(trace).toContain('"phase":"tool_succeeded"');
    expect(trace).not.toContain("secret-value");
  });

  it("contains at least 100 full capability cases", () => {
    expect(cases.length).toBeGreaterThanOrEqual(100);
  });
});
