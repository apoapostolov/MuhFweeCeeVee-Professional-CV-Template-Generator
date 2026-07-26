import { callOpenRouterResearchChat } from "@/lib/server/openRouterResearch";

import {
  buildHumanizeSystemPrompt,
  buildHumanizeUserPrompt,
  loadAiSkillForHook,
} from "./loadAiSkill";
import type { LoadedAiSkillBundle } from "./types";

export type ApplySkillResult =
  | {
      ok: true;
      text: string;
      skill: Pick<LoadedAiSkillBundle, "skillId" | "skillName" | "hook" | "filesLoaded">;
      model: string;
    }
  | {
      ok: false;
      error: string;
      /** Original text when postprocess fails — caller may keep draft. */
      fallbackText?: string;
      skill?: Pick<LoadedAiSkillBundle, "skillId" | "skillName" | "hook">;
    };

/**
 * Run a registered product skill as a postprocess pass over AI (or user) text.
 * Soft-fails: returns ok:false with fallbackText so callers can keep the draft.
 */
export async function applyAiSkillPostprocess(options: {
  hook: string;
  text: string;
  context?: {
    companyName?: string;
    jobTitle?: string;
    applicantName?: string;
  };
}): Promise<ApplySkillResult> {
  const draft = options.text.trim();
  if (!draft) {
    return { ok: false, error: "No text to process.", fallbackText: options.text };
  }

  const bundle = await loadAiSkillForHook(options.hook);
  if (!bundle) {
    return {
      ok: false,
      error: `No AI skill registered for hook "${options.hook}".`,
      fallbackText: draft,
    };
  }

  if (bundle.mode !== "postprocess") {
    return {
      ok: false,
      error: `Skill hook "${options.hook}" is mode=${bundle.mode}, not postprocess.`,
      fallbackText: draft,
      skill: {
        skillId: bundle.skillId,
        skillName: bundle.skillName,
        hook: bundle.hook,
      },
    };
  }

  const system = buildHumanizeSystemPrompt(bundle);
  const user = buildHumanizeUserPrompt(draft, options.context);
  const result = await callOpenRouterResearchChat(user, system, {
    useWebSearch: false,
    temperature: 0.35,
  });

  if (!result.ok) {
    return {
      ok: false,
      error: result.error,
      fallbackText: draft,
      skill: {
        skillId: bundle.skillId,
        skillName: bundle.skillName,
        hook: bundle.hook,
      },
    };
  }

  const revised = result.content.trim();
  if (!revised || revised.startsWith("ERROR:")) {
    return {
      ok: false,
      error: revised || "Skill returned empty text.",
      fallbackText: draft,
      skill: {
        skillId: bundle.skillId,
        skillName: bundle.skillName,
        hook: bundle.hook,
      },
    };
  }

  return {
    ok: true,
    text: revised,
    model: result.model,
    skill: {
      skillId: bundle.skillId,
      skillName: bundle.skillName,
      hook: bundle.hook,
      filesLoaded: bundle.filesLoaded,
    },
  };
}
