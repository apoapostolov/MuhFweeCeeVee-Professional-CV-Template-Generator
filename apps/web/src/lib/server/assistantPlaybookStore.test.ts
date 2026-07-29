import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { AssistantPlaybookStore } from "./assistantPlaybookStore";

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) =>
      fs.rm(directory, { recursive: true, force: true }),
    ),
  );
});

describe("AssistantPlaybookStore", () => {
  it("keeps built-ins available and persists private user playbooks", async () => {
    const directory = await fs.mkdtemp(path.join(os.tmpdir(), "mfcv-playbooks-"));
    temporaryDirectories.push(directory);
    const store = new AssistantPlaybookStore(path.join(directory, "playbooks.json"));

    expect((await store.list()).some((item) => item.id.startsWith("builtin_"))).toBe(true);
    const saved = await store.create({
      title: "My follow-up",
      prompt: "Review applications that need a follow-up.",
      scopePanels: ["applications"],
    });
    expect((await store.list()).find((item) => item.id === saved.id)?.prompt).toContain(
      "follow-up",
    );
    expect(await store.remove(saved.id)).toBe(true);
  });
});
