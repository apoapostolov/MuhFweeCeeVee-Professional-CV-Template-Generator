"use client";

import { useMemo, type JSX } from "react";

import { companyOfficeSummary } from "@/lib/research/research-normalize";
import type { ResearchedCompany, ResearchedJobPosition, ResearchSidebarTab } from "@/lib/research/types";

import { AiStarsIcon } from "./ai-stars-icon";

export type ResearchSidebarProps = {
  sidebarTab: ResearchSidebarTab;
  onSidebarTabChange: (tab: ResearchSidebarTab) => void;
  companies: ResearchedCompany[];
  jobPositions: ResearchedJobPosition[];
  selectedCompanyId: string;
  selectedJobId: string;
  onSelectCompany: (companyId: string) => void;
  onSelectJob: (jobId: string) => void;
  loadingCatalog: boolean;
  researchingCompany: boolean;
  researchingJob: boolean;
  companyName: string;
  officeCountry: string;
  officeCity: string;
  officeLabel: string;
  jobTitle: string;
  jobDescription: string;
  linkedinUrl: string;
  onCompanyNameChange: (value: string) => void;
  onOfficeCountryChange: (value: string) => void;
  onOfficeCityChange: (value: string) => void;
  onOfficeLabelChange: (value: string) => void;
  onJobTitleChange: (value: string) => void;
  onJobDescriptionChange: (value: string) => void;
  onLinkedinUrlChange: (value: string) => void;
  onResearchCompany: () => void;
  onResearchJob: () => void;
  onDeleteCompany: (id: string) => void;
  onDeleteJob: (id: string) => void;
  language: string;
};

