"use client";

import { useEffect, useState, type JSX } from "react";

import type { CompanyEnrichStage } from "@/lib/research/companyEnrich";
import type {
  ResearchedCompany,
  ResearchedJobPosition,
  ResearchFieldRefineEntity,
  ResearchSidebarTab,
} from "@/lib/research/types";
import type { EditorAutosaveActivity } from "./types";

import { ResearchDetailForm } from "./ResearchDetailForm";
import { ResearchSidebar } from "./ResearchSidebar";

export type ResearchPanelProps = {
  companies: ResearchedCompany[];
  jobPositions: ResearchedJobPosition[];
  selectedCompanyId: string;
  selectedJobId: string;
  sidebarTab: ResearchSidebarTab;
  onSidebarTabChange: (tab: ResearchSidebarTab) => void;
  onSelectCompany: (companyId: string) => void;
  onSelectJob: (jobId: string) => void;
  companyDetail: ResearchedCompany | null;
  jobDetail: ResearchedJobPosition | null;
  loadingCatalog: boolean;
  researchingCompany: boolean;
  researchingJob: boolean;
  savingResearch: boolean;
  researchAutoSaveEnabled: boolean;
  researchAutosaveActivity: EditorAutosaveActivity;
  onResearchAutoSaveChange: (enabled: boolean) => void;
  onResearchDraftChange: (
    draft: ResearchedCompany | ResearchedJobPosition,
    entityType: ResearchFieldRefineEntity,
  ) => void;
  notice: string;
  resolvedTheme: "light" | "dark";
  language: string;
  onResearchCompany: (payload: {
    companyId?: string;
    companyName: string;
    officeCountry: string;
    officeCity?: string;
    officeLabel?: string;
    website?: string;
    linkedinCompanyUrl?: string;
    aboutText?: string;
    stages?: CompanyEnrichStage[];
    useWebSearch?: boolean;
  }) => void;
  onResearchJob: (payload: {
    companyId: string;
    jobTitle: string;
    jobDescription?: string;
    linkedinUrl?: string;
  }) => void;
  onSaveCompany: (company: ResearchedCompany) => void;
  onSaveJob: (job: ResearchedJobPosition) => void;
  onDeleteCompany: (companyId: string) => void;
  onDeleteJob: (jobId: string) => void;
  /** Import legacy Editor company-metadata files into Research catalog shells. */
  onImportMetadata: () => void;
  onNotice: (message: string) => void;
};

