/**
 * Shared rendering types for cross-package callers.
 * Live PDF/HTML rendering is implemented in
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