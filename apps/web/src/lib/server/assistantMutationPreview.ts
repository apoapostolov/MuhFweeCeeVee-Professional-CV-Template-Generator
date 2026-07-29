import crypto from "node:crypto";

import {
  ASSISTANT_SCHEMA_VERSION,
  getAssistantToolDefinition,
  type AssistantApprovalPreview,
  type AssistantApprovalProposal,
  type AssistantContextEnvelope,
} from "@muhfweeceevee/schemas";

import type { AssistantMcpProvider } from "./assistantMcpClient";
import { hashAssistantApprovalValue } from "./assistantApproval";
import { redactAssistantValue } from "./assistantSecurity";
import {
  decideAssistantToolPolicy,
  describeAssistantToolTarget,
} from "./assistantToolPolicy";
import { getOpenRouterModels } from "./openRouterModels";
import { readOpenRouterSettings } from "./openRouterSettings";

const APPROVAL_TTL_MS = 5 * 60 * 1000;
const MAX_CHANGES = 40;
const MAX_PREVIEW_STRING = 240;

type ReadSpec = {
  toolName: string;
  arguments: Record<string, unknown>;
  select: (result: unknown) => unknown;
};

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function selectField(field: string): (result: unknown) => unknown {
  return (result) => record(result)?.[field] ?? null;
}

function selectListItem(
  collectionField: string,
  id: unknown,
): (result: unknown) => unknown {
  return (result) => {
    const items = record(result)?.[collectionField];
    return Array.isArray(items)
      ? items.find((item) => record(item)?.id === id) ?? null
      : null;
  };
}

function readSpec(
  toolName: string,
  args: Record<string, unknown>,
): ReadSpec | null {
  const applicationId = args.applicationId ?? args.id;
  switch (toolName) {
    case "save_cv":
      return {
        toolName: "get_cv",
        arguments: { cvId: args.cvId },
        select: selectField("cv"),
      };
    case "research_company_put":
    case "research_company_delete":
      return {
        toolName: "research_company_get",
        arguments: { companyId: args.companyId },
        select: selectField("company"),
      };
    case "research_job_put":
    case "research_job_delete":
      return {
        toolName: "research_job_get",
        arguments: { jobId: args.jobId },
        select: selectField("job_position"),
      };
    case "cover_letter_save":
      return args.id
        ? {
            toolName: "cover_letters_list",
            arguments: {},
            select: selectListItem("items", args.id),
          }
        : null;
    case "cover_letter_delete_version":
      return {
        toolName: "cover_letter_versions",
        arguments: { id: args.id },
        select: (result) => record(result),
      };
    case "application_upsert":
    case "application_update":
    case "application_activity_add":
    case "application_contact_add":
    case "application_submission_create":
      return applicationId
        ? {
            toolName: "application_get",
            arguments: { applicationId },
            select: selectField("application"),
          }
        : null;
    case "career_evidence_save":
    case "career_evidence_delete":
    case "career_evidence_link_cv": {
      const evidenceId = args.evidenceId ?? args.id;
      return evidenceId
        ? {
            toolName: "career_evidence_list",
            arguments: {},
            select: selectListItem("items", evidenceId),
          }
        : null;
    }
    case "photo_delete":
      return {
        toolName: "photo_list",
        arguments: {},
        select: selectListItem("photos", args.id ?? args.photoId),
      };
    default:
      return null;
  }
}

function proposedValue(
  toolName: string,
  args: Record<string, unknown>,
  before: unknown,
): unknown {
  if (toolName === "save_cv") return args.cv;
  if (toolName === "research_company_put") return args.company;
  if (toolName === "research_job_put") return args.job;
  if (toolName === "application_update" || toolName === "application_upsert") {
    const patch = { ...args };
    delete patch.applicationId;
    return { ...(record(before) ?? {}), ...patch };
  }
  if (toolName === "cover_letter_save") {
    return {
      ...(record(before) ?? {}),
      ...(args.title !== undefined ? { title: args.title } : {}),
      ...(args.body !== undefined ? { body: args.body } : {}),
      ...(args.cvId !== undefined ? { cv_id: args.cvId } : {}),
      ...(args.companyId !== undefined ? { company_id: args.companyId } : {}),
      ...(args.jobId !== undefined ? { job_id: args.jobId } : {}),
    };
  }
  if (
    toolName === "application_activity_add" ||
    toolName === "application_contact_add" ||
    toolName === "application_submission_create"
  ) {
    return { operation: args };
  }
  return args;
}

