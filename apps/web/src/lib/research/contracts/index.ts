import { COMPANY_FIELD_CONTRACTS } from "./companyFields";
import { JOB_FIELD_CONTRACTS } from "./jobFields";
import type { ResearchFieldContract } from "./types";

export * from "./types";
export * from "./validate";
export * from "./merge";
export * from "./sanitize";
export {
  COMPANY_FIELD_CONTRACTS,
  OFFICE_TYPE_VALUES,
  HIRING_STATUS_VALUES,
  COMPANY_SIZE_VALUES,
} from "./companyFields";
export {
  JOB_FIELD_CONTRACTS,
  EMPLOYMENT_TYPE_VALUES,
  REMOTE_POLICY_VALUES,
} from "./jobFields";

const COMPANY_BY_PATH = new Map(COMPANY_FIELD_CONTRACTS.map((c) => [c.path, c]));
const JOB_BY_PATH = new Map(JOB_FIELD_CONTRACTS.map((c) => [c.path, c]));

export function getCompanyFieldContract(path: string): ResearchFieldContract | null {
  return COMPANY_BY_PATH.get(path) ?? null;
}

export function getJobFieldContract(path: string): ResearchFieldContract | null {
  return JOB_BY_PATH.get(path) ?? null;
}

export function getResearchFieldContract(
  entityType: "company" | "job_position",
  path: string,
): ResearchFieldContract | null {
  return entityType === "company" ? getCompanyFieldContract(path) : getJobFieldContract(path);
}

export function listResearchFieldContracts(
  entityType: "company" | "job_position",
): ResearchFieldContract[] {
  return entityType === "company" ? [...COMPANY_FIELD_CONTRACTS] : [...JOB_FIELD_CONTRACTS];
}
