import type { JobAtsProfile } from "./types";

/** ATS helper terms from researched job data (keywords + action verbs). */
export function collectEditorAtsTerms(ats: JobAtsProfile | undefined): string[] {
  if (!ats) {
    return [];
  }
  const seen = new Set<string>();
  const terms: string[] = [];
  for (const raw of [...(ats.keywords ?? []), ...(ats.action_verbs ?? [])]) {
    const term = raw.trim();
    if (!term) {
      continue;
    }
    const key = term.toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    terms.push(term);
  }
  return terms;
}