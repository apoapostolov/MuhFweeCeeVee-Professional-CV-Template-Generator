import { z } from "zod";

import {
  appendPrintTweakQuery,
  baseUrl,
  buildUrl,
  requestForm,
  requestJson,
  toTextContent,
} from "./http.mjs";

const photoModeSchema = z.enum(["default", "on-circle", "on-square", "on-original", "off"]).optional();

const printTweakSchema = {
  removePhoto: z.boolean().optional(),
  moveSkillsLeft: z.boolean().optional(),
  sidebarTextScale: z.number().int().min(50).max(200).optional(),
  contentTextScale: z.number().int().min(50).max(200).optional(),
};

const RETIRED_KEYWORDS_MESSAGE =
  "Keyword Studio was retired in v1.1.0. Use Research job weighted keywords and Editor Job Targeting instead.";

const RETIRED_COMPANY_METADATA_RESEARCH_MESSAGE =
  "Editor company-metadata AI research was retired in v1.3. Use research_company_enrich on the Research catalog (or import metadata shells via research_catalog_import_metadata).";

async function fetchSessionServerSnapshot() {
  const [catalogPayload, personalPayload, examplePayload, cvListPayload] = await Promise.all([
    requestJson("GET", "/research/catalog").catch(() => null),
    requestJson("GET", "/companies", { query: { source: "personal" } }).catch(() => null),
    requestJson("GET", "/companies", { query: { source: "example" } }).catch(() => null),
    requestJson("GET", "/cvs"),
  ]);

  const researchCatalog =
    catalogPayload && catalogPayload.ok
      ? {
          version: catalogPayload.version,
          companies: catalogPayload.companies,
          job_positions: catalogPayload.job_positions,
        }
      : null;

  const companyMetadata = {
    personal: personalPayload?.ok ? (personalPayload.document ?? null) : null,
    example: examplePayload?.ok ? (examplePayload.document ?? null) : null,
  };

  const cvItems = Array.isArray(cvListPayload?.items) ? cvListPayload.items : [];
  const cvIds = cvItems
    .map((entry) => (typeof entry?.id === "string" ? entry.id.trim() : ""))
    .filter((id) => id.length > 0);

  const cvs = [];
  for (const cvId of cvIds) {
    try {
      const payload = await requestJson("GET", `/cvs/${encodeURIComponent(cvId)}`);
      if (payload?.cv !== undefined) {
        cvs.push({ cvId, cv: payload.cv });
      }
    } catch {
      // skip missing
    }
  }

  return { researchCatalog, companyMetadata, cvs };
}

