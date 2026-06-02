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
  fieldRewriteStorageKey,
  formatProposalCharacterCount,
  readFieldRewriteSession,
  writeFieldRewriteSession,
} from "./field-ai-proposals-persistence";
import {
  EDITOR_FIELD_AI_PROPOSALS_CLASS,
  EDITOR_FIELD_AI_ROW_CLASS,
  EDITOR_FIELD_AI_SEPARATOR_CLASS,
  EDITOR_FIELD_AI_SEPARATOR_LINE_CLASS,
  EDITOR_STACKED_FIELD_AI_PROPOSALS_CLASS,
  EDITOR_STACKED_FIELD_AI_ROW_CLASS,
  EDITOR_STACKED_FIELD_AI_SEPARATOR_CLASS,
  EDITOR_STACKED_FIELD_AI_SEPARATOR_LINE_CLASS,
} from "./editor-compact-form-layout";
import {
  getFieldTextBudget,
  limitToCharacters,
} from "./field-text-budget";

const iconButtonClass =
  "inline-flex h-6 w-6 shrink-0 items-center justify-center rounded border border-[var(--line)] bg-white text-xs text-slate-700 hover:bg-[var(--surface-2)]";

const actionButtonClass =
  "rounded-md border border-[var(--line)] bg-white px-2.5 py-1 text-xs font-semibold text-slate-800 hover:bg-[var(--surface-2)] disabled:cursor-not-allowed disabled:opacity-60";

const fieldInputClass =
  "h-7 rounded border border-[var(--line)] bg-white px-2 text-xs text-slate-800";

const shortenLimitInputClass =
  "composer-shorten-limit-input box-border h-7 w-[4ch] min-w-[4ch] max-w-[4ch] shrink-0 rounded border border-[var(--line)] bg-white px-0.5 text-center text-xs tabular-nums text-slate-800";

const shortenUnitSelectClass =
  "h-7 shrink-0 rounded border border-[var(--line)] bg-white pl-1 pr-0.5 text-xs text-slate-800";

/** Right padding so score / undo badges do not cover field text. */
export const EDITOR_FIELD_AI_INPUT_PAD_CLASS = "pr-14";

export type EditorFieldAiLayout = "compact" | "stacked";

export type EditorFieldAiProviderProps = {
  cvId: string;
  editorPath: string;
  pathLabel: string;
  fieldLabel: string;
  value: string;
  language: string;
  templateId: string;
  resolvedTheme: "light" | "dark";
  onApply: (next: string) => void;
  onNotice?: (message: string) => void;
  showSeparatorBelow?: boolean;
  fieldLayout?: EditorFieldAiLayout;
  children: ReactNode;
};

type FieldRewriteSession = {
  currentScore: number;
  proposals: FieldRewriteProposal[];
};

type EditorFieldAiContextValue = {
  expanded: boolean;
  setExpanded: (value: boolean) => void;
  busy: "rewrite" | "shorten" | null;
  unit: "characters" | "lines";
  setUnit: (unit: "characters" | "lines") => void;
  limitInput: string;
  setLimitInput: (value: string) => void;
  budget: ReturnType<typeof getFieldTextBudget>;
  language: string;
  resolvedTheme: "light" | "dark";
  showSeparatorBelow: boolean;
  fieldLayout: EditorFieldAiLayout;
  rewriteSession: FieldRewriteSession | null;
  undoBeforeApply: string | null;
  runFieldAi: (mode: "professional_rewrite" | "shorten") => Promise<void>;
  applyProposal: (proposal: FieldRewriteProposal) => void;
  undoApply: () => void;
};

const EditorFieldAiContext = createContext<EditorFieldAiContextValue | null>(null);

