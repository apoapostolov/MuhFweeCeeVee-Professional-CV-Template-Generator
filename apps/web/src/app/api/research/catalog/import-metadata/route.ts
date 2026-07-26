import { NextResponse } from "next/server";

import { mergeMetadataIntoCatalog } from "@/lib/research/importMetadataToCatalog";
import { assertApiAuthorized } from "@/lib/server/apiAuth";
import {
  readCompanyMetadataDocument,
  type CompanyMetadata,
} from "@/lib/server/companyMetadataStore";
import {
  readResearchCatalog,
  writeResearchCatalog,
} from "@/lib/server/researchStore";

export const runtime = "nodejs";

/**
 * Import legacy Editor company-metadata files into Research catalog shells.
 * Does not call AI. skipExisting defaults true.
 */
export async function POST(request: Request): Promise<NextResponse> {
  const denied = assertApiAuthorized(request);
  if (denied) return denied;

  const body = (await request.json().catch(() => ({}))) as {
    source?: unknown;
    skipExisting?: unknown;
    importJobs?: unknown;
  };

  const sourceRaw =
    typeof body.source === "string" ? body.source.trim().toLowerCase() : "both";
  const source =
    sourceRaw === "example" || sourceRaw === "personal" || sourceRaw === "both"
      ? sourceRaw
      : "both";

  const companies: CompanyMetadata[] = [];
  if (source === "example" || source === "both") {
    const doc = await readCompanyMetadataDocument("example");
    companies.push(...doc.companies);
  }
  if (source === "personal" || source === "both") {
    const doc = await readCompanyMetadataDocument("personal");
    companies.push(...doc.companies);
  }

  const catalog = await readResearchCatalog();
  const result = mergeMetadataIntoCatalog(catalog, companies, {
    skipExisting: body.skipExisting !== false,
    importJobs: body.importJobs !== false,
  });

  const written = await writeResearchCatalog(result.catalog);
  return NextResponse.json({
    ok: true,
    source,
    companies_added: result.companies_added,
    companies_skipped: result.companies_skipped,
    jobs_added: result.jobs_added,
    version: written.version,
    companies: written.companies,
    job_positions: written.job_positions,
  });
}
