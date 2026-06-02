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

import type { FieldRewriteProposal } from "@/lib/field-ai-rewrite";
import { scoreTone } from "./analysis-ui-utils";
import {
  companyFieldResearchStorageKey,
  readCompanyFieldResearchSession,
  writeCompanyFieldResearchSession,
} from "./company-field-ai-persistence";
import { formatProposalCharacterCount } from "./field-ai-proposals-persistence";
import {
  EDITOR_METADATA_FIELD_AI_PROPOSALS_CLASS,
  EDITOR_METADATA_FIELD_AI_SEPARATOR_CLASS,
  EDITOR_FIELD_AI_SEPARATOR_LINE_CLASS,
} from "./editor-compact-form-layout";

const iconButtonClass =
  "inline-flex h-6 w-6 shrink-0 items-center justify-center rounded border border-[var(--line)] bg-white text-xs text-slate-700 hover:bg-[var(--surface-2)]";

const actionButtonClass =
  "rounded-md border border-[var(--line)] bg-white px-2.5 py-1 text-xs font-semibold text-slate-800 hover:bg-[var(--surface-2)] disabled:cursor-not-allowed disabled:opacity-60";

const fieldAiScorePillClass =
  "flex h-5 min-w-[1.25rem] items-center justify-center rounded border border-[var(--line)] bg-[var(--surface-1)] px-1.5 text-[10px] font-bold leading-none tabular-nums";

export type CompanyFieldAiProviderProps = {
  metadataSource: string;
  companyName: string;
  pathLabel: string;
  fieldLabel: string;
  fieldKey: string;
  value: string;
  companyContext: Record<string, unknown>;
  resolvedTheme: "light" | "dark";
  onApply: (next: string) => void;
  onNotice?: (message: string) => void;
  showSeparatorBelow?: boolean;
  children: ReactNode;
};

type CompanyFieldAiContextValue = {
  expanded: boolean;
  setExpanded: (value: boolean) => void;
  busy: boolean;
  resolvedTheme: "light" | "dark";
  showSeparatorBelow: boolean;
  researchSession: { proposals: FieldRewriteProposal[] } | null;
  undoBeforeApply: string | null;
  runResearch: () => Promise<void>;
  applyProposal: (proposal: FieldRewriteProposal) => void;
  undoApply: () => void;
};

const CompanyFieldAiContext = createContext<CompanyFieldAiContextValue | null>(null);

function useCompanyFieldAiContext(): CompanyFieldAiContextValue {
  const ctx = useContext(CompanyFieldAiContext);
  if (!ctx) {
    throw new Error("CompanyFieldAi components must be used within CompanyFieldAiProvider.");
  }
  return ctx;
}

function AiStarsIcon(): JSX.Element {
  return (
    <svg aria-hidden className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2l1.55 4.74L18 8.26l-3.9 2.84L15.45 16 12 13.27 8.55 16l1.35-4.9L6 8.26l4.45-1.52L12 2z" />
      <path d="M5 14l.8 2.45L8 17.1l-2 1.45L6.7 21 5 19.55 3.3 21l.7-2.45-2-1.45 2.2-.65L5 14z" opacity="0.85" />
      <path d="M19 14l.8 2.45 2.2.65-2 1.45.7 2.45L19 19.55 17.3 21l.7-2.45-2-1.45 2.2-.65L19 14z" opacity="0.85" />
    </svg>
  );
}