function useEditorFieldAiContext(): EditorFieldAiContextValue {
  const ctx = useContext(EditorFieldAiContext);
  if (!ctx) {
    throw new Error("EditorFieldAi components must be used within EditorFieldAiProvider.");
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

export function EditorFieldAiProvider({
  cvId,
  editorPath,
  pathLabel,
  fieldLabel,
  value,
  language,
  templateId,
  resolvedTheme,
  onApply,
  onNotice,
  showSeparatorBelow = false,
  fieldLayout = "stacked",
  children,
}: EditorFieldAiProviderProps): JSX.Element {
  const storageKey = useMemo(
    () =>
      fieldRewriteStorageKey({
        cvId,
        language,
        editorPath,
        pathLabel,
      }),
    [cvId, language, editorPath, pathLabel],
  );
  const [expanded, setExpanded] = useState(false);
  const [busy, setBusy] = useState<"rewrite" | "shorten" | null>(null);
  const [unit, setUnit] = useState<"characters" | "lines">("characters");
  const [rewriteSession, setRewriteSession] = useState<FieldRewriteSession | null>(null);
  const [undoBeforeApply, setUndoBeforeApply] = useState<string | null>(null);
  const [proposalsHydrated, setProposalsHydrated] = useState(false);
  const budget = useMemo(() => getFieldTextBudget(pathLabel, templateId), [pathLabel, templateId]);
  const [limitInput, setLimitInput] = useState(String(budget.defaultCharLimit));

  useEffect(() => {
    const stored = readFieldRewriteSession(storageKey);
    setRewriteSession(stored);
    if (stored) {
      setExpanded(true);
    }
    setUndoBeforeApply(null);
    setProposalsHydrated(true);
  }, [storageKey]);

  useEffect(() => {
    if (!proposalsHydrated || !rewriteSession) {
      return;
    }
    writeFieldRewriteSession(storageKey, rewriteSession);
  }, [proposalsHydrated, storageKey, rewriteSession]);

  const limitNumber = Number(limitInput);
  const limitValid = Number.isFinite(limitNumber) && limitNumber > 0;

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

  const runFieldAi = useCallback(async (mode: "professional_rewrite" | "shorten"): Promise<void> => {
    if (!value.trim() && mode === "professional_rewrite") {
      onNotice?.(language === "bg" ? "Няма текст за пренаписване." : "Nothing to rewrite.");
      return;
    }
    setBusy(mode === "professional_rewrite" ? "rewrite" : "shorten");
    if (mode === "shorten") {
      setUndoBeforeApply(null);
    }
    try {
      const charCap =
        mode === "shorten" && limitValid
          ? limitToCharacters(budget, limitNumber, unit)
          : undefined;
      const response = await fetch("/api/analysis/field", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          mode,
          text: value,
          fieldPath: pathLabel,
          fieldLabel,
          templateId,
          language,
          limit: limitValid ? limitNumber : budget.defaultCharLimit,
          unit: mode === "shorten" ? unit : "characters",
          charCap,
        }),
      });
      const payload = (await response.json()) as {
        error?: string;
        text?: string;
        currentScore?: number;
        proposals?: FieldRewriteProposal[];
      };
      if (!response.ok) {
        onNotice?.(payload.error ?? (language === "bg" ? "AI заявката не успя." : "AI request failed."));
        return;
      }
      if (mode === "professional_rewrite") {
        const proposals = Array.isArray(payload.proposals) ? payload.proposals : [];
        const currentScore = Number(payload.currentScore);
        if (
          proposals.length < 3 ||
          !Number.isFinite(currentScore)
        ) {
          onNotice?.(language === "bg" ? "AI не върна валидни предложения." : "AI returned invalid proposals.");
          return;
        }
        const session: FieldRewriteSession = {
          currentScore: Math.max(0, Math.min(100, Math.round(currentScore))),
          proposals: proposals.slice(0, 3),
        };
        setRewriteSession(session);
        setExpanded(true);
        onNotice?.("");
        return;
      }
      if (!payload.text) {
        onNotice?.(payload.error ?? (language === "bg" ? "AI заявката не успя." : "AI request failed."));
        return;
      }
      setUndoBeforeApply(value);
      onApply(payload.text);
      onNotice?.("");
    } catch {
      onNotice?.(language === "bg" ? "AI заявката не успя." : "AI request failed.");
    } finally {
      setBusy(null);
    }
  }, [
    value,
    language,
    limitValid,
    limitNumber,
    unit,
    budget,
    pathLabel,
    fieldLabel,
    templateId,
    storageKey,
    onApply,
    onNotice,
  ]);

  const ctxValue = useMemo<EditorFieldAiContextValue>(
    () => ({
      expanded,
      setExpanded,
      busy,
      unit,
      setUnit,
      limitInput,
      setLimitInput,
      budget,
      language,
      resolvedTheme,
      showSeparatorBelow,
      fieldLayout,
      rewriteSession,
      undoBeforeApply,
      runFieldAi,
      applyProposal,
      undoApply,
    }),
    [
      expanded,
      busy,
      unit,
      limitInput,
      budget,
      language,
      resolvedTheme,
      showSeparatorBelow,
      fieldLayout,
      rewriteSession,
      undoBeforeApply,
      runFieldAi,
      applyProposal,
      undoApply,
    ],
  );

  return <EditorFieldAiContext.Provider value={ctxValue}>{children}</EditorFieldAiContext.Provider>;
}

