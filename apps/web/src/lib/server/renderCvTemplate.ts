import fs from "node:fs/promises";

import { parse } from "yaml";

import type { CvDocument } from "./cvStore";
import { readCv } from "./cvStore";
import { parseCvVariantId } from "./cvVariants";
import { repoPath } from "./repoPaths";

type TemplateFile = {
  meta?: {
    template_id?: string;
    name?: string;
  };
  page?: {
    margins_mm?: {
      top?: number;
      right?: number;
      bottom?: number;
      left?: number;
    };
  };
  labels?: {
    bg?: Record<string, unknown>;
    en?: Record<string, unknown>;
  };
  tokens?: {
    colors?: Record<string, string>;
  };
  date_display?: {
    experience?: "exact" | "month-year" | "year";
    education?: "exact" | "month-year" | "year";
  };
  text_layout?: {
    profile_summary?: "single_paragraph" | "multi_paragraph";
  };
  name_display?: {
    title?: "full" | "first" | "first-last" | "first-middle-last";
  };
};

type MappingFile = {
  bindings?: Array<{ cv_path?: string; slot_id?: string }>;
};

type RenderInput = {
  cvId: string;
  templateId: string;
  theme?: string;
  photoMode?: string;
};

type RenderResult = {
  html: string;
  cvId: string;
  templateId: string;
};

type PhotoMode =
  | "default"
  | "on-circle"
  | "on-square"
  | "on-original"
  | "off";

type EdinburghThemePalette = {
  accent: string;
  sidebarBackground: string;
  arcStroke: string;
  link: string;
  linkBorder: string;
  dotOff: string;
};

type HarvardThemePalette = {
  sidebar: string;
  sidebarText: string;
  sidebarMuted: string;
  starOn: string;
  starOff: string;
  timeline: string;
  meta: string;
};

type StanfordThemePalette = {
  sidebar: string;
  sidebarText: string;
  sidebarMuted: string;
  barTrack: string;
  barFill: string;
};

type CambridgeThemePalette = {
  accent: string;
  panel: string;
  contentPanel: string;
  text: string;
  muted: string;
  rail: string;
  dotOn: string;
  dotOff: string;
};

const EDINBURGH_THEME_PRESETS: Record<string, EdinburghThemePalette> = {
  default: {
    accent: "#4E557B",
    sidebarBackground: "#F2F3F5",
    arcStroke: "#2C315B",
    link: "#2C315B",
    linkBorder: "#C8CFEC",
    dotOff: "#C9CED8",
  },
  ocean_teal: {
    accent: "#068799",
    sidebarBackground: "#F2F3F5",
    arcStroke: "#0A6471",
    link: "#0A6471",
    linkBorder: "#A8DCE3",
    dotOff: "#B8D7DC",
  },
  forest_green: {
    accent: "#316834",
    sidebarBackground: "#F2F3F5",
    arcStroke: "#244E27",
    link: "#244E27",
    linkBorder: "#B5D0B8",
    dotOff: "#C1D4C3",
  },
  ruby_red: {
    accent: "#B0292A",
    sidebarBackground: "#F2F3F5",
    arcStroke: "#892324",
    link: "#892324",
    linkBorder: "#E5B4B5",
    dotOff: "#D9C4C4",
  },
  amber_gold: {
    accent: "#FFC209",
    sidebarBackground: "#F2F3F5",
    arcStroke: "#B78400",
    link: "#8D6700",
    linkBorder: "#E7CF81",
    dotOff: "#DCCFA6",
  },
};

const HARVARD_THEME_PRESETS: Record<string, HarvardThemePalette> = {
  default: {
    sidebar: "#434A54",
    sidebarText: "#FFFFFF",
    sidebarMuted: "#E5E8EC",
    starOn: "#FFFFFF",
    starOff: "#B8BEC8",
    timeline: "#6B7280",
    meta: "#4B5563",
  },
  blue: {
    sidebar: "#416993",
    sidebarText: "#FFFFFF",
    sidebarMuted: "#E7EEF7",
    starOn: "#FFFFFF",
    starOff: "#D5E1EF",
    timeline: "#8D939C",
    meta: "#4F6279",
  },
  pink: {
    sidebar: "#CF6FAE",
    sidebarText: "#FFFFFF",
    sidebarMuted: "#F8E6F1",
    starOn: "#FFFFFF",
    starOff: "#E8BFD9",
    timeline: "#A1578C",
    meta: "#8F4578",
  },
  red: {
    sidebar: "#DA4453",
    sidebarText: "#FFFFFF",
    sidebarMuted: "#FFE9EC",
    starOn: "#FFFFFF",
    starOff: "#F1AAB1",
    timeline: "#B83340",
    meta: "#B83340",
  },
  amber_gold: {
    sidebar: "#F0B230",
    sidebarText: "#1F2937",
    sidebarMuted: "#3F3B2E",
    starOn: "#1F2937",
    starOff: "#85724A",
    timeline: "#8B6A1E",
    meta: "#7A5C19",
  },
};

const STANFORD_THEME_PRESETS: Record<string, StanfordThemePalette> = {
  default: {
    sidebar: "#434A54",
    sidebarText: "#FFFFFF",
    sidebarMuted: "#E5E8EC",
    barTrack: "#D9DEE5",
    barFill: "#434A54",
  },
  blue: {
    sidebar: "#416993",
    sidebarText: "#FFFFFF",
    sidebarMuted: "#E7EEF7",
    barTrack: "#D8E4F3",
    barFill: "#416993",
  },
  pink: {
    sidebar: "#CF6FAE",
    sidebarText: "#FFFFFF",
    sidebarMuted: "#F8E6F1",
    barTrack: "#F5D9EA",
    barFill: "#CF6FAE",
  },
  red: {
    sidebar: "#DA4453",
    sidebarText: "#FFFFFF",
    sidebarMuted: "#FFE9EC",
    barTrack: "#FBD3D8",
    barFill: "#DA4453",
  },
  amber_gold: {
    sidebar: "#F0B230",
    sidebarText: "#1F2937",
    sidebarMuted: "#3F3B2E",
    barTrack: "#F4DEAB",
    barFill: "#B88712",
  },
};

