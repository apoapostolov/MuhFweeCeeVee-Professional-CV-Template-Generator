import { NextResponse } from "next/server";

import { readPhotoBuffer } from "@/lib/server/photoGalleryStore";

export const runtime = "nodejs";

/** Serve photo bytes for <img src> without base64 list payloads. */
export async function GET(request: Request): Promise<NextResponse> {
  const id = new URL(request.url).searchParams.get("id")?.trim() ?? "";
  if (!id) {
    return NextResponse.json({ error: "Missing photo id." }, { status: 400 });
  }
  const photo = await readPhotoBuffer(id);
  if (!photo) {
    return NextResponse.json({ error: "Photo not found." }, { status: 404 });
  }
  return new NextResponse(new Uint8Array(photo.buffer), {
    headers: {
      "content-type": photo.mimeType,
      "cache-control": "private, max-age=3600",
    },
  });
}
