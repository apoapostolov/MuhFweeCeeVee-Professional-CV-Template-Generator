import fs from "node:fs/promises";
import path from "node:path";

import { NextResponse } from "next/server";

import { repoPath } from "@/lib/server/repoPaths";

export const runtime = "nodejs";

type RelevantItem = {
  url?: string;
  title?: string;
  score?: number;
  matched_keywords?: string[];
  role_hits?: string[];
  domain?: string;
  snippet?: string;
};

type RelevantPayload = {
  generated_at?: string;
  run_id?: string;
  provider?: string;
  cached_relevant_count?: number;
  items?: RelevantItem[];
  source_files?: string[];
};

type MergeRequest = {
  targetName?: string;
};

const PROTOTYPE_DATASET_FILE = "prototype_dataset_1_0.json";
const MERGED_DATASET_FILE = "merged.json";

function isSnapshotFileName(name: string): boolean {
  return (
    /^jd_relevant_\d{8}T\d{6}Z\.json$/.test(name) ||
    /^prototype_dataset_\d+_\d+\.json$/.test(name) ||
    name === MERGED_DATASET_FILE
  );
}

function datasetLabel(name: string): string {
  if (name === MERGED_DATASET_FILE) {
    return "Merged Dataset";
  }
  if (name === PROTOTYPE_DATASET_FILE) {
    return "Prototype Dataset 1.0";
  }
  const jdMatch = /^jd_relevant_(\d{8})T(\d{6})Z\.json$/.exec(name);
  if (jdMatch) {
    return `JD Snapshot ${jdMatch[1]} ${jdMatch[2]}`;
  }
  return name;
}

async function readDataset(outputsDir: string, fileName: string): Promise<RelevantPayload> {
  const filePath = path.join(outputsDir, fileName);
  const raw = await fs.readFile(filePath, "utf-8");
  return JSON.parse(raw) as RelevantPayload;
}

async function listDatasets(): Promise<
  Array<{
    id: string;
    label: string;
    fileName: string;
    generatedAt: string | null;
    itemCount: number;
    provider: string | null;
    isPrototype: boolean;
  }>
> {
  const outputsDir = repoPath("cv-keyword-analysis", "outputs");
  const files = (await fs.readdir(outputsDir)).filter(isSnapshotFileName).sort((a, b) => b.localeCompare(a));

  const out: Array<{
    id: string;
    label: string;
    fileName: string;
    generatedAt: string | null;
    itemCount: number;
    provider: string | null;
    isPrototype: boolean;
  }> = [];

  for (const fileName of files) {
    try {
      const payload = await readDataset(outputsDir, fileName);
      out.push({
        id: fileName,
        label: datasetLabel(fileName),
        fileName,
        generatedAt: typeof payload.generated_at === "string" ? payload.generated_at : null,
        itemCount: Array.isArray(payload.items) ? payload.items.length : 0,
        provider: typeof payload.provider === "string" ? payload.provider : null,
        isPrototype: fileName === PROTOTYPE_DATASET_FILE,
      });
    } catch {
      // Ignore unreadable snapshot files in list view.
    }
  }
  return out;
}

