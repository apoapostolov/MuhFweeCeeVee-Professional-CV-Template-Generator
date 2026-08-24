import fs from "node:fs/promises";
import path from "node:path";
import { parse, stringify } from "yaml";

import { getOpenRouterModels } from "./openRouterModels";
import { fetchOpenRouterCredit } from "./openRouterCredit";
import { fetchCodexQuotas, getCodexOAuthStatus } from "./openaiCodexOAuth";
import {
  isAiModelCacheFresh,
  readAiModelCache,
  writeAiModelCache,
} from "./aiModelCache";
import { maskApiKey, readOpenRouterSettings, writeOpenRouterSettings } from "./openRouterSettings";
import { repoPath } from "./repoPaths";
import { fetchXaiQuotas, readXaiOAuthAccessToken } from "./xaiOAuth";
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
  return { schemaVersion: 1, updatedAt: "", roles, enabledProviders: ["openrouter"], providerModels: {}, thinkingModes: {}, disabledRoles: [] };
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

function normalizeLocalEndpoint(value: string): string {
  const trimmed = value.trim().replace(/\/+$/, "");
  if (!trimmed) return "";
  try {
    const parsed = new URL(trimmed);
    if (!["http:", "https:"].includes(parsed.protocol)) return "";
    return parsed.toString().replace(/\/$/, "");
  } catch {
    return "";
  }
}

function localModelsEndpoint(endpoint: string): string {
  return endpoint.endsWith("/models") ? endpoint : `${endpoint}/models`;
}

export async function checkLocalProviderEndpoint(endpoint: string): Promise<boolean> {
  const normalized = normalizeLocalEndpoint(endpoint);
  if (!normalized) return false;
  try {
    const response = await fetch(localModelsEndpoint(normalized), {
      method: "GET",
      signal: AbortSignal.timeout(8000),
    });
    return response.status === 200;
  } catch {
    return false;
  }
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
      const enabledProviders = Array.isArray(value.enabledProviders)
        ? [...new Set(value.enabledProviders.filter((providerId): providerId is string => typeof providerId === "string" && Boolean(getAiProvider(providerId))))]
        : [...new Set(Object.values(roles).map((binding) => binding.providerId).filter((providerId) => Boolean(getAiProvider(providerId))))];
      const providerEndpoints = value.providerEndpoints && typeof value.providerEndpoints === "object" && !Array.isArray(value.providerEndpoints)
        ? Object.fromEntries(Object.entries(value.providerEndpoints).flatMap(([providerId, endpoint]) => {
          const provider = getAiProvider(providerId);
          const normalized = provider?.kind === "local" && typeof endpoint === "string" ? normalizeLocalEndpoint(endpoint) : "";
          return normalized ? [[providerId, normalized]] : [];
        }))
        : {};
      const providerModels = value.providerModels && typeof value.providerModels === "object" && !Array.isArray(value.providerModels)
        ? Object.fromEntries(Object.entries(value.providerModels).filter(([providerId, modelId]) => getAiProvider(providerId) && typeof modelId === "string" && modelId.trim()).map(([providerId, modelId]) => [providerId, (modelId as string).trim()]))
        : {};
      const thinkingModes = value.thinkingModes && typeof value.thinkingModes === "object" && !Array.isArray(value.thinkingModes)
        ? Object.fromEntries(Object.entries(value.thinkingModes).filter(([, mode]) => typeof mode === "string" && mode.trim()).map(([key, mode]) => [key, (mode as string).trim()]))
        : {};
      for (const role of AI_ROLES) {
        const binding = roles[role];
        const mode = binding ? thinkingModes[`${binding.providerId}:${binding.modelId}`] : undefined;
        if (binding && mode && mode !== "none") roles[role] = { ...binding, thinkingMode: mode };
      }
      const disabledRoles = Array.isArray(value.disabledRoles)
        ? value.disabledRoles.filter((role): role is AiRole => typeof role === "string" && AI_ROLES.includes(role as AiRole))
        : [];
      return { schemaVersion: 1, updatedAt: typeof value.updatedAt === "string" ? value.updatedAt : "", roles, enabledProviders, providerEndpoints, providerModels, thinkingModes, disabledRoles };
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  const legacy = await readOpenRouterSettings();
  return defaults(legacy.model, legacy.researchModel, legacy.imageModel);
}

