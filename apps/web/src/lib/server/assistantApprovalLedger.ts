import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

import type {
  AssistantApprovalProposal,
  AssistantAuditEvent,
  AssistantEvent,
} from "@muhfweeceevee/schemas";

import { repoPath } from "./repoPaths";

export type AssistantApprovalLedgerStatus =
  | "pending"
  | "executing"
  | "approved"
  | "rejected"
  | "stale"
  | "expired"
  | "failed";

export type AssistantApprovalLedgerRecord = {
  proposal: AssistantApprovalProposal;
  status: AssistantApprovalLedgerStatus;
  updatedAt: string;
  tokenHash?: string;
  events?: AssistantEvent[];
};

type AssistantApprovalLedgerDocument = {
  version: 1;
  approvals: AssistantApprovalLedgerRecord[];
  audit: AssistantAuditEvent[];
};

const DEFAULT_PATH = repoPath("data", "assistant", "approvals.json");
const MAX_APPROVALS = 2_000;
const MAX_AUDIT_EVENTS = 10_000;

function emptyDocument(): AssistantApprovalLedgerDocument {
  return { version: 1, approvals: [], audit: [] };
}

export class AssistantApprovalLedger {
  private queue: Promise<void> = Promise.resolve();

  constructor(private readonly filePath = DEFAULT_PATH) {}

  private async read(): Promise<AssistantApprovalLedgerDocument> {
    try {
      const parsed = JSON.parse(
        await fs.readFile(this.filePath, "utf8"),
      ) as Partial<AssistantApprovalLedgerDocument>;
      return {
        version: 1,
        approvals: Array.isArray(parsed.approvals) ? parsed.approvals : [],
        audit: Array.isArray(parsed.audit) ? parsed.audit : [],
      };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return emptyDocument();
      }
      throw error;
    }
  }

  private async write(document: AssistantApprovalLedgerDocument): Promise<void> {
    await fs.mkdir(path.dirname(this.filePath), { recursive: true });
    const temporaryPath = `${this.filePath}.${process.pid}.tmp`;
    await fs.writeFile(
      temporaryPath,
      `${JSON.stringify(document, null, 2)}\n`,
      "utf8",
    );
    await fs.rename(temporaryPath, this.filePath);
  }

  private async mutate<T>(
    operation: (document: AssistantApprovalLedgerDocument) => T | Promise<T>,
  ): Promise<T> {
    let resolveResult!: (value: T) => void;
    let rejectResult!: (reason: unknown) => void;
    const result = new Promise<T>((resolve, reject) => {
      resolveResult = resolve;
      rejectResult = reject;
    });
    this.queue = this.queue
      .then(async () => {
        try {
          const document = await this.read();
          const value = await operation(document);
          await this.write(document);
          resolveResult(value);
        } catch (error) {
          rejectResult(error);
        }
      })
      .catch(() => undefined);
    return result;
  }

  async create(proposal: AssistantApprovalProposal): Promise<void> {
    await this.mutate((document) => {
      if (document.approvals.some((item) => item.proposal.id === proposal.id)) {
        throw new Error("Assistant approval already exists.");
      }
      document.approvals.unshift({
        proposal,
        status: "pending",
        updatedAt: proposal.createdAt,
      });
      document.approvals = document.approvals.slice(0, MAX_APPROVALS);
    });
  }

  async get(id: string): Promise<AssistantApprovalLedgerRecord | null> {
    const document = await this.read();
    const item = document.approvals.find(
      (candidate) => candidate.proposal.id === id,
    );
    return item ? structuredClone(item) : null;
  }

  async claim(
    id: string,
    tokenHash: string,
  ): Promise<
    | { action: "execute"; record: AssistantApprovalLedgerRecord }
    | { action: "replay"; record: AssistantApprovalLedgerRecord }
    | { action: "unavailable"; record: AssistantApprovalLedgerRecord }
  > {
    return this.mutate((document) => {
      const item = document.approvals.find(
        (candidate) => candidate.proposal.id === id,
      );
      if (!item) throw new Error("Assistant approval not found.");
      if (item.status === "approved" && item.events) {
        return { action: "replay" as const, record: structuredClone(item) };
      }
      if (item.status !== "pending") {
        return { action: "unavailable" as const, record: structuredClone(item) };
      }
      item.status = "executing";
      item.tokenHash = tokenHash;
      item.updatedAt = new Date().toISOString();
      return { action: "execute" as const, record: structuredClone(item) };
    });
  }

  async resolve(
    id: string,
    status: Exclude<AssistantApprovalLedgerStatus, "pending" | "executing">,
    events: AssistantEvent[],
  ): Promise<AssistantApprovalLedgerRecord> {
    return this.mutate((document) => {
      const item = document.approvals.find(
        (candidate) => candidate.proposal.id === id,
      );
      if (!item) throw new Error("Assistant approval not found.");
      if (item.status === "approved" && item.events) return structuredClone(item);
      const canResolve =
        (status === "approved" && item.status === "executing") ||
        (status === "failed" &&
          (item.status === "pending" || item.status === "executing")) ||
        ((status === "rejected" ||
          status === "stale" ||
          status === "expired") &&
          item.status === "pending");
      if (!canResolve) {
        return structuredClone(item);
      }
      item.status = status;
      item.events = structuredClone(events);
      item.updatedAt = new Date().toISOString();
      return structuredClone(item);
    });
  }

  async appendAudit(
    event: Omit<AssistantAuditEvent, "id" | "timestamp"> &
      Partial<Pick<AssistantAuditEvent, "id" | "timestamp">>,
  ): Promise<AssistantAuditEvent> {
    return this.mutate((document) => {
      const stored: AssistantAuditEvent = {
        ...event,
        id:
          event.id ??
          `audit_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`,
        timestamp: event.timestamp ?? new Date().toISOString(),
      };
      document.audit.push(stored);
      document.audit = document.audit.slice(-MAX_AUDIT_EVENTS);
      return structuredClone(stored);
    });
  }

  async listAudit(sessionId: string): Promise<AssistantAuditEvent[]> {
    const document = await this.read();
    return document.audit
      .filter((event) => event.sessionId === sessionId)
      .map((event) => structuredClone(event));
  }
}

export const assistantApprovalLedger = new AssistantApprovalLedger();
