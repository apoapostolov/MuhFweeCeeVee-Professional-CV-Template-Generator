import type { PathSegment } from "@/components/composer/types";

export function asRecord(input: unknown): Record<string, unknown> | null {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return null;
  }
  return input as Record<string, unknown>;
}

export function getAtPath(input: unknown, path: PathSegment[]): unknown {
  let cursor = input;
  for (const segment of path) {
    if (cursor === null || cursor === undefined) {
      return undefined;
    }
    if (typeof segment === "number") {
      if (!Array.isArray(cursor)) {
        return undefined;
      }
      cursor = cursor[segment];
      continue;
    }
    const record = asRecord(cursor);
    if (!record) {
      return undefined;
    }
    cursor = record[segment];
  }
  return cursor;
}

export function setAtPath(input: unknown, path: PathSegment[], value: unknown): unknown {
  const cloned = JSON.parse(JSON.stringify(input ?? {})) as unknown;
  if (path.length === 0) {
    return value;
  }
  let cursor: unknown = cloned;
  for (let index = 0; index < path.length - 1; index += 1) {
    const segment = path[index];
    const nextSegment = path[index + 1];
    if (typeof segment === "number") {
      if (!Array.isArray(cursor)) {
        return cloned;
      }
      if (cursor[segment] === undefined) {
        cursor[segment] = typeof nextSegment === "number" ? [] : {};
      }
      cursor = cursor[segment];
      continue;
    }
    const record = asRecord(cursor);
    if (!record) {
      return cloned;
    }
    if (record[segment] === undefined || record[segment] === null) {
      record[segment] = typeof nextSegment === "number" ? [] : {};
    }
    cursor = record[segment];
  }
  const last = path[path.length - 1];
  if (typeof last === "number" && Array.isArray(cursor)) {
    cursor[last] = value;
  } else if (typeof last === "string") {
    const record = asRecord(cursor);
    if (record) {
      record[last] = value;
    }
  }
  return cloned;
}

export function pathToDot(path: PathSegment[]): string {
  return path
    .map((segment) => (typeof segment === "number" ? `[${segment}]` : segment))
    .join(".")
    .replace(/\.\[/g, "[");
}

export function stringifyFieldValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (Array.isArray(value)) {
    return value.map((entry) => String(entry)).join("\n");
  }
  return JSON.stringify(value, null, 2);
}

export function parseFieldValueFromProposal(
  current: unknown,
  proposal: unknown,
): unknown {
  if (typeof current === "string") {
    return typeof proposal === "string" ? proposal : stringifyFieldValue(proposal);
  }
  if (Array.isArray(current)) {
    if (Array.isArray(proposal)) {
      return proposal;
    }
    if (typeof proposal === "string") {
      return proposal
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);
    }
  }
  return proposal;
}