import crypto from "node:crypto";

import { applyTemplateVisibility, readTemplateVisibility } from "@/lib/cvTemplateVisibility";
import { readCv } from "./cvStore";

export type AiDetectionScope = {
  id: string;
  label: string;
  text: string;
  characters: number;
  words: number;
  inputHash: string;
};

export type AiDetectionResult = {
  provider: "sapling" | "gptzero" | "local";
  providerUrl: string;
  checkedAt: string;
  model: string;
  scope: string;
  inputHash: string;
  characters: number;
  words: number;
  status: "measured" | "blocked" | "invalid" | "stale" | "incomparable";
  aiProbability: number | null;
  classification?: string;
  notes?: string;
};

export type AiDetectionReport = {
  cvId: string;
  scopes: AiDetectionScope[];
  results: AiDetectionResult[];
  compositeRisk: number | null;
  coverage: string;
};

function textFromValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return value.map(textFromValue).filter(Boolean).join("\n");
  if (typeof value === "object") return Object.values(value as Record<string, unknown>).map(textFromValue).filter(Boolean).join("\n");
  return "";
}

function sanitizeDocument(cv: Record<string, unknown>, templateId: string): Record<string, unknown> {
  const visible = applyTemplateVisibility(cv, readTemplateVisibility(cv));
  const clean = JSON.parse(JSON.stringify(visible)) as Record<string, unknown>;
  delete clean.schema;
  delete clean.metadata;
  delete clean.compliance;
  delete clean.references;
  const person = clean.person && typeof clean.person === "object" ? { ...(clean.person as Record<string, unknown>) } : {};
  delete person.contact;
  delete person.residence;
  delete person.birth_date;
  delete person.nationality;
  clean.person = person;
  void templateId;
  return clean;
}

function scope(id: string, label: string, value: unknown): AiDetectionScope {
  const text = textFromValue(value).replace(/https?:\/\/\S+/gi, "").replace(/\s+/g, " ").trim();
  return {
    id,
    label,
    text,
    characters: text.length,
    words: text ? text.split(/\s+/).length : 0,
    inputHash: crypto.createHash("sha256").update(text).digest("hex"),
  };
}

export async function buildAiDetectionScopes(cvId: string, templateId: string): Promise<AiDetectionScope[]> {
  const cv = await readCv(cvId);
  if (!cv) throw new Error("CV not found.");
  const clean = sanitizeDocument(cv, templateId);
  const person = (clean.person ?? {}) as Record<string, unknown>;
  const positioning = (clean.positioning ?? {}) as Record<string, unknown>;
  const experience = Array.isArray(clean.experience) ? clean.experience : [];
  const skills = clean.skills ?? clean.backmatter ?? {};
  const sidebar = { full_name: person.display_name ?? person.full_name, headline: positioning.headline };
  const frontmatter = { summary: positioning.profile_summary, transition: positioning.transition_narrative, applicability: positioning.role_applicability };
  const companyScopes = experience.map((item, index) => {
    const record = item && typeof item === "object" ? item as Record<string, unknown> : {};
    const label = `${String(record.role ?? "Position")} @ ${String(record.employer ?? "Company")}`;
    return scope(`experience-${String(record.id ?? index)}`, label, record);
  });
  return [
    scope("sidebar", "Sidebar", sidebar),
    scope("frontmatter", "Frontmatter", frontmatter),
    ...companyScopes,
    scope("backmatter", "Backmatter", skills),
    scope("whole-document", "Whole document", clean),
  ].filter((item) => item.text.length > 0);
}

function resultBase(provider: AiDetectionResult["provider"], url: string, item: AiDetectionScope): AiDetectionResult {
  return { provider, providerUrl: url, checkedAt: new Date().toISOString(), model: "", scope: item.id, inputHash: item.inputHash, characters: item.characters, words: item.words, status: "blocked", aiProbability: null };
}