export async function writeAiSettingsDocument(
  input: {
    roles?: Partial<Record<AiRole, AiRoleBinding>>;
    clearRoles?: AiRole[];
    apiKeys?: Record<string, string>;
    providerModels?: Record<string, string>;
    thinkingModes?: Record<string, string>;
    enabledProviders?: string[];
    providerEndpoints?: Record<string, string>;
  },
): Promise<AiSettingsDocument> {
  const current = await readAiSettingsDocument();
  const roles = { ...current.roles };
  const enabledProviders = input.enabledProviders
    ? [...new Set(input.enabledProviders.filter((providerId) => Boolean(getAiProvider(providerId))))]
    : [...(current.enabledProviders ?? [])];
  const providerEndpoints = { ...(current.providerEndpoints ?? {}) };
  for (const [providerId, endpoint] of Object.entries(input.providerEndpoints ?? {})) {
    if (getAiProvider(providerId)?.kind !== "local") continue;
    const normalized = typeof endpoint === "string" ? normalizeLocalEndpoint(endpoint) : "";
    if (normalized) providerEndpoints[providerId] = normalized;
    else delete providerEndpoints[providerId];
  }
  const providerModels = { ...(current.providerModels ?? {}) };
  const thinkingModes = { ...(current.thinkingModes ?? {}) };
  for (const [key, mode] of Object.entries(input.thinkingModes ?? {})) {
    if (typeof mode === "string" && mode.trim()) thinkingModes[key] = mode.trim();
  }
  for (const [providerId, modelId] of Object.entries(input.providerModels ?? {})) {
    if (!getAiProvider(providerId) || typeof modelId !== "string" || !modelId.trim()) continue;
    const normalizedModelId = modelId.trim();
    providerModels[providerId] = normalizedModelId;
    const thinkingMode = thinkingModes[`${providerId}:${normalizedModelId}`];
    for (const role of AI_ROLES) {
      if (roles[role]?.providerId === providerId) roles[role] = { providerId, modelId: normalizedModelId, ...(thinkingMode && thinkingMode !== "none" ? { thinkingMode } : {}) };
    }
  }
  const disabledRoles = new Set(current.disabledRoles);
  for (const role of input.clearRoles ?? []) {
    if (AI_ROLES.includes(role)) disabledRoles.add(role);
  }
  for (const role of AI_ROLES) {
    const candidate = input.roles?.[role];
    if (!candidate) continue;
    const provider = getAiProvider(candidate.providerId);
    if (!provider || !candidate.modelId.trim()) throw new Error(`Unknown provider or empty model for ${role}.`);
    const modelId = candidate.modelId.trim();
    const thinkingMode = thinkingModes[`${provider.id}:${modelId}`];
    roles[role] = { providerId: provider.id, modelId, ...(thinkingMode && thinkingMode !== "none" ? { thinkingMode } : {}) };
    disabledRoles.delete(role);
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
  const next = {
    schemaVersion: 1 as const,
    updatedAt: new Date().toISOString(),
    roles,
    enabledProviders,
    providerEndpoints,
    providerModels,
    thinkingModes,
    disabledRoles: [...disabledRoles],
  };
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
    "openai-codex": [
      "gpt-5.3-codex-spark",
      "gpt-5.4",
      "gpt-5.4-mini",
      "gpt-5.5",
      "gpt-5.6-luna",
      "gpt-5.6-sol",
      "gpt-5.6-terra",
    ],
    openai: ["gpt-4o-mini", "gpt-4.1-mini"],
    anthropic: ["claude-sonnet-4-6", "claude-haiku-4-5"],
    gemini: ["gemini-2.5-flash", "gemini-2.5-pro"],
    "xai-oauth": ["grok-4", "grok-3-mini"],
    xai: ["grok-4", "grok-3-mini"],
    deepseek: ["deepseek-chat", "deepseek-reasoner"],
    mistral: ["mistral-large-latest", "mistral-small-latest"],
    ollama: [],
  };
  const names: Record<string, Record<string, string>> = {
    "openai-codex": {
      "gpt-5.3-codex-spark": "GPT-5.3 Codex Spark",
      "gpt-5.4": "GPT-5.4",
      "gpt-5.4-mini": "GPT-5.4 mini",
      "gpt-5.5": "GPT-5.5",
      "gpt-5.6-luna": "GPT-5.6 Luna",
      "gpt-5.6-sol": "GPT-5.6 Sol",
      "gpt-5.6-terra": "GPT-5.6 Terra",
    },
  };
  return (seeds[providerId] ?? []).map((id) => ({
    providerId,
    id,
    name: names[providerId]?.[id] ?? id,
    capabilities: providerId === "openai-codex" && id !== "gpt-5.3-codex-spark" ? ["chat", "vision"] as AiCapability[] : ["chat"] as AiCapability[],
    thinkingLevels: providerId === "openai-codex" ? ["low", "medium", "high", "xhigh"] : undefined,
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
      thinkingLevels: (() => {
        const parameters = Array.isArray(value.supported_parameters) ? value.supported_parameters.map((item) => String(item).toLowerCase()) : [];
        return parameters.some((item) => item.includes("reasoning")) ? ["low", "medium", "high", "xhigh"] : undefined;
      })(),
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
  const settings = await readAiSettingsDocument();

  if (providerId === "openrouter") {
    const openRouter = await readOpenRouterSettings();
    const result = await getOpenRouterModels({ apiKey: openRouter.apiKey, forceRefresh });
    return result.models.map((model) => ({
      providerId,
      id: model.id,
      name: model.name,
      capabilities: model.supportsImageGeneration ? ["chat", "vision", "image-generation"] : ["chat"],
      contextLength: model.contextLength,
      inputPricePer1M: model.promptPricePer1M,
      outputPricePer1M: model.completionPricePer1M,
      thinkingLevels: model.thinkingLevels,
      live: !result.fromCache,
    }));
  }

  const localEndpoint = provider.kind === "local" ? settings.providerEndpoints?.[providerId] ?? "" : "";
  if (provider.kind === "local" && !(await checkLocalProviderEndpoint(localEndpoint))) return [];
  const cache = await readAiModelCache(providerId);
  if (!forceRefresh && isAiModelCacheFresh(cache)) return cache?.models ?? [];
  const seed = seedModels(providerId);
  const modelsEndpoint = provider.kind === "local"
    ? localModelsEndpoint(localEndpoint)
    : provider.modelsEndpoint;
  if (!modelsEndpoint) return providerId === "openai-codex" ? seed : cache?.models ?? seed;

  let apiKey = "";
  try {
    apiKey = providerId === "xai-oauth" ? await readXaiOAuthAccessToken() : await readProviderKey(providerId);
  } catch {
    return cache?.models ?? seed;
  }
  if (provider.auth !== "none" && !apiKey) return cache?.models ?? seed;

  try {
    const response = await fetch(modelsEndpoint, {
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

async function providerStatus(providerId: string, settings: AiSettingsDocument): Promise<AiProviderStatus> {
  const provider = getAiProvider(providerId)!;
  const apiKey = provider.auth === "api_key" ? await readProviderKey(providerId) : "";
  const endpoint = provider.kind === "local" ? settings.providerEndpoints?.[providerId] : undefined;
  let connected = provider.kind === "local" ? await checkLocalProviderEndpoint(endpoint ?? "") : false;
  let expiresAt: string | undefined;
  if (provider.auth === "oauth") {
    try {
      if (providerId === "xai-oauth") {
        await readXaiOAuthAccessToken();
        const session = JSON.parse(await fs.readFile(path.join(OAUTH_DIR, `${providerId}.json`), "utf8")) as { expiresAt?: string };
        connected = Boolean(session.expiresAt && Date.parse(session.expiresAt) > Date.now());
        expiresAt = session.expiresAt;
      } else if (providerId === "openai-codex") {
        const status = await getCodexOAuthStatus();
        connected = status.connected;
        expiresAt = status.expiresAt;
      }
    } catch {
      connected = false;
    }
  }
  return {
    id: provider.id,
    name: provider.name,
    kind: provider.kind,
    auth: provider.auth,
    configured: provider.kind === "local" ? connected : Boolean(apiKey) || connected,
    connected,
    endpoint,
    apiKeyMasked: apiKey ? maskApiKey(apiKey) : undefined,
    expiresAt,
    oauthVerificationUri: provider.oauthVerificationUri,
    capabilities: provider.capabilities,
  };
}

export async function getAiSettingsResponse(
  forceRefresh = false,
  requestedProviderIds: string[] = [],
): Promise<AiSettingsResponse> {
  const document = await readAiSettingsDocument();
  const providers = await Promise.all(AI_PROVIDER_REGISTRY.map((provider) => providerStatus(provider.id, document)));
  const roleProviderIds = AI_ROLES
    .filter((role) => !document.disabledRoles.includes(role))
    .map((role) => document.roles[role].providerId);
  const requested = requestedProviderIds.filter((providerId) => getAiProvider(providerId));
  const modelProviderIds = [...new Set([
    ...roleProviderIds.filter((providerId) => {
      const status = providers.find((provider) => provider.id === providerId);
      return status?.kind !== "local" || status.connected;
    }),
    ...requested.filter((providerId) => {
      const status = providers.find((provider) => provider.id === providerId);
      return status?.kind !== "local" || status.connected;
    }),
    ...providers.filter((provider) => provider.configured).map((provider) => provider.id),
  ])];
  const modelGroups = await Promise.all(
    modelProviderIds.map((providerId) => fetchAiModels(providerId, forceRefresh && (requested.length === 0 || requested.includes(providerId)))),
  );
  const quotas: AiQuota[] = [];
  const codex = providers.find((provider) => provider.id === "openai-codex");
  if (codex?.configured) quotas.push(...await fetchCodexQuotas());
  const openRouter = providers.find((provider) => provider.id === "openrouter");
  if (openRouter?.configured) {
    const credit = await fetchOpenRouterCredit(await readProviderKey("openrouter"));
    quotas.push({ providerId: "openrouter", available: credit.available, label: credit.label, remaining: credit.remainingUsd, limit: credit.limitUsd, unit: "USD", period: "monthly", checkedAt: credit.checkedAt });
  }
  const xaiOAuth = providers.find((provider) => provider.id === "xai-oauth");
  if (xaiOAuth?.configured) quotas.push(...await fetchXaiQuotas());
  return { ...document, providers, models: modelGroups.flat(), quotas };
}
