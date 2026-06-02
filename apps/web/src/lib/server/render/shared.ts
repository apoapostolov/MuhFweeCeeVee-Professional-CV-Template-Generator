import fs from "node:fs/promises";
import path from "node:path";

import { parse } from "yaml";

import type { CvDocument } from "../cvStore";
import { parseCvVariantId } from "../cvVariants";
import { repoPath } from "../repoPaths";
import type { MappingFile, TemplateFile } from "./types";
import { normalizeProfileLink, toPublicationLinks } from "./profile-links";

export function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

export function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function getByPath(input: unknown, dotPath: string): unknown {
  return dotPath.split(".").reduce<unknown>((cursor, segment) => {
    if (cursor === null || cursor === undefined) {
      return undefined;
    }
    if (Array.isArray(cursor)) {
      const index = Number(segment);
      if (!Number.isInteger(index)) {
        return undefined;
      }
      return cursor[index];
    }
    const record = asRecord(cursor);
    if (!record) {
      return undefined;
    }
    return record[segment];
  }, input);
}

export function textList(value: unknown): string[] {
  if (!value) {
    return [];
  }
  if (Array.isArray(value)) {
    return value
      .map((item) => String(item))
      .filter((item) => item.trim().length > 0);
  }
  return [String(value)];
}

export function resolveMargins(template: TemplateFile): {
  top: number;
  right: number;
  bottom: number;
  left: number;
} {
  const src = template.page?.margins_mm;
  return {
    top: src?.top ?? 12,
    right: src?.right ?? 12,
    bottom: src?.bottom ?? 12,
    left: src?.left ?? 12,
  };
}

export function resolveRenderLanguage(cv: CvDocument, cvId: string): "bg" | "en" {
  const metadata = asRecord(cv.metadata);
  const langMeta = metadata?.language;
  if (langMeta === "bg" || langMeta === "en") {
    return langMeta;
  }
  const parsed = parseCvVariantId(cvId);
  if (parsed?.language === "bg" || parsed?.language === "en") {
    return parsed.language;
  }
  return "en";
}

export function label(
  labels: Record<string, unknown>,
  key: string,
  fallback: string,
): string {
  const value = getByPath(labels, key);
  return typeof value === "string" && value.trim().length > 0
    ? value
    : fallback;
}

export function languageDotCount(value: unknown): number {
  const input = String(value ?? "").toUpperCase();
  if (input === "NATIVE" || input === "C2") return 5;
  if (input === "C1") return 4;
  if (input === "B2") return 3;
  if (input === "B1") return 2;
  if (input === "A2" || input === "A1") return 1;
  return 3;
}

export function skillDotCount(index: number): number {
  if (index <= 0) return 5;
  if (index === 1) return 4;
  if (index === 2) return 3;
  if (index === 3) return 2;
  return 3;
}

export function splitName(fullName: string): { top: string; bottom: string } {
  const parts = fullName
    .split(/\s+/)
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length <= 1) return { top: fullName, bottom: "" };
  if (parts.length === 2) return { top: parts[0], bottom: parts[1] };
  return { top: `${parts[0]} ${parts[1]}`, bottom: parts.slice(2).join(" ") };
}

