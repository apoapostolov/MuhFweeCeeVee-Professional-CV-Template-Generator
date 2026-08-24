import fs from "node:fs/promises";
import path from "node:path";
import { parse, stringify } from "yaml";

import { getOpenRouterModels } from "./openRouterModels";
import { fetchOpenRouterCredit } from "./openRouterCredit";
import {
  isAiModelCacheFresh,
  readAiModelCache,
  writeAiModelCache,
} from "./aiModelCache";
import { maskApiKey, readOpenRouterSettings, writeOpenRouterSettings } from "./openRouterSettings";
import { repoPath } from "./repoPaths";
import { AI_PROVIDER_REGISTRY, getAiProvider } from "./aiProviderRegistry";
import type {
  AiCapability,
  AiModel,
  AiProviderStatus,
  AiQuota,
  AiRole,
  AiRoleBinding,
  AiSettingsDocument,
  AiSettingsResponse,
} from "./aiProviderTypes";

const SETTINGS_FILE = repoPath("data", "settings", "ai.yaml");
const OAUTH_DIR = repoPath("work", "ai-oauth");
const ENV_FILE = process.env.MFCV_ENV_FILE?.trim() || repoPath(".env");

export const AI_ROLES: readonly AiRole[] = [
  "assistant",
  "analysis",
  "research",
  "vision",
  "translation",
  "field-rewrite",
  "image-generation",
];

function defaults(model: string, researchModel: string, imageModel: string): AiSettingsDocument {
  const roles = Object.fromEntries(
    AI_ROLES.map((role) => [
      role,
      {
        providerId: "openrouter",
        modelId:
          role === "research"
            ? researchModel
            : role === "image-generation"
              ? imageModel || model
              : model,
      } satisfies AiRoleBinding,
    ]),
  ) as Record<AiRole, AiRoleBinding>;
  return { schemaVersion: 1, updatedAt: "", roles };
}