const fieldAiChromeOverlayClass =
  "pointer-events-none absolute inset-y-0 right-1 z-10 flex items-center justify-end";

const fieldAiScorePillClass =
  "flex h-5 min-w-[1.25rem] items-center justify-center rounded border border-[var(--line)] bg-[var(--surface-1)] px-1.5 text-[10px] font-bold leading-none tabular-nums";

/** Wraps a field input/textarea; adds score badge or undo control on the right, vertically centered. */
export function EditorFieldAiInputChrome({
  children,
  multiline = false,
}: {
  children: ReactNode;
  /** When true, keep badge top-aligned (multi-line textarea). */
  multiline?: boolean;
}): JSX.Element {
  const {
    busy,
    language,
    resolvedTheme,
    rewriteSession,
    undoBeforeApply,
    undoApply,
  } = useEditorFieldAiContext();

  const showScore =
    undoBeforeApply === null &&
    rewriteSession !== null &&
    busy !== "rewrite";
  const showUndo = undoBeforeApply !== null;

  const overlayClass = multiline
    ? "pointer-events-none absolute top-1 right-1 z-10 flex items-start justify-end"
    : fieldAiChromeOverlayClass;

  return (
    <div className="relative min-w-0">
      {children}
      {showUndo ? (
        <div className={overlayClass}>
          <button
            aria-label={language === "bg" ? "Отмени приложеното" : "Undo applied rewrite"}
            className={`${iconButtonClass} pointer-events-auto`}
            onClick={undoApply}
            title={language === "bg" ? "Върни предишния текст" : "Restore previous text"}
            type="button"
          >
            <UndoIcon />
          </button>
        </div>
      ) : showScore ? (
        <div className={overlayClass}>
          <span
            className={`${fieldAiScorePillClass} ${scoreTone(resolvedTheme, rewriteSession.currentScore)}`}
            title={language === "bg" ? "Оценка на текущия текст" : "Current wording score"}
          >
            {rewriteSession.currentScore}
          </span>
        </div>
      ) : null}
    </div>
  );
}

export function EditorFieldAiTrigger(): JSX.Element {
  const { expanded, setExpanded, language } = useEditorFieldAiContext();
  return (
    <button
      aria-expanded={expanded}
      aria-label={language === "bg" ? "AI инструменти за поле" : "AI field tools"}
      className={`${iconButtonClass} ${expanded ? "bg-[var(--surface-2)] ring-1 ring-[var(--line)]" : ""}`}
      onClick={() => setExpanded(!expanded)}
      title={language === "bg" ? "AI помощ" : "AI assist"}
      type="button"
    >
      <AiStarsIcon />
    </button>
  );
}

