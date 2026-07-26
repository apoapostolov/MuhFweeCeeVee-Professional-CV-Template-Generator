import {
  applicationToPacketStub,
  getApplication,
  type ApplicationPacketFile,
  PACKET_FORMAT,
} from "./applicationStore";
import { readCoverLetter, writeCoverLetter, buildCoverLetterId } from "./coverLetterStore";
import { readCv, writeCv } from "./cvStore";
import { getPhotoBoothItem } from "./photoGalleryStore";
import {
  findResearchedCompany,
  findResearchedJobPosition,
  readResearchCatalog,
} from "./researchStore";

/**
 * Build a portable application packet (CV + photo + company + letter embeds).
 * Photo binary is not embedded; only id/name for re-link.
 */
export async function buildApplicationPacketFile(
  applicationId: string,
): Promise<ApplicationPacketFile> {
  const app = await getApplication(applicationId);
  if (!app) {
    throw new Error(`Application '${applicationId}' not found.`);
  }

  const embeds: NonNullable<ApplicationPacketFile["embeds"]> = {};

  if (app.cover_letter_id) {
    const letter = await readCoverLetter(app.cover_letter_id);
    if (letter) {
      embeds.cover_letter = {
        title: letter.title,
        body: letter.body,
        language: letter.language,
        cv_id: letter.cv_id,
      };
    }
  }

  if (app.cv_id) {
    const cv = await readCv(app.cv_id);
    if (cv) {
      embeds.cv = {
        id: app.cv_id,
        document: cv as Record<string, unknown>,
      };
    }
  }

  if (app.photo_id) {
    const photo = await getPhotoBoothItem(app.photo_id, { includeDataUrl: false });
    if (photo) {
      embeds.photo = { id: photo.id, name: photo.name };
    } else {
      embeds.photo = { id: app.photo_id };
    }
  }

  const catalog = await readResearchCatalog();
  if (app.company_id) {
    const company = findResearchedCompany(catalog, app.company_id);
    if (company) {
      embeds.company = {
        id: company.id,
        name: company.name,
        website: company.identity?.website,
      };
    }
  } else if (app.company_name) {
    embeds.company = { name: app.company_name };
  }

  if (app.job_id) {
    const job = findResearchedJobPosition(catalog, app.job_id);
    if (job) {
      embeds.job = {
        id: job.id,
        title: job.title,
        company_id: job.company_id,
      };
    }
  } else if (app.job_title) {
    embeds.job = { title: app.job_title, company_id: app.company_id };
  }

  return {
    format: PACKET_FORMAT,
    version: 1,
    exported_at: new Date().toISOString(),
    source_application_id: app.id,
    packet: applicationToPacketStub(app),
    embeds,
  };
}

export type RestorePacketOptions = {
  /** When true and CV id missing or force, write embedded CV under a new or existing id. */
  restoreCv?: boolean;
  /** When true, write embedded cover letter as a new letter. */
  restoreLetter?: boolean;
  /** Prefer new CV id (for clone-to-similar-company flows). */
  newCvId?: string;
};

/**
 * Restore embeds from a packet file onto the local workspace.
 * Returns resolved ids for board import.
 */
export async function restorePacketEmbeds(
  file: ApplicationPacketFile,
  options: RestorePacketOptions = {},
): Promise<{
  cv_id?: string;
  photo_id?: string;
  cover_letter_id?: string;
  company_id?: string;
  job_id?: string;
  restored: string[];
}> {
  const restored: string[] = [];
  let cv_id = file.packet.cv_id;
  let photo_id = file.packet.photo_id;
  let cover_letter_id = file.packet.cover_letter_id;
  const company_id = file.packet.company_id;
  const job_id = file.packet.job_id;

  if (options.restoreCv !== false && file.embeds?.cv?.document) {
    const targetId =
      (options.newCvId && options.newCvId.trim()) ||
      file.embeds.cv.id ||
      file.packet.cv_id;
    if (targetId) {
      const existing = await readCv(targetId);
      if (!existing) {
        const doc = {
          ...file.embeds.cv.document,
          id: targetId,
        };
        await writeCv(targetId, doc);
        restored.push(`cv:${targetId}`);
      }
      cv_id = targetId;
    }
  }

  // Photo: re-link by id only (binary not in packet).
  if (file.embeds?.photo?.id) {
    const photo = await getPhotoBoothItem(file.embeds.photo.id, { includeDataUrl: false });
    if (photo) {
      photo_id = photo.id;
    } else {
      photo_id = file.packet.photo_id || file.embeds.photo.id;
    }
  }

  if (options.restoreLetter !== false && file.embeds?.cover_letter) {
    const letter = file.embeds.cover_letter;
    const letterCv = cv_id || letter.cv_id || "cv_import";
    const id = buildCoverLetterId({
      cvId: letterCv,
      companyId: company_id,
      jobId: job_id,
    });
    await writeCoverLetter({
      id,
      cv_id: letterCv,
      company_id,
      job_id,
      title: letter.title || `Cover letter — ${file.packet.job_title}`,
      body: letter.body || "",
      language: letter.language,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    cover_letter_id = id;
    restored.push(`letter:${id}`);
  }

  return {
    cv_id,
    photo_id,
    cover_letter_id,
    company_id,
    job_id,
    restored,
  };
}
