import { NextResponse } from "next/server";

import { CORE_DATASET_FILE, ensureCoreDatasetFresh, readCoreDataset } from "@/lib/server/keywordCoreDataset";

export const runtime = "nodejs";

export async function GET(): Promise<NextResponse> {
  const refreshed = await ensureCoreDatasetFresh({ removeLegacySnapshots: true });
  const { payload } = await readCoreDataset();
  const itemCount = Array.isArray(payload.items) ? payload.items.length : 0;

  return NextResponse.json({
    ok: true,
    defaultDatasetId: CORE_DATASET_FILE,
    datasets: [
      {
        id: CORE_DATASET_FILE,
        label: "Core Database",
        fileName: CORE_DATASET_FILE,
        generatedAt: typeof payload.generated_at === "string" ? payload.generated_at : null,
        itemCount,
        provider: typeof payload.provider === "string" ? payload.provider : null,
        kind: "core",
      },
    ],
    refreshed,
  });
}

export async function POST(): Promise<NextResponse> {
  const refreshed = await ensureCoreDatasetFresh({ forceRebuild: true, removeLegacySnapshots: true });
  const { payload } = await readCoreDataset();
  const itemCount = Array.isArray(payload.items) ? payload.items.length : 0;

  return NextResponse.json({
    ok: true,
    mergedDatasetId: CORE_DATASET_FILE,
    mergedItemCount: itemCount,
    sourceFileCount: 1,
    datasets: [
      {
        id: CORE_DATASET_FILE,
        label: "Core Database",
        fileName: CORE_DATASET_FILE,
        generatedAt: typeof payload.generated_at === "string" ? payload.generated_at : null,
        itemCount,
        provider: typeof payload.provider === "string" ? payload.provider : null,
        kind: "core",
      },
    ],
    refreshed,
  });
}
