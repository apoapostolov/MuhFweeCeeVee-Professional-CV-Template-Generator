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

export type OpenRouterChatOptions = {
  /** D2: when true, use research model + web search extras. Default false. */
  useWebSearch?: boolean;
  /** Override model id (optional). */
  model?: string;
  temperature?: number;
};

/**
 * OpenRouter chat for research/analysis paths.
 * D2: useWebSearch false → analysis model, no web extras.
 * useWebSearch true → research model + web search extras when supported.
 */
export async function callOpenRouterResearchChat(
  prompt: string,
  systemContent: string,
  options?: OpenRouterChatOptions,
): Promise<
  | {
      ok: true;
      content: string;
      model: string;
      useWebSearch: boolean;
    }
  | {
      ok: false;
      error: string;
      status?: number;
      raw?: string;
    }
> {
  const settings = await readOpenRouterSettings();
  const apiKey = settings.apiKey || process.env.OPENROUTER_API_KEY || "";
  if (!apiKey) {
    return { ok: false, error: "OpenRouter API key is not configured." };
  }

  // Legacy callers (company/job research) omit options → keep web research model.
  // Field refine / staged cheap fill pass useWebSearch: false explicitly (D2).
  const useWebSearch =
    options && Object.prototype.hasOwnProperty.call(options, "useWebSearch")
      ? options.useWebSearch === true
      : true;
  const analysisModel =
    (settings.model && settings.model.trim()) || "openai/gpt-4o-mini";
  const researchModel = resolveOpenRouterResearchModel(
    settings.researchModel || DEFAULT_OPENROUTER_RESEARCH_MODEL,
  );
  const model =
    (options?.model && options.model.trim()) ||
    (useWebSearch ? researchModel : analysisModel);

  const searchExtras = useWebSearch ? buildResearchOpenRouterRequestExtras(model) : {};
  const temperature = options?.temperature ?? (useWebSearch ? 0.25 : 0.2);

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
      temperature,
      ...searchExtras,
    }),
  });

  if (!response.ok) {
    const raw = await response.text();
    return {
      ok: false,
      error: useWebSearch
        ? "OpenRouter research request failed."
        : "OpenRouter analysis request failed.",
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

  return { ok: true, content, model, useWebSearch };
}