function boundedValue(value: unknown): unknown {
  const safe = redactAssistantValue(value);
  if (typeof safe === "string") {
    return safe.length > MAX_PREVIEW_STRING
      ? `${safe.slice(0, MAX_PREVIEW_STRING)}…`
      : safe;
  }
  if (Array.isArray(safe)) {
    return safe.length > 8
      ? [...safe.slice(0, 8).map(boundedValue), `… ${safe.length - 8} more`]
      : safe.map(boundedValue);
  }
  const object = record(safe);
  if (!object) return safe;
  return Object.fromEntries(
    Object.entries(object)
      .slice(0, 16)
      .map(([key, nested]) => [key, boundedValue(nested)]),
  );
}

function collectChanges(
  before: unknown,
  after: unknown,
  path = "",
  changes: AssistantApprovalPreview["changes"] = [],
): AssistantApprovalPreview["changes"] {
  if (changes.length >= MAX_CHANGES) return changes;
  const beforeRecord = record(before);
  const afterRecord = record(after);
  if (beforeRecord && afterRecord) {
    for (const key of new Set([
      ...Object.keys(beforeRecord),
      ...Object.keys(afterRecord),
    ])) {
      collectChanges(
        beforeRecord[key],
        afterRecord[key],
        path ? `${path}.${key}` : key,
        changes,
      );
      if (changes.length >= MAX_CHANGES) break;
    }
    return changes;
  }
  if (hashAssistantApprovalValue(before) !== hashAssistantApprovalValue(after)) {
    changes.push({
      path: path || "record",
      ...(before !== undefined ? { before: boundedValue(before) } : {}),
      ...(after !== undefined ? { after: boundedValue(after) } : {}),
    });
  }
  return changes;
}

async function readCurrentTarget(
  toolName: string,
  args: Record<string, unknown>,
  mcp: AssistantMcpProvider,
): Promise<unknown> {
  const spec = readSpec(toolName, args);
  if (!spec) return null;
  try {
    return spec.select(await mcp.callTool(spec.toolName, spec.arguments));
  } catch {
    return null;
  }
}

function reversibility(toolName: string, approvalKind: string): string {
  if (approvalKind === "destructive") {
    return toolName === "cover_letter_delete_version"
      ? "The live letter is unchanged, but the deleted snapshot cannot be restored."
      : "This deletion is not automatically reversible. Restore from a portable backup if available.";
  }
  if (approvalKind === "cost") {
    return "The analysis does not directly overwrite workspace records.";
  }
  if (toolName === "application_activity_add") {
    return "The activity is retained in the application timeline as an audit record.";
  }
  return "The change is written locally. Existing version history or a portable backup may provide recovery.";
}

async function estimatedCostUsd(
  toolName: string,
  args: Record<string, unknown>,
  approvalKind: string,
): Promise<number | undefined> {
  const usesAi =
    approvalKind === "cost" ||
    (toolName === "cover_letter_save" &&
      (args.draftWithAi === true || args.humanize === true));
  if (!usesAi) return undefined;
  try {
    const settings = await readOpenRouterSettings();
    const useResearchModel =
      toolName.startsWith("research_") && args.useWebSearch !== false;
    const modelId = (
      useResearchModel ? settings.researchModel : settings.model
    ).trim();
    if (!modelId) return undefined;
    const catalog = await getOpenRouterModels({ apiKey: settings.apiKey });
    const model = catalog.models.find((candidate) => candidate.id === modelId);
    if (!model) return undefined;
    const researchScale = useResearchModel ? 2 : 1;
    const inputTokens = 6_000 * researchScale;
    const outputTokens = 1_500 * researchScale;
    const inputCost =
      model.promptPricePer1M === null
        ? 0
        : (model.promptPricePer1M * inputTokens) / 1_000_000;
    const outputCost =
      model.completionPricePer1M === null
        ? 0
        : (model.completionPricePer1M * outputTokens) / 1_000_000;
    return Number((inputCost + outputCost).toFixed(6));
  } catch {
    return undefined;
  }
}

