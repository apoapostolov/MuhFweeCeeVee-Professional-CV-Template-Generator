"use client";

import { useEffect, useMemo, useState, type JSX } from "react";

import {
  COMPANY_SIZE_VALUES,
  EMPLOYMENT_TYPE_VALUES,
  HIRING_STATUS_VALUES,
  OFFICE_TYPE_VALUES,
  REMOTE_POLICY_VALUES,
} from "@/lib/research/contracts";
import {
  getAtPath,
  parseFieldValueFromProposal,
  setAtPath,
  stringifyFieldValue,
} from "@/lib/research/research-path-utils";
import { KEYWORD_WEIGHT_UNDERLINE_CLASS, keywordWeightTone } from "@/lib/research/keyword-highlight";
import { parseWeightedKeywordsFromProposal } from "@/lib/research/weighted-keywords";
import type {
  ResearchedCompany,
  ResearchedJobPosition,
  ResearchFieldRefineEntity,
  WeightedKeyword,
} from "@/lib/research/types";
import type { EditorAutosaveActivity, PathSegment } from "./types";

import {
  defaultWrapCharsPerLine,
  estimateTextareaRows,
  shouldUseTextarea,
  WRAPPING_TEXT_CONTROL_CLASS,
} from "./form-path-utils";
import { EditorAutoSaveToggle, EditorAutosaveStatusPill } from "./editor-autosave-ui";
import {
  EDITOR_COMPACT_INNER_TEXT_CONTROL_CLASS,
  EDITOR_COMPACT_METADATA_FORM_GRID_CLASS,
  EDITOR_METADATA_FIELD_AI_PANEL_WRAP_CLASS,
} from "./editor-compact-form-layout";
import { EditorCompactFieldRow } from "./editor-compact-field-row";
import {
  ResearchFieldAiInputChrome,
  ResearchFieldAiPanel,
  ResearchFieldAiProvider,
  ResearchFieldAiTrigger,
} from "./research-field-ai";

const INPUT_CLASS =
  `w-full min-w-0 rounded border border-[var(--line)] bg-white px-2 py-1.5 text-xs leading-5 text-slate-800 ${WRAPPING_TEXT_CONTROL_CLASS}`;

const NUMBER_INPUT_CLASS = `${INPUT_CLASS} composer-number-input box-border`;

/** One row per keyword; keyword/category flex, weight fixed. Two columns L→R, T→B. */
const WEIGHTED_KEYWORD_ROW_COLS =
  "grid w-full min-w-0 grid-cols-[minmax(0,2fr)_3.25rem_minmax(0,1fr)] gap-x-2 items-center";
const WEIGHTED_KEYWORDS_GRID_CLASS = "col-span-full grid grid-cols-2 gap-x-4 gap-y-1.5";

function gradedKeywordInputClass(theme: "light" | "dark", weight: number): string {
  return `w-full min-w-0 rounded border border-[var(--line)] bg-[var(--surface-1)] px-2 py-1 text-xs font-bold ${KEYWORD_WEIGHT_UNDERLINE_CLASS} ${keywordWeightTone(theme, weight)}`;
}

function gradedWeightInputClass(theme: "light" | "dark", weight: number): string {
  return `composer-number-input box-border w-full min-w-0 rounded border border-[var(--line)] bg-[var(--surface-1)] px-1 py-1 text-center text-xs font-bold tabular-nums ${KEYWORD_WEIGHT_UNDERLINE_CLASS} ${keywordWeightTone(theme, weight)}`;
}

export type ResearchDetailFormProps = {
  entityType: ResearchFieldRefineEntity;
  company: ResearchedCompany | null;
  job: ResearchedJobPosition | null;
  language: string;
  resolvedTheme: "light" | "dark";
  saving: boolean;
  researchAutoSaveEnabled: boolean;
  researchAutosaveActivity: EditorAutosaveActivity;
  onResearchAutoSaveChange: (enabled: boolean) => void;
  onDraftChange?: (
    draft: ResearchedCompany | ResearchedJobPosition,
    entityType: ResearchFieldRefineEntity,
  ) => void;
  onSave: (payload: ResearchedCompany | ResearchedJobPosition) => void;
  onNotice: (message: string) => void;
};

