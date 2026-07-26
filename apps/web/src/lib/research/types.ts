export type ResearchMeta = {
  notes?: string;
  sources?: string[];
  researched_at?: string;
  research_model?: string;
  last_operation?: string;
  stages_completed?: string[];
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    estimated_usd?: number;
  };
};

export type CompanyIdentity = {
  legal_name?: string;
  brand_name?: string;
  industry?: string;
  sub_industry?: string;
  company_size?: string;
  founded_year?: string;
  website?: string;
  linkedin_company_url?: string;
  linkedin_company_id?: string;
  description?: string;
};

export type CompanyOffice = {
  country: string;
  city?: string;
  label?: string;
  office_type?: "headquarters" | "branch" | "regional_hub" | "remote_hub" | "coworking" | "unknown";
  timezone?: string;
  street_address?: string;
  address_line_2?: string;
  postal_code?: string;
  region_state?: string;
  formatted_address?: string;
  maps_url?: string;
};

/** @deprecated Use office.formatted_address and office fields */
export type ResearchContact = {
  email?: string;
  phone?: string;
  website?: string;
};

export type CompanyContacts = {
  general_email?: string;
  hr_email?: string;
  recruitment_email?: string;
  phone?: string;
  phone_secondary?: string;
  careers_page_url?: string;
  press_email?: string;
  email?: string;
  phone_legacy?: string;
  website?: string;
};

export type ResearchPerson = {
  name: string;
  title?: string;
  department?: string;
  seniority?: string;
  linkedin_url?: string;
  email?: string;
  location?: string;
  relevance?: string;
  source?: string;
};

export type ResearchLinkedInJob = {
  title: string;
  url?: string;
  location?: string;
  posted_at?: string;
  employment_type?: string;
  seniority?: string;
  remote_policy?: string;
  description_snippet?: string;
  applicants_count?: string;
};

export type CompanyLinkedIn = {
  company_page_url?: string;
  company_id?: string;
  follower_count?: string;
  recent_posts_summary?: string;
};

export type CompanyHiring = {
  hiring_status?: "active" | "limited" | "frozen" | "unknown";
  open_roles_count_estimate?: string;
  typical_role_families?: string[];
  employee_count_at_office?: string;
  employee_count_company?: string;
  glassdoor_rating?: string;
};

export type ResearchedCompany = {
  id: string;
  name: string;
  identity?: CompanyIdentity;
  office: CompanyOffice;
  contacts?: CompanyContacts;
  people?: ResearchPerson[];
  linkedin_jobs?: ResearchLinkedInJob[];
  linkedin?: CompanyLinkedIn;
  hiring?: CompanyHiring;
  research?: ResearchMeta;
  /** Legacy flat fields (migrated on read) */
  office_country?: string;
  office_city?: string;
  office_label?: string;
  address?: string;
  notes?: string;
  researched_at?: string;
  research_model?: string;
};

export type KeywordEvidence = {
  kind: "jd_quote" | "title" | "source_url" | "manual";
  text?: string;
  url?: string;
  count?: number;
};

export type WeightedKeyword = {
  keyword: string;
  weight: number;
  category?: "skill" | "tool" | "domain" | "soft" | string;
  role?: "must" | "should" | "nice";
  rationale?: string;
  evidence?: KeywordEvidence[];
  source?: "extract" | "ai" | "user";
  canonical_key?: string;
};

export type JobIdentity = {
  title: string;
  normalized_title?: string;
  department?: string;
  seniority_level?: string;
  employment_type?: string;
  remote_policy?: string;
  source?: "linkedin" | "manual" | "research";
  linkedin_url?: string;
  linkedin_job_id?: string;
};

export type JobLocation = {
  country?: string;
  city?: string;
  relocation_offered?: boolean;
};

export type JobCompensation = {
  salary_range_text?: string;
  currency?: string;
  benefits_summary?: string;
};

export type JobRoleContent = {
  /** User-pasted full job description (D3 evidence source). */
  raw_jd_text?: string;
  description_summary?: string;
  responsibilities?: string[];
  qualifications?: string[];
  nice_to_have?: string[];
  reporting_to?: string;
  team_size?: string;
};

export type JobSkillsProfile = {
  skills_required?: string[];
  skills_preferred?: string[];
  tools?: string[];
  certifications?: string[];
  languages?: string[];
  years_experience_min?: string;
};

export type JobAtsProfile = {
  keywords?: string[];
  action_verbs?: string[];
};

export type ResearchedJobPosition = {
  id: string;
  company_id: string;
  title: string;
  identity?: JobIdentity;
  location?: JobLocation;
  compensation?: JobCompensation;
  role?: JobRoleContent;
  skills?: JobSkillsProfile;
  weighted_keywords: WeightedKeyword[];
  ats?: JobAtsProfile;
  research?: ResearchMeta;
  /** Legacy */
  source?: "linkedin" | "manual" | "research";
  description_summary?: string;
  skills_required?: string[];
  linkedin_url?: string;
  researched_at?: string;
  research_model?: string;
};

export type ResearchCatalog = {
  version: number;
  companies: ResearchedCompany[];
  job_positions: ResearchedJobPosition[];
};

export type ResearchSidebarTab = "companies" | "job_positions";

export type ResearchFieldRefineEntity = "company" | "job_position";