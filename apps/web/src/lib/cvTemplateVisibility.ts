export const TEMPLATE_VISIBILITY_KEY = "template_visibility";

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

export function normalizeVisibilityPath(path: string): string {
  return path
    .replace(/\[(\d+)\]/g, ".$1")
    .replace(/^\./, "")
    .trim();
}

export function readTemplateVisibility(cv: Record<string, unknown>): Record<string, boolean> {
  const metadata = asRecord(cv.metadata);
  const raw = metadata?.[TEMPLATE_VISIBILITY_KEY];
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return {};
  }
  const out: Record<string, boolean> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (typeof value === "boolean") {
      out[normalizeVisibilityPath(key)] = value;
    }
  }
  return out;
}

export function writeTemplateVisibility(
  cv: Record<string, unknown>,
  map: Record<string, boolean>,
): Record<string, unknown> {
  const metadata = { ...(asRecord(cv.metadata) ?? {}) };
  metadata[TEMPLATE_VISIBILITY_KEY] = map;
  return { ...cv, metadata };
}

export function isTemplatePathVisible(
  dotPath: string,
  visibility: Record<string, boolean>,
): boolean {
  const normalized = normalizeVisibilityPath(dotPath);
  if (!normalized) {
    return visibility[normalized] !== false;
  }
  const segments = normalized.split(".").filter(Boolean);
  let prefix = "";
  for (const segment of segments) {
    prefix = prefix ? `${prefix}.${segment}` : segment;
    if (visibility[prefix] === false) {
      return false;
    }
  }
  return visibility[normalized] !== false;
}

function isEmptyValue(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === "string") return value.trim().length === 0;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === "object") return Object.keys(value as Record<string, unknown>).length === 0;
  return false;
}

export function applyTemplateVisibility<T>(value: T, visibility: Record<string, boolean>, path = ""): T {
  if (Object.keys(visibility).length === 0) {
    return value;
  }
  if (!isTemplatePathVisible(path, visibility)) {
    if (Array.isArray(value)) return [] as T;
    if (value && typeof value === "object") return {} as T;
    if (typeof value === "string") return "" as T;
    return value;
  }
  if (Array.isArray(value)) {
    const next: unknown[] = [];
    value.forEach((entry, index) => {
      const childPath = path ? `${path}.${index}` : String(index);
      if (!isTemplatePathVisible(childPath, visibility)) {
        return;
      }
      const pruned = applyTemplateVisibility(entry, visibility, childPath);
      if (!isEmptyValue(pruned)) {
        next.push(pruned);
      }
    });
    return next as T;
  }
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const [key, child] of Object.entries(record)) {
      if (key === TEMPLATE_VISIBILITY_KEY) {
        out[key] = child;
        continue;
      }
      const childPath = path ? `${path}.${key}` : key;
      if (!isTemplatePathVisible(childPath, visibility)) {
        continue;
      }
      const pruned = applyTemplateVisibility(child, visibility, childPath);
      if (!isEmptyValue(pruned)) {
        out[key] = pruned;
      }
    }
    return out as T;
  }
  return value;
}

export function pathSegmentsToVisibilityKey(
  segments: Array<string | number>,
  editorPath: string,
): string {
  const relative = segments
    .map((segment) => (typeof segment === "number" ? String(segment) : segment))
    .join(".");
  if (!editorPath) {
    return normalizeVisibilityPath(relative);
  }
  return normalizeVisibilityPath(relative ? `${editorPath}.${relative}` : editorPath);
}