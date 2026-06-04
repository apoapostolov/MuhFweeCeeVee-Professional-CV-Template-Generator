import { describe, expect, it, vi } from "vitest";

import {
  buildComposerSessionBackup,
  importComposerSessionBackupFromText,
  parseComposerSessionBackup,
} from "./composer-session-backup";

describe("composer-session-backup", () => {
  it("serializes and parses v2 envelope backups", () => {
    const localStorage = {
      length: 2,
      key: (index: number) => (index === 0 ? "mfcv_theme_mode" : "other"),
      getItem: (key: string) => (key === "mfcv_theme_mode" ? "dark" : "1"),
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
      JSON.stringify({ mfcv_selected_language: "en", mfcv_selected_cv_id: "cv-1" }),
    );
    expect(summary.localStorageKeys).toBe(2);
    expect(setItem).toHaveBeenCalledWith("mfcv_selected_language", "en");
    expect(setItem).toHaveBeenCalledWith("mfcv_selected_cv_id", "cv-1");

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
    expect(backup.version).toBe(2);
    expect(backup.origin).toBe("http://test");
    vi.unstubAllGlobals();
  });
});