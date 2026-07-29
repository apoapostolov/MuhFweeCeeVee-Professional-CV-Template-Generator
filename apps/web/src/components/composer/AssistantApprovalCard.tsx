"use client";

import { AlertTriangle, Check, ShieldCheck, X } from "lucide-react";

import { getAssistantToolDefinition } from "@muhfweeceevee/schemas";

import type { AssistantTimelineItem } from "./assistant-panel-model";

type ApprovalItem = Extract<AssistantTimelineItem, { kind: "approval" }>;

function previewValue(value: unknown): string {
  if (value === undefined) return "not set";
  if (value === null) return "removed";
  if (typeof value === "string") return value;
  return JSON.stringify(value);
}

function approvalAction(item: ApprovalItem): string {
  if (item.proposal.approvalKind === "destructive") {
    return getAssistantToolDefinition(item.proposal.toolName)?.title ?? "Delete";
  }
  if (item.proposal.approvalKind === "cost") return "Run paid analysis";
  if (
    item.proposal.toolName === "cover_letter_save" &&
    (item.proposal.arguments.draftWithAi === true ||
      item.proposal.arguments.humanize === true)
  ) {
    return "Generate and save letter";
  }
  return "Apply changes";
}

export function AssistantApprovalCard({
  item,
  isResolving,
  onResolve,
  selected = false,
  onSelectedChange,
}: {
  item: ApprovalItem;
  isResolving: boolean;
  onResolve: (decision: "approve" | "reject") => void;
  selected?: boolean;
  onSelectedChange?: (selected: boolean) => void;
}) {
  const { preview } = item.proposal;
  const pending = item.status === "pending";
  return (
    <article
      aria-labelledby={`approval-title-${item.id}`}
      className="rounded-lg border-2 border-amber-400 bg-amber-50 p-3 text-amber-950 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-50"
    >
      <div className="flex items-start gap-2">
        {pending ? (
          <ShieldCheck aria-hidden className="mt-0.5 h-4 w-4 flex-none" />
        ) : item.status === "approved" ? (
          <Check aria-hidden className="mt-0.5 h-4 w-4 flex-none" />
        ) : (
          <AlertTriangle aria-hidden className="mt-0.5 h-4 w-4 flex-none" />
        )}
        <div className="min-w-0 flex-1">
          <h3 className="text-xs font-black" id={`approval-title-${item.id}`}>
            {pending ? "Approval needed" : `Approval ${item.status}`}
          </h3>
          <p className="mt-1 text-xs">{preview.summary}</p>
        </div>
      </div>

      <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-[11px]">
        <dt className="font-semibold">Target</dt>
        <dd className="break-words">{item.proposal.targetDescription}</dd>
        <dt className="font-semibold">Impact</dt>
        <dd>
          {preview.affectedRecords} record
          {preview.affectedRecords === 1 ? "" : "s"}
        </dd>
        <dt className="font-semibold">Recovery</dt>
        <dd>{preview.reversibility}</dd>
        {preview.estimatedCostUsd !== undefined ? (
          <>
            <dt className="font-semibold">Cost ceiling</dt>
            <dd>${preview.estimatedCostUsd.toFixed(4)} estimated</dd>
          </>
        ) : null}
      </dl>

      {preview.changes.length > 0 ? (
        <details className="mt-3 rounded border border-amber-300 bg-white/60 p-2 dark:border-amber-800 dark:bg-black/10">
          <summary className="cursor-pointer text-[11px] font-bold">
            Review {preview.changes.length} changed field
            {preview.changes.length === 1 ? "" : "s"}
          </summary>
          <div className="mt-2 max-h-56 space-y-2 overflow-y-auto">
            {preview.changes.map((change, index) => (
              <div
                className="border-t border-amber-200 pt-2 text-[10px] first:border-0 first:pt-0 dark:border-amber-900"
                key={`${change.path}-${index}`}
              >
                <p className="font-bold">{change.path}</p>
                <p className="break-words">
                  <span className="font-semibold">Before:</span>{" "}
                  {previewValue(change.before)}
                </p>
                <p className="break-words">
                  <span className="font-semibold">After:</span>{" "}
                  {previewValue(change.after)}
                </p>
              </div>
            ))}
          </div>
        </details>
      ) : null}

      {preview.warnings.map((warning) => (
        <p className="mt-2 text-[10px] font-semibold" key={warning}>
          {warning}
        </p>
      ))}
      {item.message ? (
        <p className="mt-2 text-[11px]" role="status">
          {item.message}
        </p>
      ) : null}

      {pending ? (
        <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
          {onSelectedChange ? (
            <label className="mr-auto flex items-center gap-1.5 text-[11px] font-semibold">
              <input
                checked={selected}
                disabled={isResolving}
                onChange={(event) => onSelectedChange(event.target.checked)}
                type="checkbox"
              />
              Add to batch
            </label>
          ) : null}
          <button
            className="inline-flex items-center gap-1 rounded-md border border-amber-500 px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
            disabled={isResolving}
            onClick={() => onResolve("reject")}
            type="button"
          >
            <X aria-hidden className="h-3 w-3" />
            Keep current data
          </button>
          <button
            className="inline-flex items-center gap-1 rounded-md bg-amber-700 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50 dark:bg-amber-500 dark:text-black"
            disabled={isResolving || item.proposal.context.hasUnsavedChanges}
            onClick={() => onResolve("approve")}
            type="button"
          >
            <Check aria-hidden className="h-3 w-3" />
            {isResolving ? "Applying…" : approvalAction(item)}
          </button>
        </div>
      ) : null}
    </article>
  );
}
