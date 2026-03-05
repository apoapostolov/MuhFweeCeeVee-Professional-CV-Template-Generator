import fs from "node:fs/promises";
import path from "node:path";

import { parse, stringify } from "yaml";

import { repoPath } from "./repoPaths";

export type OpenRouterSettings = {
  apiKey: string;
  model: string;
  baseUrl: string;
  updatedAt: string;
};

const SETTINGS_DIR = repoPath("data", "settings");
const SETTINGS_FILE = path.join(SETTINGS_DIR, "openrouter.yaml");

const DEFAULT_SETTINGS: OpenRouterSettings = {
  apiKey: "",
  model: "openai/gpt-4o-mini",
  baseUrl: "https://openrouter.ai/api/v1/chat/completions",
  updatedAt: "",
};

export async function readOpenRouterSettings(): Promise<OpenRouterSettings> {
  try {
    const raw = await fs.readFile(SETTINGS_FILE, "utf-8");
    const parsed = parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return DEFAULT_SETTINGS;
    }
    const value = parsed as Record<string, unknown>;
    return {
      apiKey: typeof value.apiKey === "string" ? value.apiKey : "",
      model:
        typeof value.model === "string" && value.model.trim().length > 0
          ? value.model.trim()
          : DEFAULT_SETTINGS.model,
      baseUrl:
        typeof value.baseUrl === "string" && value.baseUrl.trim().length > 0
          ? value.baseUrl.trim()
          : DEFAULT_SETTINGS.baseUrl,
      updatedAt: typeof value.updatedAt === "string" ? value.updatedAt : "",
    };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return DEFAULT_SETTINGS;
    }
    throw error;
  }
}

export async function writeOpenRouterSettings(
  input: Partial<Pick<OpenRouterSettings, "apiKey" | "model" | "baseUrl">>,
): Promise<OpenRouterSettings> {
  const current = await readOpenRouterSettings();
  const nextApiKey =
    typeof input.apiKey === "string"
      ? input.apiKey.trim().length > 0
        ? input.apiKey.trim()
        : current.apiKey
      : current.apiKey;
  const merged: OpenRouterSettings = {
    apiKey: nextApiKey,
    model:
      typeof input.model === "string" && input.model.trim().length > 0
        ? input.model.trim()
        : current.model,
    baseUrl:
      typeof input.baseUrl === "string" && input.baseUrl.trim().length > 0
        ? input.baseUrl.trim()
        : current.baseUrl,
    updatedAt: new Date().toISOString(),
  };

  await fs.mkdir(SETTINGS_DIR, { recursive: true });
  await fs.writeFile(SETTINGS_FILE, stringify(merged), "utf-8");
  return merged;
}

export function maskApiKey(input: string): string {
  if (!input) return "";
  if (input.length <= 10) return "********";
  return `${input.slice(0, 6)}...${input.slice(-4)} (${input.length})`;
}
