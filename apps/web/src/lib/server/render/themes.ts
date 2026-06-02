import type {
  CambridgeThemePalette,
  EdinburghThemePalette,
  HarvardThemePalette,
  PhotoMode,
  StanfordThemePalette,
  TemplateFile,
} from "./types";

export const EDINBURGH_THEME_PRESETS: Record<string, EdinburghThemePalette> = {
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

export const HARVARD_THEME_PRESETS: Record<string, HarvardThemePalette> = {
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

export const STANFORD_THEME_PRESETS: Record<string, StanfordThemePalette> = {
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

export const CAMBRIDGE_THEME_PRESETS: Record<string, CambridgeThemePalette> = {
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

export function normalizeThemeKey(value: unknown): string {
  const raw = String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return raw || "default";
}

export function normalizePhotoMode(value: unknown): PhotoMode {
  const raw = String(value ?? "").trim().toLowerCase();
  if (raw === "on-circle") return "on-circle";
  if (raw === "on-square") return "on-square";
  if (raw === "on-original") return "on-original";
  if (raw === "off") return "off";
  return "default";
}

export function resolvePhotoClass(mode: PhotoMode): string {
  if (mode === "on-circle") return "photo-force-circle";
  if (mode === "on-square") return "photo-force-square";
  if (mode === "on-original") return "photo-force-original";
  return "";
}

export function shouldRenderPhoto(templateDefault: boolean, mode: PhotoMode): boolean {
  if (mode === "off") return false;
  if (mode === "default") return templateDefault;
  return true;
}

export function resolveEdinburghTheme(
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

export function resolveHarvardTheme(
  themeInput: string | undefined,
): HarvardThemePalette {
  const key = normalizeThemeKey(themeInput);
  return HARVARD_THEME_PRESETS[key] ?? HARVARD_THEME_PRESETS.default;
}

export function resolveStanfordTheme(
  themeInput: string | undefined,
): StanfordThemePalette {
  const key = normalizeThemeKey(themeInput);
  return STANFORD_THEME_PRESETS[key] ?? STANFORD_THEME_PRESETS.default;
}

export function resolveCambridgeTheme(
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
