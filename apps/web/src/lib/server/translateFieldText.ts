import { LANGUAGE_OPTIONS } from "@/components/composer/constants";
import { readOpenRouterSettings } from "@/lib/server/openRouterSettings";

const LANGUAGE_LABELS = new Map(LANGUAGE_OPTIONS.map((entry) => [entry.code, entry.label]));

function extractTextContent(input: string): string {
  const trimmed = input.trim();
  if (trimmed.startsWith("```")) {
    return trimmed.replace(/^```[a-z]*\n?/i, "").replace(/\n?```$/, "").trim();
  }
  return trimmed;
}

export function isDefinedLanguageCode(code: string): boolean {
  const normalized = code.trim().toLowerCase();
  return LANGUAGE_OPTIONS.some((entry) => entry.code === normalized);
}

export function languageDisplayName(code: string): string {
  const normalized = code.trim().toLowerCase();
  return LANGUAGE_LABELS.get(normalized) ?? normalized.toUpperCase();
}

export async function translateFieldText(args: {
  text: string;
  sourceLanguage: string;
  targetLanguage: string;
  fieldLabel?: string;
}): Promise<string> {
  const settings = await readOpenRouterSettings();
  const apiKey = settings.apiKey || process.env.OPENROUTER_API_KEY || "";
  if (!apiKey.trim()) {
    throw new Error("OpenRouter API key is not configured.");
  }

  const sourceName = languageDisplayName(args.sourceLanguage);
  const targetName = languageDisplayName(args.targetLanguage);
  const fieldHint = args.fieldLabel?.trim() ? `Field: ${args.fieldLabel.trim()}` : "Field: CV text";

  const prompt = [
    "Translate the CV field text from the source language to the target language.",
    "Preserve meaning, professional tone, names, dates, numbers, URLs, and emails.",
    "Do not add commentary, quotes, or markdown.",
    "Return only the translated text.",
    `Source language: ${sourceName} (${args.sourceLanguage})`,
    `Target language: ${targetName} (${args.targetLanguage})`,
    fieldHint,
    "",
    "Text:",
    args.text,
  ].join("\n");

  const response = await fetch(settings.baseUrl, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: settings.model || "openai/gpt-4o-mini",
      messages: [
        { role: "system", content: "You are a professional CV translator." },
        { role: "user", content: prompt },
      ],
      temperature: 0.1,
    }),
  });

  if (!response.ok) {
    const raw = await response.text();
    throw new Error(`OpenRouter request failed (${response.status}): ${raw}`);
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = data.choices?.[0]?.message?.content ?? "";
  const translated = extractTextContent(content);
  if (!translated) {
    throw new Error("OpenRouter returned an empty translation.");
  }
  return translated;
}