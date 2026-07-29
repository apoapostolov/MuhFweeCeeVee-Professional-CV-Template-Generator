import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

import {
  ASSISTANT_SCHEMA_VERSION,
  type AssistantContextEnvelope,
  type AssistantEvent,
  type AssistantSession,
} from "@muhfweeceevee/schemas";

import { repoPath } from "./repoPaths";

type AssistantStoreDocument = {
  version: 1;
  sessions: AssistantSession[];
};

export type AssistantSessionSummary = Pick<
  AssistantSession,
  "id" | "title" | "status" | "createdAt" | "updatedAt" | "context"
>;

const DEFAULT_STORE_PATH = repoPath("data", "assistant", "sessions.json");
const EMPTY_STORE: AssistantStoreDocument = { version: 1, sessions: [] };
const MAX_EVENTS_PER_SESSION = 1_200;

function newId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;
}

function cloneStore(document: AssistantStoreDocument): AssistantStoreDocument {
  return structuredClone(document);
}

export class AssistantSessionStore {
  private queue: Promise<void> = Promise.resolve();

  constructor(private readonly filePath = DEFAULT_STORE_PATH) {}

  private async readDocument(): Promise<AssistantStoreDocument> {
    try {
      const parsed = JSON.parse(
        await fs.readFile(this.filePath, "utf8"),
      ) as Partial<AssistantStoreDocument>;
      return {
        version: 1,
        sessions: Array.isArray(parsed.sessions)
          ? parsed.sessions.filter(
              (session): session is AssistantSession =>
                Boolean(session) &&
                typeof session === "object" &&
                typeof session.id === "string",
            )
          : [],
      };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return cloneStore(EMPTY_STORE);
      }
      throw error;
    }
  }

  private async writeDocument(document: AssistantStoreDocument): Promise<void> {
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
    operation: (document: AssistantStoreDocument) => T | Promise<T>,
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
          const document = await this.readDocument();
          const value = await operation(document);
          await this.writeDocument(document);
          resolveResult(value);
        } catch (error) {
          rejectResult(error);
        }
      })
      .catch(() => undefined);
    return result;
  }

  async list(): Promise<AssistantSessionSummary[]> {
    const document = await this.readDocument();
    return document.sessions
      .map((session) => ({
        id: session.id,
        title: session.title,
        status: session.status,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
        context: session.context,
      }))
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  }

  async get(id: string): Promise<AssistantSession | null> {
    const document = await this.readDocument();
    return document.sessions.find((session) => session.id === id) ?? null;
  }

  async create(
    context: AssistantContextEnvelope,
    title = "New conversation",
  ): Promise<AssistantSession> {
    return this.mutate((document) => {
      const now = new Date().toISOString();
      const session: AssistantSession = {
        schema: ASSISTANT_SCHEMA_VERSION,
        id: newId("assistant"),
        title: title.trim() || "New conversation",
        status: "active",
        createdAt: now,
        updatedAt: now,
        context,
        events: [],
      };
      document.sessions.unshift(session);
      return structuredClone(session);
    });
  }

  async updateContext(
    id: string,
    context: AssistantContextEnvelope,
  ): Promise<AssistantSession> {
    return this.mutate((document) => {
      const session = document.sessions.find((candidate) => candidate.id === id);
      if (!session) throw new Error("Assistant session not found.");
      session.context = context;
      session.updatedAt = new Date().toISOString();
      return structuredClone(session);
    });
  }

  async appendEvents(
    id: string,
    events: AssistantEvent[],
  ): Promise<AssistantSession> {
    const persisted = events.filter((event) => event.type !== "session_ready");
    return this.mutate((document) => {
      const session = document.sessions.find((candidate) => candidate.id === id);
      if (!session) throw new Error("Assistant session not found.");
      session.events = [...session.events, ...persisted].slice(
        -MAX_EVENTS_PER_SESSION,
      );
      const firstUserMessage = persisted.find(
        (event) => event.type === "user_message",
      );
      if (
        session.title === "New conversation" &&
        firstUserMessage?.type === "user_message"
      ) {
        session.title =
          firstUserMessage.content.slice(0, 72).trim() || session.title;
      }
      session.updatedAt = new Date().toISOString();
      return structuredClone(session);
    });
  }

  async setArchived(id: string, archived: boolean): Promise<AssistantSession> {
    return this.mutate((document) => {
      const session = document.sessions.find((candidate) => candidate.id === id);
      if (!session) throw new Error("Assistant session not found.");
      session.status = archived ? "archived" : "active";
      session.updatedAt = new Date().toISOString();
      return structuredClone(session);
    });
  }

  async importArchived(sessions: AssistantSession[]): Promise<number> {
    return this.mutate((document) => {
      let imported = 0;
      for (const source of sessions.slice(0, 500)) {
        if (!source?.id || !Array.isArray(source.events)) continue;
        const session = structuredClone(source);
        session.schema = ASSISTANT_SCHEMA_VERSION;
        session.status = "archived";
        session.updatedAt = new Date().toISOString();
        const index = document.sessions.findIndex((item) => item.id === session.id);
        if (index >= 0) document.sessions[index] = session;
        else document.sessions.push(session);
        imported += 1;
      }
      return imported;
    });
  }
}

export const assistantSessionStore = new AssistantSessionStore();