export function registerTools(server) {
  server.tool("health_check", "Ping the API health endpoint.", {}, async () =>
    toTextContent(await requestJson("GET", "/health")),
  );

  server.tool("api_info", "Show MCP wrapper + target API info and tool catalog.", {}, async () => {
    return toTextContent({
      name: "muhfweeceevee-api-mcp",
      version: "0.2.0",
      apiBaseUrl: baseUrl,
      authConfigured: Boolean((process.env.MFCV_API_TOKEN ?? process.env.CV_API_TOKEN ?? "").trim()),
      env: {
        CV_API_BASE_URL: process.env.CV_API_BASE_URL || "http://127.0.0.1:3000/api",
        MFCV_API_TOKEN: Boolean(process.env.MFCV_API_TOKEN),
        CV_API_TOKEN: Boolean(process.env.CV_API_TOKEN),
      },
      toolGroups: [
        "cv",
        "templates_render",
        "research",
        "analysis",
        "photos",
        "companies",
        "openrouter",
        "session_backup",
      ],
      retired: ["keyword_analysis", "keyword_datasets", "keyword_datasets_rebuild", "keyword_manage"],
    });
  });

  server.tool("list_cvs", "List CV variants.", {}, async () => toTextContent(await requestJson("GET", "/cvs")));

  server.tool(
    "get_cv",
    "Fetch a CV by ID, optionally resolving language variant.",
    {
      cvId: z.string().min(1),
      language: z.string().optional(),
      autoTranslate: z.boolean().optional(),
      templateId: z.string().optional(),
    },
    async ({ cvId, language, autoTranslate, templateId }) =>
      toTextContent(
        await requestJson("GET", `/cvs/${encodeURIComponent(cvId)}`, {
          query: { language, autoTranslate, templateId },
        }),
      ),
  );

  server.tool(
    "create_cv",
    "Create a new CV variant on disk.",
    {
      cvId: z.string().optional(),
      cv: z.record(z.any()),
      language: z.string().optional(),
      iteration: z.union([z.string(), z.number()]).optional(),
      target: z.string().optional(),
    },
    async (body) => toTextContent(await requestJson("POST", "/cvs", { body })),
  );

  server.tool(
    "save_cv",
    "Update an existing CV payload.",
    { cvId: z.string().min(1), cv: z.record(z.any()) },
    async ({ cvId, cv }) =>
      toTextContent(await requestJson("PUT", `/cvs/${encodeURIComponent(cvId)}`, { body: { cv } })),
  );

  server.tool(
    "cv_history",
    "List version history entries for a CV.",
    { cvId: z.string().min(1) },
    async ({ cvId }) =>
      toTextContent(await requestJson("GET", `/cvs/${encodeURIComponent(cvId)}/history`)),
  );

  server.tool(
    "create_cv_variant",
    "Create/ensure a language variant from a source CV, optionally AI-translated.",
    {
      sourceCvId: z.string().min(1),
      targetLanguage: z.string().min(2),
      aiTranslate: z.boolean().default(false),
    },
    async (body) => toTextContent(await requestJson("POST", "/cvs/variant", { body })),
  );

  server.tool(
    "cv_sync_status",
    "List language siblings and last-edited timestamps for sync.",
    { cvId: z.string().min(1) },
    async ({ cvId }) => toTextContent(await requestJson("POST", "/cvs/sync/status", { body: { cvId } })),
  );

  server.tool(
    "cv_sync",
    "Sync missing fields from source language CV to target language CV (with AI translation).",
    {
      cvId: z.string().min(1),
      sourceLanguage: z.string().min(2),
      targetLanguage: z.string().min(2),
    },
    async (body) => toTextContent(await requestJson("POST", "/cvs/sync", { body })),
  );

  server.tool(
    "translate_field",
    "Translate one field from source CV into target language variant(s).",
    {
      sourceCvId: z.string().min(1),
      targetCvId: z.string().optional(),
      targetLanguage: z.string().optional(),
      sectionPath: z.string().min(1),
      fieldPath: z.string().min(1),
      text: z.string(),
      fieldLabel: z.string().optional(),
    },
    async (body) => toTextContent(await requestJson("POST", "/cvs/translate-field", { body })),
  );

  server.tool("list_templates", "List available templates.", {}, async () =>
    toTextContent(await requestJson("GET", "/templates")),
  );

  server.tool(
    "preview_html_url",
    "Build a preview URL for HTML rendering (supports print tweak query params).",
    {
      cvId: z.string().min(1),
      templateId: z.string().min(1),
      theme: z.string().optional(),
      photo: photoModeSchema,
      photoId: z.string().optional(),
      ...printTweakSchema,
    },
    async (args) => {
      const { cvId, templateId, theme, photo, photoId, ...tweaks } = args;
      return toTextContent({
        url: buildUrl(
          "/preview/html",
          appendPrintTweakQuery({ cvId, templateId, theme, photo, photoId }, tweaks),
        ),
      });
    },
  );

  server.tool(
    "export_pdf_url",
    "Build a PDF export URL (supports print tweak query params and download=1).",
    {
      cvId: z.string().min(1),
      templateId: z.string().min(1),
      theme: z.string().optional(),
      photo: photoModeSchema,
      photoId: z.string().optional(),
      download: z.boolean().optional(),
      ...printTweakSchema,
    },
    async (args) => {
      const { cvId, templateId, theme, photo, photoId, download, ...tweaks } = args;
      return toTextContent({
        url: buildUrl(
          "/export/pdf",
          appendPrintTweakQuery(
            { cvId, templateId, theme, photo, photoId, download: download ? "1" : undefined },
            tweaks,
          ),
        ),
      });
    },
  );

  server.tool(
    "export_image_url",
    "Build an image export URL (supports print tweak query params).",
    {
      cvId: z.string().min(1),
      templateId: z.string().min(1),
      theme: z.string().optional(),
      photo: photoModeSchema,
      photoId: z.string().optional(),
      ...printTweakSchema,
    },
    async (args) => {
      const { cvId, templateId, theme, photo, photoId, ...tweaks } = args;
      return toTextContent({
        url: buildUrl(
          "/export/image",
          appendPrintTweakQuery({ cvId, templateId, theme, photo, photoId }, tweaks),
        ),
      });
    },
  );

  const retiredKeywordHandler = async () => {
    throw new Error(RETIRED_KEYWORDS_MESSAGE);
  };

  server.tool(
    "keyword_analysis",
    `[RETIRED] ${RETIRED_KEYWORDS_MESSAGE}`,
    { cvId: z.string().optional(), role: z.string().optional(), dataset: z.string().optional() },
    retiredKeywordHandler,
  );
  server.tool("keyword_datasets", `[RETIRED] ${RETIRED_KEYWORDS_MESSAGE}`, {}, retiredKeywordHandler);
  server.tool(
    "keyword_datasets_rebuild",
    `[RETIRED] ${RETIRED_KEYWORDS_MESSAGE}`,
    {},
    retiredKeywordHandler,
  );
  server.tool(
    "keyword_manage",
    `[RETIRED] ${RETIRED_KEYWORDS_MESSAGE}`,
    { action: z.enum(["run_collection"]).optional(), runId: z.string().optional() },
    retiredKeywordHandler,
  );

  server.tool("research_catalog_get", "Get the full research catalog.", {}, async () =>
    toTextContent(await requestJson("GET", "/research/catalog")),
  );

  server.tool(
    "research_catalog_put",
    "Replace the research catalog (companies + job_positions).",
    {
      version: z.union([z.string(), z.number()]).optional(),
      companies: z.array(z.record(z.any())),
      job_positions: z.array(z.record(z.any())),
    },
    async (body) => toTextContent(await requestJson("PUT", "/research/catalog", { body })),
  );

  server.tool(
    "research_company_get",
    "Get one researched company and its job positions.",
    { companyId: z.string().min(1) },
    async ({ companyId }) =>
      toTextContent(await requestJson("GET", `/research/companies/${encodeURIComponent(companyId)}`)),
  );

  server.tool(
    "research_company_put",
    "Upsert one researched company record.",
    { companyId: z.string().min(1), company: z.record(z.any()) },
    async ({ companyId, company }) =>
      toTextContent(
        await requestJson("PUT", `/research/companies/${encodeURIComponent(companyId)}`, {
          body: { company },
        }),
      ),
  );

  server.tool(
    "research_company_delete",
    "Delete a researched company (and related jobs).",
    { companyId: z.string().min(1) },
    async ({ companyId }) =>
      toTextContent(await requestJson("DELETE", `/research/companies/${encodeURIComponent(companyId)}`)),
  );

  server.tool(
    "research_company_run",
    "Legacy full-web company research (all stages). Prefer research_company_enrich.",
    {
      companyId: z.string().optional(),
      companyName: z.string().min(1),
      officeCountry: z.string().min(1),
      officeCity: z.string().optional(),
      officeLabel: z.string().optional(),
    },
    async (body) => toTextContent(await requestJson("POST", "/research/companies/research", { body })),
  );

  server.tool(
    "research_company_enrich",
    "Staged company fill. useWebSearch false (default) = cheap analysis model; true = Research/web.",
    {
      companyId: z.string().optional(),
      companyName: z.string().min(1),
      officeCountry: z.string().min(1),
      officeCity: z.string().optional(),
      officeLabel: z.string().optional(),
      website: z.string().optional(),
      linkedinCompanyUrl: z.string().optional(),
      aboutText: z.string().optional(),
      stages: z
        .array(z.enum(["identity", "office", "hiring", "people", "linkedin_jobs"]))
        .optional(),
      useWebSearch: z.boolean().optional(),
      forceRefresh: z.boolean().optional(),
    },
    async (body) => toTextContent(await requestJson("POST", "/research/companies/enrich", { body })),
  );

  server.tool(
    "research_job_get",
    "Get one researched job position.",
    { jobId: z.string().min(1) },
    async ({ jobId }) =>
      toTextContent(await requestJson("GET", `/research/job-positions/${encodeURIComponent(jobId)}`)),
  );

  server.tool(
    "research_job_put",
    "Upsert one researched job position record.",
    { jobId: z.string().min(1), job: z.record(z.any()) },
    async ({ jobId, job }) =>
      toTextContent(
        await requestJson("PUT", `/research/job-positions/${encodeURIComponent(jobId)}`, {
          body: { job },
        }),
      ),
  );

  server.tool(
    "research_job_delete",
    "Delete a researched job position.",
    { jobId: z.string().min(1) },
    async ({ jobId }) =>
      toTextContent(await requestJson("DELETE", `/research/job-positions/${encodeURIComponent(jobId)}`)),
  );

  server.tool(
    "research_job_run",
    "Run web-backed AI research for a job position.",
    {
      companyId: z.string().min(1),
      jobTitle: z.string().min(1),
      jobDescription: z.string().optional(),
      linkedinUrl: z.string().optional(),
    },
    async (body) => toTextContent(await requestJson("POST", "/research/job-positions/research", { body })),
  );

  server.tool(
    "research_field_refine",
    "AI refine one research catalog field. useWebSearch default false (cheap analysis model).",
    {
      entityType: z.enum(["company", "job_position"]),
      entityId: z.string().min(1),
      fieldPath: z.string().min(1),
      fieldLabel: z.string().optional(),
      currentValue: z.union([z.string(), z.record(z.any()), z.array(z.any())]).optional(),
      useWebSearch: z.boolean().optional(),
    },
    async (body) => toTextContent(await requestJson("POST", "/research/field-refine", { body })),
  );

  server.tool(
    "research_extract_keywords",
    "Local JD keyword extract for a job (no web).",
    {
      jobId: z.string().min(1),
      rawJdText: z.string().optional(),
      replace: z.boolean().optional(),
    },
    async (body) =>
      toTextContent(await requestJson("POST", "/research/jobs/extract-keywords", { body })),
  );

  server.tool(
    "research_keyword_gap",
    "Keyword gap report for a CV vs researched job.",
    { cvId: z.string().min(1), jobId: z.string().min(1) },
    async (body) => toTextContent(await requestJson("POST", "/research/jobs/gap", { body })),
  );

  server.tool(
    "analysis_ats_check",
    "Deterministic ATS checks (no LLM).",
    { cvId: z.string().min(1), jobId: z.string().optional() },
    async (body) => toTextContent(await requestJson("POST", "/analysis/ats-check", { body })),
  );

  server.tool(
    "cover_letters_list",
    "List cover letters.",
    {},
    async () => toTextContent(await requestJson("GET", "/cover-letters")),
  );

  server.tool(
    "cover_letter_save",
    "Save or AI-draft a cover letter. draftWithAi (cheap, no web) and humanize are separate steps; each creates a version snapshot.",
    {
      id: z.string().optional(),
      cvId: z.string().min(1),
      companyId: z.string().optional(),
      jobId: z.string().optional(),
      title: z.string().optional(),
      body: z.string().optional(),
      draftWithAi: z.boolean().optional(),
      humanize: z.boolean().optional(),
    },
    async (body) => toTextContent(await requestJson("POST", "/cover-letters", { body })),
  );

  server.tool(
    "cover_letter_versions",
    "List cover letter version history (server snapshots).",
    { id: z.string().min(1) },
    async ({ id }) =>
      toTextContent(
        await requestJson("GET", "/cover-letters", {
          query: { id, versions: "1" },
        }),
      ),
  );

  server.tool(
    "cover_letter_load_version",
    "Load a cover letter version snapshot (does not persist; save separately to create a new revision).",
    { id: z.string().min(1), version: z.number().int().positive() },
    async (body) =>
      toTextContent(
        await requestJson("POST", "/cover-letters", {
          body: { action: "load_version", ...body },
        }),
      ),
  );

  server.tool(
    "cover_letter_delete_version",
    "Delete one cover letter history snapshot (does not change the live letter).",
    { id: z.string().min(1), version: z.number().int().positive() },
    async (body) =>
      toTextContent(
        await requestJson("POST", "/cover-letters", {
          body: { action: "delete_version", ...body },
        }),
      ),
  );

  server.tool(
    "ai_skills_list",
    "List product AI skills (ai-skills/) and hooks used for prompt injection / output repair.",
    {},
    async () => toTextContent(await requestJson("GET", "/ai-skills")),
  );

  server.tool(
    "applications_list",
    "List application tracker board.",
    {},
    async () => toTextContent(await requestJson("GET", "/applications")),
  );

  server.tool(
    "application_upsert",
    "Create/update an application packet (CV + photo + company + letter refs on the kanban card).",
    {
      id: z.string().optional(),
      company_id: z.string().optional(),
      job_id: z.string().optional(),
      cv_id: z.string().optional(),
      photo_id: z.string().optional(),
      cover_letter_id: z.string().optional(),
      packet_title: z.string().optional(),
      company_name: z.string().min(1),
      job_title: z.string().min(1),
      status: z
        .enum(["wishlist", "applied", "interview", "offer", "rejected", "ghosted"])
        .optional(),
      url: z.string().optional(),
      notes: z.string().optional(),
    },
    async (body) =>
      toTextContent(await requestJson("POST", "/applications", { body: { action: "upsert", ...body } })),
  );

  server.tool(
    "application_export_packet",
    "Export an application packet JSON (CV + letter embeds; photo re-link by id).",
    { id: z.string().min(1) },
    async ({ id }) =>
      toTextContent(await requestJson("POST", "/applications", { body: { action: "export", id } })),
  );

  server.tool(
    "application_import_packet",
    "Import a muhfweeceevee.application_packet JSON as a new kanban card.",
    {
      packet: z.record(z.string(), z.unknown()),
      restoreCv: z.boolean().optional(),
      restoreLetter: z.boolean().optional(),
    },
    async (body) =>
      toTextContent(await requestJson("POST", "/applications", { body: { action: "import", ...body } })),
  );

  server.tool(
    "application_reuse_packet",
    "Duplicate a packet reusing CV/photo (optionally override company) for a similar application.",
    {
      id: z.string().min(1),
      overrides: z
        .object({
          company_name: z.string().optional(),
          job_title: z.string().optional(),
          company_id: z.string().optional(),
          job_id: z.string().optional(),
          cv_id: z.string().optional(),
          photo_id: z.string().optional(),
          cover_letter_id: z.string().optional(),
          packet_title: z.string().optional(),
        })
        .optional(),
    },
    async (body) =>
      toTextContent(
        await requestJson("POST", "/applications", { body: { action: "duplicate", ...body } }),
      ),
  );

  server.tool(
    "analysis_cv",
    "Score a CV section or full CV (optional company + job targeting).",
    {
      cvId: z.string().min(1),
      templateId: z.string().optional(),
      scope: z.enum(["section", "full"]).optional(),
      sectionKey: z.string().optional(),
      companyIds: z.array(z.string()).optional(),
      jobPositionId: z.string().optional(),
    },
    async (body) => toTextContent(await requestJson("POST", "/analysis/cv", { body })),
  );

  server.tool(
    "analysis_field",
    "Professional rewrite or shorten one CV field.",
    {
      mode: z.enum(["professional_rewrite", "shorten"]),
      text: z.string(),
      fieldPath: z.string().optional(),
      fieldLabel: z.string().optional(),
      templateId: z.string().optional(),
      language: z.string().optional(),
      limit: z.number().optional(),
      unit: z.enum(["characters", "lines"]).optional(),
      charCap: z.number().optional(),
      jobPositionId: z.string().optional(),
    },
    async (body) => toTextContent(await requestJson("POST", "/analysis/field", { body })),
  );

  server.tool(
    "company_metadata_research",
    `[RETIRED] ${RETIRED_COMPANY_METADATA_RESEARCH_MESSAGE}`,
    { companyName: z.string().min(1), existingRecord: z.record(z.any()).optional() },
    async () => {
      throw new Error(RETIRED_COMPANY_METADATA_RESEARCH_MESSAGE);
    },
  );

  server.tool(
    "research_catalog_import_metadata",
    "Import legacy Editor company-metadata files into Research catalog shells (no AI).",
    {
      source: z.enum(["example", "personal", "both"]).optional(),
      skipExisting: z.boolean().optional(),
      importJobs: z.boolean().optional(),
    },
    async (body) =>
      toTextContent(
        await requestJson("POST", "/research/catalog/import-metadata", { body }),
      ),
  );

  server.tool(
    "company_metadata_field_research",
    "AI refine one company metadata field with web search.",
    {
      companyName: z.string().min(1),
      fieldPath: z.string().min(1),
      fieldLabel: z.string().optional(),
      fieldKey: z.string().optional(),
      text: z.string().optional(),
      companyContext: z.record(z.any()).optional(),
    },
    async (body) => toTextContent(await requestJson("POST", "/analysis/company-field", { body })),
  );

  server.tool("photo_list", "List Photo Booth images and analysis history.", {}, async () =>
    toTextContent(await requestJson("GET", "/photos")),
  );

  server.tool(
    "photo_upload_base64",
    "Upload one photo from base64 content into Photo Booth.",
    {
      fileName: z.string().min(1),
      mimeType: z
        .enum(["image/jpeg", "image/png", "image/webp", "image/avif", "image/gif"])
        .default("image/jpeg"),
      imageBase64: z.string().min(1),
    },
    async ({ fileName, mimeType, imageBase64 }) => {
      const bytes = Uint8Array.from(Buffer.from(imageBase64, "base64"));
      const blob = new Blob([bytes], { type: mimeType });
      const form = new FormData();
      form.append("files", blob, fileName);
      return toTextContent(await requestForm("/photos", form));
    },
  );

  server.tool(
    "photo_delete",
    "Delete a Photo Booth image by id.",
    { id: z.string().min(1) },
    async ({ id }) => toTextContent(await requestJson("DELETE", "/photos", { query: { id } })),
  );

  server.tool(
    "photo_analyze",
    "Analyze a photo (data URL payload). If photoId is set, history is persisted on server.",
    {
      imageDataUrl: z.string().min(1),
      fileName: z.string().optional(),
      photoId: z.string().optional(),
    },
    async (body) => toTextContent(await requestJson("POST", "/analysis/photo", { body })),
  );

  server.tool(
    "photo_compare",
    "Compare 2+ photos via multi-image ranking.",
    {
      images: z
        .array(
          z.object({
            name: z.string().min(1),
            imageDataUrl: z.string().min(1),
          }),
        )
        .min(2),
      imageIds: z.array(z.string()).optional(),
      lookupOnly: z.boolean().optional(),
      forceNew: z.boolean().optional(),
    },
    async (body) => toTextContent(await requestJson("POST", "/analysis/photo/compare", { body })),
  );

  server.tool(
    "companies_metadata_get",
    "List company metadata sources or fetch one document (example|personal).",
    { source: z.enum(["example", "personal"]).optional() },
    async ({ source }) => toTextContent(await requestJson("GET", "/companies", { query: { source } })),
  );

  server.tool(
    "companies_metadata_put",
    "Save full company metadata document for example or personal source.",
    { source: z.enum(["example", "personal"]), document: z.record(z.any()) },
    async ({ source, document }) =>
      toTextContent(
        await requestJson("PUT", "/companies", { query: { source }, body: { document } }),
      ),
  );

  server.tool(
    "openrouter_settings_get",
    "Get OpenRouter settings and model catalog.",
    {},
    async () => toTextContent(await requestJson("GET", "/settings/openrouter")),
  );

  server.tool(
    "openrouter_settings_update",
    "Update OpenRouter settings (api key, analysis model, research model, image model, base URL).",
    {
      apiKey: z.string().optional(),
      model: z.string().optional(),
      researchModel: z.string().optional(),
      imageModel: z.string().optional(),
      baseUrl: z.string().optional(),
    },
    async (body) => toTextContent(await requestJson("PUT", "/settings/openrouter", { body })),
  );

  server.tool(
    "openrouter_credit",
    "Get OpenRouter credit/prepaid data.",
    {},
    async () => toTextContent(await requestJson("GET", "/settings/openrouter/credit")),
  );

  server.tool(
    "session_backup_export",
    "Export server-side session data (research catalog, company metadata, all CVs). Browser localStorage is not included.",
    {},
    async () => {
      const server = await fetchSessionServerSnapshot();
      return toTextContent({
        version: 2,
        exportedAt: new Date().toISOString(),
        note: "MCP export covers server data only. Import localStorage keys via the web Settings UI.",
        server,
      });
    },
  );

  server.tool(
    "session_backup_import",
    "Import server-side session backup (research catalog, metadata, CVs).",
    {
      backup: z.record(z.any()),
    },
    async ({ backup }) => {
      const server = backup.server ?? backup;
      let researchCompanies = 0;
      let researchJobs = 0;
      let companyMetadataSources = 0;
      let cvs = 0;

      if (server.researchCatalog) {
        await requestJson("PUT", "/research/catalog", { body: server.researchCatalog });
        researchCompanies = Array.isArray(server.researchCatalog.companies)
          ? server.researchCatalog.companies.length
          : 0;
        researchJobs = Array.isArray(server.researchCatalog.job_positions)
          ? server.researchCatalog.job_positions.length
          : 0;
      }

      if (server.companyMetadata?.personal != null) {
        await requestJson("PUT", "/companies", {
          query: { source: "personal" },
          body: { document: server.companyMetadata.personal },
        });
        companyMetadataSources += 1;
      }
      if (server.companyMetadata?.example != null) {
        await requestJson("PUT", "/companies", {
          query: { source: "example" },
          body: { document: server.companyMetadata.example },
        });
        companyMetadataSources += 1;
      }

      if (Array.isArray(server.cvs)) {
        for (const entry of server.cvs) {
          const cvId = typeof entry?.cvId === "string" ? entry.cvId.trim() : "";
          if (!cvId || entry.cv === undefined) continue;
          await requestJson("PUT", `/cvs/${encodeURIComponent(cvId)}`, { body: { cv: entry.cv } });
          cvs += 1;
        }
      }

      return toTextContent({
        ok: true,
        researchCompanies,
        researchJobs,
        companyMetadataSources,
        cvs,
      });
    },
  );
}