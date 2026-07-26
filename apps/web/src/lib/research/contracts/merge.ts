import { getAtPath, setAtPath } from "../research-path-utils";

import { COMPANY_FIELD_CONTRACTS } from "./companyFields";
import { JOB_FIELD_CONTRACTS } from "./jobFields";
import type {
  EnvelopeField,
  ResearchAiEnvelope,
  ResearchFieldContract,
  ValidateContext,
} from "./types";
import { validateFieldValue } from "./validate";

type PathSegment = string | number;

const COMPANY_BY_PATH = new Map(COMPANY_FIELD_CONTRACTS.map((c) => [c.path, c]));
const JOB_BY_PATH = new Map(JOB_FIELD_CONTRACTS.map((c) => [c.path, c]));

function contractFor(
  entityType: "company" | "job_position",
  path: string,
): ResearchFieldContract | null {
  return entityType === "company"
    ? (COMPANY_BY_PATH.get(path) ?? null)
    : (JOB_BY_PATH.get(path) ?? null);
}

export type MergeMode = "empty_only" | "overwrite";

export type MergeReport = {
  applied: string[];
  rejected: Array<{ path: string; error: string }>;
  entity: unknown;
};

function isEmptyAt(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === "string") return value.trim().length === 0;
  if (Array.isArray(value)) return value.length === 0;
  return false;
}

function pathToSegments(path: string): PathSegment[] {
  return path.split(".").filter(Boolean);
}

function normalizeEnvelopeField(raw: unknown): EnvelopeField | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const record = raw as Record<string, unknown>;
  const confidenceRaw = Number(record.confidence);
  const confidence = Number.isFinite(confidenceRaw)
    ? Math.max(0, Math.min(100, Math.round(confidenceRaw)))
    : 50;
  const statusRaw = String(record.status ?? "found").trim().toLowerCase();
  const status =
    statusRaw === "not_found" ||
    statusRaw === "uncertain" ||
    statusRaw === "user_provided" ||
    statusRaw === "found"
      ? statusRaw
      : "found";
  const sources = Array.isArray(record.sources)
    ? record.sources.map((s) => String(s).trim()).filter(Boolean)
    : undefined;
  return {
    value: record.value,
    confidence,
    status,
    sources,
    evidence: typeof record.evidence === "string" ? record.evidence : undefined,
  };
}

/**
 * Apply a validated AI envelope onto a company or job entity.
 */
export function applyEnvelopeToEntity(
  entityType: "company" | "job_position",
  entity: unknown,
  envelope: ResearchAiEnvelope,
  options?: { mode?: MergeMode; rawJdText?: string },
): MergeReport {
  const mode = options?.mode ?? "empty_only";
  let next = entity;
  const applied: string[] = [];
  const rejected: Array<{ path: string; error: string }> = [];

  for (const [path, fieldRaw] of Object.entries(envelope.fields ?? {})) {
    const contract = contractFor(entityType, path);
    if (!contract) {
      rejected.push({ path, error: "Unknown field path (not in contracts)." });
      continue;
    }
    const field = normalizeEnvelopeField(fieldRaw);
    if (!field) {
      rejected.push({ path, error: "Invalid envelope field shape." });
      continue;
    }
    if (field.status === "not_found") {
      continue;
    }

    const segments = pathToSegments(path);
    const current = getAtPath(next, segments);
    if (mode === "empty_only" && !isEmptyAt(current)) {
      rejected.push({ path, error: "Skipped: non-empty (empty_only mode)." });
      continue;
    }

    const ctx: ValidateContext = {
      sources: field.sources,
      status: field.status,
      rawJdText: options?.rawJdText,
    };
    const validated = validateFieldValue(contract, field.value, ctx);
    if (!validated.ok) {
      rejected.push({ path, error: validated.error });
      continue;
    }

    next = setAtPath(next, segments, validated.value);
    applied.push(path);
  }

  return { applied, rejected, entity: next };
}
