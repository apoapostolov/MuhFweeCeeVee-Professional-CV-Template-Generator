import { computeKeywordGap } from "@/lib/research/keywordGap";
import type { WeightedKeyword } from "@/lib/research/types";

export type AtsCheckSeverity = "pass" | "warn" | "fail";

export type AtsCheckItem = {
  id: string;
  severity: AtsCheckSeverity;
  title: string;
  detail: string;
};

export type AtsCheckReport = {
  score: number;
  items: AtsCheckItem[];
  summary: { pass: number; warn: number; fail: number };
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function getString(record: Record<string, unknown> | null, key: string): string {
  if (!record) return "";
  const value = record[key];
  return typeof value === "string" ? value.trim() : "";
}

function flattenText(value: unknown, parts: string[] = []): string[] {
  if (value === null || value === undefined) return parts;
  if (typeof value === "string") {
    if (value.trim()) parts.push(value.trim());
    return parts;
  }
  if (Array.isArray(value)) {
    for (const item of value) flattenText(item, parts);
    return parts;
  }
  if (typeof value === "object") {
    for (const child of Object.values(value as Record<string, unknown>)) {
      flattenText(child, parts);
    }
  }
  return parts;
}

/**
 * Deterministic ATS-style checks — no LLM (WS9).
 */
export function runDeterministicAtsChecks(payload: {
  cv: unknown;
  keywords?: WeightedKeyword[];
}): AtsCheckReport {
  const items: AtsCheckItem[] = [];
  const cv = asRecord(payload.cv);
  const person = asRecord(cv?.person);
  const contact = asRecord(person?.contact);
  const positioning = asRecord(cv?.positioning);
  const experience = Array.isArray(cv?.experience) ? cv.experience : [];
  const education = Array.isArray(cv?.education) ? cv.education : [];
  const fullText = flattenText(payload.cv).join("\n");
  const wordCount = fullText.split(/\s+/).filter(Boolean).length;

  const email = getString(contact, "email");
  const phone = getString(contact, "phone_e164") || getString(contact, "phone_local");
  const fullName = getString(person, "full_name") || getString(person, "display_name");
  const headline = getString(positioning, "headline");

  if (fullName) {
    items.push({
      id: "name",
      severity: "pass",
      title: "Name present",
      detail: fullName,
    });
  } else {
    items.push({
      id: "name",
      severity: "fail",
      title: "Missing name",
      detail: "person.full_name (or display_name) is empty.",
    });
  }

  if (email && email.includes("@")) {
    items.push({
      id: "email",
      severity: "pass",
      title: "Email present",
      detail: email,
    });
  } else {
    items.push({
      id: "email",
      severity: "fail",
      title: "Missing email",
      detail: "Add person.contact.email for ATS parsers.",
    });
  }

  if (phone) {
    items.push({
      id: "phone",
      severity: "pass",
      title: "Phone present",
      detail: phone,
    });
  } else {
    items.push({
      id: "phone",
      severity: "warn",
      title: "No phone",
      detail: "Optional but common for recruiters.",
    });
  }

  if (headline.length >= 12) {
    items.push({
      id: "headline",
      severity: "pass",
      title: "Headline present",
      detail: headline.slice(0, 120),
    });
  } else {
    items.push({
      id: "headline",
      severity: "warn",
      title: "Weak or missing headline",
      detail: "positioning.headline should be a short professional line.",
    });
  }

  if (experience.length > 0) {
    items.push({
      id: "experience",
      severity: "pass",
      title: "Experience section has entries",
      detail: `${experience.length} entr${experience.length === 1 ? "y" : "ies"}`,
    });
  } else {
    items.push({
      id: "experience",
      severity: "fail",
      title: "No experience entries",
      detail: "Add at least one experience item.",
    });
  }

  if (education.length > 0) {
    items.push({
      id: "education",
      severity: "pass",
      title: "Education present",
      detail: `${education.length} entr${education.length === 1 ? "y" : "ies"}`,
    });
  } else {
    items.push({
      id: "education",
      severity: "warn",
      title: "No education entries",
      detail: "Often expected for early/mid career roles.",
    });
  }

  if (wordCount < 150) {
    items.push({
      id: "length_short",
      severity: "warn",
      title: "CV may be too short",
      detail: `About ${wordCount} words — many roles expect more substance.`,
    });
  } else if (wordCount > 1200) {
    items.push({
      id: "length_long",
      severity: "warn",
      title: "CV may be too long",
      detail: `About ${wordCount} words — consider tightening for a 1–2 page target.`,
    });
  } else {
    items.push({
      id: "length",
      severity: "pass",
      title: "Word count in a typical band",
      detail: `About ${wordCount} words.`,
    });
  }

  const keywords = payload.keywords ?? [];
  if (keywords.length > 0) {
    const gap = computeKeywordGap(payload.cv, keywords);
    const mustTotal = gap.missingMust.length + gap.used.filter((u) => u.role === "must" || u.weight >= 75).length;
    const mustMissing = gap.missingMust.length;
    const coverage =
      mustTotal > 0 ? Math.round(((mustTotal - mustMissing) / mustTotal) * 100) : 100;
    if (mustMissing === 0) {
      items.push({
        id: "keywords_must",
        severity: "pass",
        title: "Must-have keywords covered",
        detail: `Coverage ~${coverage}% of must/high-weight terms found in CV text.`,
      });
    } else if (mustMissing <= 2) {
      items.push({
        id: "keywords_must",
        severity: "warn",
        title: "A few must-have keywords missing",
        detail: `Missing: ${gap.missingMust
          .slice(0, 5)
          .map((k) => k.keyword)
          .join(", ")}`,
      });
    } else {
      items.push({
        id: "keywords_must",
        severity: "fail",
        title: "Several must-have keywords missing",
        detail: `Missing ${mustMissing}: ${gap.missingMust
          .slice(0, 6)
          .map((k) => k.keyword)
          .join(", ")}`,
      });
    }
  } else {
    items.push({
      id: "keywords",
      severity: "warn",
      title: "No job keywords selected",
      detail: "Pick a Research job with keywords for keyword coverage checks.",
    });
  }

  const fail = items.filter((i) => i.severity === "fail").length;
  const warn = items.filter((i) => i.severity === "warn").length;
  const pass = items.filter((i) => i.severity === "pass").length;
  const score = Math.max(0, Math.min(100, 100 - fail * 18 - warn * 6));

  return {
    score,
    items,
    summary: { pass, warn, fail },
  };
}