export function ResearchPanel(props: ResearchPanelProps): JSX.Element {
  const {
    companies,
    jobPositions,
    selectedCompanyId,
    selectedJobId,
    sidebarTab,
    onSidebarTabChange,
    onSelectCompany,
    onSelectJob,
    companyDetail,
    jobDetail,
    loadingCatalog,
    researchingCompany,
    researchingJob,
    savingResearch,
    researchAutoSaveEnabled,
    researchAutosaveActivity,
    onResearchAutoSaveChange,
    onResearchDraftChange,
    notice,
    resolvedTheme,
    language,
    onResearchCompany,
    onResearchJob,
    onSaveCompany,
    onSaveJob,
    onDeleteCompany,
    onDeleteJob,
    onImportMetadata,
    onNotice,
  } = props;

  const [companyName, setCompanyName] = useState("");
  const [officeCountry, setOfficeCountry] = useState("");
  const [officeCity, setOfficeCity] = useState("");
  const [officeLabel, setOfficeLabel] = useState("");
  const [companyWebsite, setCompanyWebsite] = useState("");
  const [companyLinkedinUrl, setCompanyLinkedinUrl] = useState("");
  const [companyAboutText, setCompanyAboutText] = useState("");
  const [companyUseWebSearch, setCompanyUseWebSearch] = useState(false);
  const [companyStages, setCompanyStages] = useState<CompanyEnrichStage[]>(["identity"]);
  const [jobTitle, setJobTitle] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");

  useEffect(() => {
    if (sidebarTab === "companies" && companyDetail) {
      setCompanyName(companyDetail.name);
      setOfficeCountry(companyDetail.office.country);
      setOfficeCity(companyDetail.office.city ?? "");
      setOfficeLabel(companyDetail.office.label ?? "");
      setCompanyWebsite(companyDetail.identity?.website ?? "");
      setCompanyLinkedinUrl(companyDetail.identity?.linkedin_company_url ?? "");
    }
  }, [sidebarTab, companyDetail]);

  useEffect(() => {
    if (!companyUseWebSearch) {
      setCompanyStages((prev) =>
        prev.filter((s) => s !== "people" && s !== "linkedin_jobs"),
      );
    }
  }, [companyUseWebSearch]);

  useEffect(() => {
    if (sidebarTab === "job_positions" && jobDetail) {
      setJobTitle(jobDetail.title);
      setJobDescription(jobDetail.role?.description_summary ?? "");
      setLinkedinUrl(jobDetail.identity?.linkedin_url ?? "");
    }
  }, [sidebarTab, jobDetail]);

  const mainEntityType = sidebarTab === "companies" ? "company" : "job_position";

  return (
    <div className="grid min-h-0 flex-1 gap-4 md:grid-cols-[340px_1fr]">
      <ResearchSidebar
        companies={companies}
        companyName={companyName}
        jobDescription={jobDescription}
        jobPositions={jobPositions}
        jobTitle={jobTitle}
        language={language}
        linkedinUrl={linkedinUrl}
        loadingCatalog={loadingCatalog}
        officeCity={officeCity}
        officeCountry={officeCountry}
        officeLabel={officeLabel}
        companyAboutText={companyAboutText}
        companyLinkedinUrl={companyLinkedinUrl}
        companyStages={companyStages}
        companyUseWebSearch={companyUseWebSearch}
        companyWebsite={companyWebsite}
        onCompanyAboutTextChange={setCompanyAboutText}
        onCompanyLinkedinUrlChange={setCompanyLinkedinUrl}
        onCompanyNameChange={setCompanyName}
        onCompanyStagesChange={setCompanyStages}
        onCompanyUseWebSearchChange={setCompanyUseWebSearch}
        onCompanyWebsiteChange={setCompanyWebsite}
        onDeleteCompany={onDeleteCompany}
        onDeleteJob={onDeleteJob}
        onImportMetadata={onImportMetadata}
        onJobDescriptionChange={setJobDescription}
        onJobTitleChange={setJobTitle}
        onLinkedinUrlChange={setLinkedinUrl}
        onOfficeCityChange={setOfficeCity}
        onOfficeCountryChange={setOfficeCountry}
        onOfficeLabelChange={setOfficeLabel}
        onResearchCompany={() =>
          onResearchCompany({
            ...(sidebarTab === "companies" && selectedCompanyId
              ? { companyId: selectedCompanyId }
              : {}),
            companyName: companyName.trim(),
            officeCountry: officeCountry.trim(),
            officeCity: officeCity.trim() || undefined,
            officeLabel: officeLabel.trim() || undefined,
            website: companyWebsite.trim() || undefined,
            linkedinCompanyUrl: companyLinkedinUrl.trim() || undefined,
            aboutText: companyAboutText.trim() || undefined,
            stages: companyStages,
            useWebSearch: companyUseWebSearch,
          })
        }
        onResearchJob={() =>
          onResearchJob({
            companyId: selectedCompanyId,
            jobTitle: jobTitle.trim(),
            jobDescription: jobDescription.trim() || undefined,
            linkedinUrl: linkedinUrl.trim() || undefined,
          })
        }
        onSelectCompany={onSelectCompany}
        onSelectJob={onSelectJob}
        onSidebarTabChange={onSidebarTabChange}
        researchingCompany={researchingCompany}
        researchingJob={researchingJob}
        selectedCompanyId={selectedCompanyId}
        selectedJobId={selectedJobId}
        sidebarTab={sidebarTab}
      />

      <div className="flex min-h-0 min-w-0 flex-col gap-2">
        {notice ? (
          <p className="rounded-md border border-[var(--line)] bg-[var(--surface-1)] px-3 py-2 text-xs text-slate-800">
            {notice}
          </p>
        ) : null}
        <ResearchDetailForm
          company={sidebarTab === "companies" ? companyDetail : null}
          entityType={mainEntityType}
          job={sidebarTab === "job_positions" ? jobDetail : null}
          language={language}
          onDraftChange={onResearchDraftChange}
          onNotice={onNotice}
          onResearchAutoSaveChange={onResearchAutoSaveChange}
          onSave={(payload) => {
            if (mainEntityType === "company") {
              onSaveCompany(payload as ResearchedCompany);
            } else {
              onSaveJob(payload as ResearchedJobPosition);
            }
          }}
          researchAutoSaveEnabled={researchAutoSaveEnabled}
          researchAutosaveActivity={researchAutosaveActivity}
          resolvedTheme={resolvedTheme}
          saving={savingResearch}
        />
      </div>
    </div>
  );
}