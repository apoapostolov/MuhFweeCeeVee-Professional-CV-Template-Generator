import crypto from "node:crypto";

import type {
  ResearchedCompany,
  ResearchedJobPosition,
} from "@/lib/research/types";

import {
  normalizeApplicationUrl,
  readApplicationBoard,
  upsertApplication,
  type Application,
} from "./applicationStore";
import {
  readResearchCatalog,
  upsertResearchedCompany,
  upsertResearchedJobPosition,
} from "./researchStore";

export type QuickIntakeInput = {
  raw: string;
  companyName?: string;
  jobTitle?: string;
  location?: string;
  source?: string;
};

export type QuickIntakeResult = {
  application: Application;
  company: ResearchedCompany;
  job: ResearchedJobPosition;
  deduplicated: boolean;
  extracted: {
    url?: string;
    companyName: string;
    jobTitle: string;
    location?: string;
    salaryText?: string;
    employmentType?: string;
    deadlineAt?: string;
  };
};

function firstMatch(raw: string, patterns: RegExp[]): string | undefined {
  for (const pattern of patterns) {
    const match = pattern.exec(raw);
    const value = match?.[1]?.trim();
    if (value) return value;
  }
  return undefined;
}

function slug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

function stableId(prefix: string, value: string): string {
  const hash = crypto.createHash("sha256").update(value).digest("hex").slice(0, 8);
  return `${prefix}_${slug(value) || "item"}_${hash}`.slice(0, 72);
}