export async function buildAssistantApprovalProposal(input: {
  sessionId: string;
  callId: string;
  toolName: string;
  arguments: Record<string, unknown>;
  context: AssistantContextEnvelope;
  mcp: AssistantMcpProvider;
  now?: number;
}): Promise<AssistantApprovalProposal> {
  const decision = decideAssistantToolPolicy(input.toolName);
  if (decision.action !== "require_approval") {
    throw new Error(`Tool "${input.toolName}" does not require approval.`);
  }
  const definition = getAssistantToolDefinition(input.toolName);
  if (!definition) throw new Error("Assistant tool definition is missing.");
  const before = await readCurrentTarget(
    input.toolName,
    input.arguments,
    input.mcp,
  );
  const after =
    decision.approvalKind === "destructive"
      ? null
      : proposedValue(input.toolName, input.arguments, before);
  const comparisonBefore = [
    "application_activity_add",
    "application_contact_add",
    "application_submission_create",
  ].includes(input.toolName)
    ? null
    : before;
  const now = input.now ?? Date.now();
  const id = `approval_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;
  const changes = collectChanges(comparisonBefore, after);
  const warnings = [
    ...(input.context.hasUnsavedChanges
      ? [
          "Unsaved composer changes must be saved or discarded, then this preview must be prepared again.",
        ]
      : []),
    ...(changes.length >= MAX_CHANGES
      ? [`Preview is limited to the first ${MAX_CHANGES} changed fields.`]
      : []),
  ];
  const cost = await estimatedCostUsd(
    input.toolName,
    input.arguments,
    decision.approvalKind,
  );
  if (
    decision.approvalKind === "cost" ||
    (input.toolName === "cover_letter_save" &&
      (input.arguments.draftWithAi === true ||
        input.arguments.humanize === true))
  ) {
    warnings.push(
      cost === undefined
        ? "Provider pricing applies; an exact preflight estimate is unavailable."
        : `Estimated model cost is up to $${cost.toFixed(4)} for this operation; provider billing is authoritative.`,
    );
  }

  return {
    schema: ASSISTANT_SCHEMA_VERSION,
    id,
    callId: input.callId,
    sessionId: input.sessionId,
    toolName: input.toolName,
    approvalKind: decision.approvalKind,
    arguments: structuredClone(input.arguments),
    targetDescription: describeAssistantToolTarget(
      decision.definition,
      input.arguments,
    ),
    context: input.context,
    preview: {
      summary: `${definition.title} for ${describeAssistantToolTarget(
        definition,
        input.arguments,
      )}.`,
      affectedRecords: 1,
      changes,
      reversibility: reversibility(input.toolName, decision.approvalKind),
      warnings,
      ...(cost !== undefined ? { estimatedCostUsd: cost } : {}),
    },
    precondition: {
      kind: "content_hash",
      value: hashAssistantApprovalValue(before),
      capturedAt: new Date(now).toISOString(),
    },
    idempotencyKey: `assistant:${id}`,
    createdAt: new Date(now).toISOString(),
    expiresAt: new Date(now + APPROVAL_TTL_MS).toISOString(),
  };
}

export async function isAssistantApprovalTargetCurrent(
  proposal: AssistantApprovalProposal,
  mcp: AssistantMcpProvider,
): Promise<boolean> {
  const current = await readCurrentTarget(
    proposal.toolName,
    proposal.arguments,
    mcp,
  );
  return (
    hashAssistantApprovalValue(current) === proposal.precondition.value
  );
}

export function isAssistantApprovalContextCurrent(
  proposal: AssistantApprovalProposal,
  current: AssistantContextEnvelope,
): boolean {
  const scope = (context: AssistantContextEnvelope) => ({
    activePanel: context.activePanel,
    hasUnsavedChanges: context.hasUnsavedChanges,
    records: context.records.map(({ type, id, revision }) => ({
      type,
      id,
      revision,
    })),
  });
  return (
    !current.hasUnsavedChanges &&
    hashAssistantApprovalValue(scope(proposal.context)) ===
      hashAssistantApprovalValue(scope(current))
  );
}
