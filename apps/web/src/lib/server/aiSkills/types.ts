export type AiSkillHookMode = "postprocess" | "inject";

export type AiSkillHookConfig = {
  mode: AiSkillHookMode;
  depth?: "cleanup" | "rewrite" | "voice_match" | "critique";
  files: string[];
};

export type AiSkillManifestEntry = {
  id: string;
  name: string;
  description?: string;
  enabled?: boolean;
  source?: {
    repo?: string;
    path?: string;
    license?: string;
  };
  hooks?: Record<string, AiSkillHookConfig>;
};

export type AiSkillManifest = {
  version: number;
  description?: string;
  skills: AiSkillManifestEntry[];
};

export type LoadedAiSkillBundle = {
  skillId: string;
  skillName: string;
  hook: string;
  mode: AiSkillHookMode;
  depth: string;
  /** Concatenated instruction text for the model. */
  instructions: string;
  filesLoaded: string[];
};
