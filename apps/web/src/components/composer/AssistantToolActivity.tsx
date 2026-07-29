"use client";

import { AlertTriangle, Check, LoaderCircle, Wrench } from "lucide-react";

import type { AssistantTimelineItem } from "./assistant-panel-model";

export function AssistantToolActivity({
  item,
}: {
  item: Extract<AssistantTimelineItem, { kind: "tool" }>;
}) {
  const statusIcon =
    item.status === "succeeded" ? (
      <Check aria-hidden className="h-3.5 w-3.5" />
    ) : item.status === "failed" ? (
      <AlertTriangle aria-hidden className="h-3.5 w-3.5" />
    ) : (
      <LoaderCircle aria-hidden className="h-3.5 w-3.5 animate-spin" />
    );
  const statusLabel =
    item.status === "preparing"
      ? "Preparing"
      : item.status === "running"
        ? "Running"
        : item.status === "succeeded"
          ? "Succeeded"
          : "Failed";

  return (
    <details className="rounded-md border border-[var(--line)] bg-[var(--surface-2)] px-3 py-2 text-xs">
      <summary className="flex cursor-pointer list-none items-center gap-2 font-semibold">
        <Wrench aria-hidden className="h-3.5 w-3.5" />
        <span className="min-w-0 flex-1 truncate">{item.toolName}</span>
        <span className="inline-flex items-center gap-1 text-[var(--ink-muted)]">
          {statusIcon}
          {statusLabel}
        </span>
      </summary>
      <p className="mt-2 text-[var(--ink-muted)]">{item.targetDescription}</p>
      {item.message ? (
        <p className="mt-2 text-red-700 dark:text-red-300">{item.message}</p>
      ) : null}
      {item.result !== undefined ? (
        <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap rounded border border-[var(--line)] bg-[var(--surface-1)] p-2 text-[10px]">
          {JSON.stringify(item.result, null, 2)}
        </pre>
      ) : null}
    </details>
  );
}
