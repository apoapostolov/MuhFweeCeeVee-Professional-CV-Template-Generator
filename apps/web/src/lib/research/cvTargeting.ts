/**
 * CV metadata.targeting — single Research catalog target (D1).
 */

export type CvTargeting = {
  company_id: string;
  job_id: string;
  updated_at: string;
};

export function readCvTargeting(cv: unknown): CvTargeting | null {
  if (!cv || typeof cv !== "object" || Array.isArray(cv)) return null;
  const metadata = (cv as { metadata?: unknown }).metadata;
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return null;
  const targeting = (metadata as { targeting?: unknown }).targeting;
  if (!targeting || typeof targeting !== "object" || Array.isArray(targeting)) return null;
  const record = targeting as Record<string, unknown>;
  const company_id = typeof record.company_id === "string" ? record.company_id.trim() : "";
  const job_id = typeof record.job_id === "string" ? record.job_id.trim() : "";
  if (!company_id && !job_id) return null;
  return {
    company_id,
    job_id,
    updated_at:
      typeof record.updated_at === "string" && record.updated_at.trim()
        ? record.updated_at.trim()
        : new Date().toISOString(),
  };
}

export function writeCvTargeting(
  cv: Record<string, unknown>,
  targeting: { company_id?: string; job_id?: string } | null,
): Record<string, unknown> {
  const metadataRaw = cv.metadata;
  const metadata =
    metadataRaw && typeof metadataRaw === "object" && !Array.isArray(metadataRaw)
      ? { ...(metadataRaw as Record<string, unknown>) }
      : {};

  if (!targeting || (!targeting.company_id && !targeting.job_id)) {
    const { targeting: _drop, ...rest } = metadata;
    void _drop;
    return { ...cv, metadata: rest };
  }

  return {
    ...cv,
    metadata: {
      ...metadata,
      targeting: {
        company_id: targeting.company_id?.trim() ?? "",
        job_id: targeting.job_id?.trim() ?? "",
        updated_at: new Date().toISOString(),
      },
    },
  };
}
