import { parseWeightedKeywordsFromProposal } from "../weighted-keywords";

import type {
  ResearchFieldContract,
  ValidateContext,
  ValidateResult,
} from "./types";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isEmptyValue(raw: unknown): boolean {
  if (raw === null || raw === undefined) return true;
  if (typeof raw === "string") return raw.trim().length === 0;
  if (Array.isArray(raw)) return raw.length === 0;
  return false;
}

export function normalizeHttpsUrl(raw: unknown): string | null {
  const input = String(raw ?? "").trim();
  if (!input) return null;
  try {
    const parsed = new URL(input);
    if (parsed.protocol !== "https:") return null;
    if (parsed.username || parsed.password) return null;
    return parsed.toString();
  } catch {
    try {
      if (/^[a-z][a-z0-9+.-]*:/i.test(input)) return null;
      const parsed = new URL(`https://${input.replace(/^\/+/, "")}`);
      if (parsed.protocol !== "https:") return null;
      return parsed.toString();
    } catch {
      return null;
    }
  }
}

function validatePersonList(raw: unknown, maxItems: number): ValidateResult {
  if (!Array.isArray(raw)) {
    return { ok: false, error: "people must be an array." };
  }
  const out: Array<Record<string, string>> = [];
  for (const entry of raw.slice(0, maxItems)) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) continue;
    const record = entry as Record<string, unknown>;
    const name = String(record.name ?? "").trim();
    const title = String(record.title ?? "").trim();
    const linkedin = normalizeHttpsUrl(record.linkedin_url);
    if (!name || !linkedin) continue;
    if (!/linkedin\.com/i.test(linkedin)) continue;
    const row: Record<string, string> = { name, linkedin_url: linkedin };
    if (title) row.title = title;
    const department = String(record.department ?? "").trim();
    if (department) row.department = department.slice(0, 120);
    const seniority = String(record.seniority ?? "").trim();
    if (seniority) row.seniority = seniority.slice(0, 80);
    const location = String(record.location ?? "").trim();
    if (location) row.location = location.slice(0, 120);
    // D4: drop person emails unless we treat as user — AI people never keep email without source handling
    out.push(row);
  }
  return { ok: true, value: out };
}

function validateLinkedInJobList(raw: unknown, maxItems: number): ValidateResult {
  if (!Array.isArray(raw)) {
    return { ok: false, error: "linkedin_jobs must be an array." };
  }
  const out: Array<Record<string, string>> = [];
  for (const entry of raw.slice(0, maxItems)) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) continue;
    const record = entry as Record<string, unknown>;
    const title = String(record.title ?? "").trim();
    const url = normalizeHttpsUrl(record.url);
    if (!title || !url) continue;
    const row: Record<string, string> = { title: title.slice(0, 200), url };
    const location = String(record.location ?? "").trim();
    if (location) row.location = location.slice(0, 120);
    const snippet = String(record.description_snippet ?? "").trim();
    if (snippet) row.description_snippet = snippet.slice(0, 500);
    out.push(row);
  }
  return { ok: true, value: out };
}

export function validateFieldValue(
  contract: ResearchFieldContract,
  raw: unknown,
  ctx?: ValidateContext,
): ValidateResult {
  const empty = isEmptyValue(raw);
  if (empty) {
    if (contract.allowEmpty === false && contract.kind !== "object_list") {
      return { ok: false, error: `${contract.path} is required.` };
    }
    if (contract.kind === "string_list" || contract.kind === "object_list") {
      return { ok: true, value: [] };
    }
    if (contract.kind === "weighted_keywords") {
      return { ok: true, value: [] };
    }
    return { ok: true, value: "" };
  }

  const status = ctx?.status;
  const sources = (ctx?.sources ?? []).filter((s) => typeof s === "string" && s.trim());
  const userOwned = status === "user_provided";

  if (contract.requireSourcesToSet && !userOwned && sources.length === 0) {
    return {
      ok: false,
      error: `${contract.path} requires sources (D4); refusing inventable contact data.`,
    };
  }

  switch (contract.kind) {
    case "string": {
      const text = String(raw).trim();
      const max = contract.maxLength ?? 10_000;
      if (text.length > max) {
        return { ok: false, error: `${contract.path} exceeds max length ${max}.` };
      }
      return { ok: true, value: text };
    }
    case "number": {
      const n = typeof raw === "number" ? raw : Number(raw);
      if (!Number.isFinite(n)) {
        return { ok: false, error: `${contract.path} must be a number.` };
      }
      return { ok: true, value: n };
    }
    case "enum": {
      const text = String(raw).trim().toLowerCase().replace(/\s+/g, "_");
      const allowed = contract.enumValues ?? [];
      const match = allowed.find((v) => v.toLowerCase() === text || v === String(raw).trim());
      if (!match) {
        return {
          ok: false,
          error: `${contract.path} must be one of: ${allowed.join(", ")}.`,
        };
      }
      return { ok: true, value: match };
    }
    case "url": {
      const url = normalizeHttpsUrl(raw);
      if (!url) {
        return { ok: false, error: `${contract.path} must be a valid https URL.` };
      }
      if (contract.path.includes("linkedin") && !/linkedin\.com/i.test(url)) {
        return { ok: false, error: `${contract.path} must be a linkedin.com URL.` };
      }
      return { ok: true, value: url };
    }
    case "email": {
      const text = String(raw).trim().toLowerCase();
      if (!EMAIL_RE.test(text)) {
        return { ok: false, error: `${contract.path} must be a valid email.` };
      }
      return { ok: true, value: text };
    }
    case "string_list": {
      if (!Array.isArray(raw)) {
        return { ok: false, error: `${contract.path} must be an array of strings.` };
      }
      const maxItems = contract.maxItems ?? 100;
      const maxLen = contract.maxLength ?? 400;
      const items = raw
        .map((item) => String(item ?? "").trim())
        .filter(Boolean)
        .map((item) => item.slice(0, maxLen))
        .slice(0, maxItems);
      return { ok: true, value: items };
    }
    case "object_list": {
      const maxItems = contract.maxItems ?? 30;
      if (contract.listItemKind === "person") {
        return validatePersonList(raw, maxItems);
      }
      if (contract.listItemKind === "linkedin_job") {
        return validateLinkedInJobList(raw, maxItems);
      }
      return { ok: false, error: `${contract.path} has unknown list item kind.` };
    }
    case "weighted_keywords": {
      const keywords = parseWeightedKeywordsFromProposal(raw);
      const maxItems = contract.maxItems ?? 120;
      return { ok: true, value: keywords.slice(0, maxItems) };
    }
    default:
      return { ok: false, error: `Unknown field kind for ${contract.path}.` };
  }
}