export function nameTokens(fullName: string): string[] {
  return fullName
    .split(/\s+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

export function formatName(
  fullName: string,
  mode: "full" | "first" | "first-last" | "first-middle-last",
): string {
  const tokens = nameTokens(fullName);
  if (tokens.length === 0) return "";
  if (mode === "first") return tokens[0];
  if (mode === "first-last") {
    return tokens.length === 1
      ? tokens[0]
      : `${tokens[0]} ${tokens[tokens.length - 1]}`;
  }
  if (mode === "first-middle-last") {
    if (tokens.length === 1) return tokens[0];
    if (tokens.length === 2) return `${tokens[0]} ${tokens[1]}`;
    return `${tokens[0]} ${tokens[1]} ${tokens[tokens.length - 1]}`;
  }
  return tokens.join(" ");
}

export function nameSizeMm(value: string, max: number, min: number): number {
  const length = value.trim().length;
  if (length <= 10) return max;
  if (length >= 24) return min;
  const ratio = (length - 10) / 14;
  return Number((max - (max - min) * ratio).toFixed(2));
}

export function formatDateValue(
  value: unknown,
  mode: "exact" | "month-year" | "year",
): string {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  const match = raw.match(/^(\d{4})(?:-(\d{2}))?(?:-(\d{2}))?/);
  if (!match) return raw;
  const [, year, month, day] = match;
  if (mode === "year") return year;
  if (mode === "month-year") {
    if (month) return `${month}.${year}`;
    return year;
  }
  if (day && month) return `${day}.${month}.${year}`;
  if (month) return `${month}.${year}`;
  return year;
}

export function formatRange(
  startDate: unknown,
  endDate: unknown,
  isCurrent: unknown,
  mode: "exact" | "month-year" | "year",
  presentLabel: string,
): string {
  const start = formatDateValue(startDate, mode);
  const present = Boolean(isCurrent) || !String(endDate ?? "").trim();
  const end = present ? presentLabel : formatDateValue(endDate, mode);
  if (!start && !end) return "";
  if (!start) return end;
  if (!end) return start;
  return `${start} - ${end}`;
}

export function renderParagraphs(
  value: unknown,
  mode: "single_paragraph" | "multi_paragraph",
  className = "",
): string {
  const lines = textList(value);
  if (!lines.length) return "";
  if (mode === "single_paragraph") {
    return `<p class=\"${className}\">${escapeHtml(lines.join(" "))}</p>`;
  }
  return lines
    .map((line) => `<p class=\"${className}\">${escapeHtml(line)}</p>`)
    .join("");
}

export function renderSimpleList(title: string, value: unknown): string {
  const items = textList(value)
    .map((item) => `<li>${escapeHtml(item)}</li>`)
    .join("");
  if (!items) return "";
  return `<section class=\"subsection\"><h3>${escapeHtml(title)}</h3><ul>${items}</ul></section>`;
}

export function renderContact(title: string, value: unknown): string {
  const record = asRecord(value);
  if (!record) return "";
  const email = String(record.email ?? "").trim();
  const phoneE164 = String(record.phone_e164 ?? "").trim();
  const phoneLocal = String(record.phone_local ?? "").trim();
  const linkedIn = normalizeProfileLink(record.linkedin, "linkedin");
  const github = normalizeProfileLink(record.github, "github");
  const website = normalizeProfileLink(record.website, "website");
  const lines = [
    email ? `<div class=\"line\">${escapeHtml(email)}</div>` : "",
    phoneE164 ? `<div class=\"line\">${escapeHtml(phoneE164)}</div>` : "",
    phoneLocal ? `<div class=\"line\">${escapeHtml(phoneLocal)}</div>` : "",
    linkedIn
      ? `<div class=\"line\"><a href="${escapeHtml(linkedIn.href)}" target="_blank" rel="noopener noreferrer">${escapeHtml(linkedIn.display)}</a></div>`
      : "",
    github
      ? `<div class=\"line\"><a href="${escapeHtml(github.href)}" target="_blank" rel="noopener noreferrer">${escapeHtml(github.display)}</a></div>`
      : "",
    website
      ? `<div class=\"line\"><a href="${escapeHtml(website.href)}" target="_blank" rel="noopener noreferrer">${escapeHtml(website.display)}</a></div>`
      : "",
  ]
    .filter(Boolean)
    .join("");
  return `<section><h3>${escapeHtml(title)}</h3>${lines}</section>`;
}

export function renderLanguages(title: string, value: unknown): string {
  const list = Array.isArray(value) ? value : [];
  const rows = list
    .map((entry) => {
      const record = asRecord(entry);
      if (!record) return "";
      return `<li>${escapeHtml(record.language ?? "")}<span>${escapeHtml(record.proficiency_cefr ?? "")}</span></li>`;
    })
    .join("");
  if (!rows) return "";
  return `<section><h3>${escapeHtml(title)}</h3><ul class=\"languages\">${rows}</ul></section>`;
}


export function renderExperience(
  title: string,
  value: unknown,
  mode: "exact" | "month-year" | "year",
  presentLabel: string,
  labels: Record<string, unknown>,
  options?: { includeProducts?: boolean; includePublicationLinks?: boolean },
): string {
  const includeProducts = Boolean(options?.includeProducts);
  const includePublicationLinks = options?.includePublicationLinks !== false;
  const workedOnLabel = label(labels, "product_labels.worked_on", "Worked on:");
  const publicationLinksLabel = label(
    labels,
    "experience_labels.publication_links",
    "Publication links:",
  );
  const entries = Array.isArray(value) ? value : [];
  const blocks = entries
    .map((entry) => {
      const record = asRecord(entry);
      if (!record) return "";
      const range = formatRange(
        record.start_date,
        record.end_date,
        record.is_current,
        mode,
        presentLabel,
      );
      const bullets = textList(record.responsibilities)
        .map((item) => `<li>${escapeHtml(item)}</li>`)
        .join("");
      const productRows = (
        Array.isArray(record.products) ? record.products : []
      )
        .map((product) => {
          if (typeof product === "string") {
            const trimmed = product.trim();
            if (!trimmed) return "";
            const splitByDash = trimmed.split(/\s+-\s+/, 2);
            if (splitByDash.length === 2) {
              return `<li><span class=\"product-name\">${escapeHtml(splitByDash[0])}</span><span class=\"product-note-line\"><span class=\"product-note-tab\">&nbsp;&nbsp;</span><span class=\"product-note-text\">${escapeHtml(splitByDash[1])}</span></span></li>`;
            }
            const marker = ", вкл.";
            const markerIndex = trimmed.indexOf(marker);
            if (markerIndex > 0) {
              const name = trimmed.slice(0, markerIndex).trim();
              const note = `вкл. ${trimmed.slice(markerIndex + marker.length).trim()}`;
              return `<li><span class=\"product-name\">${escapeHtml(name)}</span><span class=\"product-note-line\"><span class=\"product-note-tab\">&nbsp;&nbsp;</span><span class=\"product-note-text\">${escapeHtml(note)}</span></span></li>`;
            }
            return `<li><span class=\"product-name\">${escapeHtml(trimmed)}</span></li>`;
          }
          const productRecord = asRecord(product);
          if (!productRecord) return "";
          const name = String(productRecord.name ?? "").trim();
          const note = String(productRecord.note ?? "").trim();
          if (!name) return "";
          return `<li><span class=\"product-name\">${escapeHtml(name)}</span>${note ? `<span class=\"product-note-line\"><span class=\"product-note-tab\">&nbsp;&nbsp;</span><span class=\"product-note-text\">${escapeHtml(note)}</span></span>` : ""}</li>`;
        })
        .join("");
      const publicationRows = toPublicationLinks(record.publication_links)
        .map(
          (item) =>
            `<li><a href="${escapeHtml(item.href)}" target="_blank" rel="noopener noreferrer">${escapeHtml(item.title)}</a></li>`,
        )
        .join("");
      return `<article class=\"entry\">
        <div class=\"entry-head\">
          <h4>${escapeHtml(record.role ?? "")}</h4>
          <span>${escapeHtml(range)}</span>
        </div>
        <p class=\"org\">${escapeHtml(record.employer ?? "")}</p>
        ${bullets ? `<ul>${bullets}</ul>` : ""}
        ${includeProducts && productRows ? `<div class=\"product-subsection\"><p class=\"product-title\">${escapeHtml(workedOnLabel)}</p><ul class=\"product-list\">${productRows}</ul></div>` : ""}
        ${includePublicationLinks && publicationRows ? `<div class=\"publication-links-subsection\"><p class=\"publication-links-title\">${escapeHtml(publicationLinksLabel)}</p><ul class=\"publication-links-list\">${publicationRows}</ul></div>` : ""}
      </article>`;
    })
    .join("");
  if (!blocks) return "";
  return `<section><h2>${escapeHtml(title)}</h2>${blocks}</section>`;
}

export function renderEducation(
  title: string,
  value: unknown,
  mode: "exact" | "month-year" | "year",
  presentLabel: string,
  labels?: Record<string, unknown>,
  options?: {
    includeDetails?: boolean;
    includeLocation?: boolean;
    includeCompleted?: boolean;
  },
): string {
  const includeDetails = Boolean(options?.includeDetails);
  const includeLocation = options?.includeLocation ?? true;
  const includeCompleted = options?.includeCompleted ?? true;
  const entries = Array.isArray(value) ? value : [];
  const blocks = entries
    .map((entry) => {
      const record = asRecord(entry);
      if (!record) return "";
      const range = formatRange(
        record.start_date,
        record.end_date,
        false,
        mode,
        presentLabel,
      );
      const field = String(record.field_of_study ?? "").trim();
      const subjects = textList(record.subjects).join(", ");
      const level = String(record.qualification_level ?? "").trim();
      const faculty = String(record.faculty ?? "").trim();
      const location = [record.city, record.country]
        .filter(Boolean)
        .map((item) => String(item))
        .join(", ");
      const completed =
        typeof record.completed === "boolean"
          ? record.completed
            ? label(labels ?? {}, "education_labels.completed_yes", "Yes")
            : label(labels ?? {}, "education_labels.completed_no", "No")
          : "";
      const detailRows = [
        field
          ? `<p class="edu-detail"><strong>${escapeHtml(label(labels ?? {}, "education_labels.field", "Field"))}:</strong> ${escapeHtml(field)}</p>`
          : "",
        subjects
          ? `<p class="edu-detail"><strong>${escapeHtml(label(labels ?? {}, "education_labels.subjects", "Subjects"))}:</strong> ${escapeHtml(subjects)}</p>`
          : "",
        level
          ? `<p class="edu-detail"><strong>${escapeHtml(label(labels ?? {}, "education_labels.level", "Level"))}:</strong> ${escapeHtml(level)}</p>`
          : "",
        faculty
          ? `<p class="edu-detail"><strong>${escapeHtml(label(labels ?? {}, "education_labels.faculty", "Faculty"))}:</strong> ${escapeHtml(faculty)}</p>`
          : "",
        includeLocation && location
          ? `<p class="edu-detail"><strong>${escapeHtml(label(labels ?? {}, "education_labels.location", "Location"))}:</strong> ${escapeHtml(location)}</p>`
          : "",
        includeCompleted && completed
          ? `<p class="edu-detail"><strong>${escapeHtml(label(labels ?? {}, "education_labels.completed", "Completed"))}:</strong> ${escapeHtml(completed)}</p>`
          : "",
      ]
        .filter(Boolean)
        .join("");
      return `<article class=\"entry\">
        <div class=\"entry-head\">
          <h4>${escapeHtml(record.degree ?? "")}</h4>
          <span>${escapeHtml(range)}</span>
        </div>
        <p class=\"org\">${escapeHtml(record.institution ?? "")}</p>
        ${includeDetails ? `<div class="edu-details">${detailRows}</div>` : ""}
      </article>`;
    })
    .join("");
  if (!blocks) return "";
  return `<section><h2>${escapeHtml(title)}</h2>${blocks}</section>`;
}

export function renderReferences(title: string, value: unknown): string {
  const entries = Array.isArray(value) ? value : [];
  const rows = entries
    .map((entry) => {
      const record = asRecord(entry);
      if (!record) return "";
      return `<article class=\"ref\">
        <strong>${escapeHtml(record.name ?? "")}</strong>
        <div>${escapeHtml(record.role ?? "")}</div>
        <div>${escapeHtml(record.organization ?? "")}</div>
        <div>${escapeHtml(record.email ?? "")}</div>
      </article>`;
    })
    .join("");
  if (!rows) return "";
  return `<section><h2>${escapeHtml(title)}</h2>${rows}</section>`;
}

export function renderEdinburghCompetenciesSection(
  labels: Record<string, unknown>,
  cv: CvDocument,
): string {
  const core = textList(getByPath(cv, "skills.core_strengths"));
  const social = textList(getByPath(cv, "skills.social"));
  const other = textList(getByPath(cv, "optional_sections.other_skills"));
  const publications = textList(
    getByPath(cv, "optional_sections.publications"),
  );

  const blocks: string[] = [];
  if (core.length) {
    blocks.push(
      `<section class=\"subsection\"><h3>${escapeHtml(label(labels, "sections.core_strengths", "Core Strengths"))}</h3><ul>${core.map((x) => `<li>${escapeHtml(x)}</li>`).join("")}</ul></section>`,
    );
  }
  if (social.length) {
    blocks.push(
      `<section class=\"subsection\"><h3>${escapeHtml(label(labels, "sections.social_skills", "Social Skills"))}</h3><ul>${social.map((x) => `<li>${escapeHtml(x)}</li>`).join("")}</ul></section>`,
    );
  }
  if (other.length) {
    blocks.push(
      `<section class=\"subsection\"><h3>${escapeHtml(label(labels, "sections.other_skills", "Other Skills"))}</h3><ul>${other.map((x) => `<li>${escapeHtml(x)}</li>`).join("")}</ul></section>`,
    );
  }
  if (publications.length) {
    blocks.push(
      `<section class=\"subsection\"><h3>${escapeHtml(label(labels, "sections.publications", "Publications"))}</h3><ul>${publications.map((x) => `<li>${escapeHtml(x)}</li>`).join("")}</ul></section>`,
    );
  }
  if (!blocks.length) return "";
  return `<section><h2>${escapeHtml(label(labels, "sections.competencies", "Competencies"))}</h2>${blocks.join("")}</section>`;
}


export async function readYamlFile<T>(filePath: string): Promise<T> {
  const content = await fs.readFile(filePath, "utf-8");
  return parse(content) as T;
}

export async function resolveMappingPath(
  cvId: string,
  templateId: string,
): Promise<string> {
  const candidates = [
    repoPath("data", "template_mappings", `${templateId}.yaml`),
    repoPath("data", "template_mappings", `${cvId}__${templateId}.yaml`),
  ];
  for (const filePath of candidates) {
    try {
      await fs.access(filePath);
      return filePath;
    } catch {
      // Continue to next candidate.
    }
  }
  throw new Error(
    `Missing mapping for templateId=${templateId}. Expected data/template_mappings/${templateId}.yaml`,
  );
}

export async function resolvePhotoDataUrl(photoId: string): Promise<string> {
  const safeId = path.basename(photoId).replace(/[^a-zA-Z0-9._-]/g, "");
  if (!safeId) return "";
  const photoPath = repoPath("photos", safeId);
  const ext = path.extname(safeId).toLowerCase();
  const mimeType =
    ext === ".png"
      ? "image/png"
      : ext === ".webp"
        ? "image/webp"
        : ext === ".avif"
          ? "image/avif"
          : ext === ".gif"
            ? "image/gif"
            : "image/jpeg";
  try {
    const buffer = await fs.readFile(photoPath);
    return `data:${mimeType};base64,${buffer.toString("base64")}`;
  } catch {
    return "";
  }
}

export function bindSlots(
  cv: CvDocument,
  mapping: MappingFile,
): Record<string, unknown> {
  const bound: Record<string, unknown> = {};
  for (const binding of mapping.bindings ?? []) {
    if (!binding.slot_id || !binding.cv_path) continue;
    bound[binding.slot_id] = getByPath(cv, binding.cv_path);
  }
  return bound;
}
