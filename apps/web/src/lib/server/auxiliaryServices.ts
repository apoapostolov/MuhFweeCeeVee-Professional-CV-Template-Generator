import fs from "node:fs/promises";
import path from "node:path";

import { repoPath } from "./repoPaths";

export type AuxiliaryServiceKind = "detector" | "ats";
export type AuxiliaryIntegrationStatus = "ready" | "planned" | "manual";

export type AuxiliaryServiceDefinition = {
  id: string;
  name: string;
  kind: AuxiliaryServiceKind;
  description: string;
  envName: string;
  integration: AuxiliaryIntegrationStatus;
};

export type AuxiliaryServiceStatus = AuxiliaryServiceDefinition & {
  configured: boolean;
  apiKeyMasked: string | null;
};

export const AUXILIARY_SERVICES: readonly AuxiliaryServiceDefinition[] = [
  {
    id: "sapling",
    name: "Sapling",
    kind: "detector",
    description: "AI writing detector used for section scans.",
    envName: "MFCV_SAPLING_API_KEY",
    integration: "ready",
  },
  {
    id: "gptzero",
    name: "GPTZero",
    kind: "detector",
    description: "AI writing detector used for whole-document scans.",
    envName: "MFCV_GPTZERO_API_KEY",
    integration: "ready",
  },
  {
    id: "originality-ai",
    name: "Originality.ai",
    kind: "detector",
    description: "Online AI writing and originality detector.",
    envName: "MFCV_ORIGINALITY_AI_API_KEY",
    integration: "planned",
  },
  {
    id: "winston-ai",
    name: "Winston AI",
    kind: "detector",
    description: "Online AI content detector.",
    envName: "MFCV_WINSTON_AI_API_KEY",
    integration: "planned",
  },
  {
    id: "jobscan",
    name: "Jobscan",
    kind: "ats",
    description: "Job-match and ATS keyword analysis service.",
    envName: "MFCV_JOBSCAN_API_KEY",
    integration: "planned",
  },
  {
    id: "resume-worded",
    name: "Resume Worded",
    kind: "ats",
    description: "Resume score and ATS feedback service.",
    envName: "MFCV_RESUME_WORDED_API_KEY",
    integration: "planned",
  },
  {
    id: "skillsyncer",
    name: "SkillSyncer",
    kind: "ats",
    description: "Resume and job-description match analysis service.",
    envName: "MFCV_SKILLSYNCER_API_KEY",
    integration: "planned",
  },
  {
    id: "teal",
    name: "Teal",
    kind: "ats",
    description: "Resume checker and job-match service.",
    envName: "MFCV_TEAL_API_KEY",
    integration: "planned",
  },
  {
    id: "applycove",
    name: "ApplyCove",
    kind: "ats",
    description: "Existing ATS review metadata provider.",
    envName: "MFCV_APPLYCOVE_API_KEY",
    integration: "manual",
  },
  {
    id: "cvparserpro",
    name: "CVParserPro",
    kind: "ats",
    description: "Existing resume parsing and ATS metadata provider.",
    envName: "MFCV_CVPARSERPRO_API_KEY",
    integration: "manual",
  },
];

const ENV_FILE = process.env.MFCV_ENV_FILE?.trim() || repoPath(".env");

function maskApiKey(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.length <= 8) return "••••••••";
  return `${trimmed.slice(0, 4)}••••${trimmed.slice(-4)}`;
}

async function readEnvFile(): Promise<string> {
  try {
    return await fs.readFile(ENV_FILE, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return "";
    throw error;
  }
}

function readEnvValue(content: string, envName: string): string {
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed.startsWith(`${envName}=`)) continue;
    const value = trimmed.slice(envName.length + 1).trim();
    return /^(['"]).*\1$/.test(value) ? value.slice(1, -1) : value;
  }
  return (process.env[envName] ?? "").trim();
}

async function writeEnvValues(values: Record<string, string>): Promise<void> {
  const current = await readEnvFile();
  const lines = current ? current.split(/\r?\n/) : [];
  const pending = new Map(Object.entries(values));
  const next = lines.map((line) => {
    const match = /^([A-Za-z_][A-Za-z0-9_]*)=/.exec(line);
    if (!match || !pending.has(match[1])) return line;
    const envName = match[1];
    const value = pending.get(envName) ?? "";
    pending.delete(envName);
    return `${envName}=${JSON.stringify(value)}`;
  });
  for (const [envName, value] of pending) next.push(`${envName}=${JSON.stringify(value)}`);
  await fs.mkdir(path.dirname(ENV_FILE), { recursive: true });
  await fs.writeFile(ENV_FILE, `${next.join("\n").replace(/\n{3,}/g, "\n\n")}\n`, "utf8");
}

export async function readAuxiliaryApiKey(serviceId: string): Promise<string> {
  const service = AUXILIARY_SERVICES.find((item) => item.id === serviceId);
  if (!service) return "";
  return readEnvValue(await readEnvFile(), service.envName);
}

export async function getAuxiliaryServices(): Promise<AuxiliaryServiceStatus[]> {
  const content = await readEnvFile();
  return AUXILIARY_SERVICES.map((service) => {
    const key = readEnvValue(content, service.envName);
    return { ...service, configured: Boolean(key), apiKeyMasked: maskApiKey(key) };
  });
}

export async function saveAuxiliaryApiKeys(input: Record<string, string>): Promise<void> {
  const values: Record<string, string> = {};
  for (const [serviceId, value] of Object.entries(input)) {
    const service = AUXILIARY_SERVICES.find((item) => item.id === serviceId);
    if (!service || typeof value !== "string" || !value.trim()) continue;
    values[service.envName] = value.trim();
  }
  if (Object.keys(values).length > 0) await writeEnvValues(values);
}
