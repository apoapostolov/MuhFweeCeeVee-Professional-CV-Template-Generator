import { describe, expect, it, vi } from "vitest";

import {
  buildComposerSessionBackup,
  importComposerSessionBackupFromText,
  parseComposerSessionBackup,
} from "./composer-session-backup";

describe("composer-session-backup", () => {
  it("serializes and parses v4 envelope backups", () => {
    const localStorage = {
      length: 3,
      key: (index: number) =>
        index === 0
          ? "mfcv_theme_mode"
          : index === 1
            ? "other"
            : "mfcv_assistant_draft:new",
      getItem: (key: string) =>
        key === "mfcv_theme_mode"
          ? "dark"
          : key === "mfcv_assistant_draft:new"
            ? "private prompt"
            : "1",
    };
    vi.stubGlobal("window", { localStorage, location: { origin: "http://localhost:3005" } });
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (url === "/api/research/catalog") {
          return {
            ok: true,
            json: async () => ({
              ok: true,
              companies: [{ id: "acme", name: "Acme", office: { country: "UK" } }],
              job_positions: [{ id: "acme_eng", company_id: "acme", title: "Engineer" }],
            }),
          };
        }
        if (url.startsWith("/api/companies")) {
          return { ok: true, json: async () => ({ ok: true, document: { companies: [] } }) };
        }
        if (url === "/api/cvs") {
          return { ok: true, json: async () => ({ items: [{ id: "cv_main" }] }) };
        }
        if (url === "/api/cvs/cv_main") {
          return { ok: true, json: async () => ({ cv: { metadata: { variant: { language: "en" } } } }) };
        }
        if (url === "/api/applications") {
          return {
            ok: true,
            json: async () => ({
              ok: true,
              applications: [
                {
                  id: "app-1",
                  company_name: "Acme",
                  job_title: "Engineer",
                  status: "applied",
                },
              ],
            }),
          };
        }
        if (url === "/api/cover-letters") {
          return {
            ok: true,
            json: async () => ({
              ok: true,
              items: [
                {
                  id: "letter-1",
                  cv_id: "cv_main",
                  title: "Acme letter",
                  body: "Current body",
                },
              ],
            }),
          };
        }
        if (url === "/api/evidence") {
          return {
            ok: true,
            json: async () => ({
              ok: true,
              entries: [
                {
                  id: "evidence-1",
                  kind: "achievement",
                  statement: "Improved build reliability.",
                },
              ],
            }),
          };
        }
        if (url === "/api/cover-letters?id=letter-1&versions=1") {
          return {
            ok: true,
            json: async () => ({
              ok: true,
              versions: [{ version: 1 }],
            }),
          };
        }
        if (url === "/api/cover-letters?id=letter-1&version=1") {
          return {
            ok: true,
            json: async () => ({
              ok: true,
              version: {
                version: 1,
                title: "Acme letter",
                body: "Earlier body",
              },
            }),
          };
        }
        return { ok: false, json: async () => ({}) };
      }),
    );

    return buildComposerSessionBackup().then((backup) => {
      const raw = JSON.stringify(backup);
      const parsed = parseComposerSessionBackup(raw);
      expect(parsed.localStorage).toEqual({
        mfcv_theme_mode: "dark",
        other: "1",
      });
      expect(parsed.server.researchCatalog?.companies).toHaveLength(1);
      expect(parsed.server.researchCatalog?.job_positions).toHaveLength(1);
      expect(parsed.server.cvs).toHaveLength(1);
      expect(parsed.server.applications).toHaveLength(1);
      expect(parsed.server.coverLetters).toHaveLength(1);
      expect(parsed.server.coverLetters[0]?.versions).toHaveLength(1);
      expect(parsed.server.careerEvidence).toHaveLength(1);
      vi.unstubAllGlobals();
    });
  });

  it("imports flat legacy localStorage maps", async () => {
    const setItem = vi.fn();
    vi.stubGlobal("window", {
      localStorage: { setItem },
    });
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({ ok: true }),
      })),
    );

    const summary = await importComposerSessionBackupFromText(
      JSON.stringify({
        mfcv_selected_language: "en",
        mfcv_selected_cv_id: "cv-1",
        "mfcv_assistant_draft:new": "private prompt",
      }),
    );
    expect(summary.localStorageKeys).toBe(2);
    expect(setItem).toHaveBeenCalledWith("mfcv_selected_language", "en");
    expect(setItem).toHaveBeenCalledWith("mfcv_selected_cv_id", "cv-1");
    expect(setItem).not.toHaveBeenCalledWith(
      "mfcv_assistant_draft:new",
      expect.anything(),
    );

    vi.unstubAllGlobals();
  });

  it("rejects empty backup text", () => {
    expect(() => parseComposerSessionBackup("   ")).toThrow(/empty/i);
  });

  it("builds backup metadata", async () => {
    vi.stubGlobal("window", {
      localStorage: { length: 0, key: () => null, getItem: () => null },
      location: { origin: "http://test" },
    });
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({ ok: true, items: [], companies: [], job_positions: [] }),
      })),
    );

    const backup = await buildComposerSessionBackup();
    expect(backup.version).toBe(4);
    expect(backup.origin).toBe("http://test");
    vi.unstubAllGlobals();
  });

  it("restores legacy v3 applications and cover-letter history in order", async () => {
    const setItem = vi.fn();
    const requests: Array<{ url: string; body: Record<string, unknown> }> = [];
    vi.stubGlobal("window", {
      localStorage: { setItem },
    });
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init?: RequestInit) => {
        const body =
          typeof init?.body === "string"
            ? (JSON.parse(init.body) as Record<string, unknown>)
            : {};
        requests.push({ url, body });
        return { ok: true, json: async () => ({ ok: true }) };
      }),
    );

    const summary = await importComposerSessionBackupFromText(
      JSON.stringify({
        version: 3,
        localStorage: { mfcv_theme_mode: "dark" },
        server: {
          researchCatalog: null,
          companyMetadata: { personal: null, example: null },
          cvs: [],
          applications: [
            {
              id: "app-1",
              company_name: "Acme",
              job_title: "Engineer",
              status: "applied",
            },
          ],
          coverLetters: [
            {
              document: {
                id: "letter-1",
                cv_id: "cv_main",
                title: "Current",
                body: "Current body",
              },
              versions: [
                {
                  version: 1,
                  title: "First",
                  body: "First body",
                },
              ],
            },
          ],
        },
      }),
    );

    expect(summary.applications).toBe(1);
    expect(summary.coverLetters).toBe(1);
    expect(summary.coverLetterVersions).toBe(2);
    expect(
      requests.filter((request) => request.url === "/api/cover-letters"),
    ).toHaveLength(2);
    expect(
      requests.find((request) => request.url === "/api/applications")?.body,
    ).toMatchObject({ action: "upsert", id: "app-1" });
    expect(setItem).toHaveBeenCalledWith("mfcv_theme_mode", "dark");

    vi.unstubAllGlobals();
  });
});
