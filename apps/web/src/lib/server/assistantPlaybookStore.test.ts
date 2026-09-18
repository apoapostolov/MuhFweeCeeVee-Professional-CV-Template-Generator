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

    const builtIns = await store.list();
    expect(builtIns).toHaveLength(26);
    expect(builtIns.map((item) => item.id)).toEqual(
      Array.from({ length: 26 }, (_, index) => `builtin_${index + 1}`),
    );
    expect(builtIns[0]?.title).toBe("Tailor a CV for this job");
    expect(builtIns.at(-1)?.title).toBe("Prepare a portable workspace backup");
    expect(new Set(builtIns.map((item) => item.title)).size).toBe(26);
    const saved = await store.create({
      title: "My follow-up",
      prompt: "Review applications that need a follow-up.",
      scopePanels: ["applications"],
    });
    const withSaved = await store.list();
    expect(withSaved[26]?.id).toBe(saved.id);
    expect(withSaved.find((item) => item.id === saved.id)?.prompt).toContain(
      "follow-up",
    );
    expect(await store.remove(saved.id)).toBe(true);
  });
});