type ScalarFieldDef = {
  label: string;
  path: PathSegment[];
  multiline?: boolean;
  inputType?: "text" | "number" | "url" | "email";
  /** Closed enum (D1 contracts) — renders <select> */
  enumValues?: readonly string[];
};

function SectionHeader({ title }: { title: string }): JSX.Element {
  return (
    <h4 className="col-span-full border-t border-[var(--line)] pt-3 text-sm font-bold text-slate-900 first:border-t-0 first:pt-0">
      {title}
    </h4>
  );
}

function SectionHeaderWithAction({
  title,
  action,
}: {
  title: string;
  action: JSX.Element;
}): JSX.Element {
  return (
    <div className="col-span-full flex items-center justify-between gap-2 border-t border-[var(--line)] pt-3 first:border-t-0 first:pt-0">
      <h4 className="text-sm font-bold text-slate-900">{title}</h4>
      {action}
    </div>
  );
}

export function ResearchDetailForm({
  entityType,
  company,
  job,
  language,
  resolvedTheme,
  saving,
  researchAutoSaveEnabled,
  researchAutosaveActivity,
  onResearchAutoSaveChange,
  onDraftChange,
  onSave,
  onNotice,
}: ResearchDetailFormProps): JSX.Element {
  const source = entityType === "company" ? company : job;
  const [draft, setDraft] = useState<unknown>(source);
  const [dirty, setDirty] = useState(false);
  const [extractingKeywords, setExtractingKeywords] = useState(false);

  useEffect(() => {
    setDraft(source);
    setDirty(false);
  }, [source, entityType]);

  const entityId = entityType === "company" ? company?.id ?? "" : job?.id ?? "";

  const updateAt = (path: PathSegment[], value: unknown) => {
    let nextForAutosave: ResearchedCompany | ResearchedJobPosition | null = null;
    setDraft((current: unknown) => {
      const next = setAtPath(current, path, value);
      if (current) {
        nextForAutosave = next as ResearchedCompany | ResearchedJobPosition;
      }
      return next;
    });
    setDirty(true);
    if (researchAutoSaveEnabled && onDraftChange && nextForAutosave) {
      onDraftChange(nextForAutosave, entityType);
    }
  };

  const applyRefined = (path: PathSegment[], current: unknown, proposal: unknown) => {
    updateAt(path, parseFieldValueFromProposal(current, proposal));
  };

  const wrapResearchFieldWithAi = (
    fieldPath: string,
    fieldLabel: string,
    currentValue: string,
    path: PathSegment[],
    current: unknown,
    shell: JSX.Element,
    onApplyOverride?: (next: unknown) => void,
  ): JSX.Element => (
    <ResearchFieldAiProvider
      key={fieldPath}
      currentValue={currentValue}
      entityId={entityId}
      entityType={entityType}
      fieldLabel={fieldLabel}
      fieldPath={fieldPath}
      language={language}
      onApply={onApplyOverride ?? ((next) => applyRefined(path, current, next))}
      onNotice={onNotice}
      resolvedTheme={resolvedTheme}
    >
      {shell}
    </ResearchFieldAiProvider>
  );

  const renderScalar = (def: ScalarFieldDef): JSX.Element => {
    const value = getAtPath(draft, def.path);
    const stringValue = stringifyFieldValue(value);
    const fieldPath = def.path.join(".");
    const wrapAt = defaultWrapCharsPerLine(language);
    const useTextarea =
      !def.enumValues &&
      (def.multiline ||
        (def.inputType !== "number" && shouldUseTextarea(stringValue, language, wrapAt)));
    const rows = estimateTextareaRows(stringValue, wrapAt);
    const control = def.enumValues ? (
      <select
        className={INPUT_CLASS}
        onChange={(event) => updateAt(def.path, event.target.value)}
        value={stringValue}
      >
        <option value="">{language === "bg" ? "— избери —" : "— select —"}</option>
        {def.enumValues.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    ) : def.inputType === "number" ? (
      <input
        className={NUMBER_INPUT_CLASS}
        onChange={(event) => updateAt(def.path, Number(event.target.value))}
        type="number"
        value={stringValue}
      />
    ) : useTextarea ? (
      <textarea
        className={`${EDITOR_COMPACT_INNER_TEXT_CONTROL_CLASS} resize-y`}
        onChange={(event) => updateAt(def.path, event.target.value)}
        rows={Math.max(def.multiline ? 3 : 1, rows)}
        value={stringValue}
      />
    ) : (
      <input
        className={INPUT_CLASS}
        onChange={(event) => updateAt(def.path, event.target.value)}
        type={def.inputType === "url" || def.inputType === "email" ? def.inputType : "text"}
        value={stringValue}
      />
    );

    const wrappedControl = (
      <ResearchFieldAiInputChrome multiline={useTextarea}>{control}</ResearchFieldAiInputChrome>
    );

    const fieldShell = (
      <>
        <EditorCompactFieldRow
          alignTop={useTextarea}
          control={wrappedControl}
          includeAiActionSlot={false}
          label={def.label}
          reserveLeadingColumn={false}
          trailing={<ResearchFieldAiTrigger />}
          unifiedControlBorder={useTextarea}
          useFormGrid
        />
        <div className={EDITOR_METADATA_FIELD_AI_PANEL_WRAP_CLASS}>
          <ResearchFieldAiPanel />
        </div>
      </>
    );

    return wrapResearchFieldWithAi(fieldPath, def.label, stringValue, def.path, value, fieldShell);
  };

  const renderStringList = (label: string, path: PathSegment[]): JSX.Element => {
    const value = getAtPath(draft, path);
    const lines = Array.isArray(value) ? value.map((v) => String(v)).join("\n") : "";
    const fieldPath = path.join(".");
    const wrapAt = defaultWrapCharsPerLine(language);
    const rows = estimateTextareaRows(lines, wrapAt);
    const listControl = (
      <textarea
        className={`${EDITOR_COMPACT_INNER_TEXT_CONTROL_CLASS} resize-y`}
        onChange={(event) =>
          updateAt(
            path,
            event.target.value
              .split("\n")
              .map((line) => line.trim())
              .filter(Boolean),
          )
        }
        rows={Math.max(3, rows)}
        value={lines}
      />
    );

    const fieldShell = (
      <>
        <EditorCompactFieldRow
          alignTop
          control={<ResearchFieldAiInputChrome multiline>{listControl}</ResearchFieldAiInputChrome>}
          includeAiActionSlot={false}
          label={label}
          reserveLeadingColumn={false}
          trailing={<ResearchFieldAiTrigger />}
          unifiedControlBorder
          useFormGrid
        />
        <div className={EDITOR_METADATA_FIELD_AI_PANEL_WRAP_CLASS}>
          <ResearchFieldAiPanel />
        </div>
      </>
    );

    return wrapResearchFieldWithAi(fieldPath, label, lines, path, value, fieldShell);
  };

  const companyFields = useMemo((): ScalarFieldDef[] => {
    if (entityType !== "company") {
      return [];
    }
    return [
      { label: "Display name", path: ["name"] },
      { label: "Legal name", path: ["identity", "legal_name"] },
      { label: "Brand name", path: ["identity", "brand_name"] },
      { label: "Industry", path: ["identity", "industry"] },
      { label: "Sub-industry", path: ["identity", "sub_industry"] },
      { label: "Company size", path: ["identity", "company_size"], enumValues: COMPANY_SIZE_VALUES },
      { label: "Founded year", path: ["identity", "founded_year"] },
      { label: "Website", path: ["identity", "website"], inputType: "url" },
      { label: "Company description", path: ["identity", "description"], multiline: true },
      { label: "LinkedIn company URL", path: ["identity", "linkedin_company_url"], inputType: "url" },
      { label: "LinkedIn company ID", path: ["identity", "linkedin_company_id"] },
      { label: "Office country", path: ["office", "country"] },
      { label: "Office city", path: ["office", "city"] },
      { label: "Office label", path: ["office", "label"] },
      { label: "Office type", path: ["office", "office_type"], enumValues: OFFICE_TYPE_VALUES },
      { label: "Timezone", path: ["office", "timezone"] },
      { label: "Street address", path: ["office", "street_address"] },
      { label: "Address line 2", path: ["office", "address_line_2"] },
      { label: "Postal code", path: ["office", "postal_code"] },
      { label: "Region / state", path: ["office", "region_state"] },
      { label: "Formatted address", path: ["office", "formatted_address"], multiline: true },
      { label: "Maps URL", path: ["office", "maps_url"], inputType: "url" },
      { label: "General email", path: ["contacts", "general_email"], inputType: "email" },
      { label: "HR email", path: ["contacts", "hr_email"], inputType: "email" },
      { label: "Recruitment email", path: ["contacts", "recruitment_email"], inputType: "email" },
      { label: "Phone", path: ["contacts", "phone"] },
      { label: "Secondary phone", path: ["contacts", "phone_secondary"] },
      { label: "Careers page", path: ["contacts", "careers_page_url"], inputType: "url" },
      { label: "Press email", path: ["contacts", "press_email"], inputType: "email" },
      { label: "LinkedIn page URL", path: ["linkedin", "company_page_url"], inputType: "url" },
      { label: "LinkedIn follower count", path: ["linkedin", "follower_count"] },
      { label: "LinkedIn posts summary", path: ["linkedin", "recent_posts_summary"], multiline: true },
      { label: "Hiring status", path: ["hiring", "hiring_status"], enumValues: HIRING_STATUS_VALUES },
      { label: "Open roles estimate", path: ["hiring", "open_roles_count_estimate"] },
      { label: "Employees at office", path: ["hiring", "employee_count_at_office"] },
      { label: "Company headcount", path: ["hiring", "employee_count_company"] },
      { label: "Glassdoor rating", path: ["hiring", "glassdoor_rating"] },
      { label: "Research notes", path: ["research", "notes"], multiline: true },
    ];
  }, [entityType]);

  const jobScalarFields = useMemo((): ScalarFieldDef[] => {
    if (entityType !== "job_position") {
      return [];
    }
    return [
      { label: "Job title", path: ["title"] },
      { label: "Normalized title", path: ["identity", "normalized_title"] },
      { label: "Department", path: ["identity", "department"] },
      { label: "Seniority", path: ["identity", "seniority_level"] },
      {
        label: "Employment type",
        path: ["identity", "employment_type"],
        enumValues: EMPLOYMENT_TYPE_VALUES,
      },
      {
        label: "Remote policy",
        path: ["identity", "remote_policy"],
        enumValues: REMOTE_POLICY_VALUES,
      },
      { label: "Source", path: ["identity", "source"] },
      { label: "LinkedIn job URL", path: ["identity", "linkedin_url"], inputType: "url" },
      { label: "LinkedIn job ID", path: ["identity", "linkedin_job_id"] },
      { label: "Location country", path: ["location", "country"] },
      { label: "Location city", path: ["location", "city"] },
      { label: "Salary range", path: ["compensation", "salary_range_text"] },
      { label: "Currency", path: ["compensation", "currency"] },
      { label: "Benefits summary", path: ["compensation", "benefits_summary"], multiline: true },
      {
        label: "Job description (paste JD)",
        path: ["role", "raw_jd_text"],
        multiline: true,
      },
      { label: "Role summary", path: ["role", "description_summary"], multiline: true },
      { label: "Reports to", path: ["role", "reporting_to"] },
      { label: "Team size", path: ["role", "team_size"] },
      { label: "Min years experience", path: ["skills", "years_experience_min"] },
      { label: "Research notes", path: ["research", "notes"], multiline: true },
    ];
  }, [entityType]);

  if (!source || !draft) {
    return (
      <div className="flex min-h-[240px] flex-col items-center justify-center rounded-xl border border-dashed border-[var(--line)] bg-[var(--surface-1)] p-8 text-center">
        <p className="text-sm font-semibold text-slate-800">
          {entityType === "company"
            ? language === "bg"
              ? "Изберете или създайте компания"
              : "Select or research a company"
            : language === "bg"
              ? "Изберете или създайте позиция"
              : "Select or research a job position"}
        </p>
        <p className="mt-2 max-w-md text-xs text-[var(--ink-muted)]">
          {language === "bg"
            ? "Използвайте страничната лента за ново проучване или избор от каталога."
            : "Use the sidebar to run new research or pick an item from the catalog."}
        </p>
      </div>
    );
  }

  const keywords =
    entityType === "job_position" && draft
      ? ((getAtPath(draft, ["weighted_keywords"]) as WeightedKeyword[] | undefined) ?? [])
      : [];

  const people =
    entityType === "company" && draft
      ? ((getAtPath(draft, ["people"]) as ResearchedCompany["people"]) ?? [])
      : [];

  const linkedinJobs =
    entityType === "company" && draft
      ? ((getAtPath(draft, ["linkedin_jobs"]) as ResearchedCompany["linkedin_jobs"]) ?? [])
      : [];

  const weightedKeywordsSummary = keywords
    .map((entry) => `${entry.keyword} (weight ${entry.weight})`)
    .join("\n");

  const weightedKeywordsLabel =
    language === "bg" ? "Тегловни ключови думи" : "Weighted keywords";

  return (
    <article className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-[var(--line)] bg-white">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--line)] px-4 py-3">
        <div>
          <h3 className="text-lg font-bold text-slate-900">
            {entityType === "company"
              ? (draft as ResearchedCompany).name
              : (draft as ResearchedJobPosition).title}
          </h3>
          <p className="text-xs text-[var(--ink-muted)]">
            {language === "bg"
              ? "Редактирайте полетата и използвайте ✨ за по-дълбоко проучване."
              : "Edit fields and use ✨ to improve values. Extract keywords from the pasted JD (local, free)."}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {entityType === "job_position" ? (
            <button
              className="rounded-md border border-[var(--line)] bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 hover:bg-[var(--surface-2)] disabled:opacity-60"
              disabled={extractingKeywords || !entityId}
              onClick={() => {
                void (async () => {
                  setExtractingKeywords(true);
                  try {
                    const response = await fetch("/api/research/jobs/extract-keywords", {
                      method: "POST",
                      headers: { "content-type": "application/json" },
                      body: JSON.stringify({
                        jobId: entityId,
                        rawJdText: getAtPath(draft, ["role", "raw_jd_text"]),
                        replace: true,
                      }),
                    });
                    const payload = (await response.json()) as {
                      error?: string;
                      job_position?: ResearchedJobPosition;
                      stats?: { phraseHits?: number; termHits?: number };
                    };
                    if (!response.ok || !payload.job_position) {
                      onNotice(
                        payload.error ??
                          (language === "bg"
                            ? "Извличането на ключови думи не успя."
                            : "Keyword extract failed."),
                      );
                      return;
                    }
                    setDraft(payload.job_position);
                    setDirty(true);
                    if (researchAutoSaveEnabled && onDraftChange) {
                      onDraftChange(payload.job_position, "job_position");
                    }
                    const hits =
                      (payload.stats?.phraseHits ?? 0) + (payload.stats?.termHits ?? 0);
                    onNotice(
                      language === "bg"
                        ? `Извлечени ключови думи от JD (локално). Трефове: ${hits}.`
                        : `Extracted keywords from JD (local). Hits: ${hits}.`,
                    );
                  } catch {
                    onNotice(
                      language === "bg"
                        ? "Извличането на ключови думи не успя."
                        : "Keyword extract failed.",
                    );
                  } finally {
                    setExtractingKeywords(false);
                  }
                })();
              }}
              type="button"
            >
              {extractingKeywords
                ? language === "bg"
                  ? "Извличане..."
                  : "Extracting..."
                : language === "bg"
                  ? "Извлечи ключови думи от JD"
                  : "Extract keywords from JD"}
            </button>
          ) : null}
          <EditorAutoSaveToggle
            enabled={researchAutoSaveEnabled}
            language={language}
            onChange={onResearchAutoSaveChange}
          />
          {researchAutoSaveEnabled ? (
            <EditorAutosaveStatusPill activity={researchAutosaveActivity} language={language} />
          ) : (
            <button
              className={`rounded-md px-3 py-1.5 text-xs font-semibold text-white disabled:cursor-not-allowed ${
                dirty && !saving
                  ? "bg-[var(--accent)] disabled:opacity-60"
                  : "bg-slate-400 text-slate-100 disabled:opacity-100"
              }`}
              disabled={!dirty || saving}
              onClick={() => {
                if (entityType === "company") {
                  onSave(draft as ResearchedCompany);
                } else {
                  onSave(draft as ResearchedJobPosition);
                }
                setDirty(false);
              }}
              type="button"
            >
              {saving
                ? language === "bg"
                  ? "Запис..."
                  : "Saving..."
                : language === "bg"
                  ? "Запази"
                  : "Save changes"}
            </button>
          )}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto p-4">
        <div className={`grid ${EDITOR_COMPACT_METADATA_FORM_GRID_CLASS}`}>
          {entityType === "company" ? (
            <>
              <SectionHeader title="Identity & brand" />
              {companyFields.slice(0, 11).map((field) => renderScalar(field))}
              <SectionHeader title="Office location" />
              {companyFields.slice(11, 21).map((field) => renderScalar(field))}
              <SectionHeader title="Contacts" />
              {companyFields.slice(21, 28).map((field) => renderScalar(field))}
              <SectionHeader title="LinkedIn company" />
              {companyFields.slice(28, 31).map((field) => renderScalar(field))}
              <SectionHeader title="Hiring signals" />
              {companyFields.slice(31, 35).map((field) => renderScalar(field))}
              {renderStringList("Typical role families (one per line)", ["hiring", "typical_role_families"])}
              {renderStringList("Research sources (one per line)", ["research", "sources"])}
              <SectionHeader title="People at office" />
              {(people ?? []).map((person, index) => (
                <div className="col-span-full rounded-md border border-[var(--line)] bg-[var(--surface-1)] p-3" key={index}>
                  <p className="mb-2 text-xs font-semibold text-slate-800">
                    {language === "bg" ? `Контакт ${index + 1}` : `Contact ${index + 1}`}
                  </p>
                  <div className={`grid ${EDITOR_COMPACT_METADATA_FORM_GRID_CLASS}`}>
                    {(
                      [
                        { label: "Name", path: ["people", index, "name"] },
                        { label: "Title", path: ["people", index, "title"] },
                        { label: "Department", path: ["people", index, "department"] },
                        { label: "Seniority", path: ["people", index, "seniority"] },
                        { label: "LinkedIn URL", path: ["people", index, "linkedin_url"] },
                        { label: "Email", path: ["people", index, "email"] },
                        { label: "Location", path: ["people", index, "location"] },
                        { label: "Relevance", path: ["people", index, "relevance"], multiline: true },
                      ] as ScalarFieldDef[]
                    ).map((field) => renderScalar(field))}
                  </div>
                </div>
              ))}
              <SectionHeader title="LinkedIn open roles" />
              {(linkedinJobs ?? []).map((role, index) => (
                <div className="col-span-full rounded-md border border-[var(--line)] bg-[var(--surface-1)] p-3" key={index}>
                  <p className="mb-2 text-xs font-semibold text-slate-800">
                    {language === "bg" ? `Роля ${index + 1}` : `Role ${index + 1}`}
                  </p>
                  <div className={`grid ${EDITOR_COMPACT_METADATA_FORM_GRID_CLASS}`}>
                    {(
                      [
                        { label: "Title", path: ["linkedin_jobs", index, "title"] },
                        { label: "URL", path: ["linkedin_jobs", index, "url"] },
                        { label: "Location", path: ["linkedin_jobs", index, "location"] },
                        { label: "Posted at", path: ["linkedin_jobs", index, "posted_at"] },
                        { label: "Employment type", path: ["linkedin_jobs", index, "employment_type"] },
                        { label: "Seniority", path: ["linkedin_jobs", index, "seniority"] },
                        { label: "Remote policy", path: ["linkedin_jobs", index, "remote_policy"] },
                        {
                          label: "Description snippet",
                          path: ["linkedin_jobs", index, "description_snippet"],
                          multiline: true,
                        },
                      ] as ScalarFieldDef[]
                    ).map((field) => renderScalar(field))}
                  </div>
                </div>
              ))}
              <SectionHeader title="Notes" />
              {companyFields.slice(35).map((field) => renderScalar(field))}
            </>
          ) : (
            <>
              <SectionHeader title="Role identity" />
              {jobScalarFields.slice(0, 9).map((field) => renderScalar(field))}
              <SectionHeader title="Location & compensation" />
              {jobScalarFields.slice(9, 15).map((field) => renderScalar(field))}
              <SectionHeader title="Role narrative" />
              {jobScalarFields.slice(15, 18).map((field) => renderScalar(field))}
              {renderStringList("Responsibilities (one per line)", ["role", "responsibilities"])}
              {renderStringList("Qualifications (one per line)", ["role", "qualifications"])}
              {renderStringList("Nice to have (one per line)", ["role", "nice_to_have"])}
              <SectionHeader title="Skills profile" />
              {renderStringList("Required skills", ["skills", "skills_required"])}
              {renderStringList("Preferred skills", ["skills", "skills_preferred"])}
              {renderStringList("Tools", ["skills", "tools"])}
              {renderStringList("Certifications", ["skills", "certifications"])}
              {renderStringList("Languages", ["skills", "languages"])}
              {jobScalarFields.slice(17, 18).map((field) => renderScalar(field))}
              {wrapResearchFieldWithAi(
                "weighted_keywords",
                weightedKeywordsLabel,
                weightedKeywordsSummary,
                ["weighted_keywords"],
                keywords,
                <>
                  <SectionHeaderWithAction
                    action={<ResearchFieldAiTrigger />}
                    title={weightedKeywordsLabel}
                  />
                  <div className={WEIGHTED_KEYWORDS_GRID_CLASS}>
                {keywords.length === 0 ? (
                  <p className="col-span-2 text-xs text-[var(--ink-muted)]">
                    {language === "bg"
                      ? "Няма ключови думи. Поставете JD в „Job description“ и натиснете „Извлечи ключови думи от JD“."
                      : "No keywords yet. Paste a JD into “Job description (paste JD)” and click “Extract keywords from JD”."}
                  </p>
                ) : (
                  <>
                    <div className="col-span-2 grid grid-cols-2 gap-x-4">
                      {[0, 1].map((column) => (
                        <div className={WEIGHTED_KEYWORD_ROW_COLS} key={`kw-header-${column}`}>
                          <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--ink-muted)]">
                            {language === "bg" ? "Ключова дума" : "Keyword"}
                          </span>
                          <span className="text-center text-[10px] font-semibold uppercase tracking-wide text-[var(--ink-muted)]">
                            {language === "bg" ? "Тегло" : "Weight"}
                          </span>
                          <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--ink-muted)]">
                            {language === "bg" ? "Категория" : "Category"}
                          </span>
                        </div>
                      ))}
                    </div>
                    {keywords.map((entry, index) => {
                      const weightValue = Number.isFinite(entry.weight) ? entry.weight : 0;
                      return (
                        <div className={WEIGHTED_KEYWORD_ROW_COLS} key={`kw-row-${index}-${entry.keyword}`}>
                          <input
                            className={gradedKeywordInputClass(resolvedTheme, weightValue)}
                            onChange={(event) => {
                              const next = [...keywords];
                              next[index] = { ...next[index], keyword: event.target.value };
                              updateAt(["weighted_keywords"], next);
                            }}
                            placeholder={language === "bg" ? "ключова дума" : "keyword"}
                            value={entry.keyword}
                          />
                          <input
                            className={gradedWeightInputClass(resolvedTheme, weightValue)}
                            max={100}
                            min={0}
                            onChange={(event) => {
                              const next = [...keywords];
                              const parsed = Number(event.target.value);
                              next[index] = {
                                ...next[index],
                                weight: Number.isFinite(parsed)
                                  ? Math.max(0, Math.min(100, Math.round(parsed)))
                                  : 0,
                              };
                              updateAt(["weighted_keywords"], next);
                            }}
                            type="number"
                            value={weightValue}
                          />
                          <input
                            className={`${INPUT_CLASS} min-w-0 px-1.5 py-1 text-[11px]`}
                            onChange={(event) => {
                              const next = [...keywords];
                              next[index] = { ...next[index], category: event.target.value };
                              updateAt(["weighted_keywords"], next);
                            }}
                            placeholder="skill"
                            value={entry.category ?? ""}
                          />
                        </div>
                      );
                    })}
                  </>
                )}
                  </div>
                  <div className={EDITOR_METADATA_FIELD_AI_PANEL_WRAP_CLASS}>
                    <ResearchFieldAiPanel />
                  </div>
                </>,
                (next) => {
                  const parsed = parseWeightedKeywordsFromProposal(next);
                  if (parsed.length > 0) {
                    updateAt(["weighted_keywords"], parsed);
                  }
                },
              )}
              <SectionHeader title="ATS helpers" />
              {renderStringList("ATS keywords", ["ats", "keywords"])}
              {renderStringList("Action verbs", ["ats", "action_verbs"])}
              <SectionHeader title="Notes" />
              {jobScalarFields.slice(18, 19).map((field) => renderScalar(field))}
              {renderStringList("Research sources", ["research", "sources"])}
            </>
          )}
        </div>
      </div>
    </article>
  );
}