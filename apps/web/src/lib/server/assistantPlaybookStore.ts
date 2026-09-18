import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

import {
  ASSISTANT_SCHEMA_VERSION,
  type AssistantPlaybook,
} from "@muhfweeceevee/schemas";

import { repoPath } from "./repoPaths";

type PlaybookDocument = { version: 1; playbooks: AssistantPlaybook[] };

const DEFAULT_PATH = repoPath("data", "assistant", "playbooks.json");
const MAX_PLAYBOOKS = 100;

const STARTERS = [
  {
    id: "builtin_1",
    title: "Tailor a CV for this job",
    description: "Compare the selected CV with the target role and propose truthful edits.",
    prompt:
      "Compare the selected CV with the selected job. Check ATS fit and evidence, then propose only truthful, high-impact edits. Preserve facts and stop for approval before changing the CV.",
    scopePanels: ["editor", "research", "applications"],
  },
  {
    id: "builtin_2",
    title: "Prepare an application packet",
    description: "Check the CV, cover letter, and job context before submission.",
    prompt:
      "Review the selected application, its job research, linked CV, and cover letter. List anything missing or inconsistent, prepare the required documents, and stop for approval before saving changes or creating a submission snapshot.",
    scopePanels: ["applications", "cover_letters", "editor"],
  },
  {
    id: "builtin_3",
    title: "Review stalled applications",
    description: "Find overdue follow-ups and turn them into a focused queue.",
    prompt:
      "Review active applications for stalled follow-ups. Rank the cases by urgency, explain the next action for each, and propose record updates only when the evidence supports them.",
    scopePanels: ["applications"],
  },
  {
    id: "builtin_4",
    title: "Capture a new job opportunity",
    description: "Turn a pasted listing into research and a Wishlist application.",
    prompt:
      "Extract the company, role, location, source, deadline, and useful job details from the pasted listing or URL. Check for duplicates, create a Wishlist application only when it is new, and stop for approval before writing records.",
    scopePanels: ["applications", "research"],
  },
  {
    id: "builtin_5",
    title: "Check ATS fit and keyword gaps",
    description: "Measure role fit without stuffing unsupported keywords.",
    prompt:
      "Compare the selected CV with the selected job description. Report matched, missing, and weakly supported keywords, distinguish must-have requirements from optional ones, and propose only changes backed by real experience.",
    scopePanels: ["editor", "research"],
  },
  {
    id: "builtin_6",
    title: "Draft a targeted cover letter",
    description: "Build a concise letter from verified CV and job evidence.",
    prompt:
      "Review the selected application, job research, and linked CV. Draft a concise cover letter using only verified evidence, flag missing facts instead of inventing them, and stop for approval before saving a version.",
    scopePanels: ["cover_letters", "applications", "research", "editor"],
  },
  {
    id: "builtin_7",
    title: "Run a pre-submission review",
    description: "Catch mismatches before an application leaves the workspace.",
    prompt:
      "Review the selected application as a final submission check. Verify company and role details, CV and letter alignment, contact data, template choice, links, dates, and unresolved warnings. Return a submit, fix, or stop verdict with exact reasons.",
    scopePanels: ["applications", "editor", "cover_letters"],
  },
  {
    id: "builtin_8",
    title: "Plan today's application work",
    description: "Build a short queue from deadlines, follow-ups, and priority.",
    prompt:
      "Review all active applications and create today's ordered action list using deadlines, next actions, status age, and priority. Keep the list short, explain why each item matters today, and make no changes unless asked.",
    scopePanels: ["applications"],
  },
  {
    id: "builtin_9",
    title: "Record a recruiter response",
    description: "Update status, activity, contact, and the next action coherently.",
    prompt:
      "Use the supplied recruiter message to identify the matching application. Summarize what changed, propose the correct status, activity, contact, and next action updates as one coherent operation, and stop for approval before writing.",
    scopePanels: ["applications"],
  },
  {
    id: "builtin_10",
    title: "Research a company before applying",
    description: "Build a practical company brief for tailoring and interviews.",
    prompt:
      "Research the selected company using available stored and live sources. Summarize its products, business model, office context, hiring signals, risks, and facts relevant to the selected role. Separate verified facts from inference and stop for approval before replacing stored research.",
    scopePanels: ["research", "applications"],
  },
  {
    id: "builtin_11",
    title: "Research a job and extract requirements",
    description: "Turn a listing into structured requirements and weighted keywords.",
    prompt:
      "Analyze the selected job listing. Extract responsibilities, must-have and optional requirements, seniority signals, weighted keywords, location constraints, and open questions. Reuse existing research where possible and stop for approval before saving replacements.",
    scopePanels: ["research", "applications"],
  },
  {
    id: "builtin_12",
    title: "Prepare an interview brief",
    description: "Create a focused prep sheet from the job, company, and CV.",
    prompt:
      "Build an interview brief for the selected application. Include the role's likely evaluation areas, company context, the strongest matching CV evidence, likely gaps, questions to ask, and concise STAR story prompts without inventing details.",
    scopePanels: ["applications", "research", "editor"],
  },
  {
    id: "builtin_13",
    title: "Create a role-specific CV variant",
    description: "Start a separate version for a distinct role or market.",
    prompt:
      "Review the selected CV and target role. Decide whether a separate CV variant is justified, define its language and target, preserve all factual source content, and stop for approval before creating or editing the variant.",
    scopePanels: ["editor", "research"],
  },
  {
    id: "builtin_14",
    title: "Translate a CV safely",
    description: "Translate selected fields while preserving meaning and source data.",
    prompt:
      "Translate the selected CV into the requested language. Preserve names, employers, product names, dates, metrics, and links; flag ambiguous terms; keep the source variant unchanged; and stop for approval before saving the target variant.",
    scopePanels: ["editor"],
  },
  {
    id: "builtin_15",
    title: "Compare CV variants",
    description: "Find drift, missing sections, and useful differences between versions.",
    prompt:
      "Compare the selected CV variants section by section. Report factual drift, missing content, translation inconsistencies, targeting differences, and changes that should be synchronized. Make no changes until the comparison is reviewed.",
    scopePanels: ["editor"],
  },
  {
    id: "builtin_16",
    title: "Improve one weak CV section",
    description: "Rewrite a selected section without expanding the scope.",
    prompt:
      "Review only the selected CV section. Identify vague claims, missing outcomes, repetition, and readability problems. Propose a concise rewrite using existing facts and stop for approval before saving it.",
    scopePanels: ["editor"],
  },
  {
    id: "builtin_17",
    title: "Verify achievements and evidence",
    description: "Check that strong claims have support and clear provenance.",
    prompt:
      "Audit the selected CV's achievements and metrics against stored career evidence and application records. Mark each claim as supported, unclear, or unsupported, identify reusable evidence, and do not strengthen claims beyond the available proof.",
    scopePanels: ["editor", "applications"],
  },
  {
    id: "builtin_18",
    title: "Prepare a recruiter follow-up",
    description: "Draft a useful follow-up based on status and recent activity.",
    prompt:
      "Review the selected application's status, contacts, activities, submission date, and next action. Draft a short recruiter follow-up that matches the actual timeline, and propose the activity and next-action updates that should be recorded after sending.",
    scopePanels: ["applications"],
  },
  {
    id: "builtin_19",
    title: "Reuse a strong application packet",
    description: "Adapt an existing packet for a closely related opportunity.",
    prompt:
      "Compare the selected source application with the new target role. Decide what CV, cover-letter, and job-context material can be reused safely, list what must change, and stop for approval before creating the new application packet.",
    scopePanels: ["applications", "cover_letters", "editor"],
  },
  {
    id: "builtin_20",
    title: "Record a completed submission",
    description: "Freeze the exact assets and details used for an application.",
    prompt:
      "Review the selected application and confirm the exact CV, template, cover letter, source, submission URL, date, and confirmation reference. Report anything missing and stop for approval before creating the immutable submission snapshot.",
    scopePanels: ["applications", "cover_letters", "editor"],
  },
  {
    id: "builtin_21",
    title: "Compare submitted and current materials",
    description: "Show what changed after an application was submitted.",
    prompt:
      "Compare the selected application's latest submission snapshot with the current CV, cover letter, job record, template, and related assets. Summarize meaningful drift and explain whether any follow-up action is needed.",
    scopePanels: ["applications", "cover_letters", "editor"],
  },
  {
    id: "builtin_22",
    title: "Review the application funnel",
    description: "Find conversion problems by status, source, timing, and role family.",
    prompt:
      "Analyze the full application funnel. Report counts and conversion by status, source, role family, and timing; identify bottlenecks and stale segments; separate small-sample noise from useful signals; and recommend the next practical experiment.",
    scopePanels: ["applications"],
  },
  {
    id: "builtin_23",
    title: "Audit duplicate and stale records",
    description: "Find records that should be merged, archived, or reviewed.",
    prompt:
      "Inspect CVs, applications, cover letters, and research records for duplicates, abandoned drafts, broken links, stale next actions, and inconsistent identifiers. Return a cleanup plan with safe and destructive steps separated. Do not delete or overwrite anything.",
    scopePanels: ["applications", "research", "editor", "cover_letters"],
  },
  {
    id: "builtin_24",
    title: "Recover from a bad CV edit",
    description: "Compare history and restore only the damaged content.",
    prompt:
      "Inspect the selected CV and its history to identify the last good version and the exact damaged fields. Propose the smallest recovery change, preserve newer unrelated work, and stop for approval before restoring anything.",
    scopePanels: ["editor"],
  },
  {
    id: "builtin_25",
    title: "Refresh a letter after CV changes",
    description: "Check whether a saved letter drifted from the current CV.",
    prompt:
      "Compare the selected cover letter with the current linked CV and job record. Identify stale claims, missing evidence, and changed role details, then propose the smallest truthful letter update and stop for approval before saving a new version.",
    scopePanels: ["cover_letters", "editor", "applications"],
  },
  {
    id: "builtin_26",
    title: "Prepare a portable workspace backup",
    description: "Check backup scope before exporting private application data.",
    prompt:
      "Review what the portable workspace backup will include, identify missing linked assets or privacy concerns, confirm whether assistant history should be included, and give a clear export checklist. Do not start an import or destructive restore.",
    scopePanels: ["settings", "applications"],
  },
] as const;

