export type FieldPathSegment = string | number;

export function serializeFieldPath(path: FieldPathSegment[]): string {
  return path
    .map((segment) => (typeof segment === "number" ? `[${segment}]` : segment))
    .join(".");
}

export function parseFieldPath(pathKey: string): FieldPathSegment[] {
  const trimmed = pathKey.trim();
  if (!trimmed) {
    return [];
  }
  const segments: FieldPathSegment[] = [];
  for (const part of trimmed.split(".")) {
    if (!part) {
      continue;
    }
    if (part.startsWith("[") && part.endsWith("]")) {
      const index = Number(part.slice(1, -1));
      if (!Number.isInteger(index) || index < 0) {
        throw new Error(`Invalid array index in field path: ${part}`);
      }
      segments.push(index);
      continue;
    }
    segments.push(part);
  }
  return segments;
}