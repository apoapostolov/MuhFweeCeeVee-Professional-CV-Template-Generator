import { getAiProvider } from "./aiProviderRegistry";
import { readAiProviderKey, readAiSettingsDocument } from "./aiSettings";
import { readOpenRouterSettings } from "./openRouterSettings";
import { readXaiOAuthAccessToken } from "./xaiOAuth";
import { readCodexOAuthAccessToken, readCodexOAuthCredentials } from "./openaiCodexOAuth";
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

async function completeCodexResponse(
  modelId: string,
  messages: ChatMessage[],
  maxTokens: number,
  images: string[] = [],
): Promise<string> {
  const credentials = await readCodexOAuthCredentials();
  const system = messages.find((message) => message.role === "system")?.content;
  const input: Array<{
    type: "message";
    role: "assistant" | "user";
    content: Array<{ type: "output_text" | "input_text" | "input_image"; text?: string; image_url?: string }>;
  }> = messages
    .filter((message) => message.role !== "system")
    .map((message) => ({
      type: "message",
      role: message.role === "assistant" ? "assistant" : "user",
      content: [{ type: message.role === "assistant" ? "output_text" : "input_text", text: message.content }],
    }));
  if (images.length > 0) {
    const last = input[input.length - 1];
    if (last) {
      last.content.push(...images.map((image) => ({ type: "input_image" as const, image_url: image })));
    }
  }
  const response = await fetch("https://chatgpt.com/backend-api/codex/responses", {
    method: "POST",
    headers: {
      authorization: `Bearer ${credentials.accessToken}`,
      "content-type": "application/json",
      ...(credentials.accountId ? { "ChatGPT-Account-Id": credentials.accountId } : {}),
    },
    body: JSON.stringify({
      model: modelId,
      store: false,
      stream: true,
      ...(system ? { instructions: system } : {}),
      input,
    }),
    signal: AbortSignal.timeout(120000),
  });
  const raw = await response.text();
  if (!response.ok) throw providerRequestError("OpenAI Codex (OAuth)", response.status, raw);
  let text = "";
  for (const line of raw.split(/\r?\n/)) {
    if (!line.startsWith("data: ")) continue;
    const data = line.slice(6).trim();
    if (data === "[DONE]") continue;
    try {
      const event = JSON.parse(data) as Record<string, unknown>;
      if (event.type === "response.output_text.delta" && typeof event.delta === "string") text += event.delta;
    } catch {
      // Ignore keepalive and malformed SSE lines. The final empty-response check reports failure.
    }
  }
  if (!text.trim()) throw new Error("AI provider OpenAI Codex (OAuth) returned an empty response.");
  return text;
}

export type VisionCompletionInput = {
  role: Extract<AiRole, "vision">;
  prompt: string;
  images: string[];
  temperature?: number;
  maxTokens: number;
};

export async function completeAiText(input: CompletionInput): Promise<CompletionResponse> {
  const settings = await readAiSettingsDocument();
  const binding = settings.disabledRoles.includes(input.role) ? null : settings.roles[input.role];
  if (!binding) throw new Error(`No AI provider is configured for ${input.role}.`);
  const provider = getAiProvider(binding.providerId);
  if (!provider) throw new Error(`AI provider '${binding.providerId}' is not configured for ${input.role}.`);
  const apiKey = provider.id === "xai-oauth"
    ? await readXaiOAuthAccessToken()
    : provider.id === "openai-codex"
      ? await readCodexOAuthAccessToken()
      : await readAiProviderKey(provider.id);
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

  if (provider.id === "openai-codex") {
    const text = await completeCodexResponse(binding.modelId, input.messages, input.maxTokens);
    return { text, providerId: provider.id, modelId: binding.modelId };
  }

  const baseEndpoint = provider.kind === "local"
    ? settings.providerEndpoints?.[provider.id]
    : provider.id === "openrouter"
      ? (await readOpenRouterSettings()).baseUrl
      : provider.endpoint;
  const endpoint = baseEndpoint ? `${baseEndpoint.replace(/\/$/, "")}/chat/completions` : "";
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
      ...(binding.thinkingMode && binding.thinkingMode !== "none" ? { reasoning_effort: binding.thinkingMode } : {}),
    }),
    signal: AbortSignal.timeout(30000),
  });
  const payload = await readResponseBody(response, provider.name);
  const text = extractOpenAiText(payload);
  if (!text.trim()) throw new Error(`AI provider ${provider.name} returned an empty response.`);
  return { text, providerId: provider.id, modelId: binding.modelId };
}

