import { readOpenRouterSettings } from "./openRouterSettings";

export const DEFAULT_OPENROUTER_RESEARCH_MODEL = "perplexity/sonar";

export function extractOpenRouterTextContent(input: string): string {
  const trimmed = input.trim();
  if (trimmed.startsWith("```")) {
    const withoutFence = trimmed.replace(/^```[a-z]*\n?/i, "").replace(/\n?```$/, "");
    return withoutFence.trim();
  }
  return trimmed;
}

export function resolveOpenRouterResearchModel(settingsModel: string): string {
  const env = (process.env.OPENROUTER_COMPANY_RESEARCH_MODEL ?? "").trim();
  if (env.length > 0) {
    return env;
  }
  const normalized = settingsModel.toLowerCase();
  if (normalized.includes("perplexity") || normalized.includes("sonar")) {
    return settingsModel;
  }
  return DEFAULT_OPENROUTER_RESEARCH_MODEL;
}

export async function callOpenRouterResearchChat(prompt: string, systemContent: string): Promise<{
  ok: true;
  content: string;
  model: string;
} | {
  ok: false;
  error: string;
  status?: number;
  raw?: string;
}> {
  const settings = await readOpenRouterSettings();
  const apiKey = settings.apiKey || process.env.OPENROUTER_API_KEY || "";
  if (!apiKey) {
    return { ok: false, error: "OpenRouter API key is not configured." };
  }

  const model = resolveOpenRouterResearchModel(settings.model || DEFAULT_OPENROUTER_RESEARCH_MODEL);

  const response = await fetch(settings.baseUrl, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemContent },
        { role: "user", content: prompt },
      ],
      temperature: 0.25,
    }),
  });

  if (!response.ok) {
    const raw = await response.text();
    return {
      ok: false,
      error: "OpenRouter research request failed.",
      status: response.status,
      raw,
    };
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = extractOpenRouterTextContent(data.choices?.[0]?.message?.content ?? "");
  if (!content) {
    return { ok: false, error: "Empty model response." };
  }

  return { ok: true, content, model };
}