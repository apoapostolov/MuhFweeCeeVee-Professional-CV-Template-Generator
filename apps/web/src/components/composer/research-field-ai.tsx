"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type JSX,
  type ReactNode,
} from "react";

import type { ResearchFieldProposal } from "@/lib/research/research-field-refine";
import type { ResearchFieldRefineEntity } from "@/lib/research/types";

import { AiStarsIcon } from "./ai-stars-icon";
import { scoreTone } from "./analysis-ui-utils";
import {
  EDITOR_METADATA_FIELD_AI_PROPOSALS_CLASS,
  EDITOR_METADATA_FIELD_AI_ROW_CLASS,
  EDITOR_METADATA_FIELD_AI_SEPARATOR_CLASS,
  EDITOR_FIELD_AI_SEPARATOR_LINE_CLASS,
} from "./editor-compact-form-layout";
import { formatProposalCharacterCount } from "./field-ai-proposals-persistence";
import {
  readResearchFieldSession,
  researchFieldStorageKey,
  writeResearchFieldSession,
  type PersistedResearchFieldSession,
} from "./research-field-ai-persistence";

const iconButtonClass =
  "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-[var(--line)] bg-white text-slate-800 hover:bg-[var(--surface-2)] disabled:opacity-50";

const actionButtonClass =
  "rounded-md border border-[var(--line)] bg-white px-2.5 py-1 text-xs font-semibold text-slate-800 hover:bg-[var(--surface-2)] disabled:cursor-not-allowed disabled:opacity-60";

const fieldAiScorePillClass =
  "flex h-5 min-w-[1.25rem] items-center justify-center rounded border border-[var(--line)] bg-[var(--surface-1)] px-1.5 text-[10px] font-bold leading-none tabular-nums";

export type ResearchFieldAiProviderProps = {
  entityType: ResearchFieldRefineEntity;
  entityId: string;
  fieldPath: string;
  fieldLabel: string;
  currentValue: string;
  language: string;
  resolvedTheme: "light" | "dark";
  onApply: (proposal: unknown) => void;
  onNotice?: (message: string) => void;
  showSeparatorBelow?: boolean;
  children: ReactNode;
};

type ResearchFieldAiContextValue = {
  expanded: boolean;
  setExpanded: (value: boolean) => void;
  busy: boolean;
  language: string;
  resolvedTheme: "light" | "dark";
  showSeparatorBelow: boolean;
  researchSession: PersistedResearchFieldSession | null;
  undoBeforeApply: string | null;
  runResearch: () => Promise<void>;
  applyProposal: (proposal: ResearchFieldProposal) => void;
  undoApply: () => void;
};

const ResearchFieldAiContext = createContext<ResearchFieldAiContextValue | null>(null);

function useResearchFieldAiContext(): ResearchFieldAiContextValue {
  const ctx = useContext(ResearchFieldAiContext);
  if (!ctx) {
    throw new Error("ResearchFieldAi components must be used within ResearchFieldAiProvider.");
  }
  return ctx;
}

