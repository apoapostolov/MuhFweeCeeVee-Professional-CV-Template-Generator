export type TemplateFile = {
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
  labels?: Record<string, Record<string, unknown>>;
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

export type MappingFile = {
  bindings?: Array<{ cv_path?: string; slot_id?: string }>;
};

import type { RenderTweaks } from "./tweaks";

export type { RenderTweaks };

export type RenderInput = {
  cvId: string;
  templateId: string;
  theme?: string;
  photoMode?: string;
  profilePhotoId?: string;
  tweaks?: RenderTweaks;
};

export type PdfMetadata = {
  author: string;
  title: string;
  subject: string;
};

export type RenderResult = {
  html: string;
  cvId: string;
  templateId: string;
  metadata: PdfMetadata;
};

export type PhotoMode =
  | "default"
  | "on-circle"
  | "on-square"
  | "on-original"
  | "off";

export type EdinburghThemePalette = {
  accent: string;
  sidebarBackground: string;
  arcStroke: string;
  link: string;
  linkBorder: string;
  dotOff: string;
};

export type HarvardThemePalette = {
  sidebar: string;
  sidebarText: string;
  sidebarMuted: string;
  starOn: string;
  starOff: string;
  timeline: string;
  meta: string;
};

export type StanfordThemePalette = {
  sidebar: string;
  sidebarText: string;
  sidebarMuted: string;
  barTrack: string;
  barFill: string;
};

export type CambridgeThemePalette = {
  accent: string;
  panel: string;
  contentPanel: string;
  text: string;
  muted: string;
  rail: string;
  dotOn: string;
  dotOff: string;
};