function EditorFieldAiProposals(): JSX.Element | null {
  const {
    busy,
    language,
    resolvedTheme,
    fieldLayout,
    rewriteSession,
    applyProposal,
  } = useEditorFieldAiContext();

  if (!rewriteSession && busy !== "rewrite") {
    return null;
  }

  const sorted = rewriteSession
    ? [...rewriteSession.proposals].sort((a, b) => b.confidence - a.confidence)
    : [];
  const proposalsClass =
    fieldLayout === "compact" ? EDITOR_FIELD_AI_PROPOSALS_CLASS : EDITOR_STACKED_FIELD_AI_PROPOSALS_CLASS;

  return (
    <div className={proposalsClass}>
      {busy === "rewrite" ? (
        <p className="text-xs text-[var(--ink-muted)]">
          {language === "bg" ? "Генериране на предложения..." : "Generating proposals..."}
        </p>
      ) : null}
      {rewriteSession ? (
        <>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--ink-muted)]">
        {language === "bg" ? "Предложения за пренаписване" : "Rewrite proposals"}
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
                {formatProposalCharacterCount(language, proposal.text.length)}
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

export function EditorFieldAiPanel(): JSX.Element | null {
  const {
    expanded,
    busy,
    unit,
    setUnit,
    limitInput,
    setLimitInput,
    budget,
    language,
    showSeparatorBelow,
    fieldLayout,
    runFieldAi,
  } = useEditorFieldAiContext();

  if (!expanded) {
    return null;
  }

  const limitNumber = Number(limitInput);
  const limitValid = Number.isFinite(limitNumber) && limitNumber > 0;
  const regionHint =
    budget.region === "sidebar"
      ? language === "bg"
        ? "странична колона"
        : "sidebar"
      : budget.region === "title"
        ? language === "bg"
          ? "заглавие"
          : "title"
        : language === "bg"
          ? "основно съдържание"
          : "main";

  const templateHint =
    language === "bg"
      ? `Шаблон (${regionHint}): ~${budget.charsPerLine} знака/ред`
      : `Template (${regionHint}): ~${budget.charsPerLine} chars/line`;

  const controls = (
    <div className="flex min-w-0 flex-wrap items-center gap-2">
      <button
        className={actionButtonClass}
        disabled={busy !== null}
        onClick={() => void runFieldAi("professional_rewrite")}
        type="button"
      >
        {busy === "rewrite"
          ? language === "bg"
            ? "Пренаписване..."
            : "Rewriting..."
          : language === "bg"
            ? "Професионално пренаписване"
            : "Professional Rewrite"}
      </button>
      <label className="inline-flex min-w-0 items-center gap-1 text-xs font-semibold text-slate-800">
        <span>{language === "bg" ? "Съкрати до" : "Shorten to"}</span>
        <input
          aria-label={language === "bg" ? "Лимит за съкращаване" : "Shorten limit"}
          className={shortenLimitInputClass}
          inputMode="numeric"
          maxLength={4}
          min={1}
          onChange={(event) => {
            const digits = event.target.value.replace(/\D/g, "").slice(0, 4);
            setLimitInput(digits);
          }}
          type="text"
          value={limitInput}
        />
        <select
          aria-label={language === "bg" ? "Единица за лимит" : "Limit unit"}
          className={shortenUnitSelectClass}
          onChange={(event) => {
            const next = event.target.value === "lines" ? "lines" : "characters";
            setUnit(next);
            setLimitInput(String(next === "lines" ? budget.defaultLineLimit : budget.defaultCharLimit));
          }}
          value={unit}
        >
          <option value="characters">{language === "bg" ? "зн." : "chars"}</option>
          <option value="lines">{language === "bg" ? "ред." : "lines"}</option>
        </select>
      </label>
      <button
        className={actionButtonClass}
        disabled={busy !== null || !limitValid}
        onClick={() => void runFieldAi("shorten")}
        type="button"
      >
        {busy === "shorten"
          ? language === "bg"
            ? "Съкращаване..."
            : "Shortening..."
          : language === "bg"
            ? "Съкрати"
            : "Shorten"}
      </button>
    </div>
  );

  const hint = (
    <p className="text-right text-[10px] leading-tight text-[var(--ink-muted)] whitespace-nowrap">
      {templateHint}
    </p>
  );

  const aiRowClass = fieldLayout === "compact" ? EDITOR_FIELD_AI_ROW_CLASS : EDITOR_STACKED_FIELD_AI_ROW_CLASS;
  const aiSeparatorWrapClass =
    fieldLayout === "compact" ? EDITOR_FIELD_AI_SEPARATOR_CLASS : EDITOR_STACKED_FIELD_AI_SEPARATOR_CLASS;
  const aiSeparatorLineClass =
    fieldLayout === "compact"
      ? EDITOR_FIELD_AI_SEPARATOR_LINE_CLASS
      : EDITOR_STACKED_FIELD_AI_SEPARATOR_LINE_CLASS;
  const separator = showSeparatorBelow ? (
    <div aria-hidden className={aiSeparatorWrapClass}>
      <div className={aiSeparatorLineClass} />
    </div>
  ) : null;

  const rowSpacing = fieldLayout === "compact" ? "" : "mt-2 pb-2";
  return (
    <>
      <div className={`${aiRowClass} ${rowSpacing}`}>
        {controls}
        {hint}
      </div>
      <EditorFieldAiProposals />
      {separator}
    </>
  );
}

/** @deprecated Use Provider + Trigger + Panel */
export function EditorFieldAiToolbar(props: EditorFieldAiProviderProps): JSX.Element {
  return (
    <EditorFieldAiProvider {...props}>
      <EditorFieldAiTrigger />
      <EditorFieldAiPanel />
    </EditorFieldAiProvider>
  );
}