function UndoIcon(): JSX.Element {
  return (
    <svg aria-hidden className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 10h10a5 5 0 0 1 5 5v1" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M7 6L3 10l4 4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ResearchFieldAiProvider({
  entityType,
  entityId,
  fieldPath,
  fieldLabel,
  currentValue,
  language,
  resolvedTheme,
  onApply,
  onNotice,
  showSeparatorBelow = false,
  children,
}: ResearchFieldAiProviderProps): JSX.Element {
  const storageKey = useMemo(
    () =>
      researchFieldStorageKey({
        entityType,
        entityId,
        fieldPath,
      }),
    [entityId, entityType, fieldPath],
  );

  const [expanded, setExpanded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [researchSession, setResearchSession] = useState<PersistedResearchFieldSession | null>(null);
  const [undoBeforeApply, setUndoBeforeApply] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const stored = readResearchFieldSession(storageKey);
    setResearchSession(stored);
    if (stored) {
      setExpanded(true);
    }
    setUndoBeforeApply(null);
    setHydrated(true);
  }, [storageKey]);

  useEffect(() => {
    if (!hydrated) {
      return;
    }
    writeResearchFieldSession(storageKey, researchSession);
  }, [hydrated, researchSession, storageKey]);

  const applyProposal = useCallback(
    (proposal: ResearchFieldProposal) => {
      setUndoBeforeApply(currentValue);
      onApply(proposal.value);
      onNotice?.("");
    },
    [currentValue, onApply, onNotice],
  );

  const undoApply = useCallback(() => {
    if (undoBeforeApply === null) {
      return;
    }
    onApply(undoBeforeApply);
    setUndoBeforeApply(null);
    onNotice?.("");
  }, [undoBeforeApply, onApply, onNotice]);

  const runResearch = useCallback(async () => {
    if (!entityId) {
      return;
    }
    setBusy(true);
    setUndoBeforeApply(null);
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
      const payload = (await response.json()) as {
        error?: string;
        currentScore?: number;
        proposals?: ResearchFieldProposal[];
      };
      if (!response.ok) {
        onNotice?.(payload.error ?? (language === "bg" ? "AI заявката не успя." : "AI request failed."));
        return;
      }
      const proposals = Array.isArray(payload.proposals) ? payload.proposals : [];
      const currentScore = Number(payload.currentScore);
      if (proposals.length === 0 || !Number.isFinite(currentScore)) {
        onNotice?.(
          language === "bg" ? "AI не върна валидни предложения." : "AI returned invalid proposals.",
        );
        return;
      }
      setResearchSession({
        currentScore: Math.max(0, Math.min(100, Math.round(currentScore))),
        proposals: proposals.slice(0, 3),
      });
      setExpanded(true);
      onNotice?.("");
    } catch {
      onNotice?.(language === "bg" ? "AI заявката не успя." : "AI request failed.");
    } finally {
      setBusy(false);
    }
  }, [currentValue, entityId, entityType, fieldLabel, fieldPath, language, onNotice]);

  const ctxValue = useMemo<ResearchFieldAiContextValue>(
    () => ({
      expanded,
      setExpanded,
      busy,
      language,
      resolvedTheme,
      showSeparatorBelow,
      researchSession,
      undoBeforeApply,
      runResearch,
      applyProposal,
      undoApply,
    }),
    [
      expanded,
      busy,
      language,
      resolvedTheme,
      showSeparatorBelow,
      researchSession,
      undoBeforeApply,
      runResearch,
      applyProposal,
      undoApply,
    ],
  );

  return <ResearchFieldAiContext.Provider value={ctxValue}>{children}</ResearchFieldAiContext.Provider>;
}

export function ResearchFieldAiInputChrome({
  children,
  multiline = false,
}: {
  children: ReactNode;
  multiline?: boolean;
}): JSX.Element {
  const { busy, language, resolvedTheme, researchSession, undoBeforeApply, undoApply } =
    useResearchFieldAiContext();

  const showScore =
    undoBeforeApply === null && researchSession !== null && busy === false;
  const showUndo = undoBeforeApply !== null;

  const overlayClass = multiline
    ? "pointer-events-none absolute top-1 right-1 z-10 flex items-start justify-end"
    : "pointer-events-none absolute inset-y-0 right-1 z-10 flex items-center justify-end";

  return (
    <div className="relative min-w-0 flex-1">
      {children}
      {showUndo ? (
        <div className={overlayClass}>
          <button
            aria-label={language === "bg" ? "Отмени приложеното" : "Undo applied value"}
            className={`${iconButtonClass} pointer-events-auto`}
            onClick={undoApply}
            title={language === "bg" ? "Върни предишния текст" : "Restore previous value"}
            type="button"
          >
            <UndoIcon />
          </button>
        </div>
      ) : showScore ? (
        <div className={overlayClass}>
          <span
            className={`${fieldAiScorePillClass} ${scoreTone(resolvedTheme, researchSession.currentScore)}`}
            title={language === "bg" ? "Оценка на текущия текст" : "Current wording score"}
          >
            {researchSession.currentScore}%
          </span>
        </div>
      ) : null}
    </div>
  );
}

