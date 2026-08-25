import fs from "node:fs/promises";

import { parse } from "yaml";

import { repoPath } from "./repoPaths";

export type TemplateCatalogEntry = {
  id: string;
  name: string;
  version: string;
  status: string;
  locale_support?: string[];
  files: {
    meta: string;
    layout: string;
    license: string;
  };
};

type TemplateCatalog = {
  version: number;
  templates: TemplateCatalogEntry[];
};

export async function listTemplates(): Promise<TemplateCatalogEntry[]> {
  const catalogPath = repoPath("templates", "catalog.yaml");
  const content = await fs.readFile(catalogPath, "utf-8");
  const parsed = parse(content) as TemplateCatalog;
  return (parsed.templates ?? []).slice();
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function mergeRecords(
  base: Record<string, unknown>,
  override: Record<string, unknown> | null,
): Record<string, unknown> {
  const result: Record<string, unknown> = { ...base };
  if (!override) return result;
  for (const [key, value] of Object.entries(override)) {
    const existing = result[key];
    const existingRecord = asRecord(existing);
    const valueRecord = asRecord(value);
    result[key] = existingRecord && valueRecord
      ? mergeRecords(existingRecord, valueRecord)
      : value;
  }
  return result;
}

function mergeDefaultRecords(
  base: Record<string, unknown>,
  addition: Record<string, unknown>,
): Record<string, unknown> {
  const result: Record<string, unknown> = { ...base };
  for (const [key, value] of Object.entries(addition)) {
    const existingRecord = asRecord(result[key]);
    const valueRecord = asRecord(value);
    if (existingRecord && valueRecord) {
      result[key] = mergeDefaultRecords(existingRecord, valueRecord);
    } else if (!(key in result)) {
      result[key] = value;
    }
  }
  return result;
}

export async function listTemplateHeaders(language: string): Promise<Record<string, unknown>> {
  const normalizedLanguage = language.trim().toLowerCase();
  const templates = await listTemplates();
  let headers: Record<string, unknown> = {};
  for (const template of templates) {
    const content = await fs.readFile(repoPath("templates", template.id, "template.yaml"), "utf-8");
    const parsed = parse(content) as { labels?: Record<string, Record<string, unknown>> };
    const labels = parsed.labels?.[normalizedLanguage] ?? parsed.labels?.en ?? {};
    headers = mergeDefaultRecords(headers, labels);
  }
  return headers;
}

export function addTemplateHeadersToCv(
  cv: Record<string, unknown>,
  defaults: Record<string, unknown>,
): Record<string, unknown> {
  const metadata = asRecord(cv.metadata) ?? {};
  const existing = asRecord(metadata.template_headers) ?? {};
  const legacyScopedHeaders = Object.entries(existing)
    .filter(([key, value]) => /-v\d+$/.test(key) && asRecord(value))
    .reduce<Record<string, unknown>>((result, [, value]) => mergeRecords(result, asRecord(value)), {});
  const directHeaders = Object.fromEntries(
    Object.entries(existing).filter(([key, value]) => !(/-v\d+$/.test(key) && asRecord(value))),
  );
  const existingHeaders = Object.keys(legacyScopedHeaders).length > 0
    ? mergeRecords(legacyScopedHeaders, directHeaders)
    : existing;
  return {
    ...cv,
    metadata: {
      ...metadata,
      template_headers: mergeRecords(defaults, existingHeaders),
    },
  };
}
