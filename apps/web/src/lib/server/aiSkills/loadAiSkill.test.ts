import { describe, expect, it } from "vitest";

import {
  buildHumanizeSystemPrompt,
  buildHumanizeUserPrompt,
  listEnabledAiSkills,
  loadAiSkillForHook,
  readAiSkillManifest,
} from "./loadAiSkill";

describe("ai-skills loader", () => {
  it("reads manifest with humanizer skill", async () => {
    const manifest = await readAiSkillManifest();
    expect(manifest.version).toBe(1);
    const humanizer = manifest.skills.find((s) => s.id === "humanizer");
    expect(humanizer?.enabled).not.toBe(false);
    expect(humanizer?.hooks?.cover_letter_draft?.mode).toBe("postprocess");
  });

  it("lists enabled skills with hooks", async () => {
    const list = await listEnabledAiSkills();
    const humanizer = list.find((s) => s.id === "humanizer");
    expect(humanizer).toBeTruthy();
    expect(humanizer?.hooks).toContain("cover_letter_draft");
    expect(humanizer?.hooks).toContain("cover_letter_humanize");
  });

  it("loads cover_letter_draft bundle with skill files", async () => {
    const bundle = await loadAiSkillForHook("cover_letter_draft");
    expect(bundle).toBeTruthy();
    expect(bundle!.skillId).toBe("humanizer");
    expect(bundle!.mode).toBe("postprocess");
    expect(bundle!.filesLoaded).toContain("SKILL.md");
    expect(bundle!.filesLoaded).toContain("cover-letter.md");
    expect(bundle!.instructions).toMatch(/Humanizer/i);
    expect(bundle!.instructions).toMatch(/cover letter/i);
  });

  it("returns null for unknown hooks", async () => {
    const bundle = await loadAiSkillForHook("no_such_hook_xyz");
    expect(bundle).toBeNull();
  });

  it("builds system and user prompts", async () => {
    const bundle = await loadAiSkillForHook("cover_letter_humanize");
    expect(bundle).toBeTruthy();
    const system = buildHumanizeSystemPrompt(bundle!);
    expect(system).toMatch(/humanizer/i);
    const user = buildHumanizeUserPrompt("I am excited to apply for this role.", {
      companyName: "Acme",
      jobTitle: "Engineer",
      applicantName: "Ada",
    });
    expect(user).toContain("Acme");
    expect(user).toContain("I am excited to apply");
    expect(user).toContain("--- DRAFT ---");
  });
});
