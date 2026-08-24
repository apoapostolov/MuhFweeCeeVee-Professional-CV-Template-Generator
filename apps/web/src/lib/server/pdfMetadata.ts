import { PDFDocument } from "pdf-lib";

import type { PdfMetadata } from "./render/types";

export async function applyPdfMetadata(
  bytes: Uint8Array,
  metadata: PdfMetadata,
): Promise<Uint8Array> {
  const document = await PDFDocument.load(bytes);
  document.setAuthor(metadata.author);
  document.setTitle(metadata.title);
  document.setSubject(metadata.subject);
  return document.save();
}