const CAMBRIDGE_THEME_PRESETS: Record<string, CambridgeThemePalette> = {
  default: {
    accent: "#416993",
    panel: "#FFFFFF",
    contentPanel: "#FFFFFF",
    text: "#27303A",
    muted: "#37414F",
    rail: "#95A0AD",
    dotOn: "#416993",
    dotOff: "#CDD3DC",
  },
  mustard_gold: {
    accent: "#8A6E2F",
    panel: "#FFFFFF",
    contentPanel: "#FFFFFF",
    text: "#2E2A22",
    muted: "#4D4639",
    rail: "#9A8A66",
    dotOn: "#8A6E2F",
    dotOff: "#D8D2C5",
  },
  emerald_green: {
    accent: "#3D9A4E",
    panel: "#FFFFFF",
    contentPanel: "#FFFFFF",
    text: "#203126",
    muted: "#3B5443",
    rail: "#88A392",
    dotOn: "#3D9A4E",
    dotOff: "#C9D9CE",
  },
  steel_blue: {
    accent: "#556F82",
    panel: "#FFFFFF",
    contentPanel: "#FFFFFF",
    text: "#24313B",
    muted: "#41515F",
    rail: "#8EA0AF",
    dotOn: "#556F82",
    dotOff: "#CCD5DC",
  },
  rose_red: {
    accent: "#BB3254",
    panel: "#FFFFFF",
    contentPanel: "#FFFFFF",
    text: "#3B252D",
    muted: "#6A3E4B",
    rail: "#B38A96",
    dotOn: "#BB3254",
    dotOff: "#DECBD1",
  },
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function getByPath(input: unknown, dotPath: string): unknown {
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

function textList(value: unknown): string[] {
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

function resolveMargins(template: TemplateFile): {
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

function resolveRenderLanguage(cv: CvDocument, cvId: string): "bg" | "en" {
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

function label(
  labels: Record<string, unknown>,
  key: string,
  fallback: string,
): string {
  const value = getByPath(labels, key);
  return typeof value === "string" && value.trim().length > 0
    ? value
    : fallback;
}

function languageDotCount(value: unknown): number {
  const input = String(value ?? "").toUpperCase();
  if (input === "NATIVE" || input === "C2") return 5;
  if (input === "C1") return 4;
  if (input === "B2") return 3;
  if (input === "B1") return 2;
  if (input === "A2" || input === "A1") return 1;
  return 3;
}

function skillDotCount(index: number): number {
  if (index <= 0) return 5;
  if (index === 1) return 4;
  if (index === 2) return 3;
  if (index === 3) return 2;
  return 3;
}

function splitName(fullName: string): { top: string; bottom: string } {
  const parts = fullName
    .split(/\s+/)
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length <= 1) return { top: fullName, bottom: "" };
  if (parts.length === 2) return { top: parts[0], bottom: parts[1] };
  return { top: `${parts[0]} ${parts[1]}`, bottom: parts.slice(2).join(" ") };
}

function nameTokens(fullName: string): string[] {
  return fullName
    .split(/\s+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function formatName(
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

function normalizeThemeKey(value: unknown): string {
  const raw = String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return raw || "default";
}

function normalizePhotoMode(value: unknown): PhotoMode {
  const raw = String(value ?? "").trim().toLowerCase();
  if (raw === "on-circle") return "on-circle";
  if (raw === "on-square") return "on-square";
  if (raw === "on-original") return "on-original";
  if (raw === "off") return "off";
  return "default";
}

function resolvePhotoClass(mode: PhotoMode): string {
  if (mode === "on-circle") return "photo-force-circle";
  if (mode === "on-square") return "photo-force-square";
  if (mode === "on-original") return "photo-force-original";
  return "";
}

function shouldRenderPhoto(templateDefault: boolean, mode: PhotoMode): boolean {
  if (mode === "off") return false;
  if (mode === "default") return templateDefault;
  return true;
}

function resolveEdinburghTheme(
  template: TemplateFile,
  themeInput: string | undefined,
): EdinburghThemePalette {
  const colors = template.tokens?.colors ?? {};
  const templateDefault: EdinburghThemePalette = {
    accent: colors.accent ?? EDINBURGH_THEME_PRESETS.default.accent,
    sidebarBackground:
      colors.sidebar_background ??
      EDINBURGH_THEME_PRESETS.default.sidebarBackground,
    arcStroke: colors.accent_dark ?? EDINBURGH_THEME_PRESETS.default.arcStroke,
    link: colors.accent_dark ?? EDINBURGH_THEME_PRESETS.default.link,
    linkBorder:
      colors.accent_light ?? EDINBURGH_THEME_PRESETS.default.linkBorder,
    dotOff: colors.muted ?? EDINBURGH_THEME_PRESETS.default.dotOff,
  };
  const key = normalizeThemeKey(themeInput);
  if (key === "default") {
    return templateDefault;
  }
  return EDINBURGH_THEME_PRESETS[key] ?? templateDefault;
}

function resolveHarvardTheme(
  themeInput: string | undefined,
): HarvardThemePalette {
  const key = normalizeThemeKey(themeInput);
  return HARVARD_THEME_PRESETS[key] ?? HARVARD_THEME_PRESETS.default;
}

function resolveStanfordTheme(
  themeInput: string | undefined,
): StanfordThemePalette {
  const key = normalizeThemeKey(themeInput);
  return STANFORD_THEME_PRESETS[key] ?? STANFORD_THEME_PRESETS.default;
}

function resolveCambridgeTheme(
  template: TemplateFile,
  themeInput: string | undefined,
): CambridgeThemePalette {
  const colors = template.tokens?.colors ?? {};
  const templateDefault: CambridgeThemePalette = {
    accent: colors.accent ?? CAMBRIDGE_THEME_PRESETS.default.accent,
    panel: "#FFFFFF",
    contentPanel: "#FFFFFF",
    text: colors.text_primary ?? CAMBRIDGE_THEME_PRESETS.default.text,
    muted: colors.text_secondary ?? CAMBRIDGE_THEME_PRESETS.default.muted,
    rail: CAMBRIDGE_THEME_PRESETS.default.rail,
    dotOn: colors.accent ?? CAMBRIDGE_THEME_PRESETS.default.dotOn,
    dotOff: CAMBRIDGE_THEME_PRESETS.default.dotOff,
  };
  const key = normalizeThemeKey(themeInput);
  if (key === "default") return templateDefault;
  return CAMBRIDGE_THEME_PRESETS[key] ?? templateDefault;
}

function nameSizeMm(value: string, max: number, min: number): number {
  const length = value.trim().length;
  if (length <= 10) return max;
  if (length >= 24) return min;
  const ratio = (length - 10) / 14;
  return Number((max - (max - min) * ratio).toFixed(2));
}

function formatDateValue(
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

function formatRange(
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

function renderParagraphs(
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

function renderSimpleList(title: string, value: unknown): string {
  const items = textList(value)
    .map((item) => `<li>${escapeHtml(item)}</li>`)
    .join("");
  if (!items) return "";
  return `<section class=\"subsection\"><h3>${escapeHtml(title)}</h3><ul>${items}</ul></section>`;
}

function renderContact(title: string, value: unknown): string {
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

function renderLanguages(title: string, value: unknown): string {
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

function renderEdinburghContact(
  value: unknown,
  residence: string,
  fullName: string,
  accent: string,
  labels: Record<string, unknown>,
): string {
  const record = asRecord(value);
  if (!record) return "";

  const rowsData: Array<{ label: string; icon: string; value: string }> = [
    {
      label: label(labels, "contact_labels.name", "Name"),
      icon: "fa-user",
      value: fullName,
    },
    {
      label: label(labels, "contact_labels.address", "Address"),
      icon: "fa-house",
      value: residence,
    },
    {
      label: label(labels, "contact_labels.phone", "Phone"),
      icon: "fa-phone",
      value: String(record.phone_e164 ?? record.phone_local ?? ""),
    },
    {
      label: label(labels, "contact_labels.email", "Email"),
      icon: "fa-envelope",
      value: String(record.email ?? ""),
    },
    {
      label: label(labels, "contact_labels.linkedin", "LinkedIn"),
      icon: "fa-link",
      value:
        normalizeProfileLink(record.linkedin, "linkedin")?.display ??
        String(record.linkedin ?? ""),
    },
    {
      label: label(labels, "contact_labels.github", "GitHub"),
      icon: "fa-link",
      value:
        normalizeProfileLink(record.github, "github")?.display ??
        String(record.github ?? ""),
    },
  ].filter((item) => item.value.trim().length > 0);

  if (!rowsData.length) return "";

  const rows = rowsData
    .map(
      (item) => `<li>
        <span class=\"icon\" style=\"color:${accent}\"><i class=\"fa-solid ${item.icon}\"></i></span>
        <span class=\"kv\"><strong>${escapeHtml(item.label)}</strong><span>${escapeHtml(item.value)}</span></span>
      </li>`,
    )
    .join("");

  return `<section><h3>${escapeHtml(label(labels, "sections.personal_details", "Personal details"))}</h3><ul class=\"contact-list\">${rows}</ul></section>`;
}

function renderEdinburghInterests(
  value: unknown,
  accent: string,
  labels: Record<string, unknown>,
): string {
  const rows = textList(value)
    .map(
      (item) =>
        `<li><span class=\"sq\" style=\"background:${accent}\"></span><span>${escapeHtml(item)}</span></li>`,
    )
    .join("");
  if (!rows) return "";
  return `<section><h3>${escapeHtml(label(labels, "sections.interests", "Interests"))}</h3><ul class=\"square-bullets\">${rows}</ul></section>`;
}

function renderEdinburghLanguages(
  value: unknown,
  accent: string,
  labels: Record<string, unknown>,
): string {
  const list = Array.isArray(value) ? value : [];
  const rows = list
    .map((entry) => {
      const record = asRecord(entry);
      if (!record) return "";
      const language = escapeHtml(record.language ?? "");
      const score = languageDotCount(record.proficiency_cefr);
      const dots = Array.from({ length: 5 })
        .map(
          (_, index) =>
            `<span class=\"dot ${index < score ? "on" : ""}\" style=\"${index < score ? `background:${accent};` : ""}\"></span>`,
        )
        .join("");
      return `<li><span class=\"label\">${language}</span><span class=\"dots\">${dots}</span></li>`;
    })
    .join("");
  if (!rows) return "";
  return `<section><h3>${escapeHtml(label(labels, "sections.languages", "Languages"))}</h3><ul class=\"edinburgh-languages\">${rows}</ul></section>`;
}

function renderEdinburghSkills(
  value: unknown,
  accent: string,
  labels: Record<string, unknown>,
): string {
  const list = textList(value);
  if (!list.length) return "";
  const rows = list
    .map((item, index) => {
      const score = skillDotCount(index);
      const dots = Array.from({ length: 5 })
        .map(
          (_, dotIndex) =>
            `<span class=\"dot ${dotIndex < score ? "on" : ""}\" style=\"${dotIndex < score ? `background:${accent};` : ""}\"></span>`,
        )
        .join("");
      return `<li><span class=\"label\">${escapeHtml(item)}</span><span class=\"dots\">${dots}</span></li>`;
    })
    .join("");
  return `<section><h3>${escapeHtml(label(labels, "sections.skills", "Skills"))}</h3><ul class=\"edinburgh-skills\">${rows}</ul></section>`;
}

function renderExperience(
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

function renderEducation(
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

function renderReferences(title: string, value: unknown): string {
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

function renderEdinburghCompetenciesSection(
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

function renderEuropassRow(labelText: string, valueHtml: string): string {
  if (!valueHtml.trim()) return "";
  return `<div class=\"erow\"><div class=\"elabel\">${escapeHtml(labelText)}</div><div class=\"evalue\">${valueHtml}</div></div>`;
}

function renderEuropassSimpleList(items: string[]): string {
  const rows = items
    .filter((item) => item.trim().length > 0)
    .map((item) => `<li>${escapeHtml(item)}</li>`)
    .join("");
  return rows ? `<ul>${rows}</ul>` : "";
}

function toProductLines(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .flatMap((item) => {
      if (typeof item === "string") {
        const trimmed = item.trim();
        return trimmed ? [trimmed] : [];
      }
      const record = asRecord(item);
      if (!record) {
        return [];
      }
      const name = String(record.name ?? "").trim();
      const note = String(record.note ?? "").trim();
      if (!name) {
        return [];
      }
      return note ? [`${name} - ${note}`] : [name];
    })
    .filter((item) => item.length > 0);
}

function normalizeUrl(raw: unknown): string {
  const input = String(raw ?? "").trim();
  if (!input) return "";
  try {
    const parsed = new URL(input);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return "";
    }
    return parsed.toString();
  } catch {
    return "";
  }
}

type ProfileLinkKind = "linkedin" | "github" | "website";
type NormalizedProfileLink = { href: string; display: string };

function normalizeUrlLenient(raw: unknown): string {
  const input = String(raw ?? "").trim();
  if (!input) return "";
  const direct = normalizeUrl(input);
  if (direct) return direct;
  if (/^[a-z][a-z0-9+.-]*:/i.test(input)) {
    return "";
  }
  return normalizeUrl(`https://${input.replace(/^\/+/, "")}`);
}

function compactDisplayFromUrl(href: string): string {
  try {
    const parsed = new URL(href);
    const host = parsed.hostname.replace(/^www\./i, "");
    const cleanPath = parsed.pathname.replace(/^\/+/, "").replace(/\/+$/, "");
    return cleanPath ? `${host}/${cleanPath}` : host;
  } catch {
    return href;
  }
}

function normalizeProfileLink(
  raw: unknown,
  kind: ProfileLinkKind,
): NormalizedProfileLink | null {
  const input = String(raw ?? "").trim();
  if (!input) return null;

  if (kind === "website") {
    const href = normalizeUrlLenient(input);
    if (!href) return null;
    return { href, display: compactDisplayFromUrl(href) };
  }

  if (kind === "linkedin") {
    const cleaned = input.replace(/^@+/, "").trim();
    const directHref = normalizeUrlLenient(cleaned);
    if (directHref) {
      try {
        const parsed = new URL(directHref);
        const host = parsed.hostname.toLowerCase();
        const path = parsed.pathname.replace(/^\/+/, "").replace(/\/+$/, "");
        if (host.includes("linkedin.com")) {
          return { href: directHref, display: path || "linkedin.com" };
        }
        return { href: directHref, display: compactDisplayFromUrl(directHref) };
      } catch {
        return { href: directHref, display: directHref };
      }
    }
    if (/^(in|company|school|pub)\/[^\s]+$/i.test(cleaned)) {
      return {
        href: `https://www.linkedin.com/${cleaned}`,
        display: cleaned,
      };
    }
    if (/^[a-z0-9][a-z0-9-]{1,99}$/i.test(cleaned)) {
      const path = `in/${cleaned}`;
      return { href: `https://www.linkedin.com/${path}`, display: path };
    }
    return null;
  }

  const cleaned = input.replace(/^@+/, "").trim();
  const directHref = normalizeUrlLenient(cleaned);
  if (directHref) {
    try {
      const parsed = new URL(directHref);
      const host = parsed.hostname.toLowerCase();
      const path = parsed.pathname.replace(/^\/+/, "").replace(/\/+$/, "");
      if (host.includes("github.com")) {
        return { href: directHref, display: path || "github.com" };
      }
      return { href: directHref, display: compactDisplayFromUrl(directHref) };
    } catch {
      return { href: directHref, display: directHref };
    }
  }
  if (/^[a-z0-9][a-z0-9-]{0,38}(\/[a-z0-9._-]+)?$/i.test(cleaned)) {
    return { href: `https://github.com/${cleaned}`, display: cleaned };
  }
  return null;
}

function deriveTitleFromUrl(raw: unknown): string {
  const href = normalizeUrl(raw);
  if (!href) return "";
  try {
    const parsed = new URL(href);
    const tail = parsed.pathname.split("/").filter(Boolean).pop();
    if (tail) {
      const cleaned = decodeURIComponent(tail)
        .replace(/\.[a-z0-9]{1,6}$/i, "")
        .replace(/[-_]+/g, " ")
        .replace(/\s+/g, " ")
        .trim();
      if (cleaned) {
        return cleaned;
      }
    }
    return parsed.hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function toPublicationLinks(
  value: unknown,
): Array<{ href: string; title: string }> {
  if (!Array.isArray(value)) return [];
  return value
    .flatMap((entry) => {
      if (typeof entry === "string") {
        const href = normalizeUrl(entry);
        if (!href) return [];
        return [{ href, title: deriveTitleFromUrl(href) || href }];
      }
      const record = asRecord(entry);
      if (!record) return [];
      const href = normalizeUrl(record.url);
      if (!href) return [];
      const explicitTitle = String(record.title ?? "").trim();
      return [
        { href, title: explicitTitle || deriveTitleFromUrl(href) || href },
      ];
    })
    .filter((item) => item.href.length > 0);
}

function renderEuropass(
  cv: CvDocument,
  template: TemplateFile,
  slots: Record<string, unknown>,
  labels: Record<string, unknown>,
): string {
  const margins = resolveMargins(template);
  const experienceDateMode = template.date_display?.experience ?? "exact";
  const educationDateMode = template.date_display?.education ?? "exact";
  const presentLabel = label(labels, "common.present", "present");

  const person = asRecord(getByPath(cv, "person")) ?? {};
  const contact =
    asRecord(slots["contact.block"] ?? getByPath(cv, "person.contact")) ?? {};
  const residence = asRecord(getByPath(cv, "person.residence")) ?? {};
  const fullName = String(
    slots["person.full_name"] ?? getByPath(cv, "person.full_name") ?? "",
  );
  const profileSummary = renderParagraphs(
    slots["positioning.profile_summary"] ??
      getByPath(cv, "positioning.profile_summary"),
    "single_paragraph",
  );
  const experiences = Array.isArray(
    slots["experience.items"] ?? getByPath(cv, "experience"),
  )
    ? (slots["experience.items"] ?? getByPath(cv, "experience"))
    : [];
  const education = Array.isArray(
    slots["education.items"] ?? getByPath(cv, "education"),
  )
    ? (slots["education.items"] ?? getByPath(cv, "education"))
    : [];
  const languages = Array.isArray(
    slots["skills.languages"] ?? getByPath(cv, "skills.languages"),
  )
    ? (slots["skills.languages"] ?? getByPath(cv, "skills.languages"))
    : [];
  const technical = textList(
    slots["skills.technical"] ?? getByPath(cv, "skills.technical"),
  );
  const social = textList(
    slots["skills.social"] ?? getByPath(cv, "skills.social"),
  );
  const core = textList(getByPath(cv, "skills.core_strengths"));
  const otherSkills = textList(getByPath(cv, "optional_sections.other_skills"));
  const publications = textList(
    getByPath(cv, "optional_sections.publications"),
  );
  const certifications = textList(
    getByPath(cv, "optional_sections.certifications"),
  );
  const projects = textList(getByPath(cv, "optional_sections.projects"));
  const awards = textList(getByPath(cv, "optional_sections.awards"));
  const volunteering = textList(
    getByPath(cv, "optional_sections.volunteering"),
  );
  const patents = textList(getByPath(cv, "optional_sections.patents"));
  const portfolioLinks = textList(
    getByPath(cv, "optional_sections.portfolio_links"),
  );
  const interests = textList(getByPath(cv, "optional_sections.interests"));
  const references = Array.isArray(getByPath(cv, "references"))
    ? (getByPath(cv, "references") as unknown[])
    : [];
  const drivingLicense = String(contact.driving_license ?? "");
  const motherTongue = (languages as unknown[])
    .map((item) => asRecord(item))
    .find(
      (record) =>
        String(record?.proficiency_cefr ?? "").toLowerCase() === "native",
    );
  const otherLanguages = (languages as unknown[])
    .map((item) => asRecord(item))
    .filter((record) => record && record !== motherTongue);

  const contactBlock = [
    renderEuropassRow(
      label(labels, "personal.name", "Name"),
      escapeHtml(fullName),
    ),
    renderEuropassRow(
      label(labels, "personal.address", "Address"),
      escapeHtml(
        [
          residence.street,
          residence.postal_code,
          residence.city,
          residence.country,
        ]
          .filter(Boolean)
          .map((item) => String(item))
          .join(", "),
      ),
    ),
    renderEuropassRow(
      label(labels, "personal.phone", "Telephone"),
      escapeHtml(String(contact.phone_local ?? contact.phone_e164 ?? "")),
    ),
    renderEuropassRow(
      label(labels, "personal.email", "E-mail"),
      escapeHtml(String(contact.email ?? "")),
    ),
    renderEuropassRow(
      label(labels, "personal.nationality", "Nationality"),
      escapeHtml(String(person.nationality ?? "")),
    ),
    renderEuropassRow(
      label(labels, "personal.birth_date", "Date of birth"),
      escapeHtml(formatDateValue(person.birth_date, "exact")),
    ),
  ]
    .filter(Boolean)
    .join("");

  const experienceBlocks = (experiences as unknown[])
    .map((item) => {
      const record = asRecord(item);
      if (!record) return "";
      const range = formatRange(
        record.start_date,
        record.end_date,
        record.is_current,
        experienceDateMode,
        presentLabel,
      );
      const location = asRecord(record.location);
      const employerLine = [record.employer, location?.address, location?.city]
        .filter(Boolean)
        .map((part) => String(part))
        .join(", ");
      const responsibilities = renderEuropassSimpleList(
        textList(record.responsibilities),
      );
      const products = renderEuropassSimpleList(
        toProductLines(record.products),
      );
      const publicationLinks = renderEuropassSimpleList(
        toPublicationLinks(record.publication_links).map(
          (item) => `${item.title} (${item.href})`,
        ),
      );
      const tools = renderEuropassSimpleList(textList(record.tools));
      const roleBase = String(record.role ?? "").trim();
      const parallelRoleSuffix = label(
        labels,
        "experience_labels.parallel_role_suffix",
        "Parallel role",
      );
      const roleWithSuffix =
        record.parallel_role && roleBase
          ? `${roleBase} (${parallelRoleSuffix})`
          : record.parallel_role
            ? parallelRoleSuffix
            : roleBase;
      return `<div class=\"entry job-subsection\">
        ${renderEuropassRow(label(labels, "experience_labels.dates", "Dates"), escapeHtml(range))}
        ${renderEuropassRow(label(labels, "experience_labels.employer", "Employer and address"), escapeHtml(employerLine))}
        ${renderEuropassRow(label(labels, "experience_labels.industry", "Type of business"), escapeHtml(String(record.industry ?? "")))}
        ${renderEuropassRow(label(labels, "experience_labels.role", "Occupation or position held"), escapeHtml(roleWithSuffix))}
        ${renderEuropassRow(label(labels, "experience_labels.activities", "Main activities and responsibilities"), responsibilities)}
        ${renderEuropassRow(label(labels, "experience_labels.products", "Published titles / products"), products)}
        ${renderEuropassRow(label(labels, "experience_labels.publication_links", "Publication links"), publicationLinks)}
        ${renderEuropassRow(label(labels, "experience_labels.tools", "Tools"), tools)}
      </div>`;
    })
    .join("");

  const educationBlocks = (education as unknown[])
    .map((item) => {
      const record = asRecord(item);
      if (!record) return "";
      const range = formatRange(
        record.start_date,
        record.end_date,
        false,
        educationDateMode,
        presentLabel,
      );
      return `<div class=\"entry\">
        ${renderEuropassRow(label(labels, "education_labels.dates", "Dates"), escapeHtml(range))}
        ${renderEuropassRow(label(labels, "education_labels.subjects", "Main subjects"), escapeHtml(textList(record.subjects).join(", ")))}
        ${renderEuropassRow(label(labels, "education_labels.field", "Field of study"), escapeHtml(String(record.field_of_study ?? "")))}
        ${renderEuropassRow(label(labels, "education_labels.qualification", "Title of qualification awarded"), escapeHtml(String(record.degree ?? "")))}
        ${renderEuropassRow(label(labels, "education_labels.level", "Level"), escapeHtml(String(record.qualification_level ?? "")))}
        ${renderEuropassRow(label(labels, "education_labels.faculty", "Faculty"), escapeHtml(String(record.faculty ?? "")))}
        ${renderEuropassRow(label(labels, "education_labels.organization", "Name of organisation"), escapeHtml(String(record.institution ?? "")))}
        ${renderEuropassRow(label(labels, "education_labels.location", "Location"), escapeHtml([record.city, record.country].filter(Boolean).join(", ")))}
      </div>`;
    })
    .join("");

  const otherLanguageHtml = otherLanguages
    .map((item) => {
      const record = asRecord(item);
      if (!record) return "";
      return `<div class=\"lang-block\">
        <strong>${escapeHtml(String(record.language ?? ""))}</strong>
        <ul>
          <li>${escapeHtml(label(labels, "language_labels.reading", "Reading"))}: ${escapeHtml(String(record.reading ?? record.proficiency_cefr ?? ""))}</li>
          <li>${escapeHtml(label(labels, "language_labels.writing", "Writing"))}: ${escapeHtml(String(record.writing ?? record.proficiency_cefr ?? ""))}</li>
          <li>${escapeHtml(label(labels, "language_labels.speaking", "Speaking"))}: ${escapeHtml(String(record.speaking ?? record.proficiency_cefr ?? ""))}</li>
        </ul>
      </div>`;
    })
    .join("");

  const referencesHtml = references
    .map((item) => {
      const record = asRecord(item);
      if (!record) return "";
      return `<div class=\"ref-item\">
        <strong>${escapeHtml(String(record.name ?? ""))}</strong>
        <div>${escapeHtml(String(record.role ?? ""))} ${escapeHtml(String(record.organization ?? ""))}</div>
        <div>${escapeHtml(String(record.email ?? ""))}</div>
      </div>`;
    })
    .join("");

  return `<!doctype html>
<html>
<head>
  <meta charset=\"utf-8\" />
  <style>
    @page { size: A4; margin: ${margins.top}mm ${margins.right}mm ${margins.bottom}mm ${margins.left}mm; }
    * { box-sizing: border-box; }
    body { margin: 0; font-family: "Liberation Sans", "Nimbus Sans", Arial, Helvetica, sans-serif; color: #111; font-size: 11.4px; line-height: 1.35; }
    .page { width: 100%; min-height: calc(297mm - ${margins.top + margins.bottom}mm); padding: 8mm 7mm 8mm; }
    .title-wrap { margin-bottom: 8mm; width: 62mm; }
    .title { text-align: left; font-family: "Liberation Sans", "Nimbus Sans", Arial, Helvetica, sans-serif; font-weight: 700; letter-spacing: 0.02em; font-size: 13px; text-transform: uppercase; margin-bottom: 2mm; line-height: 1.2; }
    .eu-flag { width: 24mm; height: 16mm; }
    .section-title { font-family: "Liberation Sans", "Nimbus Sans", Arial, Helvetica, sans-serif; font-size: 17px; margin: 0 0 4mm; font-weight: 700; text-transform: uppercase; }
    .erow { display: grid; grid-template-columns: 26% 74%; gap: 4.2mm; margin: 0.9mm 0; break-inside: avoid; page-break-inside: avoid; }
    .elabel { text-align: right; color: #2b2b2b; font-family: "Liberation Sans", "Nimbus Sans", Arial, Helvetica, sans-serif; font-weight: 600; }
    .evalue { color: #111; font-family: "Liberation Sans Narrow", "Nimbus Sans Narrow", "Arial Narrow", "Liberation Sans", "Nimbus Sans", Arial, Helvetica, sans-serif; font-weight: 400; }
    .entry { margin-bottom: 5mm; }
    .entry.job-subsection {
      break-inside: auto;
      page-break-inside: auto;
      /* Encourage moving subsection to next page if fewer than ~4 lines fit. */
      min-height: 4.2lh;
    }
    .entry.job-subsection .erow,
    .entry.job-subsection .evalue li,
    .entry.job-subsection .evalue p {
      orphans: 4;
      widows: 4;
    }
    .block { margin-bottom: 6mm; }
    .block p { margin: 0; font-family: "Liberation Sans Narrow", "Nimbus Sans Narrow", "Arial Narrow", "Liberation Sans", "Nimbus Sans", Arial, Helvetica, sans-serif; }
    .evalue ul { margin: 0; padding-left: 12px; list-style: none; }
    .evalue li { position: relative; margin: 0.7mm 0; padding-left: 2.4px; }
    .evalue li::before {
      content: "•";
      position: absolute;
      left: -6px;
      top: 1px;
      font-weight: 600;
      line-height: 1;
    }
    .lang-block { margin-bottom: 2mm; }
    .ref-item { margin-bottom: 2mm; }
  </style>
</head>
<body>
  <div class=\"page\">
    <div class=\"title-wrap\">
      <div class=\"title\">${escapeHtml(label(labels, "sections.cv_title", "European Curriculum Vitae"))}</div>
      <svg class=\"eu-flag\" viewBox=\"0 0 60 40\" xmlns=\"http://www.w3.org/2000/svg\" aria-label=\"EU flag\" role=\"img\">
        <rect width=\"60\" height=\"40\" fill=\"#003399\" />
        <g fill=\"#FFCC00\">
          <circle cx=\"30\" cy=\"7\" r=\"1.4\"/><circle cx=\"37\" cy=\"9\" r=\"1.4\"/><circle cx=\"42\" cy=\"14\" r=\"1.4\"/>
          <circle cx=\"44\" cy=\"20\" r=\"1.4\"/><circle cx=\"42\" cy=\"26\" r=\"1.4\"/><circle cx=\"37\" cy=\"31\" r=\"1.4\"/>
          <circle cx=\"30\" cy=\"33\" r=\"1.4\"/><circle cx=\"23\" cy=\"31\" r=\"1.4\"/><circle cx=\"18\" cy=\"26\" r=\"1.4\"/>
          <circle cx=\"16\" cy=\"20\" r=\"1.4\"/><circle cx=\"18\" cy=\"14\" r=\"1.4\"/><circle cx=\"23\" cy=\"9\" r=\"1.4\"/>
        </g>
      </svg>
    </div>
    <section class=\"block\">
      <h2 class=\"section-title\">${escapeHtml(label(labels, "sections.personal_info", "Personal Information"))}</h2>
      ${contactBlock}
    </section>
    <section class=\"block\">
      <h2 class=\"section-title\">${escapeHtml(label(labels, "sections.positioning", "Positioning"))}</h2>
      ${renderEuropassRow(label(labels, "sections.headline", "Headline"), escapeHtml(String(slots["positioning.headline"] ?? getByPath(cv, "positioning.headline") ?? "")))}
      ${renderEuropassRow(label(labels, "sections.profile", "Profile"), profileSummary)}
    </section>
    <section class=\"block\">
      <h2 class=\"section-title\">${escapeHtml(label(labels, "sections.work_experience", "Work Experience"))}</h2>
      ${experienceBlocks}
    </section>
    <section class=\"block\">
      <h2 class=\"section-title\">${escapeHtml(label(labels, "sections.education", "Education"))}</h2>
      ${educationBlocks}
    </section>
    <section class=\"block\">
      <h2 class=\"section-title\">${escapeHtml(label(labels, "sections.personal_competencies", "Personal Skills and Competences"))}</h2>
      ${renderEuropassRow(label(labels, "sections.mother_tongue", "Mother tongue"), escapeHtml(String(motherTongue?.language ?? "")))}
      ${renderEuropassRow(label(labels, "sections.other_languages", "Other languages"), otherLanguageHtml)}
      ${renderEuropassRow(label(labels, "sections.social_skills", "Social Skills"), renderEuropassSimpleList(social))}
      ${renderEuropassRow(label(labels, "sections.organizational_skills", "Organizational Skills"), renderEuropassSimpleList(core))}
      ${renderEuropassRow(label(labels, "sections.technical_skills", "Technical Skills"), renderEuropassSimpleList(technical))}
      ${renderEuropassRow(label(labels, "sections.artistic_skills", "Artistic Skills"), renderEuropassSimpleList(publications))}
      ${renderEuropassRow(label(labels, "sections.other_skills", "Other Skills"), renderEuropassSimpleList(otherSkills))}
      ${renderEuropassRow(label(labels, "sections.driving_license", "Driving licence"), escapeHtml(drivingLicense))}
      ${renderEuropassRow(label(labels, "sections.references", "References"), referencesHtml)}
    </section>
    <section class=\"block\">
      <h2 class=\"section-title\">${escapeHtml(label(labels, "sections.additional_information", "Additional Information"))}</h2>
      ${renderEuropassRow(label(labels, "sections.certifications", "Certifications"), renderEuropassSimpleList(certifications))}
      ${renderEuropassRow(label(labels, "sections.projects", "Projects"), renderEuropassSimpleList(projects))}
      ${renderEuropassRow(label(labels, "sections.awards", "Awards"), renderEuropassSimpleList(awards))}
      ${renderEuropassRow(label(labels, "sections.publications", "Publications"), renderEuropassSimpleList(publications))}
      ${renderEuropassRow(label(labels, "sections.volunteering", "Volunteering"), renderEuropassSimpleList(volunteering))}
      ${renderEuropassRow(label(labels, "sections.patents", "Patents"), renderEuropassSimpleList(patents))}
      ${renderEuropassRow(label(labels, "sections.portfolio_links", "Portfolio links"), renderEuropassSimpleList(portfolioLinks))}
      ${renderEuropassRow(label(labels, "sections.interests", "Interests"), renderEuropassSimpleList(interests))}
    </section>
  </div>
</body>
</html>`;
}

function renderEdinburgh(
  cv: CvDocument,
  template: TemplateFile,
  slots: Record<string, unknown>,
  labels: Record<string, unknown>,
  theme: EdinburghThemePalette,
  photoModeInput?: string,
): string {
  const accent = theme.accent;
  const sidebar = theme.sidebarBackground;
  const margins = resolveMargins(template);
  const experienceDateMode = template.date_display?.experience ?? "exact";
  const educationDateMode = template.date_display?.education ?? "exact";
  const profileSummaryMode =
    template.text_layout?.profile_summary ?? "multi_paragraph";

  const fullName = String(
    slots["person.full_name"] ?? getByPath(cv, "person.full_name") ?? "",
  );
  const parts = splitName(fullName);
  const topNameSize = nameSizeMm(parts.top, 4.4, 2.95);
  const bottomNameSize = nameSizeMm(parts.bottom || parts.top, 4.75, 3.3);
  const residenceRaw = getByPath(cv, "person.residence");
  const residenceRecord = asRecord(residenceRaw);
  const residence = [residenceRecord?.city, residenceRecord?.country]
    .filter(Boolean)
    .map((value) => String(value))
    .join(", ");
  const summary = renderParagraphs(
    slots["positioning.profile_summary"] ??
      getByPath(cv, "positioning.profile_summary"),
    profileSummaryMode,
    "summary-line",
  );
  const competenciesSection = renderEdinburghCompetenciesSection(labels, cv);
  const optionalCourses = renderSimpleList(
    label(labels, "sections.courses", "Courses"),
    slots["optional.courses"] ??
      getByPath(cv, "optional_sections.certifications"),
  );
  const optionalProjects = renderSimpleList(
    label(labels, "sections.projects", "Projects"),
    getByPath(cv, "optional_sections.projects"),
  );
  const optionalAwards = renderSimpleList(
    label(labels, "sections.awards", "Awards"),
    getByPath(cv, "optional_sections.awards"),
  );
  const optionalPublications = "";
  const optionalVolunteering = renderSimpleList(
    label(labels, "sections.volunteering", "Volunteering"),
    getByPath(cv, "optional_sections.volunteering"),
  );
  const optionalPatents = renderSimpleList(
    label(labels, "sections.patents", "Patents"),
    getByPath(cv, "optional_sections.patents"),
  );
  const optionalPortfolio = renderSimpleList(
    label(labels, "sections.portfolio_links", "Portfolio Links"),
    getByPath(cv, "optional_sections.portfolio_links"),
  );
  const presentLabel = label(labels, "common.present", "present");

  const photoValue = slots["profile.photo"];
  const photoUrl = typeof photoValue === "string" ? photoValue.trim() : "";
  const photoMode = normalizePhotoMode(photoModeInput);
  const showPhoto = shouldRenderPhoto(true, photoMode);
  const photoModeClass = resolvePhotoClass(photoMode);

  return `<!doctype html>
<html>
<head>
  <meta charset=\"utf-8\" />
  <link rel=\"stylesheet\" href=\"https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.7.2/css/all.min.css\" />
  <style>
    @page { size: A4; margin: ${margins.top}mm ${margins.right}mm ${margins.bottom}mm ${margins.left}mm; }
    * { box-sizing: border-box; }
    body { margin: 0; font-family: \"IBM Plex Sans\", Arial, sans-serif; color: #202124; font-size: 11.4px; line-height: 1.35; }
    .page { width: 100%; display: grid; grid-template-columns: 34% 66%; min-height: calc(297mm - ${margins.top + margins.bottom}mm); }
    .left { background: ${sidebar}; position: relative; }
    .left-header {
      position: relative;
      background: ${accent};
      color: #fff;
      padding: 12mm 7mm 19mm;
      min-height: 58mm;
      text-align: center;
      overflow: visible;
      z-index: 2;
    }
    .left-header::before {
      content: none;
    }
    .left-header::after {
      content: \"\";
      position: absolute;
      left: 0;
      right: 0;
      bottom: -0.1mm;
      height: 24mm;
      background-image: url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1000 240' preserveAspectRatio='none'%3E%3Cpath d='M0 54 Q500 174 1000 54 L1000 240 L0 240 Z' fill='${encodeURIComponent(sidebar)}'/%3E%3Cpath d='M0 54 Q500 174 1000 54' fill='none' stroke='${encodeURIComponent(theme.arcStroke)}' stroke-width='14' stroke-linecap='round'/%3E%3C/svg%3E\");
      background-size: 100% 100%;
      background-repeat: no-repeat;
      z-index: 3;
    }
    .name-main {
      margin: 0;
      text-transform: uppercase;
      letter-spacing: 0.11em;
      font-size: ${topNameSize}mm;
      font-weight: 600;
      line-height: 1.1;
      max-width: 90%;
      margin-left: auto;
      margin-right: auto;
      white-space: nowrap;
    }
    .name-last {
      margin: 1.2mm 0 0;
      text-transform: uppercase;
      letter-spacing: 0.12em;
      font-size: ${bottomNameSize}mm;
      font-weight: 700;
      line-height: 1.05;
      max-width: 90%;
      margin-left: auto;
      margin-right: auto;
      white-space: nowrap;
    }
    .photo-wrap {
      position: absolute;
      left: 50%;
      bottom: -4.2mm;
      transform: translateX(-50%);
      width: 33mm;
      height: 33mm;
      overflow: visible;
      z-index: 7;
    }
    .photo-wrap::before {
      content: none;
    }
    .photo-frame {
      position: relative;
      z-index: 3;
      width: 100%;
      height: 100%;
      border-radius: 999px;
      border: 0.95mm solid #fff;
      background: #d1d5db;
      overflow: hidden;
      box-shadow: 0 2px 10px rgba(0,0,0,0.2);
    }
    .photo-frame img { width: 100%; height: 100%; object-fit: cover; display: block; }
    .photo-fallback { width: 100%; height: 100%; display:flex; align-items:center; justify-content:center; color:#4b5563; font-size:10mm; }
    .photo-frame.photo-force-circle { border-radius: 999px; }
    .photo-frame.photo-force-square { border-radius: 0; }
    .photo-wrap.photo-force-original { height: auto; bottom: -8mm; }
    .photo-frame.photo-force-original { height: auto; border-radius: 0; overflow: visible; background: transparent; }
    .photo-frame.photo-force-original img { width: 100%; height: auto; max-height: 33mm; object-fit: contain; }
    .photo-frame.photo-force-original .photo-fallback { width: 100%; aspect-ratio: 3 / 4; height: auto; border-radius: 0; }

    .left-body { padding: 10mm 7mm 6mm; font-size: 11.2px; position: relative; z-index: 1; }
    .left-body section { border-top: 1px solid #d7d9dd; padding-top: 11px; margin-bottom: 14px; }
    .left-body section:first-child { border-top: 0; padding-top: 0; }

    h3 { font-size: 13.2px; letter-spacing: 0.12em; text-transform: uppercase; margin: 0 0 8px; font-weight: 700; }
    h2 { font-size: 24px; margin: 0 0 9px; letter-spacing: 0.02em; font-weight: 700; }

    .contact-list { list-style: none; margin: 0; padding: 0; }
    .contact-list li { display: grid; grid-template-columns: 14px 1fr; gap: 7px; margin: 6px 0; }
    .contact-list .icon { font-size: 10px; padding-top: 2px; }
    .contact-list .kv { display: flex; flex-direction: column; gap: 1px; }
    .contact-list .kv strong { font-size: 10.8px; line-height: 1.1; }
    .contact-list .kv span { font-size: 10.8px; color: #3f4349; line-height: 1.2; }

    .square-bullets { list-style: none; margin: 0; padding: 0; }
    .square-bullets li { display: flex; align-items: center; gap: 8px; margin: 5px 0; }
    .square-bullets .sq { width: 6px; height: 6px; display: inline-block; }

    .edinburgh-languages,
    .edinburgh-skills { list-style: none; margin: 0; padding: 0; }
    .edinburgh-languages li,
    .edinburgh-skills li { display: flex; justify-content: space-between; gap: 8px; margin: 7px 0; align-items: center; }
    .edinburgh-languages .label,
    .edinburgh-skills .label { font-weight: 600; font-size: 11.4px; }
    .edinburgh-languages .dots,
    .edinburgh-skills .dots { display: inline-flex; gap: 4px; }
    .edinburgh-languages .dot,
    .edinburgh-skills .dot { width: 8px; height: 8px; border-radius: 999px; background: ${theme.dotOff}; display: inline-block; }

    .right { padding: 6mm 7mm 10mm; background: #fff; }
    .headline { margin: 0 0 8px; font-size: 15px; font-weight: 700; color: #202124; }
    .summary p { margin: 0 0 8px; line-height: 1.48; color: #3f4349; }
    .right > section { margin-bottom: 14px; padding-bottom: 2px; }
    .entry { border-top: 1px solid #ddd; padding-top: 10px; margin-top: 10px; }
    .entry-head { display: flex; justify-content: space-between; gap: 10px; }
    .entry-head h4 { margin: 0; font-size: 14.5px; font-weight: 700; text-transform: none; }
    .entry-head span { font-size: 11.6px; color: #40464f; white-space: nowrap; }
    .org { margin: 3px 0 7px; color: #5f6368; font-weight: 500; }
    .entry ul { margin: 5px 0 0 16px; padding: 0; }
    .entry li { margin: 2px 0; line-height: 1.33; }
    .entry a { color: ${theme.link}; text-decoration: none; border-bottom: 1px solid ${theme.linkBorder}; }
    .entry a:hover { border-bottom-color: ${theme.link}; }
    .product-subsection { margin-top: 6px; }
    .product-title { margin: 0 0 3px; font-weight: 700; font-size: 11.4px; color: #2f3640; }
    .product-list { list-style: none; margin: 0; padding: 0; }
    .product-list li { position: relative; padding-left: 14px; margin: 2px 0; }
    .product-list li::before { content: \"\"; position: absolute; left: 0; top: 6px; width: 6px; height: 6px; background: ${accent}; }
    .product-list .product-name { display: block; font-weight: 600; }
    .product-list .product-note-line { display: flex; align-items: flex-start; gap: 6px; margin-top: 1px; }
    .product-list .product-note-tab { color: #666; font-family: \"JetBrains Mono\", monospace; }
    .product-list .product-note-text { display: block; color: #555; font-size: 10.8px; line-height: 1.35; }
    .publication-links-subsection { margin-top: 7px; }
    .publication-links-title { margin: 0 0 3px; font-weight: 700; font-size: 11.4px; color: #2f3640; }
    .publication-links-list { margin: 0; padding-left: 16px; }
    .publication-links-list li { margin: 2px 0; line-height: 1.32; }
    .edu-details { margin-top: 6px; }
    .edu-detail { margin: 2px 0; color: #3f4349; font-size: 11.2px; line-height: 1.33; }
    .edu-detail strong { color: #262b31; font-weight: 700; }
    .ref { margin-top: 8px; line-height: 1.35; }
    .right .entry,
    .right .ref,
    .right .subsection {
      break-inside: avoid;
      page-break-inside: avoid;
    }
  </style>
</head>
<body>
  <div class=\"page\">
    <aside class=\"left\">
      <div class=\"left-header\">
        <p class=\"name-main\">${escapeHtml(parts.top)}</p>
        ${parts.bottom ? `<p class=\"name-last\">${escapeHtml(parts.bottom)}</p>` : ""}
        ${
          showPhoto
            ? `<div class=\"photo-wrap ${photoModeClass}\">
          <div class=\"photo-frame ${photoModeClass}\">
            ${
              photoUrl
                ? `<img src=\"${escapeHtml(photoUrl)}\" alt=\"Profile photo\" />`
                : `<div class=\"photo-fallback\"><i class=\"fa-solid fa-user\"></i></div>`
            }
          </div>
        </div>`
            : ""
        }
      </div>
      <div class=\"left-body\">
        ${renderEdinburghContact(slots["contact.block"] ?? getByPath(cv, "person.contact"), residence, fullName, accent, labels)}
        ${renderEdinburghLanguages(slots["skills.languages"] ?? getByPath(cv, "skills.languages"), accent, labels)}
        ${renderEdinburghSkills(slots["skills.technical"] ?? getByPath(cv, "skills.technical"), accent, labels)}
        ${renderEdinburghInterests(slots["optional.interests"] ?? getByPath(cv, "optional_sections.interests"), accent, labels)}
      </div>
    </aside>
    <main class=\"right\">
      <section class=\"summary\">${summary}</section>
      ${renderExperience(
        label(labels, "sections.work_experience", "Work experience"),
        slots["experience.items"] ?? getByPath(cv, "experience"),
        experienceDateMode,
        presentLabel,
        labels,
        { includeProducts: true, includePublicationLinks: true },
      )}
      ${renderEducation(
        label(labels, "sections.education", "Education and Qualifications"),
        slots["education.items"] ?? getByPath(cv, "education"),
        educationDateMode,
        presentLabel,
        labels,
        {
          includeDetails: true,
          includeLocation: false,
          includeCompleted: false,
        },
      )}
      ${optionalCourses}
      ${optionalProjects}
      ${optionalAwards}
      ${optionalPublications}
      ${optionalVolunteering}
      ${optionalPatents}
      ${optionalPortfolio}
      ${renderReferences(label(labels, "sections.references", "References"), slots["references.items"] ?? getByPath(cv, "references"))}
      ${competenciesSection}
    </main>
  </div>
</body>
</html>`;
}

function renderHarvard(
  cv: CvDocument,
  template: TemplateFile,
  slots: Record<string, unknown>,
  labels: Record<string, unknown>,
  theme: HarvardThemePalette,
  photoModeInput?: string,
): string {
  const margins = resolveMargins(template);
  const experienceDateMode = template.date_display?.experience ?? "year";
  const educationDateMode = template.date_display?.education ?? "year";
  const presentLabel = label(labels, "common.present", "present");

  const fullName = String(
    slots["person.full_name"] ?? getByPath(cv, "person.full_name") ?? "",
  ).trim();
  const titleName = formatName(
    fullName,
    template.name_display?.title ?? "first-last",
  );
  const summaryText = textList(
    slots["positioning.profile_summary"] ??
      getByPath(cv, "positioning.profile_summary"),
  ).join(" ");
  const photoValue = slots["profile.photo"];
  const photoUrl = typeof photoValue === "string" ? photoValue.trim() : "";
  const photoMode = normalizePhotoMode(photoModeInput);
  const showPhoto = shouldRenderPhoto(true, photoMode);
  const photoModeClass = resolvePhotoClass(photoMode);

  const person = asRecord(getByPath(cv, "person")) ?? {};
  const residence = asRecord(getByPath(cv, "person.residence")) ?? {};
  const contact =
    asRecord(slots["contact.block"] ?? getByPath(cv, "person.contact")) ?? {};

  const personalRows = [
    {
      icon: "fa-user",
      label: label(labels, "contact_labels.name", "Name"),
      value: String(person.full_name ?? fullName ?? "").trim(),
    },
    {
      icon: "fa-house",
      label: label(labels, "contact_labels.address", "Address"),
      value: [residence.street, residence.city, residence.country]
        .filter(Boolean)
        .map(String)
        .join(", "),
    },
    {
      icon: "fa-phone",
      label: label(labels, "contact_labels.phone", "Phone"),
      value: String(contact.phone_e164 ?? contact.phone_local ?? "").trim(),
    },
    {
      icon: "fa-envelope",
      label: label(labels, "contact_labels.email", "Email address"),
      value: String(contact.email ?? "").trim(),
    },
    {
      icon: "fa-link",
      label: label(labels, "contact_labels.linkedin", "LinkedIn"),
      value:
        normalizeProfileLink(contact.linkedin, "linkedin")?.display ??
        String(contact.linkedin ?? "").trim(),
    },
    {
      icon: "fa-link",
      label: label(labels, "contact_labels.github", "GitHub"),
      value:
        normalizeProfileLink(contact.github, "github")?.display ??
        String(contact.github ?? "").trim(),
    },
  ].filter((item) => item.value.length > 0);

  const interests = textList(
    slots["optional.interests"] ?? getByPath(cv, "optional_sections.interests"),
  );
  const languages = Array.isArray(
    slots["skills.languages"] ?? getByPath(cv, "skills.languages"),
  )
    ? (slots["skills.languages"] ?? getByPath(cv, "skills.languages"))
    : [];
  const technicalSkills = textList(
    slots["skills.technical"] ?? getByPath(cv, "skills.technical"),
  );
  const experiences = Array.isArray(
    slots["experience.items"] ?? getByPath(cv, "experience"),
  )
    ? (slots["experience.items"] ?? getByPath(cv, "experience"))
    : [];
  const education = Array.isArray(
    slots["education.items"] ?? getByPath(cv, "education"),
  )
    ? (slots["education.items"] ?? getByPath(cv, "education"))
    : [];
  const referencesRaw =
    slots["references.items"] ?? getByPath(cv, "references");
  const references = Array.isArray(referencesRaw) ? referencesRaw : [];
  const optionalCourses = renderSimpleList(
    label(labels, "sections.courses", "Courses"),
    slots["optional.courses"] ??
      getByPath(cv, "optional_sections.certifications"),
  );
  const optionalProjects = renderSimpleList(
    label(labels, "sections.projects", "Projects"),
    getByPath(cv, "optional_sections.projects"),
  );
  const optionalAwards = renderSimpleList(
    label(labels, "sections.awards", "Awards"),
    getByPath(cv, "optional_sections.awards"),
  );
  const optionalVolunteering = renderSimpleList(
    label(labels, "sections.volunteering", "Volunteering"),
    getByPath(cv, "optional_sections.volunteering"),
  );
  const optionalPatents = renderSimpleList(
    label(labels, "sections.patents", "Patents"),
    getByPath(cv, "optional_sections.patents"),
  );
  const optionalPortfolio = renderSimpleList(
    label(labels, "sections.portfolio_links", "Portfolio Links"),
    getByPath(cv, "optional_sections.portfolio_links"),
  );
  const competenciesSection = renderEdinburghCompetenciesSection(labels, cv);

  const personalDetailsHtml = personalRows
    .map(
      (item) => `<li>
      <span class="icon"><i class="fa-solid ${item.icon}"></i></span>
      <span class="kv"><strong>${escapeHtml(item.label)}</strong><span>${escapeHtml(item.value)}</span></span>
    </li>`,
    )
    .join("");

  const interestsHtml = interests
    .map(
      (item) =>
        `<li><span class="sq"></span><span>${escapeHtml(item)}</span></li>`,
    )
    .join("");

  const languageRows = (languages as unknown[])
    .map((entry) => {
      const record = asRecord(entry);
      if (!record) return "";
      const score = languageDotCount(record.proficiency_cefr);
      const stars = Array.from({ length: 5 })
        .map(
          (_, index) =>
            `<span class="star ${index < score ? "on" : ""}">★</span>`,
        )
        .join("");
      return `<li><span class="label">${escapeHtml(record.language ?? "")}</span><span class="stars">${stars}</span></li>`;
    })
    .join("");

  function timelineSectionHtml(
    titleText: string,
    iconClass: string,
    items: string[],
    extraClass = "",
  ): string {
    if (!items.length) return "";
    return `<section class="${extraClass}">
      <h2><span class="section-icon"><i class="fa-solid ${iconClass}"></i></span>${escapeHtml(titleText)}</h2>
      <div class="timeline">${items.join("")}</div>
    </section>`;
  }

  const experienceItems = (experiences as unknown[])
    .map((entry) => {
      const record = asRecord(entry);
      if (!record) return "";
      const range = formatRange(
        record.start_date,
        record.end_date,
        record.is_current,
        experienceDateMode,
        presentLabel,
      );
      const orgLine = [
        String(record.employer ?? "").trim(),
        String(asRecord(record.location)?.city ?? "").trim(),
      ]
        .filter(Boolean)
        .join(", ");
      const bullets = textList(record.responsibilities)
        .map((item) => `<li>${escapeHtml(item)}</li>`)
        .join("");
      const productLines = toProductLines(record.products);
      const publicationLinks = toPublicationLinks(record.publication_links);
      const productsHtml = productLines.length
        ? `<div class="product-subsection"><p class="product-title">${escapeHtml(label(labels, "sections.worked_on_projects", "Worked on projects"))}</p><ul class="product-list">${productLines.map((line) => `<li>${escapeHtml(line)}</li>`).join("")}</ul></div>`
        : "";
      const publicationLinksHtml = publicationLinks.length
        ? `<div class="publication-links-subsection"><p class="publication-links-title">${escapeHtml(label(labels, "sections.publication_links", "Publication links"))}</p><ul class="publication-links-list">${publicationLinks.map((item) => `<li><a href="${escapeHtml(item.href)}" target="_blank" rel="noopener noreferrer">${escapeHtml(item.title)}</a></li>`).join("")}</ul></div>`
        : "";
      return `<article class="timeline-item">
        <span class="timeline-dot"></span>
        <div class="timeline-date">${escapeHtml(range)}</div>
        <div class="timeline-body">
          <h3>${escapeHtml(record.role ?? "")}</h3>
          ${orgLine ? `<p class="meta">${escapeHtml(orgLine)}</p>` : ""}
          ${bullets ? `<ul>${bullets}</ul>` : ""}
          ${productsHtml}
          ${publicationLinksHtml}
        </div>
      </article>`;
    })
    .filter(Boolean);

  const educationItems = (education as unknown[])
    .map((entry) => {
      const record = asRecord(entry);
      if (!record) return "";
      const range = formatRange(
        record.start_date,
        record.end_date,
        false,
        educationDateMode,
        presentLabel,
      );
      const orgLine = String(record.institution ?? "").trim();
      const detail = textList(record.subjects).join(", ");
      return `<article class="timeline-item">
        <span class="timeline-dot"></span>
        <div class="timeline-date">${escapeHtml(range)}</div>
        <div class="timeline-body">
          <h3>${escapeHtml(record.degree ?? "")}</h3>
          ${orgLine ? `<p class="meta">${escapeHtml(orgLine)}</p>` : ""}
          ${detail ? `<p>${escapeHtml(detail)}</p>` : ""}
        </div>
      </article>`;
    })
    .filter(Boolean);

  const skillRows = technicalSkills
    .map((item, index) => {
      const score = skillDotCount(index);
      const stars = Array.from({ length: 5 })
        .map(
          (_, starIndex) =>
            `<span class="star ${starIndex < score ? "on" : ""}">★</span>`,
        )
        .join("");
      return `<li><span class="label">${escapeHtml(item)}</span><span class="stars">${stars}</span></li>`;
    })
    .join("");

  const referenceItem = asRecord(references[0]);
  const referencesItems = referenceItem
    ? [
        `<article class="timeline-item">
          <span class="timeline-dot"></span>
          <div class="timeline-date">${escapeHtml(String(referenceItem.organization ?? ""))}</div>
          <div class="timeline-body">
            <h3>${escapeHtml(String(referenceItem.name ?? ""))}</h3>
            ${referenceItem.phone ? `<p class="meta">${escapeHtml(String(referenceItem.phone))}</p>` : ""}
            ${referenceItem.email ? `<p>${escapeHtml(String(referenceItem.email))}</p>` : ""}
          </div>
        </article>`,
      ]
    : [];

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.7.2/css/all.min.css" />
  <style>
    @page { size: A4; margin: ${margins.top}mm ${margins.right}mm ${margins.bottom}mm ${margins.left}mm; }
    * { box-sizing: border-box; }
    body { margin: 0; font-family: "IBM Plex Sans", Arial, sans-serif; color: #1f2937; font-size: 11.2px; line-height: 1.42; }
    .page { width: 100%; min-height: calc(297mm - ${margins.top + margins.bottom}mm); display: grid; grid-template-columns: 31% 69%; }
    .sidebar { background: ${theme.sidebar}; color: ${theme.sidebarText}; padding: 11mm 5.5mm 9mm; }
    .content { background: #fff; padding: 7mm 6.5mm 9mm; }

    .profile {
      text-align: center;
      margin: 0 0 8mm;
      min-height: 44mm;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .profile.profile-original { align-items: flex-end; }
    .avatar-wrap { width: 40mm; height: 40mm; border-radius: 50%; overflow: hidden; border: 0.9mm solid rgba(255,255,255,0.9); box-shadow: 0 2px 10px rgba(0,0,0,0.25); margin: 0 auto; }
    .avatar-wrap img { width: 100%; height: 100%; object-fit: cover; display: block; }
    .avatar-fallback { width: 100%; height: 100%; display:flex; align-items:center; justify-content:center; font-size: 14mm; color: ${theme.sidebarMuted}; background: rgba(0,0,0,0.12); }
    .avatar-wrap.photo-force-circle { border-radius: 999px; }
    .avatar-wrap.photo-force-square { border-radius: 0; }
    .avatar-wrap.photo-force-original { height: auto; border-radius: 0; }
    .avatar-wrap.photo-force-original img { width: 100%; height: auto; max-height: 40mm; object-fit: contain; }
    .avatar-wrap.photo-force-original .avatar-fallback { width: 100%; aspect-ratio: 3 / 4; height: auto; border-radius: 0; }

    .sidebar h3 {
      margin: 0 0 4.5mm;
      font-size: 6.1mm;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      font-weight: 700;
    }
    .sidebar section { margin-bottom: 7.5mm; }
    .sidebar ul { list-style: none; margin: 0; padding: 0; }
    .personal-list li { display: grid; grid-template-columns: 5mm 1fr; gap: 2.3mm; margin: 1.9mm 0; align-items: start; }
    .personal-list .icon { padding-top: 0.4mm; color: ${theme.sidebarText}; font-size: 3.6mm; }
    .personal-list .kv { display: flex; flex-direction: column; gap: 0.4mm; }
    .personal-list .kv strong { font-size: 3.5mm; line-height: 1.1; font-weight: 700; }
    .personal-list .kv span { font-size: 3.35mm; line-height: 1.2; color: ${theme.sidebarMuted}; }

    .sq-list li { display: flex; align-items: center; gap: 2.4mm; margin: 1.6mm 0; }
    .sq-list .sq { width: 2.1mm; height: 2.1mm; background: ${theme.sidebarText}; }

    .star-list li { display: flex; justify-content: space-between; gap: 3mm; margin: 1.8mm 0; align-items: center; }
    .star-list .label { font-size: 3.5mm; font-weight: 600; }
    .star-list .stars { letter-spacing: 0.7mm; white-space: nowrap; }
    .star { color: ${theme.starOff}; font-size: 3.8mm; }
    .star.on { color: ${theme.starOn}; }

    .name { margin: 0; font-size: 8.4mm; letter-spacing: 0.08em; text-transform: uppercase; line-height: 1.08; font-weight: 600; color: #1f2937; }
    .summary { margin-top: 3.4mm; margin-bottom: 4.2mm; color: #394150; font-size: 4.05mm; line-height: 1.45; }
    .intro-divider { border: 0; border-top: 0.35mm solid #d7dde6; margin: 0 0 4.5mm; }

    .content section { margin-bottom: 6.4mm; }
    .content h2 {
      margin: 0 0 2.8mm;
      font-size: 5.8mm;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      font-weight: 700;
      display: flex;
      align-items: center;
      gap: 2.6mm;
      color: #1f2937;
    }
    .section-icon {
      width: 8.2mm;
      height: 8.2mm;
      border-radius: 50%;
      border: 0.35mm solid #1f2937;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 3.5mm;
      flex: 0 0 auto;
    }
    .timeline { position: relative; padding-left: 11mm; }
    .timeline::before { content: ""; position: absolute; left: 4.1mm; top: 0; bottom: 0; width: 0.35mm; background: ${theme.timeline}; }
    .timeline-item {
      position: relative;
      display: grid;
      grid-template-columns: 28mm 1fr;
      gap: 5mm;
      margin-bottom: 4.2mm;
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .timeline-dot {
      position: absolute;
      left: -8.25mm;
      top: 1.25mm;
      width: 3.1mm;
      height: 3.1mm;
      border-radius: 50%;
      background: #fff;
      border: 0.35mm solid ${theme.timeline};
    }
    .timeline-date { font-size: 3.55mm; color: #374151; padding-top: 0.2mm; }
    .timeline-body h3 { margin: 0; font-size: 4.35mm; line-height: 1.2; font-weight: 700; text-transform: none; letter-spacing: 0; color: #1f2937; }
    .timeline-body .meta { margin: 0.8mm 0 1.1mm; color: ${theme.meta}; font-size: 3.8mm; }
    .timeline-body p { margin: 0 0 1.1mm; color: #3b4452; font-size: 3.7mm; }
    .timeline-body ul { margin: 0.8mm 0 0 4.2mm; padding: 0; }
    .timeline-body li { margin: 0.5mm 0; line-height: 1.34; color: #2f3745; font-size: 3.7mm; }
    .timeline-body .product-subsection { margin-top: 1.2mm; }
    .timeline-body .product-title { margin: 0 0 0.5mm; font-weight: 700; font-size: 3.6mm; color: #2f3745; }
    .timeline-body .product-list { margin: 0; padding-left: 4.2mm; }
    .timeline-body .product-list li { margin: 0.35mm 0; }
    .timeline-body .publication-links-subsection { margin-top: 1.1mm; }
    .timeline-body .publication-links-title { margin: 0 0 0.5mm; font-weight: 700; font-size: 3.6mm; color: #2f3745; }
    .timeline-body .publication-links-list { margin: 0; padding-left: 4.2mm; }
    .timeline-body .publication-links-list li { margin: 0.35mm 0; }
    .timeline-body .publication-links-list a { color: ${theme.meta}; text-decoration: none; border-bottom: 0.2mm solid rgba(0,0,0,0.14); }
    .timeline-body .publication-links-list a:hover { border-bottom-color: ${theme.meta}; }
    .content section > ul { margin: 0.9mm 0 0 4.2mm; padding: 0; }
    .content section > ul li { margin: 0.5mm 0; line-height: 1.34; color: #2f3745; font-size: 3.7mm; }
    .subsection { margin-top: 1.7mm; }
    .subsection h3 { margin: 0 0 0.8mm; font-size: 4.1mm; letter-spacing: 0; text-transform: none; }
    .subsection ul { margin: 0.4mm 0 0 4.2mm; padding: 0; }
    .subsection li { margin: 0.4mm 0; color: #2f3745; font-size: 3.65mm; }
  </style>
</head>
<body>
  <div class="page">
    <aside class="sidebar">
      ${
        showPhoto
          ? `<div class="profile ${photoMode === "on-original" ? "profile-original" : ""}">
        <div class="avatar-wrap ${photoModeClass}">
          ${
            photoUrl
              ? `<img src="${escapeHtml(photoUrl)}" alt="Profile photo" />`
              : `<div class="avatar-fallback"><i class="fa-solid fa-user"></i></div>`
          }
        </div>
      </div>`
          : ""
      }
      ${
        personalDetailsHtml
          ? `<section><h3>${escapeHtml(label(labels, "sections.personal_details", "Personal details"))}</h3><ul class="personal-list">${personalDetailsHtml}</ul></section>`
          : ""
      }
      ${
        interestsHtml
          ? `<section><h3>${escapeHtml(label(labels, "sections.interests", "Interests"))}</h3><ul class="sq-list">${interestsHtml}</ul></section>`
          : ""
      }
      ${
        languageRows
          ? `<section><h3>${escapeHtml(label(labels, "sections.languages", "Languages"))}</h3><ul class="star-list">${languageRows}</ul></section>`
          : ""
      }
    </aside>
    <main class="content">
      ${titleName ? `<h1 class="name">${escapeHtml(titleName)}</h1>` : ""}
      ${summaryText ? `<p class="summary">${escapeHtml(summaryText)}</p>` : ""}
      <hr class="intro-divider" />
      ${timelineSectionHtml(label(labels, "sections.work_experience", "Work experience"), "fa-briefcase", experienceItems)}
      ${timelineSectionHtml(label(labels, "sections.education", "Education and Qualifications"), "fa-graduation-cap", educationItems)}
      ${
        skillRows
          ? `<section><h2><span class="section-icon"><i class="fa-solid fa-screwdriver-wrench"></i></span>${escapeHtml(label(labels, "sections.skills", "Skills"))}</h2><ul class="star-list">${skillRows}</ul></section>`
          : ""
      }
      ${timelineSectionHtml(label(labels, "sections.references", "References"), "fa-id-badge", referencesItems)}
      ${optionalCourses}
      ${optionalProjects}
      ${optionalAwards}
      ${optionalVolunteering}
      ${optionalPatents}
      ${optionalPortfolio}
      ${competenciesSection}
    </main>
  </div>
</body>
</html>`;
}

function languageLevelLabel(value: unknown, labels: Record<string, unknown>): string {
  const normalized = String(value ?? "").trim().toUpperCase();
  if (normalized === "NATIVE" || normalized === "C2") {
    return label(labels, "language_levels.native", "Native speaker");
  }
  if (normalized === "C1") {
    return label(labels, "language_levels.very_good", "Very good command");
  }
  if (normalized === "B2" || normalized === "B1") {
    return label(labels, "language_levels.working", "Working knowledge");
  }
  if (normalized === "A2" || normalized === "A1") {
    return label(labels, "language_levels.basic", "Basic understanding");
  }
  return normalized || label(labels, "language_levels.working", "Working knowledge");
}

function skillBarPercent(index: number): number {
  if (index <= 0) return 84;
  if (index === 1) return 74;
  if (index === 2) return 64;
  if (index === 3) return 54;
  return 48;
}

function cambridgeLanguageDotCount(value: unknown): number {
  const fiveScale = languageDotCount(value);
  const converted = Math.round((fiveScale / 5) * 4);
  return Math.max(1, Math.min(4, converted));
}

function renderCambridge(
  cv: CvDocument,
  template: TemplateFile,
  slots: Record<string, unknown>,
  labels: Record<string, unknown>,
  theme: CambridgeThemePalette,
): string {
  const margins = resolveMargins(template);
  const experienceDateMode = template.date_display?.experience ?? "year";
  const educationDateMode = template.date_display?.education ?? "year";
  const presentLabel = label(labels, "common.present", "present");

  const fullName = String(
    slots["person.full_name"] ?? getByPath(cv, "person.full_name") ?? "",
  ).trim();
  const summaryText = textList(
    slots["positioning.profile_summary"] ??
      getByPath(cv, "positioning.profile_summary"),
  ).join(" ");

  const person = asRecord(getByPath(cv, "person")) ?? {};
  const residence = asRecord(getByPath(cv, "person.residence")) ?? {};
  const contact =
    asRecord(slots["contact.block"] ?? getByPath(cv, "person.contact")) ?? {};

  const personalRows = [
    {
      label: label(labels, "contact_labels.name", "Name"),
      value: String(person.full_name ?? fullName ?? "").trim(),
    },
    {
      label: label(labels, "contact_labels.address", "Address"),
      value: [residence.street, residence.city, residence.country]
        .filter(Boolean)
        .map(String)
        .join(", "),
    },
    {
      label: label(labels, "contact_labels.phone", "Phone number"),
      value: String(contact.phone_e164 ?? contact.phone_local ?? "").trim(),
    },
    {
      label: label(labels, "contact_labels.email", "Email address"),
      value: String(contact.email ?? "").trim(),
    },
    {
      label: label(labels, "contact_labels.driving_license", "Driving license"),
      value: String(contact.driving_license ?? "").trim(),
    },
    {
      label: label(labels, "contact_labels.linkedin", "LinkedIn"),
      value:
        normalizeProfileLink(contact.linkedin, "linkedin")?.display ??
        String(contact.linkedin ?? "").trim(),
    },
    {
      label: label(labels, "contact_labels.github", "GitHub"),
      value:
        normalizeProfileLink(contact.github, "github")?.display ??
        String(contact.github ?? "").trim(),
    },
  ].filter((row) => row.value.length > 0);

  const interests = textList(
    slots["optional.interests"] ?? getByPath(cv, "optional_sections.interests"),
  );
  const languages = Array.isArray(
    slots["skills.languages"] ?? getByPath(cv, "skills.languages"),
  )
    ? (slots["skills.languages"] ?? getByPath(cv, "skills.languages"))
    : [];
  const technicalSkills = textList(
    slots["skills.technical"] ?? getByPath(cv, "skills.technical"),
  );
  const experiences = Array.isArray(
    slots["experience.items"] ?? getByPath(cv, "experience"),
  )
    ? (slots["experience.items"] ?? getByPath(cv, "experience"))
    : [];
  const education = Array.isArray(
    slots["education.items"] ?? getByPath(cv, "education"),
  )
    ? (slots["education.items"] ?? getByPath(cv, "education"))
    : [];
  const referencesRaw =
    slots["references.items"] ?? getByPath(cv, "references");
  const references = Array.isArray(referencesRaw) ? referencesRaw : [];
  const optionalCourses = renderSimpleList(
    label(labels, "sections.courses", "Courses"),
    slots["optional.courses"] ??
      getByPath(cv, "optional_sections.certifications"),
  );
  const optionalProjects = renderSimpleList(
    label(labels, "sections.projects", "Projects"),
    getByPath(cv, "optional_sections.projects"),
  );
  const optionalAwards = renderSimpleList(
    label(labels, "sections.awards", "Awards"),
    getByPath(cv, "optional_sections.awards"),
  );
  const optionalVolunteering = renderSimpleList(
    label(labels, "sections.volunteering", "Volunteering"),
    getByPath(cv, "optional_sections.volunteering"),
  );
  const optionalPatents = renderSimpleList(
    label(labels, "sections.patents", "Patents"),
    getByPath(cv, "optional_sections.patents"),
  );
  const optionalPortfolio = renderSimpleList(
    label(labels, "sections.portfolio_links", "Portfolio Links"),
    getByPath(cv, "optional_sections.portfolio_links"),
  );
  const competenciesSection = renderEdinburghCompetenciesSection(labels, cv);

  const personalHtml = personalRows
    .map(
      (row) =>
        `<li><strong>${escapeHtml(row.label)}</strong><span>${escapeHtml(row.value)}</span></li>`,
    )
    .join("");
  const interestsHtml = interests.join(", ");
  const languageHtml = (languages as unknown[])
    .map((entry) => {
      const record = asRecord(entry);
      if (!record) return "";
      const score = cambridgeLanguageDotCount(record.proficiency_cefr);
      const dots = Array.from({ length: 4 })
        .map(
          (_, idx) =>
            `<span class="dot ${idx < score ? "on" : ""}"></span>`,
        )
        .join("");
      return `<li><span class="label">${escapeHtml(record.language ?? "")}</span><span class="dots">${dots}</span></li>`;
    })
    .join("");

  const workHtml = (experiences as unknown[])
    .map((entry) => {
      const record = asRecord(entry);
      if (!record) return "";
      const range = formatRange(
        record.start_date,
        record.end_date,
        record.is_current,
        experienceDateMode,
        presentLabel,
      );
      const orgLine = [
        String(record.employer ?? "").trim(),
        String(asRecord(record.location)?.city ?? "").trim(),
      ]
        .filter(Boolean)
        .join(", ");
      const bullets = textList(record.responsibilities)
        .map((item) => `<li>${escapeHtml(item)}</li>`)
        .join("");
      const summaryLine = textList(record.summary).join(" ");
      const productLines = toProductLines(record.products);
      const publicationLinks = toPublicationLinks(record.publication_links);
      const productsHtml = productLines.length
        ? `<div class="product-subsection"><p class="product-title">${escapeHtml(label(labels, "sections.worked_on_projects", "Worked on projects"))}</p><ul class="product-list">${productLines.map((line) => `<li>${escapeHtml(line)}</li>`).join("")}</ul></div>`
        : "";
      const publicationLinksHtml = publicationLinks.length
        ? `<div class="publication-links-subsection"><p class="publication-links-title">${escapeHtml(label(labels, "sections.publication_links", "Publication links"))}</p><ul class="publication-links-list">${publicationLinks.map((item) => `<li><a href="${escapeHtml(item.href)}" target="_blank" rel="noopener noreferrer">${escapeHtml(item.title)}</a></li>`).join("")}</ul></div>`
        : "";
      return `<article class="dated-entry">
        <div class="date-col">${escapeHtml(range)}</div>
        <div class="entry-body">
          <h3>${escapeHtml(record.role ?? "")}</h3>
          ${orgLine ? `<p class="meta">${escapeHtml(orgLine)}</p>` : ""}
          ${summaryLine ? `<p>${escapeHtml(summaryLine)}</p>` : ""}
          ${bullets ? `<ul>${bullets}</ul>` : ""}
          ${productsHtml}
          ${publicationLinksHtml}
        </div>
      </article>`;
    })
    .join("");

  const educationHtml = (education as unknown[])
    .map((entry) => {
      const record = asRecord(entry);
      if (!record) return "";
      const range = formatRange(
        record.start_date,
        record.end_date,
        false,
        educationDateMode,
        presentLabel,
      );
      const detail = textList(record.subjects).join(", ");
      return `<article class="dated-entry">
        <div class="date-col">${escapeHtml(range)}</div>
        <div class="entry-body">
          <h3>${escapeHtml(record.degree ?? "")}</h3>
          <p class="meta">${escapeHtml(String(record.institution ?? ""))}</p>
          ${detail ? `<p>${escapeHtml(detail)}</p>` : ""}
        </div>
      </article>`;
    })
    .join("");

  const skillsHtml = technicalSkills
    .map((entry, index) => {
      const score = skillDotCount(index);
      const dots = Array.from({ length: 5 })
        .map(
          (_, idx) =>
            `<span class="dot ${idx < score ? "on" : ""}"></span>`,
        )
        .join("");
      return `<li><span class="label">${escapeHtml(entry)}</span><span class="dots">${dots}</span></li>`;
    })
    .join("");

  const refsHtml = (references as unknown[])
    .map((entry) => {
      const record = asRecord(entry);
      if (!record) return "";
      return `<article class="reference-entry">
        ${record.organization ? `<p class="reference-orgline">${escapeHtml(String(record.organization))}</p>` : ""}
        <h3>${escapeHtml(String(record.name ?? ""))}</h3>
        ${record.role ? `<p class="reference-role">${escapeHtml(String(record.role))}</p>` : ""}
        ${record.phone ? `<p class="meta">${escapeHtml(String(record.phone))}</p>` : ""}
        ${record.email ? `<p>${escapeHtml(String(record.email))}</p>` : ""}
      </article>`;
    })
    .join("");

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    @page { size: A4; margin: ${margins.top}mm ${margins.right}mm ${margins.bottom}mm ${margins.left}mm; }
    * { box-sizing: border-box; }
    body { margin: 0; font-family: "IBM Plex Sans", Arial, sans-serif; color: ${theme.text}; font-size: 11.4px; line-height: 1.42; }
    .page { width: 100%; min-height: calc(297mm - ${margins.top + margins.bottom}mm); background: ${theme.panel}; }
    .header { background: ${theme.accent}; color: #fff; padding: 5mm 6.6mm; }
    .header h1 { margin: 0; font-size: 10.5mm; font-weight: 700; line-height: 1.05; letter-spacing: 0.02em; }
    .main { display: grid; grid-template-columns: 31% 69%; min-height: calc(297mm - ${margins.top + margins.bottom}mm - 20mm); }
    .sidebar { padding: 5.6mm 5.2mm 7mm; background: ${theme.panel}; }
    .content { padding: 5.6mm 6.2mm 7mm; background: ${theme.contentPanel}; }

    .sidebar section { margin-bottom: 5.3mm; }
    .sidebar h2,
    .content h2 {
      margin: 0 0 2.2mm;
      font-size: 5.05mm;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      font-weight: 700;
      color: ${theme.text};
      display: flex;
      align-items: center;
      gap: 2.2mm;
    }
    .content h2::after {
      content: "";
      flex: 1;
      border-top: 0.24mm solid #c8cdd3;
      margin-top: 0.3mm;
    }
    .sidebar ul { list-style: none; margin: 0; padding: 0; }
    .sidebar li { margin: 1.7mm 0; }
    .sidebar li strong { display: block; margin-bottom: 0.2mm; font-size: 3.8mm; font-weight: 700; }
    .sidebar li span { font-size: 3.65mm; color: ${theme.muted}; line-height: 1.28; }

    .interests-text { margin: 0; color: ${theme.muted}; font-size: 4mm; line-height: 1.35; }
    .rated-list li { display: flex; justify-content: space-between; align-items: center; gap: 3mm; margin: 1.6mm 0; }
    .rated-list .label { font-size: 3.9mm; font-weight: 600; }
    .dots { display: inline-flex; gap: 1.6mm; }
    .dot { width: 2.2mm; height: 2.2mm; border-radius: 999px; background: ${theme.dotOff}; display: inline-block; }
    .dot.on { background: ${theme.dotOn}; }

    .summary { margin: 0 0 3.6mm; color: #343d49; font-size: 4.15mm; line-height: 1.45; }
    .content section { margin-bottom: 5.6mm; }
    .dated-list { position: relative; padding-left: 0; }
    .dated-list::before { content: ""; position: absolute; left: -1.1mm; top: 0.6mm; bottom: 0.6mm; width: 0.22mm; background: ${theme.rail}; }
    .dated-entry {
      position: relative;
      display: grid;
      grid-template-columns: 28mm 1fr;
      column-gap: 4.3mm;
      margin-bottom: 3.3mm;
      align-items: center;
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .dated-entry::before {
      content: "";
      position: absolute;
      left: -1.1mm;
      top: 50%;
      transform: translateY(-50%);
      width: 3.2mm;
      border-top: 0.22mm solid ${theme.rail};
    }
    .date-col { font-size: 3.85mm; color: #2d3845; padding-left: 3.8mm; white-space: nowrap; }
    .entry-body h3 { margin: 0; font-size: 4.9mm; line-height: 1.17; color: #242d37; }
    .entry-body .meta { margin: 0.5mm 0 0.95mm; font-style: italic; color: ${theme.muted}; font-size: 4.05mm; }
    .entry-body p { margin: 0.6mm 0 0; font-size: 3.9mm; color: ${theme.muted}; line-height: 1.38; }
    .entry-body ul { margin: 0.8mm 0 0 4.2mm; padding: 0; }
    .entry-body li { margin: 0.45mm 0; font-size: 3.86mm; line-height: 1.34; }
    .entry-body .product-subsection { margin-top: 1.1mm; }
    .entry-body .product-title { margin: 0 0 0.5mm; font-weight: 700; font-size: 3.7mm; color: #2f3745; }
    .entry-body .product-list { margin: 0; padding-left: 4.2mm; }
    .entry-body .product-list li { margin: 0.35mm 0; }
    .entry-body .publication-links-subsection { margin-top: 1.1mm; }
    .entry-body .publication-links-title { margin: 0 0 0.5mm; font-weight: 700; font-size: 3.7mm; color: #2f3745; }
    .entry-body .publication-links-list { margin: 0; padding-left: 4.2mm; }
    .entry-body .publication-links-list li { margin: 0.35mm 0; }
    .entry-body .publication-links-list a { color: ${theme.dotOn}; text-decoration: none; border-bottom: 0.2mm solid rgba(0,0,0,0.15); }
    .entry-body .publication-links-list a:hover { border-bottom-color: ${theme.dotOn}; }

    .skill-list { list-style: none; margin: 0; padding: 0; }
    .skill-list li { display: flex; justify-content: space-between; align-items: center; gap: 3.6mm; margin: 1.8mm 0; }
    .skill-list .label { font-size: 4.2mm; font-weight: 600; color: #2a3441; }
    .reference-entry {
      margin: 0.7mm 0 2.2mm;
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .reference-orgline { margin: 0 0 0.4mm; font-size: 3.85mm; color: #2d3845; font-weight: 500; }
    .reference-entry h3 { margin: 0; font-size: 4.9mm; line-height: 1.17; color: #242d37; }
    .reference-role { margin: 0.45mm 0 0.25mm; font-style: italic; color: ${theme.muted}; font-size: 4.05mm; }
    .reference-entry .meta { margin: 0.35mm 0 0.15mm; font-style: italic; color: ${theme.muted}; font-size: 4.05mm; }
    .reference-entry p { margin: 0.35mm 0 0; font-size: 3.9mm; color: ${theme.muted}; line-height: 1.36; }

    .content section > ul { margin: 0.8mm 0 0 4.2mm; padding: 0; }
    .content section > ul li { margin: 0.45mm 0; font-size: 3.85mm; color: ${theme.muted}; }
    .subsection { margin-top: 1.7mm; }
    .subsection h3 { margin: 0 0 0.7mm; font-size: 4mm; font-weight: 700; text-transform: none; letter-spacing: 0; color: ${theme.text}; }
    .subsection ul { margin: 0.35mm 0 0 4.2mm; padding: 0; }
    .subsection li { margin: 0.35mm 0; font-size: 3.8mm; color: #2f3946; }
  </style>
</head>
<body>
  <div class="page">
    <header class="header"><h1>${escapeHtml(label(labels, "common.curriculum_vitae", "Curriculum Vitae"))}</h1></header>
    <div class="main">
      <aside class="sidebar">
        ${personalHtml ? `<section><h2>${escapeHtml(label(labels, "sections.personal_details", "Personal details"))}</h2><ul>${personalHtml}</ul></section>` : ""}
        ${interestsHtml ? `<section><h2>${escapeHtml(label(labels, "sections.interests", "Interests"))}</h2><p class="interests-text">${escapeHtml(interestsHtml)}</p></section>` : ""}
        ${languageHtml ? `<section><h2>${escapeHtml(label(labels, "sections.languages", "Languages"))}</h2><ul class="rated-list">${languageHtml}</ul></section>` : ""}
      </aside>
      <main class="content">
        ${summaryText ? `<section><p class="summary">${escapeHtml(summaryText)}</p></section>` : ""}
        ${workHtml ? `<section><h2>${escapeHtml(label(labels, "sections.work_experience", "Work experience"))}</h2><div class="dated-list">${workHtml}</div></section>` : ""}
        ${educationHtml ? `<section><h2>${escapeHtml(label(labels, "sections.education", "Education and Qualifications"))}</h2><div class="dated-list">${educationHtml}</div></section>` : ""}
        ${skillsHtml ? `<section><h2>${escapeHtml(label(labels, "sections.skills", "Skills"))}</h2><ul class="skill-list">${skillsHtml}</ul></section>` : ""}
        ${refsHtml ? `<section><h2>${escapeHtml(label(labels, "sections.references", "References"))}</h2>${refsHtml}</section>` : ""}
        ${optionalCourses}
        ${optionalProjects}
        ${optionalAwards}
        ${optionalVolunteering}
        ${optionalPatents}
        ${optionalPortfolio}
        ${competenciesSection}
      </main>
    </div>
  </div>
</body>
</html>`;
}

function renderStanford(
  cv: CvDocument,
  template: TemplateFile,
  slots: Record<string, unknown>,
  labels: Record<string, unknown>,
  theme: StanfordThemePalette,
  photoModeInput?: string,
): string {
  const margins = resolveMargins(template);
  const experienceDateMode = template.date_display?.experience ?? "year";
  const educationDateMode = template.date_display?.education ?? "year";
  const presentLabel = label(labels, "common.present", "present");
  const fullName = String(slots["person.full_name"] ?? getByPath(cv, "person.full_name") ?? "").trim();
  const titleName = formatName(fullName, "first-last");
  const summaryText = textList(slots["positioning.profile_summary"] ?? getByPath(cv, "positioning.profile_summary")).join(" ");
  const photoValue = slots["profile.photo"];
  const photoUrl = typeof photoValue === "string" ? photoValue.trim() : "";
  const photoMode = normalizePhotoMode(photoModeInput);
  const showPhoto = shouldRenderPhoto(true, photoMode);
  const photoModeClass = resolvePhotoClass(photoMode);

  const person = asRecord(getByPath(cv, "person")) ?? {};
  const residence = asRecord(getByPath(cv, "person.residence")) ?? {};
  const contact = asRecord(slots["contact.block"] ?? getByPath(cv, "person.contact")) ?? {};
  const personalRows = [
    { label: label(labels, "contact_labels.name", "Name"), value: String(person.full_name ?? fullName ?? "").trim() },
    {
      label: label(labels, "contact_labels.address", "Address"),
      value: [residence.street, residence.city, residence.country].filter(Boolean).map(String).join(", "),
    },
    { label: label(labels, "contact_labels.phone", "Phone number"), value: String(contact.phone_e164 ?? contact.phone_local ?? "").trim() },
    { label: label(labels, "contact_labels.email", "Email address"), value: String(contact.email ?? "").trim() },
    { label: label(labels, "contact_labels.driving_license", "Driving license"), value: String(contact.driving_license ?? "").trim() },
    {
      label: label(labels, "contact_labels.linkedin", "LinkedIn"),
      value:
        normalizeProfileLink(contact.linkedin, "linkedin")?.display ??
        String(contact.linkedin ?? "").trim(),
    },
    {
      label: label(labels, "contact_labels.github", "GitHub"),
      value:
        normalizeProfileLink(contact.github, "github")?.display ??
        String(contact.github ?? "").trim(),
    },
  ].filter((row) => row.value.length > 0);

  const interests = textList(slots["optional.interests"] ?? getByPath(cv, "optional_sections.interests"));
  const languages = Array.isArray(slots["skills.languages"] ?? getByPath(cv, "skills.languages"))
    ? (slots["skills.languages"] ?? getByPath(cv, "skills.languages"))
    : [];
  const technicalSkills = textList(slots["skills.technical"] ?? getByPath(cv, "skills.technical"));
  const experiences = Array.isArray(slots["experience.items"] ?? getByPath(cv, "experience"))
    ? (slots["experience.items"] ?? getByPath(cv, "experience"))
    : [];
  const education = Array.isArray(slots["education.items"] ?? getByPath(cv, "education"))
    ? (slots["education.items"] ?? getByPath(cv, "education"))
    : [];
  const referencesRaw = slots["references.items"] ?? getByPath(cv, "references");
  const references = Array.isArray(referencesRaw) ? referencesRaw : [];
  const optionalCourses = renderSimpleList(
    label(labels, "sections.courses", "Courses"),
    slots["optional.courses"] ??
      getByPath(cv, "optional_sections.certifications"),
  );
  const optionalProjects = renderSimpleList(
    label(labels, "sections.projects", "Projects"),
    getByPath(cv, "optional_sections.projects"),
  );
  const optionalAwards = renderSimpleList(
    label(labels, "sections.awards", "Awards"),
    getByPath(cv, "optional_sections.awards"),
  );
  const optionalVolunteering = renderSimpleList(
    label(labels, "sections.volunteering", "Volunteering"),
    getByPath(cv, "optional_sections.volunteering"),
  );
  const optionalPatents = renderSimpleList(
    label(labels, "sections.patents", "Patents"),
    getByPath(cv, "optional_sections.patents"),
  );
  const optionalPortfolio = renderSimpleList(
    label(labels, "sections.portfolio_links", "Portfolio Links"),
    getByPath(cv, "optional_sections.portfolio_links"),
  );
  const competenciesSection = renderEdinburghCompetenciesSection(labels, cv);

  const personalHtml = personalRows
    .map((row) => `<li><strong>${escapeHtml(row.label)}</strong><span>${escapeHtml(row.value)}</span></li>`)
    .join("");
  const interestsHtml = interests.map((entry) => `<li>${escapeHtml(entry)}</li>`).join("");
  const languageHtml = (languages as unknown[])
    .map((entry) => {
      const record = asRecord(entry);
      if (!record) return "";
      return `<li><span class="lname">${escapeHtml(record.language ?? "")}</span><span class="llevel">${escapeHtml(languageLevelLabel(record.proficiency_cefr, labels))}</span></li>`;
    })
    .join("");

  const workHtml = (experiences as unknown[])
    .map((entry) => {
      const record = asRecord(entry);
      if (!record) return "";
      const range = formatRange(record.start_date, record.end_date, record.is_current, experienceDateMode, presentLabel);
      const orgLine = [String(record.employer ?? "").trim(), String(asRecord(record.location)?.city ?? "").trim()]
        .filter(Boolean)
        .join(", ");
      const bullets = textList(record.responsibilities).map((item) => `<li>${escapeHtml(item)}</li>`).join("");
      const body = bullets ? `<ul>${bullets}</ul>` : `<p>${escapeHtml(textList(record.summary).join(" "))}</p>`;
      const productLines = toProductLines(record.products);
      const publicationLinks = toPublicationLinks(record.publication_links);
      const productsHtml = productLines.length
        ? `<div class="product-subsection"><p class="product-title">${escapeHtml(label(labels, "sections.worked_on_projects", "Worked on projects"))}</p><ul class="product-list">${productLines.map((line) => `<li>${escapeHtml(line)}</li>`).join("")}</ul></div>`
        : "";
      const publicationLinksHtml = publicationLinks.length
        ? `<div class="publication-links-subsection"><p class="publication-links-title">${escapeHtml(label(labels, "sections.publication_links", "Publication links"))}</p><ul class="publication-links-list">${publicationLinks.map((item) => `<li><a href="${escapeHtml(item.href)}" target="_blank" rel="noopener noreferrer">${escapeHtml(item.title)}</a></li>`).join("")}</ul></div>`
        : "";
      return `<article class="entry"><div class="entry-head"><h3>${escapeHtml(record.role ?? "")}</h3>${range ? `<span class="date">${escapeHtml(range)}</span>` : ""}</div><p class="meta">${escapeHtml(orgLine)}</p>${body}${productsHtml}${publicationLinksHtml}</article>`;
    })
    .join("");

  const educationHtml = (education as unknown[])
    .map((entry) => {
      const record = asRecord(entry);
      if (!record) return "";
      const range = formatRange(record.start_date, record.end_date, false, educationDateMode, presentLabel);
      const detail = textList(record.subjects).join(", ");
      return `<article class="entry"><div class="entry-head"><h3>${escapeHtml(record.degree ?? "")}</h3>${range ? `<span class="date">${escapeHtml(range)}</span>` : ""}</div><p class="meta">${escapeHtml(String(record.institution ?? ""))}</p>${detail ? `<p>${escapeHtml(detail)}</p>` : ""}</article>`;
    })
    .join("");

  const skillsHtml = technicalSkills
    .map((entry, index) => `<div class="skill"><span class="skill-name">${escapeHtml(entry)}</span><div class="bar"><div class="fill" style="width:${skillBarPercent(index)}%"></div></div></div>`)
    .join("");

  const referenceItem = asRecord(references[0]);
  const refsHtml = referenceItem
    ? `<article class="reference"><div class="reference-head"><h3>${escapeHtml(String(referenceItem.name ?? ""))}</h3><span class="reference-org">${escapeHtml(String(referenceItem.organization ?? ""))}</span></div>${referenceItem.phone ? `<p>${escapeHtml(String(referenceItem.phone ?? ""))}</p>` : ""}${referenceItem.email ? `<p>${escapeHtml(String(referenceItem.email ?? ""))}</p>` : ""}</article>`
    : "";

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    @page { size: A4; margin: ${margins.top}mm ${margins.right}mm ${margins.bottom}mm ${margins.left}mm; }
    * { box-sizing: border-box; }
    body { margin: 0; font-family: "Lato", "Helvetica Neue", Arial, sans-serif; color: #242d37; font-size: 11.5px; line-height: 1.44; }
    .page { width: 100%; min-height: calc(297mm - ${margins.top + margins.bottom}mm); display: grid; grid-template-columns: 31.5% 68.5%; background: #f3f4f6; }
    .sidebar { background: ${theme.sidebar}; color: ${theme.sidebarText}; padding: 8.2mm 7mm; }
    .content { background: #fff; padding: 8.4mm 7.8mm 8mm; }

    .profile { text-align: left; margin-bottom: 7.2mm; min-height: 44mm; display: flex; align-items: center; justify-content: center; }
    .profile.profile-original { align-items: flex-end; }
    .avatar-wrap { width: 41mm; height: 41mm; margin: 0 auto; border-radius: 50%; overflow: hidden; border: 0.7mm solid rgba(255,255,255,0.85); box-shadow: 0 2px 10px rgba(0,0,0,0.22); }
    .avatar-wrap img { width: 100%; height: 100%; object-fit: cover; display: block; }
    .avatar-fallback { width: 100%; height: 100%; display:flex; align-items:center; justify-content:center; font-size: 13mm; color: ${theme.sidebarMuted}; background: rgba(0,0,0,0.2); }
    .avatar-wrap.photo-force-circle { border-radius: 999px; }
    .avatar-wrap.photo-force-square { border-radius: 0; }
    .avatar-wrap.photo-force-original { height: auto; border-radius: 0; }
    .avatar-wrap.photo-force-original img { width: 100%; height: auto; max-height: 41mm; object-fit: contain; }
    .avatar-wrap.photo-force-original .avatar-fallback { width: 100%; aspect-ratio: 3 / 4; height: auto; border-radius: 0; }

    .sidebar h2 { margin: 0 0 2.2mm; padding-bottom: 1.4mm; font-size: 4.05mm; font-weight: 700; text-transform: none; border-bottom: none; letter-spacing: 0; position: relative; }
    .sidebar h2::after { content: ""; display: block; width: calc(100% + 7mm); margin-top: 1.4mm; border-top: 0.25mm solid #ffffff; }
    .sidebar section { margin-bottom: 5.4mm; padding-right: 0; }
    .sidebar ul { list-style: none; margin: 0; padding: 0; }
    .sidebar li { margin: 1.5mm 0; }
    .sidebar li strong { display: block; font-size: 3.2mm; margin-bottom: 0.28mm; color: ${theme.sidebarText}; font-weight: 700; }
    .sidebar li span { color: ${theme.sidebarMuted}; font-size: 3.03mm; line-height: 1.32; }
    .languages li { display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: baseline; column-gap: 2mm; }
    .languages .lname { color: ${theme.sidebarText}; font-weight: 700; font-size: 3.22mm; }
    .languages .llevel { color: ${theme.sidebarMuted}; font-size: 3.04mm; white-space: nowrap; }

    .name { margin: 0 0 4.2mm; font-size: 8.1mm; line-height: 1.06; font-weight: 500; letter-spacing: 0.01em; color: #1f2731; }
    .name-divider { border: 0; border-top: 0.24mm solid #d7dce2; margin: 0 0 4.2mm; }
    .summary { margin: 0 0 4.1mm; color: #3c4551; line-height: 1.46; font-size: 3.56mm; }
    .intro-divider { border: none; border-top: 0.26mm solid #d5dae0; margin: 0 0 4.6mm; }
    .content section { margin-bottom: 5.1mm; }
    .content h2 { margin: 0 0 2.1mm; padding-bottom: 1.7mm; font-size: 5.1mm; line-height: 1.12; font-weight: 700; text-transform: none; letter-spacing: 0; border-bottom: 0.24mm solid #d7dce2; color: #222c38; }
    .work-section h2 { border-bottom: none; padding-bottom: 0; margin-bottom: 2.6mm; }
    .work-section { border-bottom: 0.24mm solid #d7dce2; padding-bottom: 2.4mm; margin-bottom: 4.2mm; }
    .work-section .section-divider { border-top: 0.24mm solid #d7dce2; margin: 0 0 2.8mm; }

    .entry { margin-bottom: 3.4mm; }
    .entry-head { display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: baseline; column-gap: 3mm; }
    .entry h3 { margin: 0; font-size: 4.68mm; line-height: 1.2; font-weight: 700; color: #222c38; }
    .date { font-weight: 400; color: #303a47; font-size: 3.6mm; white-space: nowrap; text-align: right; }
    .meta { margin: 0.6mm 0 0.9mm; color: #515c6a; font-style: italic; font-size: 3.72mm; }
    .entry p { margin: 0.7mm 0 0; color: #3a4452; font-size: 3.5mm; }
    .entry ul { margin: 0.6mm 0 0 4.1mm; padding: 0; }
    .entry li { margin: 0.35mm 0; font-size: 3.5mm; }
    .entry .product-subsection { margin-top: 1.1mm; }
    .entry .product-title { margin: 0 0 0.45mm; font-weight: 700; font-size: 3.45mm; color: #2f3745; }
    .entry .product-list { margin: 0; padding-left: 4.1mm; }
    .entry .product-list li { margin: 0.3mm 0; }
    .entry .publication-links-subsection { margin-top: 1.05mm; }
    .entry .publication-links-title { margin: 0 0 0.45mm; font-weight: 700; font-size: 3.45mm; color: #2f3745; }
    .entry .publication-links-list { margin: 0; padding-left: 4.1mm; }
    .entry .publication-links-list li { margin: 0.3mm 0; }
    .entry .publication-links-list a { color: #49566a; text-decoration: none; border-bottom: 0.2mm solid rgba(0,0,0,0.14); }
    .entry .publication-links-list a:hover { border-bottom-color: #49566a; }

    .skill { display: grid; grid-template-columns: minmax(0, 1fr) 37mm; align-items: center; gap: 4.6mm; margin-bottom: 3mm; }
    .skill-name { font-size: 4.02mm; font-weight: 700; color: #26303c; }
    .bar { height: 1.72mm; background: ${theme.barTrack}; border-radius: 99px; overflow: hidden; }
    .fill { height: 100%; background: ${theme.barFill}; border-radius: 99px; }

    .reference { margin-top: 0.4mm; }
    .reference-head { display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: baseline; column-gap: 2.4mm; margin-bottom: 0.8mm; }
    .reference h3 { margin: 0; font-size: 4.5mm; color: #222c38; }
    .reference-org { color: #444f5e; font-size: 3.9mm; }
    .reference p { margin: 0.35mm 0; font-style: italic; color: #3b4552; }
    .content section > ul { margin: 0.8mm 0 0 4.1mm; padding: 0; }
    .content section > ul li { margin: 0.35mm 0; font-size: 3.5mm; color: #3a4452; }
    .subsection { margin-top: 1.6mm; }
    .subsection h3 { margin: 0 0 0.7mm; font-size: 4.05mm; font-weight: 700; color: #222c38; text-transform: none; letter-spacing: 0; }
    .subsection ul { margin: 0.35mm 0 0 4.1mm; padding: 0; }
    .subsection li { margin: 0.3mm 0; font-size: 3.48mm; color: #3a4452; }
  </style>
</head>
<body>
  <div class="page">
    <aside class="sidebar">
      ${
        showPhoto
          ? `<div class="profile ${photoMode === "on-original" ? "profile-original" : ""}">
        <div class="avatar-wrap ${photoModeClass}">
          ${
            photoUrl
              ? `<img src="${escapeHtml(photoUrl)}" alt="Profile photo" />`
              : `<div class="avatar-fallback">👤</div>`
          }
        </div>
      </div>`
          : ""
      }
      ${personalHtml ? `<section><h2>${escapeHtml(label(labels, "sections.personal_details", "Personal details"))}</h2><ul>${personalHtml}</ul></section>` : ""}
      ${interestsHtml ? `<section><h2>${escapeHtml(label(labels, "sections.interests", "Interests"))}</h2><ul>${interestsHtml}</ul></section>` : ""}
      ${languageHtml ? `<section><h2>${escapeHtml(label(labels, "sections.languages", "Languages"))}</h2><ul class="languages">${languageHtml}</ul></section>` : ""}
    </aside>
    <main class="content">
      ${titleName ? `<h1 class="name">${escapeHtml(titleName)}</h1>` : ""}
      ${titleName ? `<hr class="name-divider" />` : ""}
      ${summaryText ? `<section class="summary"><p>${escapeHtml(summaryText)}</p></section>` : ""}
      ${workHtml ? `<section class="work-section"><h2>${escapeHtml(label(labels, "sections.work_experience", "Work experience"))}</h2><div class="section-divider"></div>${workHtml}</section>` : ""}
      ${educationHtml ? `<section><h2>${escapeHtml(label(labels, "sections.education", "Education and Qualifications"))}</h2>${educationHtml}</section>` : ""}
      ${skillsHtml ? `<section><h2>${escapeHtml(label(labels, "sections.skills", "Skills"))}</h2>${skillsHtml}</section>` : ""}
      ${refsHtml ? `<section><h2>${escapeHtml(label(labels, "sections.references", "References"))}</h2>${refsHtml}</section>` : ""}
      ${optionalCourses}
      ${optionalProjects}
      ${optionalAwards}
      ${optionalVolunteering}
      ${optionalPatents}
      ${optionalPortfolio}
      ${competenciesSection}
    </main>
  </div>
</body>
</html>`;
}

function renderGeneric(
  cv: CvDocument,
  template: TemplateFile,
  slots: Record<string, unknown>,
  labels: Record<string, unknown>,
): string {
  const margins = resolveMargins(template);
  const experienceDateMode = template.date_display?.experience ?? "exact";
  const educationDateMode = template.date_display?.education ?? "exact";
  const name =
    slots["person.full_name"] ?? getByPath(cv, "person.full_name") ?? "";
  const headline =
    slots["positioning.headline"] ??
    getByPath(cv, "positioning.headline") ??
    "";
  const pageLabel = label(labels, "common.page", "Page");
  const presentLabel = label(labels, "common.present", "present");

  return `<!doctype html>
<html>
<head>
  <meta charset=\"utf-8\" />
  <style>
    @page { size: A4; margin: ${margins.top}mm ${margins.right}mm ${margins.bottom}mm ${margins.left}mm; }
    * { box-sizing: border-box; }
    body { margin: 0; font-family: \"IBM Plex Sans\", Arial, sans-serif; color: #202124; font-size: 12px; line-height: 1.35; }
    .page { width: 100%; min-height: calc(297mm - ${margins.top + margins.bottom}mm); display: grid; grid-template-columns: 250px 1fr; }
    .left { background: #f3f4f6; padding: 22px 18px; border-right: 1px solid #d1d5db; }
    .right { padding: 26px 30px; }
    h1 { margin: 0; font-size: 25px; }
    h2 { font-size: 21px; margin: 0 0 10px; }
    h3 { font-size: 14px; text-transform: uppercase; letter-spacing: 0.08em; margin: 0 0 8px; }
    h4 { margin: 0; font-size: 15px; }
    section { margin-bottom: 18px; }
    ul { margin: 8px 0 0 18px; padding: 0; }
    .entry { border-top: 1px solid #ddd; padding-top: 10px; margin-top: 10px; }
    .entry-head { display: flex; justify-content: space-between; gap: 10px; }
    .org { margin: 4px 0 8px; color: #5f6368; }
    .page-footer {
      position: fixed;
      right: 0;
      bottom: 0;
      left: 0;
      text-align: right;
      font-size: 10px;
      color: #5f6368;
      padding: 0 1mm 0 0;
    }
    .page-footer::after { content: \"${escapeHtml(pageLabel)} \" counter(page); }
  </style>
</head>
<body>
  <div class=\"page\">
    <aside class=\"left\">
      ${renderContact(label(labels, "sections.contact", "Contact"), slots["contact.block"] ?? getByPath(cv, "person.contact"))}
      ${renderLanguages(label(labels, "sections.languages", "Languages"), slots["skills.languages"] ?? getByPath(cv, "skills.languages"))}
      ${renderSimpleList(label(labels, "sections.technical_skills", "Technical Skills"), slots["skills.technical"] ?? getByPath(cv, "skills.technical"))}
      ${renderSimpleList(label(labels, "sections.social_skills", "Social Skills"), slots["skills.social"] ?? getByPath(cv, "skills.social"))}
    </aside>
    <main class=\"right\">
      <h1>${escapeHtml(name)}</h1>
      <p>${escapeHtml(headline)}</p>
      ${renderSimpleList(label(labels, "sections.profile", "Profile"), slots["positioning.profile_summary"] ?? getByPath(cv, "positioning.profile_summary"))}
      ${renderExperience(
        label(labels, "sections.work_experience", "Work Experience"),
        slots["experience.items"] ?? getByPath(cv, "experience"),
        experienceDateMode,
        presentLabel,
        labels,
      )}
      ${renderEducation(
        label(labels, "sections.education", "Education"),
        slots["education.items"] ?? getByPath(cv, "education"),
        educationDateMode,
        presentLabel,
      )}
      ${renderReferences(label(labels, "sections.references", "References"), slots["references.items"] ?? getByPath(cv, "references"))}
    </main>
  </div>
  <footer class=\"page-footer\"></footer>
</body>
</html>`;
}

async function readYamlFile<T>(filePath: string): Promise<T> {
  const content = await fs.readFile(filePath, "utf-8");
  return parse(content) as T;
}

async function resolveMappingPath(
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

function bindSlots(
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

export async function buildCvTemplateHtml(
  input: RenderInput,
): Promise<RenderResult> {
  const cv = await readCv(input.cvId);
  if (!cv) {
    throw new Error(`CV '${input.cvId}' was not found.`);
  }

  const templatePath = repoPath("templates", input.templateId, "template.yaml");
  const mappingPath = await resolveMappingPath(input.cvId, input.templateId);
  const [template, mapping] = await Promise.all([
    readYamlFile<TemplateFile>(templatePath),
    readYamlFile<MappingFile>(mappingPath),
  ]);

  const lang = resolveRenderLanguage(cv, input.cvId);
  const labels = template.labels?.[lang] ?? template.labels?.en ?? {};

  const slots = bindSlots(cv, mapping);
  const edinburghTheme = resolveEdinburghTheme(template, input.theme);
  const harvardTheme = resolveHarvardTheme(input.theme);
  const stanfordTheme = resolveStanfordTheme(input.theme);
  const cambridgeTheme = resolveCambridgeTheme(template, input.theme);
  const html =
    input.templateId === "edinburgh-v1"
      ? renderEdinburgh(
          cv,
          template,
          slots,
          labels,
          edinburghTheme,
          input.photoMode,
        )
      : input.templateId === "harvard-v1"
        ? renderHarvard(cv, template, slots, labels, harvardTheme, input.photoMode)
        : input.templateId === "stanford-v1"
          ? renderStanford(cv, template, slots, labels, stanfordTheme, input.photoMode)
          : input.templateId === "cambridge-v1"
            ? renderCambridge(cv, template, slots, labels, cambridgeTheme)
        : input.templateId === "europass-v1"
          ? renderEuropass(cv, template, slots, labels)
          : renderGeneric(cv, template, slots, labels);

  return {
    html,
    cvId: input.cvId,
    templateId: input.templateId,
  };
}
