import fs from "node:fs/promises";

import { normalizeResearchCatalog } from "@/lib/research/research-normalize";
import { repoPath } from "./repoPaths";
import type {
  ResearchCatalog,
  ResearchedCompany,
  ResearchedJobPosition,
} from "@/lib/research/types";

const CATALOG_PATH = repoPath("data", "research", "catalog.json");

const EMPTY_CATALOG: ResearchCatalog = {
  version: 2,
  companies: [],
  job_positions: [],
};

async function ensureCatalogFile(): Promise<void> {
  try {
    await fs.access(CATALOG_PATH);
  } catch {
    await fs.mkdir(repoPath("data", "research"), { recursive: true });
    await fs.writeFile(CATALOG_PATH, `${JSON.stringify(EMPTY_CATALOG, null, 2)}\n`, "utf-8");
  }
}

export async function readResearchCatalog(): Promise<ResearchCatalog> {
  await ensureCatalogFile();
  const raw = await fs.readFile(CATALOG_PATH, "utf-8");
  return normalizeResearchCatalog(JSON.parse(raw));
}

export async function writeResearchCatalog(catalog: ResearchCatalog): Promise<ResearchCatalog> {
  await ensureCatalogFile();
  const normalized = normalizeResearchCatalog(catalog);
  await fs.writeFile(CATALOG_PATH, `${JSON.stringify(normalized, null, 2)}\n`, "utf-8");
  return normalized;
}

export async function upsertResearchedCompany(company: ResearchedCompany): Promise<ResearchCatalog> {
  const catalog = await readResearchCatalog();
  const next = catalog.companies.filter((entry) => entry.id !== company.id);
  next.push({
    ...company,
    research: {
      ...company.research,
      researched_at: company.research?.researched_at ?? new Date().toISOString(),
    },
  });
  next.sort((a, b) => a.name.localeCompare(b.name));
  return writeResearchCatalog({ ...catalog, companies: next });
}

export async function deleteResearchedCompany(companyId: string): Promise<ResearchCatalog> {
  const catalog = await readResearchCatalog();
  return writeResearchCatalog({
    ...catalog,
    companies: catalog.companies.filter((c) => c.id !== companyId),
    job_positions: catalog.job_positions.filter((j) => j.company_id !== companyId),
  });
}

export async function upsertResearchedJobPosition(
  job: ResearchedJobPosition,
): Promise<ResearchCatalog> {
  const catalog = await readResearchCatalog();
  const next = catalog.job_positions.filter((entry) => entry.id !== job.id);
  next.push({
    ...job,
    research: {
      ...job.research,
      researched_at: job.research?.researched_at ?? new Date().toISOString(),
    },
  });
  next.sort((a, b) => a.title.localeCompare(b.title));
  return writeResearchCatalog({ ...catalog, job_positions: next });
}

export async function deleteResearchedJobPosition(jobId: string): Promise<ResearchCatalog> {
  const catalog = await readResearchCatalog();
  return writeResearchCatalog({
    ...catalog,
    job_positions: catalog.job_positions.filter((j) => j.id !== jobId),
  });
}

export function findResearchedCompany(
  catalog: ResearchCatalog,
  companyId: string,
): ResearchedCompany | null {
  return catalog.companies.find((c) => c.id === companyId) ?? null;
}

export function findResearchedJobPosition(
  catalog: ResearchCatalog,
  jobId: string,
): ResearchedJobPosition | null {
  return catalog.job_positions.find((j) => j.id === jobId) ?? null;
}

export function listJobPositionsForCompany(
  catalog: ResearchCatalog,
  companyId: string,
): ResearchedJobPosition[] {
  return catalog.job_positions.filter((j) => j.company_id === companyId);
}