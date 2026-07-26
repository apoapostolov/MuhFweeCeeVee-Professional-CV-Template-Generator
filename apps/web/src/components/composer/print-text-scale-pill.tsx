"use client";

import { useEffect, useState, type JSX } from "react";

import {
  clampPrintTextScale,
  PRINT_TEXT_SCALE_MAX,
  PRINT_TEXT_SCALE_MIN,
  PRINT_TEXT_SCALE_STEP,
} from "./constants";

export function stepPrintTextScale(current: number, direction: -1 | 1): number {
  const next = current + direction * PRINT_TEXT_SCALE_STEP;
  if (direction < 0) {
    return Math.max(PRINT_TEXT_SCALE_MIN, next);
  }
  return Math.min(PRINT_TEXT_SCALE_MAX, next);
}

export type PrintTextScaleRowProps = {
  label: string;
  enabled: boolean;
  value: number;
  rowDisabled?: boolean;
  disabledTitle?: string;
  onEnabledChange: (enabled: boolean) => void;
  onValueChange: (value: number) => void;
  onStep: (direction: -1 | 1) => void;
};

export function PrintTextScaleRow({
  label,
  enabled,
  value,
  rowDisabled = false,
  disabledTitle,
  onEnabledChange,
  onValueChange,
  onStep,
}: PrintTextScaleRowProps): JSX.Element {
  const [draft, setDraft] = useState(String(value));

  useEffect(() => {
    setDraft(String(value));
  }, [value]);

  const controlDisabled = rowDisabled || !enabled;
  const atMin = value <= PRINT_TEXT_SCALE_MIN;
  const atMax = value >= PRINT_TEXT_SCALE_MAX;

  function commitDraft(raw: string): void {
    const parsed = Number(raw.replace(/%/g, "").trim());
    onValueChange(clampPrintTextScale(parsed));
  }

  return (
    <div
      className={`flex min-w-0 flex-wrap items-center justify-between gap-x-2 gap-y-1 ${rowDisabled ? "cursor-not-allowed opacity-50" : ""}`}
      title={disabledTitle}
    >
      <label
        className={`flex min-w-0 flex-1 items-center gap-2 text-sm text-slate-800 ${rowDisabled ? "cursor-not-allowed" : "cursor-pointer"}`}
      >
        <input
          checked={enabled}
          className="h-4 w-4 shrink-0 rounded border-[var(--line)] accent-[var(--accent)]"
          disabled={rowDisabled ? true : undefined}
          onChange={(event) => onEnabledChange(event.target.checked)}
          type="checkbox"
        />
        <span className="min-w-0 truncate">{label}</span>
      </label>

      <div
        aria-label={`${label}: ${value}%`}
        className="inline-flex shrink-0 overflow-hidden rounded-full border border-[var(--line)] bg-[var(--surface-1)] text-xs font-semibold"
        role="group"
      >
        <button
          aria-label={`Decrease ${label}`}
          className="px-1.5 py-0.5 text-slate-800 hover:bg-[var(--surface-2)] disabled:cursor-not-allowed disabled:opacity-40"
          disabled={controlDisabled || atMin ? true : undefined}
          onClick={() => onStep(-1)}
          type="button"
        >
          −
        </button>
        <span className="flex items-center border-x border-[var(--line)] bg-[var(--surface-1)]">
          <input
            aria-label={`${label} percent`}
            className="w-9 bg-transparent px-0.5 py-0.5 text-center tabular-nums text-slate-800 disabled:cursor-not-allowed disabled:opacity-40 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            disabled={controlDisabled ? true : undefined}
            inputMode="numeric"
            max={PRINT_TEXT_SCALE_MAX}
            min={PRINT_TEXT_SCALE_MIN}
            onBlur={() => commitDraft(draft)}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                commitDraft(draft);
                (event.target as HTMLInputElement).blur();
              }
            }}
            type="number"
            value={draft}
          />
          <span className="pr-1 text-[10px] text-[var(--ink-muted)]">%</span>
        </span>
        <button
          aria-label={`Increase ${label}`}
          className="px-1.5 py-0.5 text-slate-800 hover:bg-[var(--surface-2)] disabled:cursor-not-allowed disabled:opacity-40"
          disabled={controlDisabled || atMax ? true : undefined}
          onClick={() => onStep(1)}
          type="button"
        >
          +
        </button>
      </div>
    </div>
  );
}