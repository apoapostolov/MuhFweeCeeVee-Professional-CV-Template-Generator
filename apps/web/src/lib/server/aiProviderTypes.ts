export type AiCapability = "chat" | "vision" | "image-generation" | "research";
export type AiAuthMethod = "api_key" | "oauth" | "none";
export type AiRole =
  | "assistant"
  | "analysis"
  | "research"
  | "vision"
  | "translation"
  | "field-rewrite"
  | "image-generation";

export type AiProviderKind = "openai-compatible" | "native" | "local";

export type AiProviderDefinition = {
  id: string;
  name: string;
  kind: AiProviderKind;
  auth: AiAuthMethod;
  endpoint?: string;
  modelsEndpoint?: string;
  capabilities: AiCapability[];
  oauthVerificationUri?: string;
};

export type AiModel = {
  providerId: string;
  id: string;
  name: string;
  capabilities: AiCapability[];
  contextLength: number | null;
  inputPricePer1M: number | null;
  outputPricePer1M: number | null;
  live: boolean;
};

export type AiRoleBinding = {
  providerId: string;
  modelId: string;
};

export type AiSettingsDocument = {
  schemaVersion: 1;
  updatedAt: string;
  roles: Record<AiRole, AiRoleBinding>;
  disabledRoles: AiRole[];
};

export type AiProviderStatus = {
  id: string;
  name: string;
  kind: AiProviderKind;
  auth: AiAuthMethod;
  configured: boolean;
  connected: boolean;
  apiKeyMasked?: string;
  expiresAt?: string;
  oauthVerificationUri?: string;
  capabilities: AiCapability[];
};

export type AiQuota = {
  providerId: string;
  available: boolean;
  label: string;
  remaining: number | null;
  limit: number | null;
  unit: "USD" | "tokens" | "requests";
  period: "monthly" | "weekly" | "daily" | "rolling" | "unknown";
  checkedAt: string;
};

export type AiSettingsResponse = AiSettingsDocument & {
  providers: AiProviderStatus[];
  models: AiModel[];
  quotas: AiQuota[];
};