async function detectSapling(item: AiDetectionScope): Promise<AiDetectionResult> {
  const result = resultBase("sapling", "https://api.sapling.ai/api/v1/aidetect", item);
  const key = process.env.MFCV_SAPLING_API_KEY?.trim();
  if (!key) return { ...result, notes: "Sapling API key is not configured." };
  if (!item.text) return { ...result, status: "invalid", notes: "Scope has no text." };
  try {
    const response = await fetch(result.providerUrl, { method: "POST", headers: { authorization: `Bearer ${key}`, "content-type": "application/json" }, body: JSON.stringify({ text: item.text, sent_scores: true, version: "20251027" }), signal: AbortSignal.timeout(30000) });
    const payload = await response.json().catch(() => ({})) as { score?: unknown; version?: unknown };
    if (!response.ok || typeof payload.score !== "number") return { ...result, status: response.status === 401 || response.status === 403 ? "blocked" : "invalid", notes: `Sapling returned HTTP ${response.status}.` };
    return { ...result, status: "measured", model: String(payload.version ?? "20251027"), aiProbability: Math.max(0, Math.min(1, payload.score)), classification: "provider estimate" };
  } catch (error) { return { ...result, notes: error instanceof Error ? error.message : "Sapling request failed." }; }
}

async function detectGptZero(item: AiDetectionScope): Promise<AiDetectionResult> {
  const result = resultBase("gptzero", "https://api.gptzero.me/v2/predict/text", item);
  const key = process.env.MFCV_GPTZERO_API_KEY?.trim();
  if (!key) return { ...result, notes: "GPTZero API key is not configured." };
  try {
    const response = await fetch(result.providerUrl, { method: "POST", headers: { "x-api-key": key, "content-type": "application/json" }, body: JSON.stringify({ document: item.text }), signal: AbortSignal.timeout(30000) });
    const payload = await response.json().catch(() => ({})) as { documents?: Array<{ completely_generated_prob?: unknown; document_classification?: unknown; confidence_category?: unknown }> };
    const document = payload.documents?.[0];
    if (!response.ok || !document || typeof document.completely_generated_prob !== "number") return { ...result, status: response.status === 401 || response.status === 403 ? "blocked" : "invalid", notes: `GPTZero returned HTTP ${response.status}.` };
    return { ...result, status: "measured", model: "v2", aiProbability: Math.max(0, Math.min(1, document.completely_generated_prob)), classification: String(document.document_classification ?? ""), notes: String(document.confidence_category ?? "") };
  } catch (error) { return { ...result, notes: error instanceof Error ? error.message : "GPTZero request failed." }; }
}

function detectLocal(item: AiDetectionScope): AiDetectionResult {
  const result = resultBase("local", "local://ai-writing-heuristic", item);
  if (!item.text) return { ...result, status: "invalid", notes: "Scope has no text." };
  const sentences = item.text.split(/[.!?]+/).map((value) => value.trim()).filter(Boolean);
  const generic = (item.text.match(/\b(leverage|robust|seamless|innovative|spearheaded|passionate|dynamic)\b/gi) ?? []).length;
  const repeated = sentences.length > 1 ? 1 - new Set(sentences.map((value) => value.toLowerCase())).size / sentences.length : 0;
  const probability = Math.max(0, Math.min(1, generic / Math.max(8, item.words / 40) * 0.35 + repeated * 0.65));
  return { ...result, status: "measured", model: "local-heuristic-v1", aiProbability: probability, classification: "heuristic estimate", notes: "Local heuristic, not a provider verdict." };
}

export async function runAiDetection(cvId: string, templateId: string): Promise<AiDetectionReport> {
  const scopes = await buildAiDetectionScopes(cvId, templateId);
  const whole = scopes.find((item) => item.id === "whole-document");
  if (!whole) throw new Error("The CV has no visible text to scan.");
  const saplingResults = await Promise.all(scopes.filter((item) => item.id !== "whole-document").map(detectSapling));
  const wholeResults = await Promise.all([detectGptZero(whole), Promise.resolve(detectLocal(whole))]);
  const results = [...saplingResults, ...wholeResults];
  const measured = results.filter((item) => item.status === "measured" && item.aiProbability !== null);
  const weight = measured.reduce((sum, item) => sum + Math.max(1, item.words), 0);
  const compositeRisk = weight ? measured.reduce((sum, item) => sum + (item.aiProbability ?? 0) * Math.max(1, item.words), 0) / weight : null;
  return { cvId, scopes, results, compositeRisk, coverage: `${measured.length}/${results.length} measured` };
}
