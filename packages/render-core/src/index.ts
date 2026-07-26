/**
 * Shared rendering types for cross-package callers.
 *
 * Status: **type stub only** (not a full shared renderer package yet).
 * Live PDF/HTML rendering lives in:
 * `apps/web/src/lib/server/renderCvTemplate.ts` and `apps/web/src/lib/server/render/`.
 */
export type RenderJob = {
  cvId: string;
  templateId: string;
  theme?: string;
  photoMode?: string;
  profilePhotoId?: string;
};

export type RenderInput = RenderJob;

export type RenderResult = {
  html: string;
  cvId: string;
  templateId: string;
};