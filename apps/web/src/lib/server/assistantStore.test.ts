import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import {
  ASSISTANT_SCHEMA_VERSION,
  type AssistantContextEnvelope,
} from "@muhfweeceevee/schemas";
import { afterEach, describe, expect, it } from "vitest";

import { AssistantSessionStore } from "./assistantStore";

const temporaryDirectories: string[] = [];

async function createStore(): Promise<AssistantSessionStore> {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "mfcv-assistant-"));
  temporaryDirectories.push(directory);
  return new AssistantSessionStore(path.join(directory, "sessions.json"));
}

const context: AssistantContextEnvelope = {
  schema: ASSISTANT_SCHEMA_VERSION,
  activePanel: "applications",
  capturedAt: "2026-07-29T18:00:00.000Z",
  records: [{ type: "cv", id: "cv_en_john_doe", label: "Public Example CV" }],
  hasUnsavedChanges: false,
};

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) =>
      fs.rm(directory, { recursive: true, force: true }),
    ),
  );
});

describe("AssistantSessionStore", () => {
  it("creates, titles, persists, and archives a conversation", async () => {
    const store = await createStore();
    const created = await store.create(context);
    expect(created.events).toEqual([]);

    const updated = await store.appendEvents(created.id, [
      {
        type: "session_ready",
        sessionId: created.id,
        timestamp: "2026-07-29T18:00:00.000Z",
      },
      {
        type: "user_message",
        messageId: "message_1",
        content: "Which applications need a follow-up?",
        timestamp: "2026-07-29T18:00:01.000Z",
      },
      {
        type: "message_delta",
        messageId: "message_2",
        delta: "Two applications need attention.",
      },
    ]);

    expect(updated.title).toBe("Which applications need a follow-up?");
    expect(updated.events).toHaveLength(2);
    expect((await store.get(created.id))?.events).toHaveLength(2);
    expect((await store.list())[0]?.id).toBe(created.id);
    expect((await store.setArchived(created.id, true)).status).toBe("archived");
  });
});
