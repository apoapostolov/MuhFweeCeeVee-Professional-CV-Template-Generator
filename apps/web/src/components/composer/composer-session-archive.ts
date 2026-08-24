import JSZip from "jszip";

import { STORAGE_KEYS } from "./constants";
import {
  buildComposerSessionBackup,
  formatBackupImportSummary,
  importComposerSessionBackupFromText,
  type ComposerSessionBackupFile,
  type SessionBackupImportSummary,
} from "./composer-session-backup";
import { readPrintTweaksForScope } from "./print-tweaks-persistence";

export const COMPOSER_SESSION_ARCHIVE_FORMAT =
  "muhfweeceevee.session_archive";
export const COMPOSER_SESSION_ARCHIVE_VERSION = 2;

const MAX_ARCHIVE_BYTES = 256 * 1024 * 1024;

type PhotoArchiveAsset = {
  id: string;
  path: string;
  mimeType: string;
  name?: string;
  analysisHistory: unknown[];
};

type GeneratedCvArchiveAsset = {
  path: string;
  cvId: string;
  templateId: string;
  photoId?: string;
  applicationIds: string[];
};

type SubmissionArchiveAsset = {
  applicationId: string;
  snapshotId: string;
  assetKey: string;
  fileName: string;
  sha256: string;
  path: string;
};

export type ComposerSessionArchiveManifest = {
  format: typeof COMPOSER_SESSION_ARCHIVE_FORMAT;
  version: typeof COMPOSER_SESSION_ARCHIVE_VERSION;
  exportedAt: string;
  backup: ComposerSessionBackupFile;
  assets: {
    photos: PhotoArchiveAsset[];
    cvSources: Array<{ cvId: string; path: string }>;
    generatedCvs: GeneratedCvArchiveAsset[];
    submissions: SubmissionArchiveAsset[];
  };
};

export type ComposerSessionArchiveExport = {
  blob: Blob;
  fileName: string;
  manifest: ComposerSessionArchiveManifest;
};

export type ComposerSessionArchiveImportSummary = SessionBackupImportSummary & {
  archivePhotos: number;
  generatedCvs: number;
  submissionAssets: number;
};

type PhotoListItem = {
  id: string;
  name?: string;
  mimeType?: string;
  analysisHistory?: unknown[];
};

