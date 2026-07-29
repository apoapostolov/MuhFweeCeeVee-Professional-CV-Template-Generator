import JSZip from "jszip";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  COMPOSER_SESSION_ARCHIVE_FORMAT,
  COMPOSER_SESSION_ARCHIVE_VERSION,
  createComposerSessionArchive,
  importComposerSessionArchive,
} from "./composer-session-archive";
import type { ComposerSessionBackupFile } from "./composer-session-backup";

function backupFixture(): ComposerSessionBackupFile {
  return {
    version: 4,
    exportedAt: "2026-07-29T00:00:00.000Z",
    origin: "http://test",
    localStorage: {
      mfcv_selected_template_id: "cambridge-v1",
      mfcv_selected_language: "en",
      mfcv_theme_mode: "dark",
    },
    server: {
      researchCatalog: null,
      companyMetadata: { personal: null, example: null },
      cvs: [
        {
          cvId: "cv_main",
          cv: {
            metadata: { variant: { language: "en" } },
            person: { name: "Jane Example" },
          },
        },
      ],
      applications: [
        {
          id: "app-1",
          company_name: "Acme",
          job_title: "Engineer",
          status: "applied",
          cv_id: "cv_main",
          photo_id: "photo-1.png",
          submission_snapshots: [
            {
              id: "submission-1",
              assets: {
                cv_pdf: {
                  file: "submitted-cv.pdf",
                  sha256: "a".repeat(64),
                  bytes: 6,
                },
              },
            },
          ],
        },
      ],
      coverLetters: [],
      careerEvidence: [],
    },
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("composer-session-archive", () => {
  it("creates a ZIP with the manifest, used photo, CV source, and generated PDF", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (url === "/api/photos") {
          return new Response(
            JSON.stringify({
              items: [
                {
                  id: "photo-1.png",
                  name: "profile.png",
                  mimeType: "image/png",
                  analysisHistory: [{ score: 90, verdict: "excellent" }],
                },
              ],
            }),
            { status: 200, headers: { "content-type": "application/json" } },
          );
        }
        if (url === "/api/photos/raw?id=photo-1.png") {
          return new Response(new Uint8Array([1, 2, 3]), {
            status: 200,
            headers: { "content-type": "image/png" },
          });
        }
        if (url.startsWith("/api/export/pdf?")) {
          return new Response(new Uint8Array([37, 80, 68, 70]), {
            status: 200,
            headers: { "content-type": "application/pdf" },
          });
        }
        if (
          url ===
          "/api/applications/app-1/submissions?snapshotId=submission-1&asset=cv_pdf"
        ) {
          return new Response(new Uint8Array([37, 80, 68, 70, 45, 49]), {
            status: 200,
            headers: { "content-type": "application/pdf" },
          });
        }
        return new Response("not found", { status: 404 });
      }),
    );

    const archive = await createComposerSessionArchive(backupFixture());
    const zip = await JSZip.loadAsync(await archive.blob.arrayBuffer());
    const manifest = JSON.parse(
      await zip.file("manifest.json")!.async("string"),
    ) as {
      format: string;
      assets: {
        photos: unknown[];
        cvSources: unknown[];
        generatedCvs: Array<{ path: string }>;
        submissions: Array<{ path: string }>;
      };
    };

    expect(manifest.format).toBe(COMPOSER_SESSION_ARCHIVE_FORMAT);
    expect(manifest.assets.photos).toHaveLength(1);
    expect(manifest.assets.cvSources).toHaveLength(1);
    expect(manifest.assets.generatedCvs).toHaveLength(1);
    expect(manifest.assets.submissions).toHaveLength(1);
    expect(zip.file("photos/photo-1.png")).not.toBeNull();
    expect(zip.file("cv-sources/cv_main.json")).not.toBeNull();
    expect(zip.file(manifest.assets.generatedCvs[0].path)).not.toBeNull();
    expect(zip.file(manifest.assets.submissions[0].path)).not.toBeNull();
  });

  it("restores a ZIP photo under its original id before merging the backup", async () => {
    const backup = backupFixture();
    backup.server.applications = [];
    const zip = new JSZip();
    zip.file("photos/photo-1.png", new Uint8Array([1, 2, 3]));
    zip.file(
      "manifest.json",
      JSON.stringify({
        format: COMPOSER_SESSION_ARCHIVE_FORMAT,
        version: COMPOSER_SESSION_ARCHIVE_VERSION,
        exportedAt: "2026-07-29T00:00:00.000Z",
        backup,
        assets: {
          photos: [
            {
              id: "photo-1.png",
              path: "photos/photo-1.png",
              mimeType: "image/png",
              analysisHistory: [{ score: 90, verdict: "excellent" }],
            },
          ],
          cvSources: [],
          generatedCvs: [],
          submissions: [],
        },
      }),
    );
    const archiveBytes = await zip.generateAsync({ type: "uint8array" });
    const setItem = vi.fn();
    let restoredId = "";
    let restoredMimeType = "";
    vi.stubGlobal("window", { localStorage: { setItem } });
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init?: RequestInit) => {
        if (url === "/api/photos" && init?.body instanceof FormData) {
          restoredId = String(init.body.get("restoreId") ?? "");
          const restoredFile = init.body.get("files");
          restoredMimeType =
            restoredFile instanceof Blob ? restoredFile.type : "";
          return new Response(JSON.stringify({ ok: true }), { status: 200 });
        }
        if (url === "/api/cvs/cv_main" && init?.method === "PUT") {
          return new Response(JSON.stringify({ ok: true }), { status: 200 });
        }
        return new Response("not found", { status: 404 });
      }),
    );

    const summary = await importComposerSessionArchive(
      new Blob([Uint8Array.from(archiveBytes).buffer], {
        type: "application/zip",
      }),
    );

    expect(restoredId).toBe("photo-1.png");
    expect(restoredMimeType).toBe("image/png");
    expect(summary.archivePhotos).toBe(1);
    expect(summary.cvs).toBe(1);
    expect(setItem).toHaveBeenCalledWith("mfcv_theme_mode", "dark");
  });
});
