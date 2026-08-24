import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

import { runDeterministicAtsChecks } from "@/lib/ats/deterministicChecks";
import { applyPdfMetadata } from "./pdfMetadata";
import { stringify } from "yaml";

import {
  getApplication,
  mutateApplication,
  type ApplicationActivity,
  type ApplicationSubmissionAsset,
  type ApplicationSubmissionSnapshot,
} from "./applicationStore";
import { readCoverLetter } from "./coverLetterStore";
import { readCv } from "./cvStore";
import { getPhotoBoothItem } from "./photoGalleryStore";
import { buildCvTemplateHtml } from "./renderCvTemplate";
import { repoPath } from "./repoPaths";
import type { RenderTweaks } from "./render/tweaks";
import {
  findResearchedCompany,
  findResearchedJobPosition,
  readResearchCatalog,
} from "./researchStore";

const SUBMISSIONS_DIR = repoPath("data", "applications", "submissions");

export type CreateSubmissionSnapshotInput = {
  templateId: string;
  theme?: string;
  source?: string;
  submissionUrl?: string;
  confirmationReference?: string;
  submittedAt?: string;
  photoMode?: string;
  tweaks?: RenderTweaks;
};

type StoredAsset = {
  absolutePath: string;
  summary: ApplicationSubmissionAsset;
};

function safeSegment(value: string, fallback: string): string {
  const safe = value
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return safe || fallback;
}

function sha256(buffer: Uint8Array | string): string {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

async function writeAsset(
  directory: string,
  fileName: string,
  content: Uint8Array | string,
): Promise<StoredAsset> {
  const absolutePath = path.join(directory, fileName);
  const buffer =
    typeof content === "string" ? Buffer.from(content, "utf8") : Buffer.from(content);
  await fs.writeFile(absolutePath, buffer);
  return {
    absolutePath,
    summary: {
      file: fileName,
      sha256: sha256(buffer),
      bytes: buffer.byteLength,
    },
  };
}

function cvRevision(cv: Record<string, unknown>): string | undefined {
  const metadata =
    cv.metadata && typeof cv.metadata === "object"
      ? (cv.metadata as Record<string, unknown>)
      : null;
  return typeof metadata?.updated_at === "string"
    ? metadata.updated_at
    : undefined;
}

function photoExtension(mimeType: string): string {
  if (mimeType === "image/png") return ".png";
  if (mimeType === "image/webp") return ".webp";
  if (mimeType === "image/avif") return ".avif";
  if (mimeType === "image/gif") return ".gif";
  return ".jpg";
}

function dataUrlBuffer(dataUrl: string): Buffer {
  const match = /^data:[^;,]+;base64,([\s\S]+)$/.exec(dataUrl);
  if (!match) {
    throw new Error("Selected photo could not be decoded.");
  }
  return Buffer.from(match[1], "base64");
}

async function renderPdf(input: {
  cvId: string;
  templateId: string;
  theme?: string;
  photoId?: string;
  photoMode?: string;
  tweaks?: RenderTweaks;
}): Promise<Uint8Array> {
  const { html, metadata } = await buildCvTemplateHtml({
    cvId: input.cvId,
    templateId: input.templateId,
    theme: input.theme,
    photoMode: input.photoMode,
    tweaks: input.tweaks,
    profilePhotoId: input.photoId,
  });
  const { chromium } = await import("playwright");
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle" });
    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      displayHeaderFooter: true,
      headerTemplate: "<div></div>",
      footerTemplate:
        '<div style="font-size:10px;color:#6b7280;width:100%;padding:0 24px;text-align:right;"><span class="pageNumber"></span> / <span class="totalPages"></span></div>',
      margin: { top: "0mm", right: "0mm", bottom: "0mm", left: "0mm" },
    });
    await page.close();
    return applyPdfMetadata(new Uint8Array(pdf), metadata);
  } finally {
    await browser.close();
  }
}