export async function completeAiVision(input: VisionCompletionInput): Promise<CompletionResponse> {
  const settings = await readAiSettingsDocument();
  const binding = settings.disabledRoles.includes(input.role) ? null : settings.roles[input.role];
  if (!binding) throw new Error("No AI provider is configured for the vision role.");
  const provider = getAiProvider(binding.providerId);
  if (!provider) throw new Error(`AI provider '${binding.providerId}' is not configured for the vision role.`);
  const apiKey = provider.id === "xai-oauth"
    ? await readXaiOAuthAccessToken()
    : provider.id === "openai-codex"
      ? await readCodexOAuthAccessToken()
      : await readAiProviderKey(provider.id);
  if (provider.auth !== "none" && !apiKey) throw new Error(`AI provider ${provider.name} is not configured for the vision role.`);
  const images = input.images.filter((image) => image.startsWith("data:image/"));
  if (images.length === 0) throw new Error("At least one valid image is required.");

  if (provider.id === "gemini") {
    const endpoint = `${provider.endpoint}/models/${encodeURIComponent(binding.modelId)}:generateContent?key=${encodeURIComponent(apiKey)}`;
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: input.prompt }, ...images.map((image) => { const [header, data] = image.split(",", 2); return { inlineData: { mimeType: header.match(/^data:([^;]+);/)?.[1] ?? "image/jpeg", data } }; })] }],
        generationConfig: { temperature: input.temperature, maxOutputTokens: input.maxTokens },
      }),
    });
    const payload = await readResponseBody(response, provider.name);
    const text = extractGeminiText(payload);
    if (!text.trim()) throw new Error(`AI provider ${provider.name} returned an empty response.`);
    return { text, providerId: provider.id, modelId: binding.modelId };
  }

  if (provider.id === "anthropic") {
    const response = await fetch(`${provider.endpoint}/messages`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: binding.modelId, max_tokens: input.maxTokens, temperature: input.temperature, messages: [{ role: "user", content: [{ type: "text", text: input.prompt }, ...images.map((image) => { const [header, data] = image.split(",", 2); return { type: "image", source: { type: "base64", media_type: header.match(/^data:([^;]+);/)?.[1] ?? "image/jpeg", data } }; })] }] }),
    });
    const payload = await readResponseBody(response, provider.name);
    const text = extractAnthropicText(payload);
    if (!text.trim()) throw new Error(`AI provider ${provider.name} returned an empty response.`);
    return { text, providerId: provider.id, modelId: binding.modelId };
  }

  if (provider.id === "openai-codex") {
    const text = await completeCodexResponse(binding.modelId, [{ role: "user", content: input.prompt }], input.maxTokens, images);
    return { text, providerId: provider.id, modelId: binding.modelId };
  }

  const baseEndpoint = provider.kind === "local"
    ? settings.providerEndpoints?.[provider.id]
    : provider.id === "openrouter"
      ? (await readOpenRouterSettings()).baseUrl
      : provider.endpoint;
  const endpoint = baseEndpoint ? `${baseEndpoint.replace(/\/$/, "")}/chat/completions` : "";
  if (!endpoint) throw new Error(`AI provider ${provider.name} has no vision endpoint.`);
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "content-type": "application/json", ...(apiKey ? { authorization: `Bearer ${apiKey}` } : {}) },
    body: JSON.stringify({ model: binding.modelId, messages: [{ role: "user", content: [{ type: "text", text: input.prompt }, ...images.map((image) => ({ type: "image_url", image_url: { url: image } }))] }], temperature: input.temperature, max_tokens: input.maxTokens }),
  });
  const payload = await readResponseBody(response, provider.name);
  const text = extractOpenAiText(payload);
  if (!text.trim()) throw new Error(`AI provider ${provider.name} returned an empty response.`);
  return { text, providerId: provider.id, modelId: binding.modelId };
}