function createStarter(
  source: (typeof STARTERS)[number],
): AssistantPlaybook {
  const timestamp = new Date(0).toISOString();
  return {
    schema: ASSISTANT_SCHEMA_VERSION,
    ...source,
    scopePanels: [...source.scopePanels],
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

function validateText(value: unknown, label: string, max: number): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${label} is required.`);
  }
  if (value.trim().length > max) throw new Error(`${label} is too long.`);
  return value.trim();
}

export class AssistantPlaybookStore {
  private queue: Promise<void> = Promise.resolve();

  constructor(private readonly filePath = DEFAULT_PATH) {}

  private async read(): Promise<PlaybookDocument> {
    try {
      const parsed = JSON.parse(await fs.readFile(this.filePath, "utf8")) as Partial<PlaybookDocument>;
      return {
        version: 1,
        playbooks: Array.isArray(parsed.playbooks) ? parsed.playbooks : [],
      };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return { version: 1, playbooks: [] };
      }
      throw error;
    }
  }

  private async mutate<T>(
    operation: (document: PlaybookDocument) => T,
  ): Promise<T> {
    let output!: T;
    const run = this.queue.catch(() => undefined).then(async () => {
      const document = await this.read();
      output = operation(document);
      await fs.mkdir(path.dirname(this.filePath), { recursive: true });
      const temporaryPath = `${this.filePath}.${process.pid}.tmp`;
      await fs.writeFile(temporaryPath, `${JSON.stringify(document, null, 2)}\n`);
      await fs.rename(temporaryPath, this.filePath);
    });
    this.queue = run.then(
      () => undefined,
      () => undefined,
    );
    await run;
    return output;
  }

  async list(): Promise<AssistantPlaybook[]> {
    const document = await this.read();
    return [
      ...STARTERS.map(createStarter),
      ...document.playbooks.sort((left, right) =>
        right.updatedAt.localeCompare(left.updatedAt),
      ),
    ];
  }

  async create(input: {
    title: unknown;
    description?: unknown;
    prompt: unknown;
    scopePanels?: unknown;
  }): Promise<AssistantPlaybook> {
    return this.mutate((document) => {
      if (document.playbooks.length >= MAX_PLAYBOOKS) {
        throw new Error("Playbook limit reached.");
      }
      const now = new Date().toISOString();
      const scopePanels = Array.isArray(input.scopePanels)
        ? input.scopePanels.filter((item): item is string => typeof item === "string").slice(0, 12)
        : [];
      const playbook: AssistantPlaybook = {
        schema: ASSISTANT_SCHEMA_VERSION,
        id: `playbook_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`,
        title: validateText(input.title, "Title", 80),
        description:
          typeof input.description === "string"
            ? input.description.trim().slice(0, 240)
            : "",
        prompt: validateText(input.prompt, "Prompt", 4_000),
        scopePanels,
        createdAt: now,
        updatedAt: now,
      };
      document.playbooks.unshift(playbook);
      return structuredClone(playbook);
    });
  }

  async remove(id: string): Promise<boolean> {
    if (id.startsWith("builtin_")) throw new Error("Built-in playbooks cannot be deleted.");
    return this.mutate((document) => {
      const before = document.playbooks.length;
      document.playbooks = document.playbooks.filter((item) => item.id !== id);
      return document.playbooks.length < before;
    });
  }

  async import(playbooks: AssistantPlaybook[]): Promise<number> {
    return this.mutate((document) => {
      let imported = 0;
      for (const source of playbooks.slice(0, MAX_PLAYBOOKS)) {
        if (
          !source?.id ||
          source.id.startsWith("builtin_") ||
          !source.prompt?.trim() ||
          !source.title?.trim() ||
          source.prompt.length > 4_000 ||
          source.title.length > 80 ||
          !Array.isArray(source.scopePanels)
        ) {
          continue;
        }
        const now = new Date().toISOString();
        const playbook: AssistantPlaybook = {
          ...structuredClone(source),
          schema: ASSISTANT_SCHEMA_VERSION,
          updatedAt: now,
        };
        const index = document.playbooks.findIndex((item) => item.id === playbook.id);
        if (index >= 0) document.playbooks[index] = playbook;
        else document.playbooks.push(playbook);
        imported += 1;
      }
      document.playbooks = document.playbooks.slice(0, MAX_PLAYBOOKS);
      return imported;
    });
  }
}

export const assistantPlaybookStore = new AssistantPlaybookStore();