export function ResearchFieldAiTrigger(): JSX.Element {
  const { expanded, setExpanded, busy, language, resolvedTheme, runResearch } =
    useResearchFieldAiContext();

  return (
    <button
      aria-expanded={expanded}
      aria-label={language === "bg" ? "Проучи полето с AI" : "Research field with AI"}
      className={`${iconButtonClass} ${expanded ? "bg-[var(--surface-2)] ring-1 ring-[var(--line)]" : ""}`}
      disabled={busy}
      onClick={() => {
        setExpanded(true);
        void runResearch();
      }}
      title={
        busy
          ? language === "bg"
            ? "Проучване..."
            : "Researching..."
          : language === "bg"
            ? "Проучи полето"
            : "Research field"
      }
      type="button"
    >
      <AiStarsIcon
        className={`h-3.5 w-3.5 ${resolvedTheme === "dark" ? "text-white" : ""}`}
        variant={resolvedTheme === "dark" ? "default" : "on-light"}
      />
    </button>
  );
}

function ResearchFieldAiProposals(): JSX.Element | null {
  const { busy, language, resolvedTheme, researchSession, applyProposal } = useResearchFieldAiContext();

  if (!researchSession && !busy) {
    return null;
  }

  const sorted = researchSession
    ? [...researchSession.proposals].sort((a, b) => b.confidence - a.confidence)
    : [];

  return (
    <div className={EDITOR_METADATA_FIELD_AI_PROPOSALS_CLASS}>
      {busy ? (
        <p className="text-xs text-[var(--ink-muted)]">
          {language === "bg" ? "Генериране на предложения..." : "Generating proposals..."}
        </p>
      ) : null}
      {researchSession ? (
        <>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--ink-muted)]">
            {language === "bg" ? "Предложения за проучване" : "Research proposals"}
          </p>
          <ul className="space-y-2">
            {sorted.map((proposal, index) => (
              <li
                className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-start gap-2 rounded-md border border-[var(--line)] bg-[var(--surface-1)] px-2 py-1.5"
                key={`${index}-${proposal.confidence}`}
              >
                <p className="min-w-0 text-xs leading-snug whitespace-pre-wrap text-slate-800">
                  {proposal.preview}
                  <span className="text-[var(--ink-muted)]">
                    {" "}
                    {formatProposalCharacterCount(language, proposal.preview.length)}
                  </span>
                </p>
                <span
                  className={`${fieldAiScorePillClass} shrink-0 ${scoreTone(resolvedTheme, proposal.confidence)}`}
                  title={language === "bg" ? "AI увереност" : "AI confidence"}
                >
                  {proposal.confidence}%
                </span>
                <button
                  className={`${actionButtonClass} shrink-0`}
                  onClick={() => applyProposal(proposal)}
                  type="button"
                >
                  {language === "bg" ? "Приложи" : "Apply"}
                </button>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </div>
  );
}

export function ResearchFieldAiPanel(): JSX.Element | null {
  const { expanded, busy, language, showSeparatorBelow, researchSession, runResearch } =
    useResearchFieldAiContext();

  if (!expanded) {
    return null;
  }

  if (!busy && !researchSession) {
    return null;
  }

  const separator = showSeparatorBelow ? (
    <div aria-hidden className={EDITOR_METADATA_FIELD_AI_SEPARATOR_CLASS}>
      <div className={EDITOR_FIELD_AI_SEPARATOR_LINE_CLASS} />
    </div>
  ) : null;

  return (
    <>
      {researchSession ? (
        <div className={EDITOR_METADATA_FIELD_AI_ROW_CLASS}>
          <button
            className={`${actionButtonClass} bg-[var(--accent)] text-white hover:opacity-90`}
            disabled={busy}
            onClick={() => void runResearch()}
            type="button"
          >
            {busy
              ? language === "bg"
                ? "Проучване..."
                : "Researching..."
              : language === "bg"
                ? "Проучи още"
                : "Research More"}
          </button>
        </div>
      ) : null}
      <ResearchFieldAiProposals />
      {separator}
    </>
  );
}