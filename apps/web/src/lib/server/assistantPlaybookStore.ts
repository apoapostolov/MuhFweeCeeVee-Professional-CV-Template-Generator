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
    title: "Tailor a CV for this job",
    description: "Plan a truthful CV review, ATS gap check, and targeted edits.",
    prompt:
      "Create a short plan to compare the selected CV with the selected job, run the relevant checks, and propose only truthful high-impact CV changes.",
    scopePanels: ["editor", "research", "applications"],
  },
  {
    title: "Prepare an application packet",
    description: "Coordinate CV, letter, and submission-readiness checks.",
    prompt:
      "Create a plan to review the selected application, verify its CV and job context, prepare a cover letter if needed, and identify the exact documents ready for submission.",
    scopePanels: ["applications", "cover_letters"],
  },
  {
    title: "Review stalled applications",
    description: "Find overdue follow-ups and turn them into a focused queue.",
    prompt:
      "Review active applications for stalled follow-ups, summarize the highest-priority cases, and propose coherent application updates only where needed.",
    scopePanels: ["applications"],
  },
] as const;

function createStarter(
  source: (typeof STARTERS)[number],
  index: number,
): AssistantPlaybook {
  const timestamp = new Date(0).toISOString();
  return {
    schema: ASSISTANT_SCHEMA_VERSION,
    id: `builtin_${index + 1}`,
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
      ...document.playbooks,
    ].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
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
