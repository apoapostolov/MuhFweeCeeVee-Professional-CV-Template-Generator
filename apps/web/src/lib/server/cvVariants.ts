export type CvLanguage = string;
export type SyncLanguage = "bg" | "en";

export type CvVariantParts = {
  language: CvLanguage;
  iteration: string;
  target: string;
};

export type CvVariantPartsLoose = {
  language: CvLanguage;
  iteration: string | null;
  target: string;
};

const CV_ID_PATTERN = /^cv_([a-z]{2,8})_(\d{3,4})_([a-z0-9][a-z0-9_-]{1,79})$/i;
/** e.g. cv_apoapostolov_en_001 — owner slug, language, iteration; target from metadata.variant */
const CV_ID_PATTERN_PROFILE_LANG_ITER =
  /^cv_([a-z0-9][a-z0-9_-]{1,79})_([a-z]{2,8})_(\d{3,4})$/i;
const CV_ID_PATTERN_NO_ITERATION = /^cv_([a-z]{2,8})_([a-z0-9][a-z0-9_-]{1,79})$/i;
const SYNC_LANGUAGES = new Set<SyncLanguage>(["bg", "en"]);

export function isSupportedLanguage(value: string): value is CvLanguage {
  return /^[a-z]{2,8}$/i.test(value.trim());
}

export function isSyncLanguage(value: string): value is SyncLanguage {
  return SYNC_LANGUAGES.has(value as SyncLanguage);
}

export function parseCvVariantId(cvId: string): CvVariantParts | null {
  const match = CV_ID_PATTERN.exec(cvId.trim());
  if (!match) {
    return null;
  }

  const language = match[1].toLowerCase();
  if (!isSupportedLanguage(language)) {
    return null;
  }

  return {
    language,
    iteration: match[2],
    target: match[3].toLowerCase(),
  };
}

export function buildCvVariantId(parts: CvVariantParts): string {
  return `cv_${parts.language.toLowerCase()}_${parts.iteration}_${parts.target}`;
}

export type CvProfileVariantParts = {
  profile: string;
  language: CvLanguage;
  iteration: string;
};

export function parseCvProfileVariantId(cvId: string): CvProfileVariantParts | null {
  const match = CV_ID_PATTERN_PROFILE_LANG_ITER.exec(cvId.trim());
  if (!match) {
    return null;
  }
  const language = match[2].toLowerCase();
  if (!isSupportedLanguage(language)) {
    return null;
  }
  return {
    profile: match[1].toLowerCase(),
    language,
    iteration: match[3],
  };
}

export function buildCvProfileVariantId(parts: CvProfileVariantParts): string {
  return `cv_${parts.profile.toLowerCase()}_${parts.language.toLowerCase()}_${parts.iteration}`;
}

/** Resolve the paired CV file id for another language (same iteration/target or profile slug). */
export function resolveSiblingCvId(cvId: string, targetLanguage: string): string | null {
  const lang = targetLanguage.trim().toLowerCase();
  if (!isSupportedLanguage(lang)) {
    return null;
  }

  const profile = parseCvProfileVariantId(cvId);
  if (profile) {
    return buildCvProfileVariantId({ profile: profile.profile, language: lang, iteration: profile.iteration });
  }

  const strict = parseCvVariantId(cvId);
  if (strict) {
    return buildCvVariantId({ language: lang, iteration: strict.iteration, target: strict.target });
  }

  const loose = parseCvVariantIdLoose(cvId);
  if (loose?.target) {
    return buildCvVariantIdLoose({ language: lang, iteration: loose.iteration, target: loose.target });
  }

  return null;
}

export function parseCvVariantIdLoose(cvId: string): CvVariantPartsLoose | null {
  const strict = parseCvVariantId(cvId);
  if (strict) {
    return {
      language: strict.language,
      iteration: strict.iteration,
      target: strict.target,
    };
  }

  const profileMatch = CV_ID_PATTERN_PROFILE_LANG_ITER.exec(cvId.trim());
  if (profileMatch) {
    const language = profileMatch[2].toLowerCase();
    if (!isSupportedLanguage(language)) {
      return null;
    }
    return {
      language,
      iteration: profileMatch[3],
      target: "",
    };
  }

  const match = CV_ID_PATTERN_NO_ITERATION.exec(cvId.trim());
  if (!match) {
    return null;
  }

  const language = match[1].toLowerCase();
  if (!isSupportedLanguage(language)) {
    return null;
  }

  return {
    language,
    iteration: null,
    target: match[2].toLowerCase(),
  };
}

export function buildCvVariantIdLoose(parts: CvVariantPartsLoose, profileSlug?: string): string {
  if (profileSlug?.trim()) {
    return buildCvProfileVariantId({
      profile: profileSlug.trim().toLowerCase(),
      language: parts.language,
      iteration: parts.iteration?.trim() || "001",
    });
  }
  if (parts.iteration && parts.iteration.trim().length > 0 && parts.target.trim().length > 0) {
    return buildCvVariantId({
      language: parts.language,
      iteration: parts.iteration,
      target: parts.target,
    });
  }
  return `cv_${parts.language.toLowerCase()}_${parts.target}`;
}

export function siblingLanguage(language: SyncLanguage): SyncLanguage {
  return language === "bg" ? "en" : "bg";
}

export type CvVariantListItem = {
  id: string;
  language?: string | null;
  iteration?: string | null;
  target?: string | null;
};

/** Groups language variants for Print Controls pills and CV Template pairs. */
export function cvVariantGroupKey(item: CvVariantListItem): string | null {
  const profile = parseCvProfileVariantId(item.id);
  if (profile) {
    return `profile:${profile.profile}:${profile.iteration}`;
  }

  const iteration = (item.iteration ?? "").trim();
  const target = (item.target ?? "").trim().toLowerCase();
  if (iteration && target) {
    return `iter:${iteration}:${target}`;
  }

  const loose = parseCvVariantIdLoose(item.id);
  if (loose?.iteration && loose.target) {
    return `iter:${loose.iteration}:${loose.target}`;
  }
  if (loose?.iteration) {
    return `iter:${loose.iteration}:profile`;
  }

  return null;
}
