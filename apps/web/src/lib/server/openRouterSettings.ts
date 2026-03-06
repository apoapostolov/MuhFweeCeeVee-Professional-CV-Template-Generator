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
const ENV_FILE = repoPath(".env");

const DEFAULT_SETTINGS: OpenRouterSettings = {
  apiKey: "",
  model: "openai/gpt-4o-mini",
  baseUrl: "https://openrouter.ai/api/v1/chat/completions",
  updatedAt: "",
};

function parseEnvApiKey(input: string): string {
  const lines = input.split(/\r?\n/);
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    if (!line.startsWith("OPENROUTER_API_KEY=")) continue;
    const value = line.slice("OPENROUTER_API_KEY=".length).trim();
    if (!value) return "";
    if ((value.startsWith("\"") && value.endsWith("\"")) || (value.startsWith("'") && value.endsWith("'"))) {
      return value.slice(1, -1);
    }
    return value;
  }
  return "";
}

async function readApiKeyFromEnvFile(): Promise<string> {
  try {
    const raw = await fs.readFile(ENV_FILE, "utf-8");
    return parseEnvApiKey(raw);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return "";
    }
    throw error;
  }
}

export async function readOpenRouterSettings(): Promise<OpenRouterSettings> {
  const processApiKey = (process.env.OPENROUTER_API_KEY ?? "").trim();
  const fileApiKey = await readApiKeyFromEnvFile();
  const envApiKey = fileApiKey || processApiKey;
  try {
    const raw = await fs.readFile(SETTINGS_FILE, "utf-8");
    const parsed = parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {
        ...DEFAULT_SETTINGS,
        apiKey: envApiKey,
      };
    }
    const value = parsed as Record<string, unknown>;
    return {
      apiKey: envApiKey,
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
      return {
        ...DEFAULT_SETTINGS,
        apiKey: envApiKey,
      };
    }
    throw error;
  }
}

export async function writeOpenRouterSettings(
  input: Partial<Pick<OpenRouterSettings, "apiKey" | "model" | "baseUrl">>,
): Promise<OpenRouterSettings> {
  const current = await readOpenRouterSettings();
  const nextApiKey =
    typeof input.apiKey === "string" ? input.apiKey.trim() : current.apiKey;
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
  await fs.writeFile(
    SETTINGS_FILE,
    stringify({
      model: merged.model,
      baseUrl: merged.baseUrl,
      updatedAt: merged.updatedAt,
    }),
    "utf-8",
  );
  if (typeof input.apiKey === "string") {
    await upsertOpenRouterApiKeyEnv(nextApiKey);
  }
  return merged;
}

function escapeEnvValue(value: string): string {
  if (/^[^\s"'`#=]+$/.test(value)) {
    return value;
  }
  return JSON.stringify(value);
}

async function upsertOpenRouterApiKeyEnv(apiKey: string): Promise<void> {
  let current = "";
  try {
    current = await fs.readFile(ENV_FILE, "utf-8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      throw error;
    }
  }

  const lines = current.length > 0 ? current.split(/\r?\n/) : [];
  const keyLine = `OPENROUTER_API_KEY=${escapeEnvValue(apiKey)}`;
  let found = false;
  const nextLines = lines.map((line) => {
    if (line.startsWith("OPENROUTER_API_KEY=")) {
      found = true;
      return keyLine;
    }
    return line;
  });
  if (!found) {
    if (nextLines.length > 0 && nextLines[nextLines.length - 1].trim().length > 0) {
      nextLines.push("");
    }
    nextLines.push(keyLine);
  }
  const out = nextLines.join("\n").replace(/\n{3,}/g, "\n\n");
  await fs.writeFile(ENV_FILE, out.endsWith("\n") ? out : `${out}\n`, "utf-8");
}

export function maskApiKey(input: string): string {
  if (!input) return "";
  if (input.length <= 10) return "********";
  return `${input.slice(0, 6)}...${input.slice(-4)} (${input.length})`;
}
