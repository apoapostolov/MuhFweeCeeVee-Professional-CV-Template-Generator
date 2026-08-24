import { getAiProvider } from "./aiProviderRegistry";
import { readAiProviderKey, readAiSettingsDocument } from "./aiSettings";
import { readOpenRouterSettings } from "./openRouterSettings";
import type { AiRole } from "./aiProviderTypes";

type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type CompletionInput = {
  role: AiRole;
  messages: ChatMessage[];
  temperature?: number;
  maxTokens: number;
};

type CompletionResponse = {
  text: string;
  providerId: string;
  modelId: string;
};

function providerRequestError(providerName: string, status: number, body: string): Error {
  return new Error(`AI provider ${providerName} request failed (${status}): ${body}`);
}

async function readResponseBody(response: Response, providerName: string): Promise<unknown> {
  const raw = await response.text();
  if (!response.ok) throw providerRequestError(providerName, response.status, raw);
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    throw new Error(`AI provider ${providerName} returned invalid JSON.`);
  }
}

function extractOpenAiText(payload: unknown): string {
  const choices = payload && typeof payload === "object" && !Array.isArray(payload)
    ? (payload as Record<string, unknown>).choices
    : undefined;
  if (!Array.isArray(choices)) return "";
  const message = choices[0] && typeof choices[0] === "object" ? (choices[0] as Record<string, unknown>).message : null;
  return message && typeof message === "object" ? String((message as Record<string, unknown>).content ?? "") : "";
}

function extractAnthropicText(payload: unknown): string {
  const content = payload && typeof payload === "object" && !Array.isArray(payload)
    ? (payload as Record<string, unknown>).content
    : undefined;
  if (!Array.isArray(content)) return "";
  return content
    .filter((part): part is Record<string, unknown> => Boolean(part && typeof part === "object" && !Array.isArray(part)))
    .map((part) => typeof part.text === "string" ? part.text : "")
    .join("");
}

function extractGeminiText(payload: unknown): string {
  const candidates = payload && typeof payload === "object" && !Array.isArray(payload)
    ? (payload as Record<string, unknown>).candidates
    : undefined;
  const content = Array.isArray(candidates) && candidates[0] && typeof candidates[0] === "object"
    ? (candidates[0] as Record<string, unknown>).content
    : undefined;
  const parts = content && typeof content === "object" && !Array.isArray(content)
    ? (content as Record<string, unknown>).parts
    : undefined;
  if (!Array.isArray(parts)) return "";
  return parts
    .filter((part): part is Record<string, unknown> => Boolean(part && typeof part === "object" && !Array.isArray(part)))
    .map((part) => typeof part.text === "string" ? part.text : "")
    .join("");
}

export async function completeAiText(input: CompletionInput): Promise<CompletionResponse> {
  const settings = await readAiSettingsDocument();
  const binding = settings.roles[input.role];
  const provider = getAiProvider(binding.providerId);
  if (!provider) throw new Error(`AI provider '${binding.providerId}' is not configured for ${input.role}.`);
  const apiKey = await readAiProviderKey(provider.id);
  if (provider.auth !== "none" && !apiKey) {
    throw new Error(`AI provider ${provider.name} is not configured for ${input.role}.`);
  }

  if (provider.kind === "native" && provider.id === "anthropic") {
    const response = await fetch(`${provider.endpoint}/messages`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: binding.modelId,
        system: input.messages.find((message) => message.role === "system")?.content,
        messages: input.messages.filter((message) => message.role !== "system"),
        temperature: input.temperature,
        max_tokens: input.maxTokens,
      }),
      signal: AbortSignal.timeout(30000),
    });
    const payload = await readResponseBody(response, provider.name);
    const text = extractAnthropicText(payload);
    if (!text.trim()) throw new Error(`AI provider ${provider.name} returned an empty response.`);
    return { text, providerId: provider.id, modelId: binding.modelId };
  }

  if (provider.kind === "native" && provider.id === "gemini") {
    const endpoint = `${provider.endpoint}/models/${encodeURIComponent(binding.modelId)}:generateContent`;
    const system = input.messages.find((message) => message.role === "system")?.content;
    const contents = input.messages
      .filter((message) => message.role !== "system")
      .map((message) => ({ role: message.role === "assistant" ? "model" : "user", parts: [{ text: message.content }] }));
    const response = await fetch(`${endpoint}?key=${encodeURIComponent(apiKey)}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        ...(system ? { systemInstruction: { parts: [{ text: system }] } } : {}),
        contents,
        generationConfig: { temperature: input.temperature, maxOutputTokens: input.maxTokens },
      }),
      signal: AbortSignal.timeout(30000),
    });
    const payload = await readResponseBody(response, provider.name);
    const text = extractGeminiText(payload);
    if (!text.trim()) throw new Error(`AI provider ${provider.name} returned an empty response.`);
    return { text, providerId: provider.id, modelId: binding.modelId };
  }

  const endpoint = provider.id === "openrouter"
    ? (await readOpenRouterSettings()).baseUrl
    : `${provider.endpoint?.replace(/\/$/, "")}/chat/completions`;
  if (!endpoint) throw new Error(`AI provider ${provider.name} has no completion endpoint.`);
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(apiKey ? { authorization: `Bearer ${apiKey}` } : {}),
    },
    body: JSON.stringify({
      model: binding.modelId,
      messages: input.messages,
      temperature: input.temperature,
      max_tokens: input.maxTokens,
    }),
    signal: AbortSignal.timeout(30000),
  });
  const payload = await readResponseBody(response, provider.name);
  const text = extractOpenAiText(payload);
  if (!text.trim()) throw new Error(`AI provider ${provider.name} returned an empty response.`);
  return { text, providerId: provider.id, modelId: binding.modelId };
}
