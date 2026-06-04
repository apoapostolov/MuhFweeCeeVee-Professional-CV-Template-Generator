import {
  DEFAULT_OPENROUTER_RESEARCH_MODEL,
  resolveOpenRouterResearchModelId,
} from "@/lib/openrouter-research-model";
import { buildResearchOpenRouterRequestExtras } from "@/lib/research/research-web-search";
import { readOpenRouterSettings } from "./openRouterSettings";

export { DEFAULT_OPENROUTER_RESEARCH_MODEL };

export function extractOpenRouterTextContent(input: string): string {
  const trimmed = input.trim();
  if (trimmed.startsWith("```")) {
    const withoutFence = trimmed.replace(/^```[a-z]*\n?/i, "").replace(/\n?```$/, "");
    return withoutFence.trim();
  }
  return trimmed;
}

export function resolveOpenRouterResearchModel(researchModel: string): string {
  return resolveOpenRouterResearchModelId(researchModel);
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

  const model = resolveOpenRouterResearchModel(
    settings.researchModel || DEFAULT_OPENROUTER_RESEARCH_MODEL,
  );
  const searchExtras = buildResearchOpenRouterRequestExtras(model);

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
      ...searchExtras,
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