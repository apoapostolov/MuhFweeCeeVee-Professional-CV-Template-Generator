"use client";

import Image from "next/image";
import type { JSX } from "react";

import { templateDisplayName } from "./form-path-utils";

export type TemplateGalleryItem = {
  id: string;
  name: string;
  version: string;
};

export type TemplatesPanelProps = {
  templates: TemplateGalleryItem[];
  galleryCvId: string;
  previewNonce: number;
  approvedPhotoId: string;
};

export function TemplatesPanel({
  templates,
  galleryCvId,
  previewNonce,
  approvedPhotoId,
}: TemplatesPanelProps): JSX.Element {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="grid min-h-0 flex-1 gap-4 overflow-auto md:grid-cols-2 xl:grid-cols-3">
        {templates.map((item) => {
          const galleryUrl = galleryCvId
            ? (() => {
                const params = new URLSearchParams({
                  cvId: galleryCvId,
                  templateId: item.id,
                  photo: "default",
                  v: String(previewNonce),
                });
                if (approvedPhotoId) {
                  params.set("photoId", approvedPhotoId);
                }
                return `/api/export/image?${params.toString()}`;
              })()
            : "";

          return (
            <article
              key={item.id}
              className="flex h-fit self-start flex-col rounded-xl border border-[var(--line)] bg-white p-3"
            >
              <h3 className="text-base font-bold text-slate-900">
                {templateDisplayName(item.name)} {item.version}
              </h3>
              <div className="mb-3 mt-3 aspect-[210/297] w-full overflow-hidden rounded-md border border-[var(--line)] bg-[var(--surface-1)]">
                {galleryUrl ? (
                  <Image
                    alt={`${item.id} preview`}
                    className="h-full w-full object-contain"
                    height={1755}
                    src={galleryUrl}
                    unoptimized
                    width={1242}
                  />
                ) : (
                  <div className="p-3 text-xs text-[var(--ink-muted)]">No CV available for preview.</div>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}