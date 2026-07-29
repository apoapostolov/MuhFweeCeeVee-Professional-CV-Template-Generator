"use client";

import { RefreshCw } from "lucide-react";
import { useState, type RefObject } from "react";

import type { AssistantHandoff } from "@muhfweeceevee/schemas";
import type { AssistantTimelineItem } from "./assistant-panel-model";
import { AssistantApprovalCard } from "./AssistantApprovalCard";
import { AssistantHandoffCard } from "./AssistantHandoffCard";
import { AssistantPlanCard } from "./AssistantPlanCard";
import { AssistantToolActivity } from "./AssistantToolActivity";

function readableMessage(content: string, assistant: boolean): string {
  return assistant
    ? content.replace(/\*\*([^*]+)\*\*/g, "$1").replace(/`([^`]+)`/g, "$1")
    : content;
}

export function AssistantConversation({
  timeline,
  suggestions,
  error,
  onSuggestion,
  onReconnect,
  onRetry,
  onResolveApproval,
  resolvingApprovalId,
  onResolveBatch,
  onNavigate,
  endRef,
}: {
  timeline: AssistantTimelineItem[];
  suggestions: string[];
  error: string;
  onSuggestion: (suggestion: string) => void;
  onReconnect: () => void;
  onRetry: () => void;
  onResolveApproval: (
    proposalId: string,
    decision: "approve" | "reject",
  ) => void;
  resolvingApprovalId: string;
  onResolveBatch: (
    proposalIds: string[],
    decision: "approve" | "reject",
  ) => void;
  onNavigate: (handoff: AssistantHandoff) => void;
  endRef: RefObject<HTMLDivElement | null>;
}) {
  const [selectedApprovals, setSelectedApprovals] = useState<string[]>([]);
  const selectableApprovals = timeline.filter(
    (item): item is Extract<AssistantTimelineItem, { kind: "approval" }> =>
      item.kind === "approval" && item.status === "pending",
  );
  const selectedPending = selectedApprovals.filter((id) =>
    selectableApprovals.some((item) => item.id === id),
  );
  return (
    <div
      aria-live="polite"
      aria-relevant="additions text"
      className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4"
    >
      {timeline.length === 0 ? (
        <section className="space-y-3" aria-labelledby="assistant-empty-heading">
          <div>
            <h3 className="text-sm font-bold" id="assistant-empty-heading">
              Ask about the workspace
            </h3>
            <p className="mt-1 text-xs text-[var(--ink-muted)]">
              I can inspect CVs, applications, Research, letters, templates,
              and deterministic analyses. Proposed changes pause for an
              explicit before/after approval.
            </p>
          </div>
          <div className="space-y-2">
            {suggestions.map((suggestion) => (
              <button
                className="block w-full rounded-md border border-[var(--line)] bg-[var(--surface-2)] px-3 py-2 text-left text-xs hover:border-[var(--accent)]"
                key={suggestion}
                onClick={() => onSuggestion(suggestion)}
                type="button"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {timeline.map((item) =>
        item.kind === "message" ? (
          <article
            className={`max-w-[92%] rounded-lg border px-3 py-2 text-sm ${
              item.role === "user"
                ? "ml-auto border-[var(--accent)] bg-[var(--accent)] text-white"
                : "border-[var(--line)] bg-[var(--surface-2)]"
            }`}
            key={item.id}
          >
            <p className="whitespace-pre-wrap">
              {readableMessage(item.content, item.role === "assistant")}
            </p>
          </article>
        ) : item.kind === "tool" ? (
          <AssistantToolActivity item={item} key={item.id} />
        ) : item.kind === "approval" ? (
          <AssistantApprovalCard
            isResolving={resolvingApprovalId === item.id}
            item={item}
            key={item.id}
            onSelectedChange={
              item.status === "pending"
                ? (selected) =>
                    setSelectedApprovals((current) =>
                      selected
                        ? [...new Set([...current, item.id])]
                        : current.filter((id) => id !== item.id),
                    )
                : undefined
            }
            onResolve={(decision) => onResolveApproval(item.id, decision)}
            selected={selectedPending.includes(item.id)}
          />
        ) : item.kind === "plan" ? (
          <AssistantPlanCard key={item.id} plan={item.plan} />
        ) : item.kind === "handoff" ? (
          <AssistantHandoffCard
            handoff={item.handoff}
            key={item.id}
            onNavigate={onNavigate}
          />
        ) : (
          <div
            className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-800 dark:border-red-800 dark:bg-red-950/30 dark:text-red-200"
            key={item.id}
            role="alert"
          >
            <p>{item.message}</p>
            {item.canRetry ? (
              <div className="mt-2 flex gap-3">
                <button
                  className="font-semibold underline"
                  onClick={onRetry}
                  type="button"
                >
                  Retry
                </button>
                <button
                  className="font-semibold underline"
                  onClick={onReconnect}
                  type="button"
                >
                  Reconnect tools
                </button>
              </div>
            ) : null}
          </div>
        ),
      )}
      {selectedPending.length >= 2 ? (
        <section className="sticky bottom-0 rounded-lg border-2 border-[var(--accent)] bg-[var(--surface-1)] p-3 shadow-lg">
          <p className="text-xs font-bold">
            Review {selectedPending.length} selected operations as one batch
          </p>
          <p className="mt-1 text-[10px] text-[var(--ink-muted)]">
            Each operation keeps its own revision, expiry, and audit record.
          </p>
          <div className="mt-2 flex justify-end gap-2">
            <button
              className="rounded border border-[var(--line)] px-2 py-1 text-xs font-semibold"
              onClick={() => onResolveBatch(selectedPending, "reject")}
              type="button"
            >
              Keep all current data
            </button>
            <button
              className="rounded bg-[var(--accent)] px-2 py-1 text-xs font-semibold text-white"
              onClick={() => onResolveBatch(selectedPending, "approve")}
              type="button"
            >
              Apply selected
            </button>
          </div>
        </section>
      ) : null}
      {error ? (
        <div
          className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100"
          role="alert"
        >
          <p>{error}</p>
          <div className="mt-2 flex gap-3">
            <button
              className="inline-flex items-center gap-1 font-semibold underline"
              onClick={onReconnect}
              type="button"
            >
              <RefreshCw aria-hidden className="h-3 w-3" />
              Reconnect tools
            </button>
            <button
              className="font-semibold underline"
              onClick={onRetry}
              type="button"
            >
              Retry prompt
            </button>
          </div>
        </div>
      ) : null}
      <div ref={endRef} />
    </div>
  );
}