type PdfTarget = {
  cvId: string;
  photoId?: string;
  applicationIds: string[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function safeArchiveSegment(value: string, fallback: string): string {
  const normalized = value
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return normalized || fallback;
}

function validPhotoId(value: string): boolean {
  return (
    value.length > 0 &&
    value !== "." &&
    value !== ".." &&
    value !== "metadata.json" &&
    /^[a-zA-Z0-9._-]+$/.test(value)
  );
}

function readString(record: Record<string, unknown>, key: string): string {
  return typeof record[key] === "string" ? record[key].trim() : "";
}

function collectUsedPhotoIds(backup: ComposerSessionBackupFile): string[] {
  const ids = new Set<string>();
  const approvedId =
    backup.localStorage[STORAGE_KEYS.approvedPhotoId]?.trim() ?? "";
  if (approvedId) ids.add(approvedId);
  for (const application of backup.server.applications) {
    const id = readString(application, "photo_id");
    if (id) ids.add(id);
  }
  return [...ids].sort((a, b) => a.localeCompare(b));
}

function collectPdfTargets(backup: ComposerSessionBackupFile): PdfTarget[] {
  const targets = new Map<string, PdfTarget>();
  for (const application of backup.server.applications) {
    const cvId = readString(application, "cv_id");
    if (!cvId) continue;
    const photoId = readString(application, "photo_id") || undefined;
    const key = `${cvId}\u0000${photoId ?? ""}`;
    const target = targets.get(key) ?? {
      cvId,
      photoId,
      applicationIds: [],
    };
    const applicationId = readString(application, "id");
    if (applicationId) target.applicationIds.push(applicationId);
    targets.set(key, target);
  }

  if (targets.size === 0) {
    const selectedCvId =
      backup.localStorage[STORAGE_KEYS.selectedCvId]?.trim() ?? "";
    if (selectedCvId) {
      const approvedPhotoId =
        backup.localStorage[STORAGE_KEYS.approvedPhotoId]?.trim() || undefined;
      targets.set(`${selectedCvId}\u0000${approvedPhotoId ?? ""}`, {
        cvId: selectedCvId,
        photoId: approvedPhotoId,
        applicationIds: [],
      });
    }
  }
  return [...targets.values()];
}

function cvLanguage(
  backup: ComposerSessionBackupFile,
  cvId: string,
): string {
  const entry = backup.server.cvs.find((candidate) => candidate.cvId === cvId);
  if (isRecord(entry?.cv)) {
    const metadata = isRecord(entry.cv.metadata) ? entry.cv.metadata : null;
    const variant = isRecord(metadata?.variant) ? metadata.variant : null;
    const language = variant ? readString(variant, "language") : "";
    if (language) return language;
  }
  return (
    backup.localStorage[STORAGE_KEYS.selectedLanguage]?.trim().toLowerCase() ||
    "en"
  );
}

function backupStorage(
  backup: ComposerSessionBackupFile,
): Pick<Storage, "getItem"> {
  return {
    getItem: (key: string) => backup.localStorage[key] ?? null,
  };
}

function buildPdfUrl(
  backup: ComposerSessionBackupFile,
  target: PdfTarget,
  templateId: string,
): string {
  const params = new URLSearchParams({
    cvId: target.cvId,
    templateId,
    download: "1",
  });
  const theme =
    backup.localStorage[STORAGE_KEYS.selectedTemplateTheme]?.trim() ?? "";
  const photoMode =
    backup.localStorage[STORAGE_KEYS.selectedPhotoMode]?.trim() ?? "";
  if (theme) params.set("theme", theme);
  if (photoMode) params.set("photo", photoMode);

  const tweaks = readPrintTweaksForScope(
    {
      cvId: target.cvId,
      templateId,
      language: cvLanguage(backup, target.cvId),
    },
    backupStorage(backup),
  );
  if (tweaks.removePhoto) {
    params.set("removePhoto", "1");
  } else if (target.photoId) {
    params.set("photoId", target.photoId);
  }
  if (tweaks.intelligentPagination) params.set("pagination", "smart");
  if (tweaks.moveSkillsLeft) params.set("moveSkillsLeft", "1");
  if (tweaks.sidebarTextScaleEnabled) {
    params.set("sidebarTextScale", String(tweaks.sidebarTextScale));
  }
  if (tweaks.contentTextScaleEnabled) {
    params.set("contentTextScale", String(tweaks.contentTextScale));
  }
  return `/api/export/pdf?${params.toString()}`;
}

async function responseError(
  response: Response,
  fallback: string,
): Promise<Error> {
  const payload = (await response.json().catch(() => ({}))) as {
    error?: string;
  };
  return new Error(payload.error ?? fallback);
}

export async function createComposerSessionArchive(
  backup: ComposerSessionBackupFile,
  options: { includeGeneratedPdfs?: boolean } = {},
): Promise<ComposerSessionArchiveExport> {
  const zip = new JSZip();
  const photoAssets: PhotoArchiveAsset[] = [];
  const cvSources: Array<{ cvId: string; path: string }> = [];
  const generatedCvs: GeneratedCvArchiveAsset[] = [];
  const submissionAssets: SubmissionArchiveAsset[] = [];

  for (const entry of backup.server.cvs) {
    const safeCvId = safeArchiveSegment(entry.cvId, "cv");
    const archivePath = `cv-sources/${safeCvId}.json`;
    zip.file(archivePath, JSON.stringify(entry.cv, null, 2));
    cvSources.push({ cvId: entry.cvId, path: archivePath });
  }

  const usedPhotoIds = collectUsedPhotoIds(backup);
  let photoItems = new Map<string, PhotoListItem>();
  if (usedPhotoIds.length > 0) {
    const listResponse = await fetch("/api/photos");
    if (!listResponse.ok) {
      throw await responseError(
        listResponse,
        "Could not list photos for the session archive.",
      );
    }
    const payload = (await listResponse.json()) as { items?: unknown[] };
    const photoEntries: Array<[string, PhotoListItem]> = [];
    for (const item of (payload.items ?? []).filter(isRecord)) {
      const id = readString(item, "id");
      if (id) photoEntries.push([id, item as PhotoListItem]);
    }
    photoItems = new Map(photoEntries);
  }

  for (const id of usedPhotoIds) {
    if (!validPhotoId(id)) {
      throw new Error(`Referenced photo id "${id}" is invalid.`);
    }
    const response = await fetch(
      `/api/photos/raw?id=${encodeURIComponent(id)}`,
    );
    if (!response.ok) {
      throw await responseError(
        response,
        `Referenced photo "${id}" could not be included.`,
      );
    }
    const item = photoItems.get(id);
    const mimeType =
      item?.mimeType ||
      response.headers.get("content-type") ||
      "application/octet-stream";
    const archivePath = `photos/${id}`;
    zip.file(archivePath, await response.arrayBuffer());
    photoAssets.push({
      id,
      path: archivePath,
      mimeType,
      name: item?.name,
      analysisHistory: Array.isArray(item?.analysisHistory)
        ? item.analysisHistory
        : [],
    });
  }

  if (options.includeGeneratedPdfs !== false) {
    const targets = collectPdfTargets(backup);
    const templateId =
      backup.localStorage[STORAGE_KEYS.selectedTemplateId]?.trim() ?? "";
    if (targets.length > 0 && !templateId) {
      throw new Error(
        "Select a CV template before including generated PDFs, or turn that option off.",
      );
    }
    for (const target of targets) {
      const response = await fetch(buildPdfUrl(backup, target, templateId));
      if (!response.ok) {
        throw await responseError(
          response,
          `Could not generate PDF for CV "${target.cvId}". Turn off generated PDFs to create a source-only backup.`,
        );
      }
      const safeCvId = safeArchiveSegment(target.cvId, "cv");
      const safeTemplateId = safeArchiveSegment(templateId, "template");
      const photoSuffix = target.photoId
        ? `__${safeArchiveSegment(target.photoId, "photo")}`
        : "";
      const archivePath = `generated-cvs/${safeCvId}__${safeTemplateId}${photoSuffix}.pdf`;
      zip.file(archivePath, await response.arrayBuffer());
      generatedCvs.push({
        path: archivePath,
        cvId: target.cvId,
        templateId,
        photoId: target.photoId,
        applicationIds: [...target.applicationIds],
      });
    }
  }

  for (const application of backup.server.applications) {
    const applicationId = readString(application, "id");
    const snapshots = Array.isArray(application.submission_snapshots)
      ? application.submission_snapshots.filter(isRecord)
      : [];
    if (!applicationId) continue;
    for (const snapshot of snapshots) {
      const snapshotId = readString(snapshot, "id");
      const assets = isRecord(snapshot.assets) ? snapshot.assets : null;
      if (!snapshotId || !assets) continue;
      for (const [assetKey, rawAsset] of Object.entries(assets)) {
        if (!isRecord(rawAsset)) continue;
        const fileName = readString(rawAsset, "file");
        const sha256 = readString(rawAsset, "sha256");
        if (
          !fileName ||
          !/^[a-f0-9]{64}$/.test(sha256) ||
          fileName !== safeArchiveSegment(fileName, "")
        ) {
          throw new Error(
            `Submission snapshot "${snapshotId}" contains an invalid asset.`,
          );
        }
        const response = await fetch(
          `/api/applications/${encodeURIComponent(applicationId)}/submissions?snapshotId=${encodeURIComponent(snapshotId)}&asset=${encodeURIComponent(assetKey)}`,
        );
        if (!response.ok) {
          throw await responseError(
            response,
            `Could not include submission asset "${fileName}".`,
          );
        }
        const archivePath = `submissions/${safeArchiveSegment(applicationId, "application")}/${safeArchiveSegment(snapshotId, "snapshot")}/${fileName}`;
        zip.file(archivePath, await response.arrayBuffer());
        submissionAssets.push({
          applicationId,
          snapshotId,
          assetKey,
          fileName,
          sha256,
          path: archivePath,
        });
      }
    }
  }

  const manifest: ComposerSessionArchiveManifest = {
    format: COMPOSER_SESSION_ARCHIVE_FORMAT,
    version: COMPOSER_SESSION_ARCHIVE_VERSION,
    exportedAt: new Date().toISOString(),
    backup,
    assets: {
      photos: photoAssets,
      cvSources,
      generatedCvs,
      submissions: submissionAssets,
    },
  };
  zip.file("manifest.json", JSON.stringify(manifest, null, 2));
  zip.file(
    "README.txt",
    [
      "MuhFweeCeeVee portable session archive",
      "",
      "Restore this ZIP from Settings > Import / Export Data.",
      "manifest.json contains the complete merge-restorable session backup.",
      "photos/ contains only photos referenced by an application or the approved-photo setting.",
      "cv-sources/ contains the structured CV documents.",
      "generated-cvs/ contains rendered application PDFs when that export option was enabled.",
      "submissions/ contains immutable application submission snapshots and their checksummed assets.",
    ].join("\n"),
  );

  const blob = await zip.generateAsync({
    type: "blob",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });
  const date = new Date().toISOString().slice(0, 10);
  return {
    blob,
    fileName: `muhfweeceevee-backup-${date}.zip`,
    manifest,
  };
}

export async function buildComposerSessionArchive(
  options: {
    includeGeneratedPdfs?: boolean;
    includeAssistantHistory?: boolean;
  } = {},
): Promise<ComposerSessionArchiveExport> {
  return createComposerSessionArchive(
    await buildComposerSessionBackup({
      includeAssistantHistory: options.includeAssistantHistory,
    }),
    options,
  );
}

function parseArchiveManifest(raw: string): ComposerSessionArchiveManifest {
  const parsed = JSON.parse(raw) as unknown;
  if (!isRecord(parsed)) {
    throw new Error("Archive manifest must be a JSON object.");
  }
  if (parsed.format !== COMPOSER_SESSION_ARCHIVE_FORMAT) {
    throw new Error("This ZIP is not a MuhFweeCeeVee session archive.");
  }
  if (parsed.version !== 1 && parsed.version !== COMPOSER_SESSION_ARCHIVE_VERSION) {
    throw new Error(`Unsupported session archive version: ${String(parsed.version)}.`);
  }
  if (!isRecord(parsed.backup) || !isRecord(parsed.assets)) {
    throw new Error("Session archive manifest is incomplete.");
  }
  const assets = parsed.assets;
  return {
    format: COMPOSER_SESSION_ARCHIVE_FORMAT,
    version: COMPOSER_SESSION_ARCHIVE_VERSION,
    exportedAt:
      typeof parsed.exportedAt === "string" ? parsed.exportedAt : "",
    backup: parsed.backup as unknown as ComposerSessionBackupFile,
    assets: {
      photos: Array.isArray(assets.photos)
        ? (assets.photos.filter(isRecord) as PhotoArchiveAsset[])
        : [],
      cvSources: Array.isArray(assets.cvSources)
        ? (assets.cvSources.filter(isRecord) as Array<{
            cvId: string;
            path: string;
          }>)
        : [],
      generatedCvs: Array.isArray(assets.generatedCvs)
        ? (assets.generatedCvs.filter(isRecord) as GeneratedCvArchiveAsset[])
        : [],
      submissions: Array.isArray(assets.submissions)
        ? (assets.submissions.filter(isRecord) as SubmissionArchiveAsset[])
        : [],
    },
  };
}

export async function importComposerSessionArchive(
  file: Blob,
): Promise<ComposerSessionArchiveImportSummary> {
  if (file.size > MAX_ARCHIVE_BYTES) {
    throw new Error("Session archive exceeds the 256 MB safety limit.");
  }
  const zip = await JSZip.loadAsync(await file.arrayBuffer());
  const manifestEntry = zip.file("manifest.json");
  if (!manifestEntry) {
    throw new Error("Session archive is missing manifest.json.");
  }
  const manifest = parseArchiveManifest(await manifestEntry.async("string"));

  let submissionAssets = 0;
  for (const asset of manifest.assets.submissions) {
    if (
      typeof asset.applicationId !== "string" ||
      typeof asset.snapshotId !== "string" ||
      typeof asset.fileName !== "string" ||
      typeof asset.sha256 !== "string" ||
      !/^[a-f0-9]{64}$/.test(asset.sha256) ||
      !asset.path.startsWith("submissions/")
    ) {
      throw new Error("Session archive contains an invalid submission asset.");
    }
    const entry = zip.file(asset.path);
    if (!entry) {
      throw new Error(`Session archive is missing "${asset.path}".`);
    }
    const form = new FormData();
    form.set("snapshotId", asset.snapshotId);
    form.set("fileName", asset.fileName);
    form.set("sha256", asset.sha256);
    form.set(
      "file",
      new Blob([await entry.async("arraybuffer")]),
      asset.fileName,
    );
    const response = await fetch(
      `/api/applications/${encodeURIComponent(asset.applicationId)}/submissions`,
      { method: "PUT", body: form },
    );
    if (!response.ok) {
      throw await responseError(
        response,
        `Could not restore submission asset "${asset.fileName}".`,
      );
    }
    submissionAssets += 1;
  }

  let archivePhotos = 0;
  for (const asset of manifest.assets.photos) {
    if (
      !isRecord(asset) ||
      typeof asset.id !== "string" ||
      !validPhotoId(asset.id) ||
      asset.path !== `photos/${asset.id}` ||
      typeof asset.mimeType !== "string" ||
      !asset.mimeType.startsWith("image/")
    ) {
      throw new Error("Session archive contains an invalid photo entry.");
    }
    const photoEntry = zip.file(asset.path);
    if (!photoEntry) {
      throw new Error(`Session archive is missing photo "${asset.id}".`);
    }
    const photoBlob = new Blob([await photoEntry.async("arraybuffer")], {
      type: asset.mimeType,
    });
    const form = new FormData();
    form.set("restoreId", asset.id);
    form.set(
      "analysisHistory",
      JSON.stringify(
        Array.isArray(asset.analysisHistory) ? asset.analysisHistory : [],
      ),
    );
    form.set("files", photoBlob, asset.id);
    const response = await fetch("/api/photos", {
      method: "POST",
      body: form,
    });
    if (!response.ok) {
      throw await responseError(
        response,
        `Could not restore photo "${asset.id}".`,
      );
    }
    archivePhotos += 1;
  }

  const backupSummary = await importComposerSessionBackupFromText(
    JSON.stringify(manifest.backup),
  );
  return {
    ...backupSummary,
    archivePhotos,
    generatedCvs: manifest.assets.generatedCvs.length,
    submissionAssets,
  };
}

export function formatArchiveExportSummary(
  archive: ComposerSessionArchiveExport,
): string {
  const { assets } = archive.manifest;
  return `Downloaded ZIP with ${assets.cvSources.length} CV source${assets.cvSources.length === 1 ? "" : "s"}, ${assets.photos.length} used photo${assets.photos.length === 1 ? "" : "s"}, ${assets.generatedCvs.length} generated PDF${assets.generatedCvs.length === 1 ? "" : "s"}, and ${assets.submissions.length} immutable submission asset${assets.submissions.length === 1 ? "" : "s"}.`;
}

export function formatArchiveImportSummary(
  summary: ComposerSessionArchiveImportSummary,
): string {
  return `${formatBackupImportSummary(summary).replace(/ Reloading…$/, "")} Restored ${summary.archivePhotos} photo file${summary.archivePhotos === 1 ? "" : "s"} and ${summary.submissionAssets} immutable submission asset${summary.submissionAssets === 1 ? "" : "s"}; ${summary.generatedCvs} generated PDF${summary.generatedCvs === 1 ? "" : "s"} remain available inside the ZIP. Reloading…`;
}