export async function createApplicationSubmissionSnapshot(
  applicationId: string,
  input: CreateSubmissionSnapshotInput,
): Promise<ApplicationSubmissionSnapshot> {
  const application = await getApplication(applicationId);
  if (!application) {
    throw new Error(`Application '${applicationId}' not found.`);
  }
  if (!application.cv_id) {
    throw new Error("Link a CV before marking this application as submitted.");
  }
  if (!input.templateId.trim()) {
    throw new Error("Select a template for the immutable submitted PDF.");
  }

  const cv = await readCv(application.cv_id);
  if (!cv) {
    throw new Error(`CV '${application.cv_id}' was not found.`);
  }
  const letter = application.cover_letter_id
    ? await readCoverLetter(application.cover_letter_id)
    : null;
  const photo = application.photo_id
    ? await getPhotoBoothItem(application.photo_id, { includeDataUrl: true })
    : null;
  const catalog = await readResearchCatalog();
  const company = application.company_id
    ? findResearchedCompany(catalog, application.company_id)
    : null;
  const job = application.job_id
    ? findResearchedJobPosition(catalog, application.job_id)
    : null;
  const atsReport = runDeterministicAtsChecks({
    cv,
    keywords: job?.weighted_keywords,
  });

  const submittedAt = input.submittedAt?.trim() || new Date().toISOString();
  const snapshotId = `${submittedAt.replace(/[:.]/g, "-")}-${crypto
    .randomUUID()
    .slice(0, 8)}`;
  const applicationDir = path.join(
    SUBMISSIONS_DIR,
    safeSegment(application.id, "application"),
  );
  const finalDir = path.join(applicationDir, snapshotId);
  const temporaryDir = `${finalDir}.tmp-${process.pid}`;
  await fs.mkdir(temporaryDir, { recursive: true });

  try {
    const baseName = safeSegment(
      `${application.company_name}-${application.job_title}`,
      application.id,
    );
    const cvSource = await writeAsset(
      temporaryDir,
      `${baseName}-cv.yaml`,
      stringify(cv),
    );
    const pdf = await renderPdf({
      cvId: application.cv_id,
      templateId: input.templateId.trim(),
      theme: input.theme?.trim() || undefined,
      photoMode: input.photoMode,
      tweaks: input.tweaks,
      photoId: application.photo_id,
    });
    const cvPdf = await writeAsset(
      temporaryDir,
      `${baseName}-submitted.pdf`,
      pdf,
    );
    const coverLetter = letter
      ? await writeAsset(
          temporaryDir,
          `${baseName}-cover-letter.txt`,
          letter.body,
        )
      : undefined;
    const photoAsset =
      photo && photo.dataUrl
        ? await writeAsset(
            temporaryDir,
            `${baseName}-photo${photoExtension(photo.mimeType)}`,
            dataUrlBuffer(photo.dataUrl),
          )
        : undefined;

    const manifestPayload = {
      format: "muhfweeceevee.submission_snapshot",
      version: 1,
      id: snapshotId,
      application: {
        id: application.id,
        company_name: application.company_name,
        job_title: application.job_title,
        company_id: application.company_id,
        job_id: application.job_id,
        source: input.source?.trim() || application.source,
        submission_url:
          input.submissionUrl?.trim() || application.url,
        confirmation_reference: input.confirmationReference?.trim() || undefined,
      },
      submitted_at: submittedAt,
      cv: {
        id: application.cv_id,
        revision: cvRevision(cv),
        sha256: cvSource.summary.sha256,
      },
      cover_letter: letter
        ? {
            id: letter.id,
            version: letter.version,
            sha256: coverLetter?.summary.sha256,
          }
        : null,
      photo: photo
        ? {
            id: photo.id,
            sha256: photoAsset?.summary.sha256,
          }
        : null,
      company,
      job,
      ats_report: atsReport,
      assets: {
        cv_source: cvSource.summary,
        cv_pdf: cvPdf.summary,
        cover_letter: coverLetter?.summary,
        photo: photoAsset?.summary,
      },
    };
    const manifest = await writeAsset(
      temporaryDir,
      "manifest.json",
      JSON.stringify(manifestPayload, null, 2),
    );

    await fs.mkdir(applicationDir, { recursive: true });
    await fs.rename(temporaryDir, finalDir);

    const snapshot: ApplicationSubmissionSnapshot = {
      id: snapshotId,
      submitted_at: submittedAt,
      source: input.source?.trim() || application.source,
      submission_url:
        input.submissionUrl?.trim() || application.url,
      confirmation_reference:
        input.confirmationReference?.trim() || undefined,
      template_id: input.templateId.trim(),
      theme: input.theme?.trim() || undefined,
      cv_id: application.cv_id,
      cv_revision: cvRevision(cv),
      cv_sha256: cvSource.summary.sha256,
      cover_letter_id: letter?.id,
      cover_letter_version: letter?.version,
      photo_id: photo?.id,
      job_id: application.job_id,
      assets: {
        manifest: manifest.summary,
        cv_source: cvSource.summary,
        cv_pdf: cvPdf.summary,
        cover_letter: coverLetter?.summary,
        photo: photoAsset?.summary,
      },
    };
    const activity: ApplicationActivity = {
      id: crypto.randomUUID().replace(/-/g, "").slice(0, 16),
      type: "applied",
      occurred_at: submittedAt,
      summary: `Submitted snapshot ${snapshotId}`,
      from_status: application.status,
      to_status: "applied",
    };
    await mutateApplication(application.id, (current) => ({
      ...current,
      status: current.status === "wishlist" ? "applied" : current.status,
      applied_at: current.applied_at ?? submittedAt,
      status_since:
        current.status === "wishlist" ? submittedAt : current.status_since,
      source: input.source?.trim() || current.source,
      url: input.submissionUrl?.trim() || current.url,
      submission_snapshots: [snapshot, ...(current.submission_snapshots ?? [])],
      activities: [activity, ...(current.activities ?? [])],
    }));
    return snapshot;
  } catch (error) {
    await fs.rm(temporaryDir, { recursive: true, force: true }).catch(() => undefined);
    throw error;
  }
}

