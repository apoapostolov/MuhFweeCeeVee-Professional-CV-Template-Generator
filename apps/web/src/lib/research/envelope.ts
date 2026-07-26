import { extractFirstJsonBlock } from "@/lib/field-ai-rewrite";

import type { ResearchAiEnvelope, ResearchAiOperation } from "./contracts/types";

const OPERATIONS = new Set<ResearchAiOperation>([
  "seed_fill",
  "group_enrich",
  "field_refine",
  "keyword_extract",
]);

/**
 * Parse strict Research AI envelope (schema_version 1).
 * Also accepts legacy single-field refine JSON and wraps it when fieldPath is provided.
 */
export function parseResearchAiEnvelope(
  raw: string,
  options?: {
    fallbackEntityType?: "company" | "job_position";
    fallbackOperation?: ResearchAiOperation;
    /** When model returns { value, confidence } only */
    singleFieldPath?: string;
  },
): ResearchAiEnvelope | null {
  const parsed = extractFirstJsonBlock(raw);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return null;
  }
  const record = parsed as Record<string, unknown>;

  if (record.schema_version === 1 && record.fields && typeof record.fields === "object") {
    const entityType = record.entity_type;
    const operation = record.operation;
    if (entityType !== "company" && entityType !== "job_position") {
      return null;
    }
    if (typeof operation !== "string" || !OPERATIONS.has(operation as ResearchAiOperation)) {
      return null;
    }
    const fieldsRecord = record.fields as Record<string, unknown>;
    const fields: ResearchAiEnvelope["fields"] = {};
    for (const [path, value] of Object.entries(fieldsRecord)) {
      if (!value || typeof value !== "object" || Array.isArray(value)) continue;
      const entry = value as Record<string, unknown>;
      const confidenceRaw = Number(entry.confidence);
      fields[path] = {
        value: entry.value,
        confidence: Number.isFinite(confidenceRaw)
          ? Math.max(0, Math.min(100, Math.round(confidenceRaw)))
          : 50,
        status: normalizeStatus(entry.status),
        sources: Array.isArray(entry.sources)
          ? entry.sources.map((s) => String(s).trim()).filter(Boolean)
          : undefined,
        evidence: typeof entry.evidence === "string" ? entry.evidence : undefined,
      };
    }
    if (Object.keys(fields).length === 0) {
      return null;
    }
    return {
      schema_version: 1,
      entity_type: entityType,
      operation: operation as ResearchAiOperation,
      fields,
      usage: parseUsage(record.usage),
    };
  }

  // Legacy field-refine: { current_score, proposals: [{ value, confidence }] }
  if (options?.singleFieldPath && Array.isArray(record.proposals)) {
    const first = record.proposals[0];
    if (first && typeof first === "object" && !Array.isArray(first)) {
      const proposal = first as Record<string, unknown>;
      const confidenceRaw = Number(proposal.confidence);
      return {
        schema_version: 1,
        entity_type: options.fallbackEntityType ?? "company",
        operation: options.fallbackOperation ?? "field_refine",
        fields: {
          [options.singleFieldPath]: {
            value: proposal.value,
            confidence: Number.isFinite(confidenceRaw)
              ? Math.max(0, Math.min(100, Math.round(confidenceRaw)))
              : 50,
            status: "found",
          },
        },
      };
    }
  }

  // Legacy: { value, confidence } for one field
  if (options?.singleFieldPath && "value" in record) {
    const confidenceRaw = Number(record.confidence);
    return {
      schema_version: 1,
      entity_type: options.fallbackEntityType ?? "company",
      operation: options.fallbackOperation ?? "field_refine",
      fields: {
        [options.singleFieldPath]: {
          value: record.value,
          confidence: Number.isFinite(confidenceRaw)
            ? Math.max(0, Math.min(100, Math.round(confidenceRaw)))
            : 50,
          status: "found",
          sources: Array.isArray(record.sources)
            ? record.sources.map((s) => String(s).trim()).filter(Boolean)
            : undefined,
        },
      },
    };
  }

  return null;
}

function normalizeStatus(
  raw: unknown,
): "found" | "not_found" | "uncertain" | "user_provided" {
  const s = String(raw ?? "found").trim().toLowerCase();
  if (s === "not_found" || s === "uncertain" || s === "user_provided" || s === "found") {
    return s;
  }
  return "found";
}

function parseUsage(
  raw: unknown,
): ResearchAiEnvelope["usage"] | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const record = raw as Record<string, unknown>;
  return {
    model: typeof record.model === "string" ? record.model : undefined,
    prompt_tokens:
      typeof record.prompt_tokens === "number" ? record.prompt_tokens : undefined,
    completion_tokens:
      typeof record.completion_tokens === "number" ? record.completion_tokens : undefined,
  };
}
