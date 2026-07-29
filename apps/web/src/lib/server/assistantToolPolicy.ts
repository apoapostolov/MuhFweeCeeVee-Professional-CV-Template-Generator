import {
  getAssistantToolDefinition,
  type AssistantPolicyDecision,
  type AssistantToolDefinition,
} from "@muhfweeceevee/schemas";

const APPROVAL_CLASS = {
  paid: "cost",
  write: "write",
  destructive: "destructive",
} as const;

const BLOCKED_CLASS_REASON = {
  sensitive: "Sensitive settings are unavailable to the assistant.",
  bulk: "Bulk and session-import operations are unavailable to the assistant.",
  retired: "This tool is retired and cannot be used by the assistant.",
} as const;

const CONFIRMED_MANAGEMENT_TOOLS = new Set([
  "create_cv",
  "save_cv",
  "create_cv_variant",
  "cv_sync",
  "translate_field",
  "research_company_put",
  "research_company_delete",
  "research_company_run",
  "research_company_enrich",
  "research_job_put",
  "research_job_delete",
  "research_job_run",
  "research_field_refine",
  "cover_letter_save",
  "cover_letter_delete_version",
  "application_upsert",
  "application_update",
  "application_activity_add",
  "application_contact_add",
  "application_submission_create",
  "application_quick_intake",
  "application_reuse_packet",
]);

export function isAssistantConfirmedManagementTool(toolName: string): boolean {
  return CONFIRMED_MANAGEMENT_TOOLS.has(toolName);
}

export function decideAssistantToolPolicy(toolName: string): AssistantPolicyDecision {
  const definition = getAssistantToolDefinition(toolName);
  if (!definition) {
    return {
      action: "block",
      code: "UNKNOWN_TOOL",
      reason: `Unknown MCP tool "${toolName}" is blocked by default.`,
    };
  }

  if (definition.class === "read" || definition.class === "derived") {
    return { action: "allow", definition };
  }

  if (
    definition.class === "paid" ||
    definition.class === "write" ||
    definition.class === "destructive"
  ) {
    return {
      action: "require_approval",
      approvalKind: APPROVAL_CLASS[definition.class],
      definition,
    };
  }

  return {
    action: "block",
    code: "BLOCKED_TOOL_CLASS",
    reason: BLOCKED_CLASS_REASON[definition.class],
    definition,
  };
}

function displayValue(value: unknown): string | undefined {
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (Array.isArray(value) && value.length > 0) {
    return value.map(displayValue).filter(Boolean).join(", ");
  }
  return undefined;
}

export function describeAssistantToolTarget(
  definition: AssistantToolDefinition,
  args: Record<string, unknown>,
): string {
  const identifiers = definition.target.idFields
    .map((field) => {
      const value = displayValue(args[field]);
      return value ? `${field}=${value}` : undefined;
    })
    .filter((value): value is string => Boolean(value));
  const labels = definition.target.labelFields
    .map((field) => displayValue(args[field]))
    .filter((value): value is string => Boolean(value));
  const detail = [...labels, ...identifiers].join(" · ");

  return detail
    ? `${definition.target.entity}: ${detail}`
    : definition.target.entity;
}

export type AssistantToolGateResult =
  | {
      action: "execute";
      targetDescription: string;
      execute: () => Promise<unknown>;
    }
  | {
      action: "require_approval";
      approvalKind: "cost" | "write" | "destructive";
      targetDescription: string;
    }
  | {
      action: "block";
      code: "UNKNOWN_TOOL" | "BLOCKED_TOOL_CLASS";
      reason: string;
    };

/**
 * The only policy entry point used before MCP execution. Guarded calls never
 * receive an executable closure, so model output cannot bypass approval.
 */
export function gateAssistantToolCall(
  toolName: string,
  args: Record<string, unknown>,
  executor: () => Promise<unknown>,
): AssistantToolGateResult {
  const decision = decideAssistantToolPolicy(toolName);
  if (decision.action === "block") {
    return decision;
  }

  const targetDescription = describeAssistantToolTarget(decision.definition, args);
  if (decision.action === "require_approval") {
    return {
      action: "require_approval",
      approvalKind: decision.approvalKind,
      targetDescription,
    };
  }

  return { action: "execute", targetDescription, execute: executor };
}