function mergeItemsByUrl(datasets: Array<{ fileName: string; payload: RelevantPayload }>): RelevantItem[] {
  const byUrl = new Map<string, RelevantItem>();
  const bySynthetic = new Map<string, RelevantItem>();

  for (const { payload } of datasets) {
    const items = Array.isArray(payload.items) ? payload.items : [];
    for (const item of items) {
      const url = String(item.url ?? "").trim();
      const title = String(item.title ?? "").trim();
      const snippet = String(item.snippet ?? "").trim();
      const key = url || `${title}::${snippet}`;
      if (!key) {
        continue;
      }

      const bucket = url ? byUrl : bySynthetic;
      const current = bucket.get(key);

      if (!current) {
        bucket.set(key, {
          url,
          title,
          score: Number(item.score ?? 0),
          matched_keywords: Array.isArray(item.matched_keywords) ? [...new Set(item.matched_keywords.map((v) => String(v).trim()).filter(Boolean))] : [],
          role_hits: Array.isArray(item.role_hits) ? [...new Set(item.role_hits.map((v) => String(v).trim()).filter(Boolean))] : [],
          domain: String(item.domain ?? "").trim(),
          snippet,
        });
        continue;
      }

      const currentScore = Number(current.score ?? 0);
      const nextScore = Number(item.score ?? 0);
      current.score = Math.max(currentScore, nextScore);

      const mergedKeywords = new Set([...(current.matched_keywords ?? []), ...((item.matched_keywords ?? []).map((v) => String(v).trim()).filter(Boolean))]);
      current.matched_keywords = [...mergedKeywords];

      const mergedRoles = new Set([...(current.role_hits ?? []), ...((item.role_hits ?? []).map((v) => String(v).trim()).filter(Boolean))]);
      current.role_hits = [...mergedRoles];

      if (!current.title && title) current.title = title;
      if (!current.domain && item.domain) current.domain = String(item.domain);
      if (!current.snippet && snippet) current.snippet = snippet;
    }
  }

  const merged = [...byUrl.values(), ...bySynthetic.values()];
  merged.sort((a, b) => Number(b.score ?? 0) - Number(a.score ?? 0));
  return merged;
}

export async function GET(): Promise<NextResponse> {
  const datasets = await listDatasets();
  return NextResponse.json({
    ok: true,
    defaultDatasetId:
      datasets.find((item) => item.fileName === MERGED_DATASET_FILE)?.id ??
      datasets.find((item) => item.fileName === PROTOTYPE_DATASET_FILE)?.id ?? datasets[0]?.id ?? null,
    datasets,
  });
}

export async function POST(request: Request): Promise<NextResponse> {
  const body = (await request.json().catch(() => ({}))) as MergeRequest;
  const targetNameRaw = (body.targetName ?? PROTOTYPE_DATASET_FILE).trim();
  const targetName = targetNameRaw.length > 0 ? targetNameRaw : PROTOTYPE_DATASET_FILE;

  if (!/^prototype_dataset_[a-z0-9_.-]+\.json$/i.test(targetName) && targetName !== PROTOTYPE_DATASET_FILE) {
    return NextResponse.json({ error: "Invalid targetName. Expected prototype_dataset_*.json" }, { status: 400 });
  }

  const outputsDir = repoPath("cv-keyword-analysis", "outputs");
  const files = (await fs.readdir(outputsDir)).filter((name) => /^jd_relevant_\d{8}T\d{6}Z\.json$/.test(name)).sort();

  if (files.length === 0) {
    return NextResponse.json({ error: "No JD snapshot files found to merge." }, { status: 400 });
  }

  const datasets: Array<{ fileName: string; payload: RelevantPayload }> = [];
  for (const fileName of files) {
    try {
      datasets.push({ fileName, payload: await readDataset(outputsDir, fileName) });
    } catch {
      // Skip unreadable files and continue merge.
    }
  }

  const mergedItems = mergeItemsByUrl(datasets);

  const payload: RelevantPayload = {
    generated_at: new Date().toISOString(),
    run_id: "prototype-dataset-1.0",
    provider: "merged",
    cached_relevant_count: mergedItems.length,
    source_files: datasets.map((item) => item.fileName),
    items: mergedItems,
  };

  const destination = path.join(outputsDir, targetName === PROTOTYPE_DATASET_FILE ? PROTOTYPE_DATASET_FILE : targetName);
  await fs.writeFile(destination, JSON.stringify(payload, null, 2), "utf-8");

  const datasetsAfter = await listDatasets();
  return NextResponse.json({
    ok: true,
    mergedDatasetId: path.basename(destination),
    mergedItemCount: mergedItems.length,
    sourceFileCount: datasets.length,
    datasets: datasetsAfter,
  });
}
