/** Typical printable width budgets derived from template layout.yaml regions (A4 @ ~794px). */
export type FieldLayoutRegion = "sidebar" | "main" | "title";

export type FieldTextBudget = {
  region: FieldLayoutRegion;
  charsPerLine: number;
  /** Default character cap for “two lines” in the main content column (all templates). */
  defaultCharLimit: number;
  defaultLineLimit: number;
};

export const DEFAULT_TWO_LINE_MAIN_CHARS = 170;

const TEMPLATE_MAIN_WIDTH_PX: Record<string, number> = {
  "harvard-v1": 544,
  "stanford-v1": 544,
  "cambridge-v1": 544,
  "edinburgh-v1": 720,
  "europass-v1": 720,
  generic: 544,
};

const TEMPLATE_SIDEBAR_WIDTH_PX: Record<string, number> = {
  "harvard-v1": 250,
  "stanford-v1": 250,
  "cambridge-v1": 250,
  "edinburgh-v1": 0,
  "europass-v1": 0,
  generic: 0,
};

const AVG_CHAR_WIDTH_PX = 6.5;

/** Matches `EDITOR_FIELD_AI_INPUT_PAD_CLASS` (pr-14) — badges sit over the field, not in layout width. */
export const EDITOR_FIELD_AI_CONTENT_PAD_PX = 56;

export type FieldTextBudgetOptions = {
  /** Subtract from printable column width (e.g. AI score badge padding on inputs). */
  contentInsetPx?: number;
};

function charsPerLineForWidth(widthPx: number): number {
  return Math.max(24, Math.floor(widthPx / AVG_CHAR_WIDTH_PX));
}

export function classifyFieldLayout(pathLabel: string): FieldLayoutRegion {
  const normalized = pathLabel.toLowerCase();
  if (normalized.includes("headline")) {
    return "title";
  }
  if (
    normalized.includes("person.contact")
    || normalized.includes("skills.languages")
    || normalized.includes("optional_sections")
    || normalized.includes("interests")
    || normalized.includes("sidebar")
  ) {
    return "sidebar";
  }
  return "main";
}

export function getFieldTextBudget(
  pathLabel: string,
  templateId: string,
  options?: FieldTextBudgetOptions,
): FieldTextBudget {
  const region = classifyFieldLayout(pathLabel);
  const templateKey = templateId in TEMPLATE_MAIN_WIDTH_PX ? templateId : "generic";
  const inset = Math.max(0, options?.contentInsetPx ?? 0);
  const fullMainWidth = TEMPLATE_MAIN_WIDTH_PX[templateKey] ?? TEMPLATE_MAIN_WIDTH_PX.generic;
  const mainWidth = Math.max(160, fullMainWidth - inset);
  const sidebarRaw = TEMPLATE_SIDEBAR_WIDTH_PX[templateKey] ?? 0;
  const sidebarWidth = sidebarRaw > 0 ? Math.max(120, sidebarRaw - inset) : 0;

  const mainCharsPerLine = charsPerLineForWidth(mainWidth);
  const sidebarCharsPerLine = sidebarWidth > 0 ? charsPerLineForWidth(sidebarWidth) : mainCharsPerLine;
  const titleCharsPerLine = charsPerLineForWidth(Math.max(120, Math.min(fullMainWidth, 520) - inset));

  if (region === "sidebar") {
    return {
      region,
      charsPerLine: sidebarCharsPerLine,
      defaultCharLimit: sidebarCharsPerLine * 2,
      defaultLineLimit: 2,
    };
  }
  if (region === "title") {
    return {
      region,
      charsPerLine: titleCharsPerLine,
      defaultCharLimit: titleCharsPerLine,
      defaultLineLimit: 1,
    };
  }
  return {
    region: "main",
    charsPerLine: mainCharsPerLine,
    defaultCharLimit: DEFAULT_TWO_LINE_MAIN_CHARS,
    defaultLineLimit: 2,
  };
}

export function limitToCharacters(
  budget: FieldTextBudget,
  amount: number,
  unit: "characters" | "lines",
): number {
  if (unit === "lines") {
    return Math.max(40, Math.round(amount * budget.charsPerLine));
  }
  return Math.max(40, Math.round(amount));
}