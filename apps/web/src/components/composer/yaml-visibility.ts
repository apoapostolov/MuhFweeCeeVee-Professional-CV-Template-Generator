import { parse as parseYaml, stringify as stringifyYaml } from "yaml";

import { normalizeVisibilityPath } from "@/lib/cvTemplateVisibility";

type PathSegments = string[];

export type ParsedYamlVisibility = {
  value: unknown;
  paths: string[];
  hiddenPaths: string[];
};

function pathKey(basePath: string, segments: PathSegments): string {
  return normalizeVisibilityPath([basePath, ...segments].filter(Boolean).join("."));
}

function normalizePrefixedMarkers(source: string): string {
  return source.replace(/^(\s*)(-\s+)?!([A-Za-z0-9_.-]+):/gm, "$1$2$3!:");
}

function stripMarker(key: string): { key: string; hidden: boolean } {
  if (key.length > 1 && key.endsWith("!")) {
    return { key: key.slice(0, -1), hidden: true };
  }
  return { key, hidden: false };
}

function collectParsedVisibility(
  value: unknown,
  basePath: string,
  segments: PathSegments,
  paths: string[],
  hiddenPaths: string[],
): unknown {
  if (Array.isArray(value)) {
    return value.map((entry, index) => collectParsedVisibility(entry, basePath, [...segments, String(index)], paths, hiddenPaths));
  }
  if (!value || typeof value !== "object") return value;

  const output: Record<string, unknown> = {};
  for (const [rawKey, child] of Object.entries(value as Record<string, unknown>)) {
    const { key, hidden } = stripMarker(rawKey);
    const childSegments = [...segments, key];
    const childPath = pathKey(basePath, childSegments);
    paths.push(childPath);
    if (hidden) hiddenPaths.push(childPath);
    output[key] = collectParsedVisibility(child, basePath, childSegments, paths, hiddenPaths);
  }
  return output;
}

export function parseYamlWithVisibilityMarkers(editorPath: string, source: string): ParsedYamlVisibility {
  const parsed = parseYaml(normalizePrefixedMarkers(source));
  const paths: string[] = [];
  const hiddenPaths: string[] = [];
  const value = collectParsedVisibility(parsed, editorPath, [], paths, hiddenPaths);
  return { value, paths, hiddenPaths };
}

function markHiddenKeys(value: unknown, editorPath: string, segments: PathSegments, visibility: Record<string, boolean>): unknown {
  if (Array.isArray(value)) {
    return value.map((entry, index) => markHiddenKeys(entry, editorPath, [...segments, String(index)], visibility));
  }
  if (!value || typeof value !== "object") return value;

  const output: Record<string, unknown> = {};
  for (const [rawKey, child] of Object.entries(value as Record<string, unknown>)) {
    const key = rawKey.endsWith("!") ? rawKey.slice(0, -1) : rawKey;
    const childSegments = [...segments, key];
    const hidden = visibility[pathKey(editorPath, childSegments)] === false;
    output[hidden ? `${key}!` : key] = markHiddenKeys(child, editorPath, childSegments, visibility);
  }
  return output;
}

export function stringifyYamlWithVisibility(
  value: unknown,
  editorPath: string,
  visibility: Record<string, boolean>,
): string {
  return stringifyYaml(markHiddenKeys(value, editorPath, [], visibility));
}

export function mergeYamlVisibility(
  current: Record<string, boolean>,
  parsed: Pick<ParsedYamlVisibility, "paths" | "hiddenPaths">,
): Record<string, boolean> {
  const next = { ...current };
  for (const path of parsed.paths) delete next[path];
  for (const path of parsed.hiddenPaths) next[path] = false;
  return next;
}