function UndoIcon(): JSX.Element {
  return (
    <svg aria-hidden className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 10h10a5 5 0 0 1 5 5v1" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M7 6L3 10l4 4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function CompanyFieldAiProvider({
  metadataSource,
  companyName,
  pathLabel,
  fieldLabel,
  fieldKey,
  value,
  companyContext,
  resolvedTheme,
  onApply,
  onNotice,
  showSeparatorBelow = false,
  children,
}: CompanyFieldAiProviderProps): JSX.Element {
  const storageKey = useMemo(
    () =>
      companyFieldResearchStorageKey({
        metadataSource,
        pathLabel,
      }),
    [metadataSource, pathLabel],
  );
  const [expanded, setExpanded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [researchSession, setResearchSession] = useState<{ proposals: FieldRewriteProposal[] } | null>(null);
  const [undoBeforeApply, setUndoBeforeApply] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const stored = readCompanyFieldResearchSession(storageKey);
    setResearchSession(stored);
    if (stored) {
      setExpanded(true);
    }
    setUndoBeforeApply(null);
    setHydrated(true);
  }, [storageKey]);

  useEffect(() => {
    if (!hydrated || !researchSession) {
      return;
    }
    writeCompanyFieldResearchSession(storageKey, researchSession);
  }, [hydrated, storageKey, researchSession]);

  const applyProposal = useCallback(
    (proposal: FieldRewriteProposal): void => {
      setUndoBeforeApply(value);
      onApply(proposal.text);
      onNotice?.("");
    },
    [value, onApply, onNotice],
  );

  const undoApply = useCallback((): void => {
    if (undoBeforeApply === null) {
      return;
    }
    onApply(undoBeforeApply);
    setUndoBeforeApply(null);
    onNotice?.("");
  }, [undoBeforeApply, onApply, onNotice]);

  const runResearch = useCallback(async (): Promise<void> => {
    if (!companyName.trim()) {
      onNotice?.("Set the company name before running web research.");
      return;
    }
    setBusy(true);
    setUndoBeforeApply(null);
    try {
      const response = await fetch("/api/analysis/company-field", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          companyName,
          fieldPath: pathLabel,
          fieldLabel,
          fieldKey,
          text: value,
          companyContext,
        }),
      });
      const payload = (await response.json()) as {
        error?: string;
        proposals?: FieldRewriteProposal[];
      };
      if (!response.ok) {
        onNotice?.(payload.error ?? "Company research request failed.");
        return;
      }
      const proposals = Array.isArray(payload.proposals) ? payload.proposals : [];
      if (proposals.length < 3) {
        onNotice?.("AI returned invalid research proposals.");
        return;
      }
      setResearchSession({ proposals: proposals.slice(0, 3) });
      setExpanded(true);
      onNotice?.("");
    } catch {
      onNotice?.("Company research request failed.");
    } finally {
      setBusy(false);
    }
  }, [companyName, pathLabel, fieldLabel, fieldKey, value, companyContext, onNotice]);

  const ctxValue = useMemo<CompanyFieldAiContextValue>(
    () => ({
      expanded,
      setExpanded,
      busy,
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
      resolvedTheme,
      showSeparatorBelow,
      researchSession,
      undoBeforeApply,
      runResearch,
      applyProposal,
      undoApply,
    ],
  );

  return <CompanyFieldAiContext.Provider value={ctxValue}>{children}</CompanyFieldAiContext.Provider>;
}

export function CompanyFieldAiInputChrome({
  children,
  multiline = false,
}: {
  children: ReactNode;
  multiline?: boolean;
}): JSX.Element {
  const { undoBeforeApply, undoApply } = useCompanyFieldAiContext();
  const overlayClass = multiline
    ? "pointer-events-none absolute top-1 right-1 z-10 flex items-start justify-end"
    : "pointer-events-none absolute inset-y-0 right-1 z-10 flex items-center justify-end";

  if (undoBeforeApply === null) {
    return <div className="relative min-w-0">{children}</div>;
  }

  return (
    <div className="relative min-w-0">
      {children}
      <div className={overlayClass}>
        <button
          aria-label="Undo applied research"
          className={`${iconButtonClass} pointer-events-auto`}
          onClick={undoApply}
          title="Restore previous text"
          type="button"
        >
          <UndoIcon />
        </button>
      </div>
    </div>
  );
}

export function CompanyFieldAiTrigger(): JSX.Element {
  const { expanded, setExpanded, busy, runResearch } = useCompanyFieldAiContext();
  return (
    <button
      aria-expanded={expanded}
      aria-label="Research and populate company field"
      className={`${iconButtonClass} ${expanded ? "bg-[var(--surface-2)] ring-1 ring-[var(--line)]" : ""}`}
      disabled={busy}
      onClick={() => {
        setExpanded(true);
        void runResearch();
      }}
      title="Research & populate"
      type="button"
    >
      <AiStarsIcon />
    </button>
  );
}

function CompanyFieldAiProposals(): JSX.Element | null {
  const { busy, resolvedTheme, researchSession, applyProposal } = useCompanyFieldAiContext();

  if (!researchSession && !busy) {
    return null;
  }

  const sorted = researchSession
    ? [...researchSession.proposals].sort((a, b) => b.confidence - a.confidence)
    : [];

  return (
    <div className={EDITOR_METADATA_FIELD_AI_PROPOSALS_CLASS}>
      {busy ? <p className="text-xs text-[var(--ink-muted)]">Researching company field...</p> : null}
      {researchSession ? (
        <>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--ink-muted)]">
            Research proposals
          </p>
          <ul className="space-y-2">
            {sorted.map((proposal, index) => (
              <li
                className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-2 rounded-md border border-[var(--line)] bg-[var(--surface-1)] px-2 py-1.5"
                key={`${index}-${proposal.confidence}`}
              >
                <p className="min-w-0 self-center text-xs leading-snug text-slate-800 whitespace-pre-wrap">
                  {proposal.text}
                  <span className="text-[var(--ink-muted)]">
                    {" "}
                    {formatProposalCharacterCount("en", proposal.text.length)}
                  </span>
                </p>
                <span
                  className={`${fieldAiScorePillClass} shrink-0 ${scoreTone(resolvedTheme, proposal.confidence)}`}
                  title="AI confidence"
                >
                  {proposal.confidence}%
                </span>
                <button
                  className={`${actionButtonClass} shrink-0`}
                  onClick={() => applyProposal(proposal)}
                  type="button"
                >
                  Apply
                </button>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </div>
  );
}

export function CompanyFieldAiPanel(): JSX.Element | null {
  const { expanded, busy, showSeparatorBelow, researchSession } = useCompanyFieldAiContext();

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
      <CompanyFieldAiProposals />
      {separator}
    </>
  );
}