function normalizeIdentity(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function titleFromUrl(urlValue: string | undefined): string | undefined {
  if (!urlValue) return undefined;
  try {
    const url = new URL(urlValue);
    const segment = url.pathname
      .split("/")
      .filter(Boolean)
      .reverse()
      .find((entry) => !/^\d+$/.test(entry));
    if (!segment) return undefined;
    return decodeURIComponent(segment)
      .replace(/[-_]+/g, " ")
      .replace(/\b(job|jobs|career|careers|vacancy)\b/gi, "")
      .replace(/\s+/g, " ")
      .trim();
  } catch {
    return undefined;
  }
}

function companyFromUrl(urlValue: string | undefined): string | undefined {
  if (!urlValue) return undefined;
  try {
    const hostname = new URL(urlValue).hostname.replace(/^www\./, "");
    const part = hostname.split(".")[0];
    if (!part || ["linkedin", "indeed", "jobs", "careers"].includes(part)) {
      return undefined;
    }
    return part
      .replace(/[-_]+/g, " ")
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
  } catch {
    return undefined;
  }
}

export function extractQuickIntake(
  input: QuickIntakeInput,
): QuickIntakeResult["extracted"] {
  const raw = input.raw.trim();
  const url = firstMatch(raw, [/(https?:\/\/[^\s<>"']+)/i]);
  const companyName =
    input.companyName?.trim() ||
    firstMatch(raw, [
      /(?:^|\n)\s*(?:company|employer|organization)\s*[:\-]\s*(.+)/i,
      /(?:^|\n)\s*at\s+([^\n]+)/i,
    ]) ||
    companyFromUrl(url) ||
    "Unknown company";
  const jobTitle =
    input.jobTitle?.trim() ||
    firstMatch(raw, [
      /(?:^|\n)\s*(?:job\s*title|position|role)\s*[:\-]\s*(.+)/i,
      /(?:^|\n)\s*title\s*[:\-]\s*(.+)/i,
    ]) ||
    titleFromUrl(url) ||
    raw.split(/\r?\n/).map((line) => line.trim()).find(Boolean)?.slice(0, 100) ||
    "Untitled role";
  const location =
    input.location?.trim() ||
    firstMatch(raw, [
      /(?:^|\n)\s*location\s*[:\-]\s*(.+)/i,
      /(?:^|\n)\s*(?:workplace|office)\s*[:\-]\s*(.+)/i,
    ]);
  const salaryText = firstMatch(raw, [
    /(?:^|\n)\s*(?:salary|compensation|pay)\s*[:\-]\s*(.+)/i,
    /((?:[$€£]\s?[\d,.]+|[\d,.]+\s?(?:USD|EUR|GBP|BGN))(?:\s*[-–]\s*(?:[$€£]\s?)?[\d,.]+)?(?:\s*\/\s*(?:year|month|hour))?)/i,
  ]);
  const employmentType = firstMatch(raw, [
    /(?:^|\n)\s*(?:employment\s*type|contract)\s*[:\-]\s*(.+)/i,
    /\b(full[- ]time|part[- ]time|contract|freelance|internship|temporary)\b/i,
  ]);
  const deadlineAt = firstMatch(raw, [
    /(?:^|\n)\s*(?:deadline|apply\s+by|closing\s+date)\s*[:\-]\s*(.+)/i,
  ]);
  return {
    url,
    companyName: companyName.slice(0, 160),
    jobTitle: jobTitle.slice(0, 180),
    location: location?.slice(0, 180),
    salaryText: salaryText?.slice(0, 180),
    employmentType: employmentType?.slice(0, 100),
    deadlineAt: deadlineAt?.slice(0, 100),
  };
}

export async function quickIntakeApplication(
  input: QuickIntakeInput,
): Promise<QuickIntakeResult> {
  const raw = input.raw.trim();
  if (!raw) {
    throw new Error("Paste a job URL or job description.");
  }
  const extracted = extractQuickIntake(input);
  const catalog = await readResearchCatalog();
  const normalizedCompany = normalizeIdentity(extracted.companyName);
  const normalizedJob = normalizeIdentity(extracted.jobTitle);
  const normalizedUrl = normalizeApplicationUrl(extracted.url);

  const existingCompany = catalog.companies.find(
    (entry) => normalizeIdentity(entry.name) === normalizedCompany,
  );
  const company: ResearchedCompany =
    existingCompany ?? {
      id: stableId("company", extracted.companyName),
      name: extracted.companyName,
      office: {
        country:
          extracted.location?.split(",").at(-1)?.trim() || "Unknown",
        formatted_address: extracted.location,
      },
      identity: {
        website: extracted.url
          ? (() => {
              try {
                return new URL(extracted.url).origin;
              } catch {
                return undefined;
              }
            })()
          : undefined,
      },
      research: {
        notes: "Created by Quick Intake. Raw job input is preserved on the application.",
        sources: extracted.url ? [extracted.url] : undefined,
        researched_at: new Date().toISOString(),
      },
    };
  if (!existingCompany) {
    await upsertResearchedCompany(company);
  }

  const existingJob = catalog.job_positions.find(
    (entry) =>
      entry.company_id === company.id &&
      (normalizeIdentity(entry.title) === normalizedJob ||
        (normalizedUrl &&
          normalizeApplicationUrl(entry.identity?.linkedin_url) ===
            normalizedUrl)),
  );
  const job: ResearchedJobPosition =
    existingJob ?? {
      id: stableId("job", `${company.id}:${extracted.jobTitle}:${normalizedUrl}`),
      company_id: company.id,
      title: extracted.jobTitle,
      identity: {
        title: extracted.jobTitle,
        employment_type: extracted.employmentType,
        linkedin_url: extracted.url,
        source: "manual",
      },
      location: {
        country: extracted.location?.split(",").at(-1)?.trim(),
        city: extracted.location?.split(",")[0]?.trim(),
      },
      compensation: {
        salary_range_text: extracted.salaryText,
      },
      role: {
        raw_jd_text: raw,
        description_summary: raw.slice(0, 500),
      },
      weighted_keywords: [],
      research: {
        notes: "Quick Intake record; review extracted fields before research.",
        sources: extracted.url ? [extracted.url] : undefined,
        researched_at: new Date().toISOString(),
      },
    };
  if (!existingJob) {
    await upsertResearchedJobPosition(job);
  }

  const board = await readApplicationBoard();
  const duplicate = board.applications.find(
    (entry) =>
      (normalizedUrl && normalizeApplicationUrl(entry.url) === normalizedUrl) ||
      (normalizeIdentity(entry.company_name) === normalizedCompany &&
        normalizeIdentity(entry.job_title) === normalizedJob),
  );
  if (duplicate) {
    return {
      application: duplicate,
      company,
      job,
      deduplicated: true,
      extracted,
    };
  }

  const written = await upsertApplication({
    company_id: company.id,
    job_id: job.id,
    company_name: company.name,
    job_title: job.title,
    status: "applied",
    url: extracted.url,
    source: input.source?.trim() || "Quick Intake",
    location: extracted.location,
    salary_text: extracted.salaryText,
    employment_type: extracted.employmentType,
    deadline_at: extracted.deadlineAt,
    raw_job_input: raw,
    packet_title: `${job.title} @ ${company.name}`,
    priority: "normal",
  });
  const application = written.applications[0];
  if (!application) {
    throw new Error("Quick Intake could not create the application.");
  }
  return { application, company, job, deduplicated: false, extracted };
}