export async function readApplicationSubmissionAsset(
  applicationId: string,
  snapshotId: string,
  assetKey: keyof ApplicationSubmissionSnapshot["assets"],
): Promise<{ buffer: Buffer; fileName: string } | null> {
  const application = await getApplication(applicationId);
  const snapshot = application?.submission_snapshots?.find(
    (entry) => entry.id === snapshotId,
  );
  const asset = snapshot?.assets[assetKey];
  if (!snapshot || !asset) return null;
  const filePath = path.join(
    SUBMISSIONS_DIR,
    safeSegment(applicationId, "application"),
    snapshot.id,
    path.basename(asset.file),
  );
  try {
    return { buffer: await fs.readFile(filePath), fileName: asset.file };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

export type ApplicationSubmissionComparison = {
  snapshotId: string;
  cv: {
    submittedId: string;
    currentId?: string;
    submittedRevision?: string;
    currentRevision?: string;
    hasChanged: boolean;
  };
  coverLetter?: {
    submittedId?: string;
    currentId?: string;
    submittedVersion?: number;
    currentVersion?: number;
    hasChanged: boolean;
  };
  photo?: {
    submittedId?: string;
    currentId?: string;
    hasChanged: boolean;
  };
};

export async function compareLatestApplicationSubmission(
  applicationId: string,
): Promise<ApplicationSubmissionComparison | null> {
  const application = await getApplication(applicationId);
  const snapshot = application?.submission_snapshots?.[0];
  if (!application || !snapshot) return null;
  const currentCv = application.cv_id ? await readCv(application.cv_id) : null;
  const currentCvHash = currentCv
    ? sha256(Buffer.from(stringify(currentCv), "utf8"))
    : undefined;
  const currentLetter = application.cover_letter_id
    ? await readCoverLetter(application.cover_letter_id)
    : null;
  return {
    snapshotId: snapshot.id,
    cv: {
      submittedId: snapshot.cv_id,
      currentId: application.cv_id,
      submittedRevision: snapshot.cv_revision,
      currentRevision: currentCv
        ? cvRevision(currentCv as Record<string, unknown>)
        : undefined,
      hasChanged:
        snapshot.cv_id !== application.cv_id ||
        currentCvHash !== snapshot.cv_sha256,
    },
    coverLetter:
      snapshot.cover_letter_id || application.cover_letter_id
        ? {
            submittedId: snapshot.cover_letter_id,
            currentId: application.cover_letter_id,
            submittedVersion: snapshot.cover_letter_version,
            currentVersion: currentLetter?.version,
            hasChanged:
              snapshot.cover_letter_id !== application.cover_letter_id ||
              snapshot.cover_letter_version !== currentLetter?.version,
          }
        : undefined,
    photo:
      snapshot.photo_id || application.photo_id
        ? {
            submittedId: snapshot.photo_id,
            currentId: application.photo_id,
            hasChanged: snapshot.photo_id !== application.photo_id,
          }
        : undefined,
  };
}

export async function restoreApplicationSubmissionAsset(input: {
  applicationId: string;
  snapshotId: string;
  fileName: string;
  expectedSha256: string;
  buffer: Uint8Array;
}): Promise<void> {
  if (
    !/^[a-zA-Z0-9._-]+$/.test(input.snapshotId) ||
    path.basename(input.fileName) !== input.fileName ||
    !input.fileName
  ) {
    throw new Error("Invalid submission snapshot asset path.");
  }
  const actualSha256 = sha256(input.buffer);
  if (actualSha256 !== input.expectedSha256) {
    throw new Error("Submission snapshot asset checksum does not match.");
  }
  const directory = path.join(
    SUBMISSIONS_DIR,
    safeSegment(input.applicationId, "application"),
    input.snapshotId,
  );
  await fs.mkdir(directory, { recursive: true });
  const destination = path.join(directory, input.fileName);
  const temp = `${destination}.${process.pid}.tmp`;
  await fs.writeFile(temp, input.buffer);
  await fs.rename(temp, destination);
}
