import fs from "node:fs/promises";
import path from "node:path";

import { repoPath } from "@/lib/server/repoPaths";

import type {
  AiSkillManifest,
  AiSkillManifestEntry,
  LoadedAiSkillBundle,
} from "./types";

const MAX_TOTAL_CHARS = 28_000;

export function aiSkillsRoot(): string {
  return repoPath("ai-skills");
}

export async function readAiSkillManifest(): Promise<AiSkillManifest> {
  const manifestPath = path.join(aiSkillsRoot(), "manifest.json");
  const raw = await fs.readFile(manifestPath, "utf8");
  const parsed = JSON.parse(raw) as AiSkillManifest;
  if (!parsed || !Array.isArray(parsed.skills)) {
    throw new Error("ai-skills/manifest.json is invalid.");
  }
  return parsed;
}

export async function listEnabledAiSkills(): Promise<
  Array<{
    id: string;
    name: string;
    description?: string;
    hooks: string[];
    source?: AiSkillManifestEntry["source"];
  }>
> {
  const manifest = await readAiSkillManifest();
  return manifest.skills
    .filter((skill) => skill.enabled !== false)
    .map((skill) => ({
      id: skill.id,
      name: skill.name,
      description: skill.description,
      hooks: Object.keys(skill.hooks ?? {}),
      source: skill.source,
    }));
}

function findSkillForHook(
  manifest: AiSkillManifest,
  hook: string,
): { entry: AiSkillManifestEntry; hookConfig: NonNullable<AiSkillManifestEntry["hooks"]>[string] } | null {
  for (const entry of manifest.skills) {
    if (entry.enabled === false) continue;
    const hookConfig = entry.hooks?.[hook];
    if (hookConfig) {
      return { entry, hookConfig };
    }
  }
  return null;
}

/**
 * Load skill instruction text for a product hook (e.g. cover_letter_draft).
 * Returns null when no skill is registered for the hook.
 */
export async function loadAiSkillForHook(
  hook: string,
  options?: { maxChars?: number },
): Promise<LoadedAiSkillBundle | null> {
  const manifest = await readAiSkillManifest();
  const match = findSkillForHook(manifest, hook);
  if (!match) return null;

  const { entry, hookConfig } = match;
  const skillDir = path.join(aiSkillsRoot(), entry.id);
  const maxChars = options?.maxChars ?? MAX_TOTAL_CHARS;
  const parts: string[] = [];
  const filesLoaded: string[] = [];
  let used = 0;

  for (const rel of hookConfig.files) {
    const safeRel = rel.replace(/\\/g, "/");
    if (safeRel.includes("..") || path.isAbsolute(safeRel)) {
      continue;
    }
    const full = path.join(skillDir, safeRel);
    if (!full.startsWith(skillDir)) continue;
    try {
      const text = await fs.readFile(full, "utf8");
      const remaining = maxChars - used;
      if (remaining <= 0) break;
      const slice = text.length > remaining ? text.slice(0, remaining) : text;
      parts.push(`--- FILE: ${entry.id}/${safeRel} ---\n${slice.trim()}`);
      filesLoaded.push(safeRel);
      used += slice.length;
    } catch {
      // missing optional file — skip
    }
  }

  if (parts.length === 0) {
    return null;
  }

  return {
    skillId: entry.id,
    skillName: entry.name,
    hook,
    mode: hookConfig.mode,
    depth: hookConfig.depth ?? "rewrite",
    instructions: parts.join("\n\n"),
    filesLoaded,
  };
}

export function buildHumanizeSystemPrompt(bundle: LoadedAiSkillBundle): string {
  return [
    `You are applying the product AI skill "${bundle.skillName}" (${bundle.skillId}).`,
    `Hook: ${bundle.hook}. Mode: ${bundle.mode}. Depth: ${bundle.depth}.`,
    "Follow the skill instructions below exactly.",
    "Return only the revised plain-text letter body unless the skill says otherwise.",
    "",
    bundle.instructions,
  ].join("\n");
}

export function buildHumanizeUserPrompt(draft: string, context?: {
  companyName?: string;
  jobTitle?: string;
  applicantName?: string;
}): string {
  const meta = [
    context?.applicantName ? `Applicant: ${context.applicantName}` : "",
    context?.companyName ? `Company: ${context.companyName}` : "",
    context?.jobTitle ? `Role: ${context.jobTitle}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  return [
    "Humanize the following cover letter draft.",
    "Remove AI-isms; preserve facts; do not invent experience.",
    meta ? `\nContext:\n${meta}` : "",
    "",
    "--- DRAFT ---",
    draft.trim(),
    "--- END DRAFT ---",
    "",
    "Return the revised letter body only.",
  ]
    .filter((line) => line !== undefined)
    .join("\n");
}
