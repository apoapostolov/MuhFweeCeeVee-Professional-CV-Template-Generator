"use client";

import { useCallback, useState, type JSX } from "react";

import type { ResearchFieldRefineEntity } from "@/lib/research/types";

import { AiStarsIcon } from "./ai-stars-icon";

export type ResearchFieldAiProps = {
  entityType: ResearchFieldRefineEntity;
  entityId: string;
  fieldPath: string;
  fieldLabel: string;
  currentValue: string;
  language: string;
  resolvedTheme: "light" | "dark";
  onApply: (proposal: unknown) => void;
  onNotice?: (message: string) => void;
};

export function ResearchFieldAi({
  entityType,
  entityId,
  fieldPath,
  fieldLabel,
  currentValue,
  language,
  resolvedTheme,
  onApply,
  onNotice,
}: ResearchFieldAiProps): JSX.Element {
  const [busy, setBusy] = useState(false);
  const [proposal, setProposal] = useState<unknown>(null);
  const [proposalPreview, setProposalPreview] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  const runRefine = useCallback(async () => {
    if (!entityId) {
      return;
    }
    setBusy(true);
    setProposal(null);
    setProposalPreview(null);
    try {
      const response = await fetch("/api/research/field-refine", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          entityType,
          entityId,
          fieldPath,
          fieldLabel,
          currentValue,
        }),
      });
      const payload = (await response.json()) as { error?: string; proposal?: unknown };
      if (!response.ok) {
        onNotice?.(payload.error ?? (language === "bg" ? "AI заявката не успя." : "AI request failed."));
        return;
      }
      setProposal(payload.proposal);
      setProposalPreview(
        typeof payload.proposal === "string"
          ? payload.proposal
          : JSON.stringify(payload.proposal, null, 2),
      );
      setExpanded(true);
      onNotice?.("");
    } catch {
      onNotice?.(language === "bg" ? "AI заявката не успя." : "AI request failed.");
    } finally {
      setBusy(false);
    }
  }, [currentValue, entityId, entityType, fieldLabel, fieldPath, language, onNotice]);

  return (
    <div className="relative shrink-0">
      <button
        aria-busy={busy}
        className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-[var(--line)] bg-white text-slate-800 disabled:opacity-50"
        disabled={busy || !entityId}
        onClick={() => void runRefine()}
        title={
          busy
            ? language === "bg"
              ? "Проучване..."
              : "Researching..."
            : language === "bg"
              ? "Проучи още"
              : "Research More"
        }
        type="button"
      >
        <AiStarsIcon
          className={`h-3.5 w-3.5 ${resolvedTheme === "dark" ? "text-white" : ""}`}
          variant={resolvedTheme === "dark" ? "default" : "on-light"}
        />
      </button>
      {expanded && proposalPreview ? (
        <div className="absolute right-0 top-full z-20 mt-1 w-72 rounded-md border border-[var(--line)] bg-white p-2 shadow-md">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--ink-muted)]">
            {language === "bg" ? "Предложение" : "Proposal"}
          </p>
          <pre className="mt-1 max-h-32 overflow-auto whitespace-pre-wrap text-[11px] text-slate-800">
            {proposalPreview}
          </pre>
          <div className="mt-2 flex justify-end gap-1">
            <button
              className="rounded border border-[var(--line)] px-2 py-0.5 text-[11px] font-semibold"
              onClick={() => setExpanded(false)}
              type="button"
            >
              {language === "bg" ? "Затвори" : "Dismiss"}
            </button>
            <button
              className="rounded bg-[var(--accent)] px-2 py-0.5 text-[11px] font-semibold text-white"
              onClick={() => {
                if (proposal !== null) {
                  onApply(proposal);
                }
                setExpanded(false);
                setProposal(null);
                setProposalPreview(null);
              }}
              type="button"
            >
              {language === "bg" ? "Приложи" : "Apply"}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}