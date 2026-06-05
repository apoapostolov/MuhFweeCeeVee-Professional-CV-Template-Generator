import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = fileURLToPath(new URL("../../../../", import.meta.url));
export const ENV_TEST_FILE = path.join(repoRoot, ".env.test");

export function parseEnvValue(rawEnv: string, key: string): string {
  const prefix = `${key}=`;
  for (const rawLine of rawEnv.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#") || !line.startsWith(prefix)) {
      continue;
    }
    const value = line.slice(prefix.length).trim();
    if (!value) {
      return "";
    }
    if (
      (value.startsWith("\"") && value.endsWith("\"")) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      return value.slice(1, -1);
    }
    return value;
  }
  return "";
}

/** Vitest setup: load OPENROUTER_API_KEY from repo `.env.test` only. */
export function loadEnvTestIntoProcess(): void {
  if ((process.env.OPENROUTER_API_KEY ?? "").trim().length > 0) {
    return;
  }
  if (!fs.existsSync(ENV_TEST_FILE)) {
    return;
  }
  const raw = fs.readFileSync(ENV_TEST_FILE, "utf-8");
  const key = parseEnvValue(raw, "OPENROUTER_API_KEY");
  if (key) {
    process.env.OPENROUTER_API_KEY = key;
  }
}