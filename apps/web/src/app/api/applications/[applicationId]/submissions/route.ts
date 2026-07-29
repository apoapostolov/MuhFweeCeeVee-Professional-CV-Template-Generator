import { NextResponse } from "next/server";

import { assertApiAuthorized } from "@/lib/server/apiAuth";
import {
  createApplicationSubmissionSnapshot,
  readApplicationSubmissionAsset,
  restoreApplicationSubmissionAsset,
} from "@/lib/server/applicationSubmissionStore";
import type { ApplicationSubmissionSnapshot } from "@/lib/server/applicationStore";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ applicationId: string }> };

export async function GET(
  request: Request,
  context: RouteContext,
): Promise<NextResponse> {
  const { applicationId } = await context.params;
  const url = new URL(request.url);
  const snapshotId = url.searchParams.get("snapshotId")?.trim() ?? "";
  const asset = url.searchParams.get("asset")?.trim() as
    | keyof ApplicationSubmissionSnapshot["assets"]
    | "";
  if (!snapshotId || !asset) {
    return NextResponse.json(
      { error: "snapshotId and asset are required." },
      { status: 400 },
    );
  }
  const result = await readApplicationSubmissionAsset(
    applicationId,
    snapshotId,
    asset,
  );
  if (!result) {
    return NextResponse.json({ error: "Snapshot asset not found." }, { status: 404 });
  }
  const contentType =
    asset === "cv_pdf"
      ? "application/pdf"
      : asset === "photo"
        ? "application/octet-stream"
        : asset === "manifest"
          ? "application/json"
          : "text/plain; charset=utf-8";
  return new NextResponse(new Uint8Array(result.buffer), {
    headers: {
      "content-type": contentType,
      "content-disposition": `attachment; filename="${result.fileName.replace(/"/g, "")}"`,
      "cache-control": "no-store",
    },
  });
}

export async function POST(
  request: Request,
  context: RouteContext,
): Promise<NextResponse> {
  const denied = assertApiAuthorized(request);
  if (denied) return denied;
  const { applicationId } = await context.params;
  const body = (await request.json()) as Record<string, unknown>;
  const templateId =
    typeof body.templateId === "string" ? body.templateId.trim() : "";
  if (!templateId) {
    return NextResponse.json(
      { error: "templateId is required." },
      { status: 400 },
    );
  }
  try {
    const snapshot = await createApplicationSubmissionSnapshot(applicationId, {
      templateId,
      theme: typeof body.theme === "string" ? body.theme : undefined,
      source: typeof body.source === "string" ? body.source : undefined,
      submissionUrl:
        typeof body.submissionUrl === "string" ? body.submissionUrl : undefined,
      confirmationReference:
        typeof body.confirmationReference === "string"
          ? body.confirmationReference
          : undefined,
      submittedAt:
        typeof body.submittedAt === "string" ? body.submittedAt : undefined,
    });
    return NextResponse.json({ ok: true, snapshot }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Submission failed." },
      { status: 400 },
    );
  }
}

export async function PUT(
  request: Request,
  context: RouteContext,
): Promise<NextResponse> {
  const denied = assertApiAuthorized(request);
  if (denied) return denied;
  const { applicationId } = await context.params;
  const form = await request.formData();
  const snapshotId = String(form.get("snapshotId") ?? "").trim();
  const fileName = String(form.get("fileName") ?? "").trim();
  const expectedSha256 = String(form.get("sha256") ?? "").trim();
  const file = form.get("file");
  if (
    !snapshotId ||
    !fileName ||
    !/^[a-f0-9]{64}$/.test(expectedSha256) ||
    !(file instanceof File)
  ) {
    return NextResponse.json(
      { error: "snapshotId, fileName, sha256, and file are required." },
      { status: 400 },
    );
  }
  try {
    await restoreApplicationSubmissionAsset({
      applicationId,
      snapshotId,
      fileName,
      expectedSha256,
      buffer: new Uint8Array(await file.arrayBuffer()),
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Restore failed." },
      { status: 400 },
    );
  }
}