export function ResearchSidebar(props: ResearchSidebarProps): JSX.Element {
  const {
    sidebarTab,
    onSidebarTabChange,
    companies,
    jobPositions,
    selectedCompanyId,
    selectedJobId,
    onSelectCompany,
    onSelectJob,
    loadingCatalog,
    researchingCompany,
    researchingJob,
    companyName,
    officeCountry,
    officeCity,
    officeLabel,
    jobTitle,
    jobDescription,
    linkedinUrl,
    onCompanyNameChange,
    onOfficeCountryChange,
    onOfficeCityChange,
    onOfficeLabelChange,
    onJobTitleChange,
    onJobDescriptionChange,
    onLinkedinUrlChange,
    onResearchCompany,
    onResearchJob,
    onDeleteCompany,
    onDeleteJob,
    language,
  } = props;

  const jobsForCompany = useMemo(
    () => jobPositions.filter((job) => job.company_id === selectedCompanyId),
    [jobPositions, selectedCompanyId],
  );

  const selectedCompany = companies.find((c) => c.id === selectedCompanyId) ?? null;
  const linkedinJobs = selectedCompany?.linkedin_jobs ?? [];

  return (
    <article className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-[var(--line)] bg-white">
      <div className="border-b border-[var(--line)] p-3">
        <div
          aria-label={language === "bg" ? "Тип проучване" : "Research type"}
          className="inline-flex w-full overflow-hidden rounded-full border border-[var(--line)]"
          role="group"
        >
          <button
            className={`flex-1 px-3 py-2 text-xs font-semibold ${
              sidebarTab === "companies" ? "bg-[var(--accent)] text-white" : "bg-white text-slate-800"
            }`}
            onClick={() => onSidebarTabChange("companies")}
            type="button"
          >
            {language === "bg" ? "Компании" : "Companies"}
          </button>
          <button
            className={`flex-1 border-l border-[var(--line)] px-3 py-2 text-xs font-semibold ${
              sidebarTab === "job_positions"
                ? "bg-[var(--accent)] text-white"
                : "bg-white text-slate-800"
            }`}
            onClick={() => onSidebarTabChange("job_positions")}
            type="button"
          >
            {language === "bg" ? "Позиции" : "Job Positions"}
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-auto p-4">
        {sidebarTab === "companies" ? (
          <>
            <p className="text-xs text-[var(--ink-muted)]">
              {language === "bg"
                ? "Проучете офис на компания: адрес, контакти, хора и отворени роли в LinkedIn."
                : "Research a company office: address, contacts, people, and LinkedIn open roles."}
            </p>
            <div className="space-y-2">
              <label className="block text-xs font-medium text-slate-800">
                {language === "bg" ? "Име на компания" : "Company name"}
                <input
                  className="mt-1 w-full rounded-md border border-[var(--line)] bg-[var(--surface-1)] px-2 py-1.5 text-xs"
                  onChange={(event) => onCompanyNameChange(event.target.value)}
                  value={companyName}
                />
              </label>
              <label className="block text-xs font-medium text-slate-800">
                {language === "bg" ? "Държава на офис" : "Office country"}
                <input
                  className="mt-1 w-full rounded-md border border-[var(--line)] bg-[var(--surface-1)] px-2 py-1.5 text-xs"
                  onChange={(event) => onOfficeCountryChange(event.target.value)}
                  placeholder="Bulgaria"
                  value={officeCountry}
                />
              </label>
              <div className="grid gap-2 sm:grid-cols-2">
                <label className="block text-xs font-medium text-slate-800">
                  {language === "bg" ? "Град" : "City"}
                  <input
                    className="mt-1 w-full rounded-md border border-[var(--line)] bg-[var(--surface-1)] px-2 py-1.5 text-xs"
                    onChange={(event) => onOfficeCityChange(event.target.value)}
                    value={officeCity}
                  />
                </label>
                <label className="block text-xs font-medium text-slate-800">
                  {language === "bg" ? "Етикет на офис" : "Office label"}
                  <input
                    className="mt-1 w-full rounded-md border border-[var(--line)] bg-[var(--surface-1)] px-2 py-1.5 text-xs"
                    onChange={(event) => onOfficeLabelChange(event.target.value)}
                    placeholder="Sofia HQ"
                    value={officeLabel}
                  />
                </label>
              </div>
              <button
                className="inline-flex w-full items-center justify-center gap-1.5 rounded-md bg-[var(--accent)] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
                disabled={researchingCompany || !companyName.trim() || !officeCountry.trim()}
                onClick={onResearchCompany}
                type="button"
              >
                <AiStarsIcon className="h-3.5 w-3.5" variant="default" />
                {researchingCompany
                  ? language === "bg"
                    ? "Проучване..."
                    : "Researching..."
                  : language === "bg"
                    ? "Проучи компания"
                    : "Research Company"}
              </button>
            </div>

            <div className="rounded-md border border-[var(--line)] bg-[var(--surface-1)] p-3">
              <p className="text-sm font-semibold text-slate-800">
                {language === "bg" ? "Каталог" : "Catalog"} ({companies.length})
              </p>
              {loadingCatalog ? (
                <p className="mt-2 text-xs text-[var(--ink-muted)]">
                  {language === "bg" ? "Зареждане..." : "Loading..."}
                </p>
              ) : companies.length === 0 ? (
                <p className="mt-2 text-xs text-[var(--ink-muted)]">
                  {language === "bg" ? "Няма записи." : "No entries yet."}
                </p>
              ) : (
                <ul className="mt-2 max-h-56 space-y-1 overflow-auto">
                  {companies.map((company) => (
                    <li key={company.id}>
                      <div
                        className={`flex items-center gap-1 rounded-md border px-2 py-1 ${
                          selectedCompanyId === company.id
                            ? "border-[var(--accent)] bg-[var(--accent-soft)]"
                            : "border-[var(--line)] bg-white"
                        }`}
                      >
                        <button
                          className="min-w-0 flex-1 text-left text-xs font-semibold"
                          onClick={() => onSelectCompany(company.id)}
                          type="button"
                        >
                          {company.name}
                          <span className="block truncate font-normal text-[var(--ink-muted)]">
                            {companyOfficeSummary(company)}
                          </span>
                        </button>
                        <button
                          className="shrink-0 rounded border border-red-300 px-1.5 py-0.5 text-[10px] text-red-700"
                          onClick={() => onDeleteCompany(company.id)}
                          type="button"
                        >
                          ×
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        ) : (
          <>
            <p className="text-xs text-[var(--ink-muted)]">
              {language === "bg"
                ? "Проучете ключови думи и умения за роля в избрана компания."
                : "Research weighted keywords and skills for a role at the selected company."}
            </p>
            <label className="block text-xs font-medium text-slate-800">
              {language === "bg" ? "Компания" : "Company"}
              <select
                className="mt-1 w-full rounded-md border border-[var(--line)] bg-[var(--surface-1)] px-2 py-1.5 text-xs"
                onChange={(event) => onSelectCompany(event.target.value)}
                value={selectedCompanyId}
              >
                <option value="">{language === "bg" ? "Изберете..." : "Select company..."}</option>
                {companies.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.name} ({company.office.country})
                  </option>
                ))}
              </select>
            </label>

            {linkedinJobs.length > 0 ? (
              <label className="block text-xs font-medium text-slate-800">
                {language === "bg" ? "Роля от LinkedIn" : "LinkedIn role (optional)"}
                <select
                  className="mt-1 w-full rounded-md border border-[var(--line)] bg-[var(--surface-1)] px-2 py-1.5 text-xs"
                  onChange={(event) => {
                    const role = linkedinJobs.find((entry) => entry.title === event.target.value);
                    if (role) {
                      onJobTitleChange(role.title);
                      onLinkedinUrlChange(role.url ?? "");
                    }
                  }}
                  value={jobTitle}
                >
                  <option value="">{language === "bg" ? "Изберете..." : "Pick listing..."}</option>
                  {linkedinJobs.map((role) => (
                    <option key={`${role.title}-${role.url ?? ""}`} value={role.title}>
                      {role.title}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}

            <label className="block text-xs font-medium text-slate-800">
              {language === "bg" ? "Длъжност" : "Job title"}
              <input
                className="mt-1 w-full rounded-md border border-[var(--line)] bg-[var(--surface-1)] px-2 py-1.5 text-xs"
                onChange={(event) => onJobTitleChange(event.target.value)}
                value={jobTitle}
              />
            </label>
            <label className="block text-xs font-medium text-slate-800">
              {language === "bg" ? "Описание (по избор)" : "Job description (optional)"}
              <textarea
                className="mt-1 w-full rounded-md border border-[var(--line)] bg-[var(--surface-1)] px-2 py-1.5 text-xs"
                onChange={(event) => onJobDescriptionChange(event.target.value)}
                rows={4}
                value={jobDescription}
              />
            </label>
            <button
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-md bg-[var(--accent)] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
              disabled={researchingJob || !selectedCompanyId || !jobTitle.trim()}
              onClick={onResearchJob}
              type="button"
            >
              <AiStarsIcon className="h-3.5 w-3.5" variant="default" />
              {researchingJob
                ? language === "bg"
                  ? "Проучване..."
                  : "Researching..."
                : language === "bg"
                  ? "Проучи позиция"
                  : "Research Job Position"}
            </button>

            <div className="rounded-md border border-[var(--line)] bg-[var(--surface-1)] p-3">
              <p className="text-sm font-semibold text-slate-800">
                {language === "bg" ? "Позиции" : "Positions"} ({jobsForCompany.length})
              </p>
              {!selectedCompanyId ? (
                <p className="mt-2 text-xs text-[var(--ink-muted)]">
                  {language === "bg" ? "Първо изберете компания." : "Select a company first."}
                </p>
              ) : jobsForCompany.length === 0 ? (
                <p className="mt-2 text-xs text-[var(--ink-muted)]">
                  {language === "bg" ? "Няма позиции." : "No positions yet."}
                </p>
              ) : (
                <ul className="mt-2 max-h-56 space-y-1 overflow-auto">
                  {jobsForCompany.map((job) => (
                    <li key={job.id}>
                      <div
                        className={`flex items-center gap-1 rounded-md border px-2 py-1 ${
                          selectedJobId === job.id
                            ? "border-[var(--accent)] bg-[var(--accent-soft)]"
                            : "border-[var(--line)] bg-white"
                        }`}
                      >
                        <button
                          className="min-w-0 flex-1 text-left text-xs font-semibold"
                          onClick={() => onSelectJob(job.id)}
                          type="button"
                        >
                          {job.title}
                          <span className="font-normal text-[var(--ink-muted)]">
                            {" "}
                            ({job.weighted_keywords.length} kw)
                          </span>
                        </button>
                        <button
                          className="shrink-0 rounded border border-red-300 px-1.5 py-0.5 text-[10px] text-red-700"
                          onClick={() => onDeleteJob(job.id)}
                          type="button"
                        >
                          ×
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}
      </div>
    </article>
  );
}