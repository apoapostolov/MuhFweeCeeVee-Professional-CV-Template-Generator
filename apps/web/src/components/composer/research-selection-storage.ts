import { STORAGE_KEYS } from "./constants";

export type StoredResearchSelection = {
  companyId: string;
  jobId: string;
};

export function readStoredResearchSelection(): StoredResearchSelection {
  if (typeof window === "undefined") {
    return { companyId: "", jobId: "" };
  }
  try {
    return {
      companyId: window.localStorage.getItem(STORAGE_KEYS.selectedResearchCompanyId) ?? "",
      jobId: window.localStorage.getItem(STORAGE_KEYS.selectedResearchJobPositionId) ?? "",
    };
  } catch {
    return { companyId: "", jobId: "" };
  }
}

export function writeStoredResearchSelection(companyId: string, jobId: string): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    if (companyId) {
      window.localStorage.setItem(STORAGE_KEYS.selectedResearchCompanyId, companyId);
    } else {
      window.localStorage.removeItem(STORAGE_KEYS.selectedResearchCompanyId);
    }
    if (jobId) {
      window.localStorage.setItem(STORAGE_KEYS.selectedResearchJobPositionId, jobId);
    } else {
      window.localStorage.removeItem(STORAGE_KEYS.selectedResearchJobPositionId);
    }
  } catch {
    // no-op
  }
}

export function resolveStoredResearchCompanyId(
  companies: Array<{ id: string }>,
  preferredId = "",
): string {
  if (preferredId && companies.some((entry) => entry.id === preferredId)) {
    return preferredId;
  }
  const stored = readStoredResearchSelection().companyId;
  if (stored && companies.some((entry) => entry.id === stored)) {
    return stored;
  }
  return "";
}

export function resolveStoredResearchJobId(
  jobs: Array<{ id: string; company_id: string }>,
  companyId: string,
  preferredId = "",
): string {
  if (!companyId) {
    return "";
  }
  if (preferredId && jobs.some((entry) => entry.id === preferredId && entry.company_id === companyId)) {
    return preferredId;
  }
  const stored = readStoredResearchSelection().jobId;
  if (stored && jobs.some((entry) => entry.id === stored && entry.company_id === companyId)) {
    return stored;
  }
  return "";
}