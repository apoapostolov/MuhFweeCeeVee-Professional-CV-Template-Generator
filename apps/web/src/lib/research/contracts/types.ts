/**
 * Field contracts for Research catalog entities (D1–D5).
 * Every AI/write path should validate through these before applying values.
 */

export type FieldValueKind =
  | "string"
  | "enum"
  | "url"
  | "email"
  | "string_list"
  | "object_list"
  | "weighted_keywords"
  | "number";

export type FieldAiMode = "none" | "cheap" | "web" | "derived";

export type ResearchFieldContract = {
  path: string;
  kind: FieldValueKind;
  maxLength?: number;
  maxItems?: number;
  enumValues?: readonly string[];
  /** Prefer web search when filling (still gated by D2 checkbox). */
  requiresWeb?: boolean;
  allowEmpty?: boolean;
  /** D4: non-empty value requires sources unless user-provided. */
  requireSourcesToSet?: boolean;
  /** object_list shape tag */
  listItemKind?: "person" | "linkedin_job";
  description: string;
  aiMode?: FieldAiMode;
};

export type FieldValueStatus = "found" | "not_found" | "uncertain" | "user_provided";

export type EnvelopeField = {
  value: unknown;
  confidence: number;
  status: FieldValueStatus;
  sources?: string[];
  evidence?: string;
};

export type ResearchAiOperation =
  | "seed_fill"
  | "group_enrich"
  | "field_refine"
  | "keyword_extract";

export type ResearchAiEnvelope = {
  schema_version: 1;
  entity_type: "company" | "job_position";
  operation: ResearchAiOperation;
  fields: Record<string, EnvelopeField>;
  usage?: {
    model?: string;
    prompt_tokens?: number;
    completion_tokens?: number;
  };
};

export type ValidateResult =
  | { ok: true; value: unknown }
  | { ok: false; error: string };

export type ValidateContext = {
  sources?: string[];
  status?: FieldValueStatus;
  /** When set, JD quote evidence can be verified against this text. */
  rawJdText?: string;
};