function parseEnv(input: string, key: string): string {
  for (const line of input.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed.startsWith(`${key}=`)) continue;
    const value = trimmed.slice(key.length + 1).trim();
    return /^(['"]).*\1$/.test(value) ? value.slice(1, -1) : value;
  }
  return "";
}

async function readProviderKey(providerId: string): Promise<string> {
  const envName = `MFCV_AI_API_KEY_${providerId.replace(/[^A-Za-z0-9]/g, "_").toUpperCase()}`;
  const processValue = (process.env[envName] ?? "").trim();
  if (processValue) return processValue;
  if (providerId === "openrouter") {
    return (await readOpenRouterSettings()).apiKey;
  }
  try {
    return parseEnv(await fs.readFile(ENV_FILE, "utf8"), envName).trim();
  } catch {
    return "";
  }
}

export async function readAiProviderKey(providerId: string): Promise<string> {
  return readProviderKey(providerId);
}

async function writeProviderKey(providerId: string, value: string): Promise<void> {
  if (providerId === "openrouter") {
    await writeOpenRouterSettings({ apiKey: value });
    return;
  }
  const envName = `MFCV_AI_API_KEY_${providerId.replace(/[^A-Za-z0-9]/g, "_").toUpperCase()}`;
  let current = "";
  try {
    current = await fs.readFile(ENV_FILE, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  const lines = current ? current.split(/\r?\n/) : [];
  const replacement = `${envName}=${JSON.stringify(value)}`;
  let found = false;
  const next = lines.map((line) => {
    if (line.startsWith(`${envName}=`)) {
      found = true;
      return replacement;
    }
    return line;
  });
  if (!found) next.push(replacement);
  await fs.writeFile(ENV_FILE, `${next.join("\n").replace(/\n{3,}/g, "\n\n")}\n`, "utf8");
}

export async function readAiSettingsDocument(): Promise<AiSettingsDocument> {
  try {
    const value = parse(await fs.readFile(SETTINGS_FILE, "utf8")) as Record<string, unknown>;
    const rawRoles = value?.roles;
    if (rawRoles && typeof rawRoles === "object" && !Array.isArray(rawRoles)) {
      const roles = { ...defaults("openai/gpt-4o-mini", "perplexity/sonar-pro", "").roles };
      for (const role of AI_ROLES) {
        const raw = (rawRoles as Record<string, unknown>)[role];
        if (!raw || typeof raw !== "object") continue;
        const record = raw as Record<string, unknown>;
        const providerId = typeof record.providerId === "string" ? record.providerId.trim() : "";
        const modelId = typeof record.modelId === "string" ? record.modelId.trim() : "";
        if (getAiProvider(providerId) && modelId) roles[role] = { providerId, modelId };
      }
      return { schemaVersion: 1, updatedAt: typeof value.updatedAt === "string" ? value.updatedAt : "", roles };
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  const legacy = await readOpenRouterSettings();
  return defaults(legacy.model, legacy.researchModel, legacy.imageModel);
}

export async function writeAiSettingsDocument(
  input: { roles?: Partial<Record<AiRole, AiRoleBinding>>; apiKeys?: Record<string, string> },
): Promise<AiSettingsDocument> {
  const current = await readAiSettingsDocument();
  const roles = { ...current.roles };
  for (const role of AI_ROLES) {
    const candidate = input.roles?.[role];
    if (!candidate) continue;
    const provider = getAiProvider(candidate.providerId);
    if (!provider || !candidate.modelId.trim()) throw new Error(`Unknown provider or empty model for ${role}.`);
    roles[role] = { providerId: provider.id, modelId: candidate.modelId.trim() };
  }
  const openRouterRoles = Object.fromEntries(
    ["analysis", "research", "image-generation"].flatMap((role) => {
      const binding = roles[role as AiRole];
      return binding?.providerId === "openrouter" ? [[role, binding.modelId]] : [];
    }),
  ) as Partial<Record<"analysis" | "research" | "image-generation", string>>;
  if (Object.keys(openRouterRoles).length > 0) {
    await writeOpenRouterSettings({
      model: openRouterRoles.analysis,
      researchModel: openRouterRoles.research,
      imageModel: openRouterRoles["image-generation"],
    });
  }
  for (const [providerId, key] of Object.entries(input.apiKeys ?? {})) {
    if (!getAiProvider(providerId)) throw new Error(`Unknown AI provider '${providerId}'.`);
    if (typeof key === "string" && key.trim()) await writeProviderKey(providerId, key.trim());
  }
  const next = { schemaVersion: 1 as const, updatedAt: new Date().toISOString(), roles };
  await fs.mkdir(path.dirname(SETTINGS_FILE), { recursive: true });
  const temporary = `${SETTINGS_FILE}.${process.pid}.tmp`;
  await fs.writeFile(temporary, stringify(next), "utf8");
  try {
    await fs.rename(temporary, SETTINGS_FILE);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "EPERM") throw error;
    // Windows can reject rename when Next.js still has the destination open.
    await fs.copyFile(temporary, SETTINGS_FILE);
    await fs.unlink(temporary).catch(() => undefined);
  }
  return next;
}

function seedModels(providerId: string): AiModel[] {
  const seeds: Record<string, string[]> = {
    openai: ["gpt-4o-mini", "gpt-4.1-mini"],
    anthropic: ["claude-sonnet-4-6", "claude-haiku-4-5"],
    gemini: ["gemini-2.5-flash", "gemini-2.5-pro"],
    xai: ["grok-4", "grok-3-mini"],
    deepseek: ["deepseek-chat", "deepseek-reasoner"],
    mistral: ["mistral-large-latest", "mistral-small-latest"],
    ollama: [],
  };
  return (seeds[providerId] ?? []).map((id) => ({
    providerId,
    id,
    name: id,
    capabilities: ["chat"] as AiCapability[],
    contextLength: null,
    inputPricePer1M: null,
    outputPricePer1M: null,
    live: false,
  }));
}

function normalizeModels(providerId: string, payload: unknown): AiModel[] {
  const rows = payload && typeof payload === "object" && !Array.isArray(payload)
    ? (payload as Record<string, unknown>).data
    : undefined;
  if (!Array.isArray(rows)) return [];
  return rows.flatMap((row) => {
    if (!row || typeof row !== "object") return [];
    const value = row as Record<string, unknown>;
    const id = typeof value.id === "string" ? value.id.trim() : "";
    if (!id) return [];
    return [{
      providerId,
      id,
      name: typeof value.name === "string" && value.name.trim() ? value.name.trim() : id,
      capabilities: ["chat"] as AiCapability[],
      contextLength: typeof value.context_length === "number" ? value.context_length : null,
      inputPricePer1M: null,
      outputPricePer1M: null,
      live: true,
    }];
  });
}

export async function fetchAiModels(providerId: string, forceRefresh = false): Promise<AiModel[]> {
  const provider = getAiProvider(providerId);
  if (!provider) return [];

  if (providerId === "openrouter") {
    const settings = await readOpenRouterSettings();
    const result = await getOpenRouterModels({ apiKey: settings.apiKey, forceRefresh });
    return result.models.map((model) => ({
      providerId,
      id: model.id,
      name: model.name,
      capabilities: model.supportsImageGeneration ? ["chat", "vision", "image-generation"] : ["chat"],
      contextLength: model.contextLength,
      inputPricePer1M: model.promptPricePer1M,
      outputPricePer1M: model.completionPricePer1M,
      live: !result.fromCache,
    }));
  }

  const cache = await readAiModelCache(providerId);
  if (!forceRefresh && isAiModelCacheFresh(cache)) return cache?.models ?? [];
  const seed = seedModels(providerId);
  if (!provider.modelsEndpoint) return cache?.models ?? seed;

  const apiKey = await readProviderKey(providerId);
  if (provider.auth === "api_key" && !apiKey) return cache?.models ?? seed;

  try {
    const response = await fetch(provider.modelsEndpoint, {
      headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : undefined,
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) throw new Error(`Model request failed (${response.status}).`);
    const models = normalizeModels(providerId, await response.json());
    if (!models.length) return cache?.models ?? seed;
    await writeAiModelCache(providerId, models);
    return models;
  } catch {
    return cache?.models ?? seed;
  }
}

async function providerStatus(providerId: string): Promise<AiProviderStatus> {
  const provider = getAiProvider(providerId)!;
  const apiKey = provider.auth === "api_key" ? await readProviderKey(providerId) : "";
  let connected = false;
  let expiresAt: string | undefined;
  if (provider.auth === "oauth") {
    try {
      const session = JSON.parse(await fs.readFile(path.join(OAUTH_DIR, `${providerId}.json`), "utf8")) as { expiresAt?: string };
      connected = Boolean(session.expiresAt && Date.parse(session.expiresAt) > Date.now());
      expiresAt = session.expiresAt;
    } catch {
      connected = false;
    }
  }
  return {
    id: provider.id,
    name: provider.name,
    kind: provider.kind,
    auth: provider.auth,
    configured: provider.auth === "none" || Boolean(apiKey) || connected,
    connected,
    apiKeyMasked: apiKey ? maskApiKey(apiKey) : undefined,
    expiresAt,
    capabilities: provider.capabilities,
  };
}

export async function getAiSettingsResponse(
  forceRefresh = false,
  requestedProviderIds: string[] = [],
): Promise<AiSettingsResponse> {
  const document = await readAiSettingsDocument();
  const providers = await Promise.all(AI_PROVIDER_REGISTRY.map((provider) => providerStatus(provider.id)));
  const roleProviderIds = AI_ROLES.map((role) => document.roles[role].providerId);
  const requested = requestedProviderIds.filter((providerId) => getAiProvider(providerId));
  const modelProviderIds = [...new Set([
    ...roleProviderIds,
    ...requested,
    ...providers.filter((provider) => provider.auth === "none" || provider.configured).map((provider) => provider.id),
  ])];
  const modelGroups = await Promise.all(
    modelProviderIds.map((providerId) => fetchAiModels(providerId, forceRefresh && requested.includes(providerId))),
  );
  const quotas: AiQuota[] = [];
  const openRouter = providers.find((provider) => provider.id === "openrouter");
  if (openRouter?.configured) {
    const credit = await fetchOpenRouterCredit(await readProviderKey("openrouter"));
    quotas.push({ providerId: "openrouter", available: credit.available, label: credit.label, remaining: credit.remainingUsd, limit: credit.limitUsd, unit: "USD", period: "monthly", checkedAt: credit.checkedAt });
  }
  return { ...document, providers, models: modelGroups.flat(), quotas };
}
