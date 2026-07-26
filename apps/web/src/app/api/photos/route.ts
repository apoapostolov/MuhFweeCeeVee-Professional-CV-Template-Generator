import { NextResponse } from "next/server";

import { assertApiAuthorized } from "@/lib/server/apiAuth";
import {
  addPhotoBoothFiles,
  getPhotoBoothItem,
  listPhotoBoothItems,
  removePhotoBoothItem,
} from "@/lib/server/photoGalleryStore";

export const runtime = "nodejs";

export async function GET(request: Request): Promise<NextResponse> {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get("id")?.trim() ?? "";
    if (id) {
      const item = await getPhotoBoothItem(id, { includeDataUrl: true });
      if (!item) {
        return NextResponse.json({ ok: false, error: "Photo not found." }, { status: 404 });
      }
      return NextResponse.json({ ok: true, item, items: [item] });
    }
    // List without base64 payloads (use item.mediaUrl for display).
    const items = await listPhotoBoothItems({ includeDataUrl: false });
    return NextResponse.json({ ok: true, items });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Could not load photos.",
        items: [],
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  const denied = assertApiAuthorized(request);
  if (denied) {
    return denied;
  }

  try {
    const form = await request.formData();
    const uploads: Array<{ name: string; mimeType: string; buffer: Buffer }> = [];

    for (const value of form.values()) {
      if (!(value instanceof File)) continue;
      if (!value.type.startsWith("image/")) continue;
      const buffer = Buffer.from(await value.arrayBuffer());
      uploads.push({
        name: value.name || "photo",
        mimeType: value.type,
        buffer,
      });
    }

    if (uploads.length === 0) {
      return NextResponse.json(
        { ok: false, error: "No image files were provided.", items: [] },
        { status: 400 },
      );
    }

    await addPhotoBoothFiles(uploads);
    const items = await listPhotoBoothItems();
    return NextResponse.json({ ok: true, items });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Could not upload images.",
        items: [],
      },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request): Promise<NextResponse> {
  const denied = assertApiAuthorized(request);
  if (denied) {
    return denied;
  }

  const id = new URL(request.url).searchParams.get("id")?.trim() ?? "";
  if (!id) {
    return NextResponse.json({ ok: false, error: "Missing photo id." }, { status: 400 });
  }

  try {
    const removed = await removePhotoBoothItem(id);
    if (!removed) {
      return NextResponse.json({ ok: false, error: "Photo not found." }, { status: 404 });
    }
    const items = await listPhotoBoothItems();
    return NextResponse.json({ ok: true, items });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Could not delete photo.",
      },
      { status: 500 },
    );
  }
}