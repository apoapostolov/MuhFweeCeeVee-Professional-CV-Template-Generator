import { slugifyResearchId } from "./research-slug";
import type { ResearchCatalog } from "./types";

/** First entry uses base slug; further same company+title pairs get _2, _3, … */
export function allocateResearchedJobPositionId(
  catalog: ResearchCatalog,
  companyId: string,
  title: string,
): string {
  const base = slugifyResearchId(`${companyId}_${title}`);
  if (!base) {
    return slugifyResearchId(`${companyId}_job_${Date.now()}`);
  }
  if (!catalog.job_positions.some((entry) => entry.id === base)) {
    return base;
  }
  let suffix = 2;
  while (catalog.job_positions.some((entry) => entry.id === `${base}_${suffix}`)) {
    suffix += 1;
  }
  return `${base}_${suffix}`;
}