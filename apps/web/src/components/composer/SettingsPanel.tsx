"use client";

import type { JSX } from "react";

import { OpenRouterSettingsCard, type OpenRouterSettingsCardProps } from "./OpenRouterSettingsCard";
import { formatUsd, type AnalysisCostEstimate } from "./openrouter-utils";

export type SettingsPanelProps = OpenRouterSettingsCardProps & {
  analysisCostEstimate: AnalysisCostEstimate;
};

export function SettingsPanel(props: SettingsPanelProps): JSX.Element {
  const { analysisCostEstimate, creditStatus, ...cardProps } = props;

  return (
    <div className="grid min-h-0 flex-1 gap-4 md:grid-cols-[340px_1fr]">
      <article className="min-h-0 overflow-auto rounded-xl border border-[var(--line)] bg-white p-4">
        <h2 className="text-xl font-bold text-slate-900">Settings</h2>
        <p className="mt-2 text-sm text-[var(--ink-muted)]">
          Configure external model access and monitor remaining OpenRouter credit.
        </p>
        <div className="mt-4">
          <OpenRouterSettingsCard {...cardProps} creditStatus={creditStatus} />
        </div>
        <div className="mt-4 rounded-md border border-[var(--line)] bg-[var(--surface-1)] p-3">
          <p className="text-sm font-semibold text-slate-800">Approximate Cost per Check</p>
          <p className="mt-2 text-xs leading-relaxed text-[var(--ink-muted)]">
            Typical OpenRouter cost with the selected analysis model: CV analysis{" "}
            {analysisCostEstimate.analysisCost === null
              ? "n/a"
              : formatUsd(analysisCostEstimate.analysisCost)}
            , one photo{" "}
            {analysisCostEstimate.photoAnalysisCost === null
              ? "n/a"
              : formatUsd(analysisCostEstimate.photoAnalysisCost)}
            , two-photo compare{" "}
            {analysisCostEstimate.photoComparisonCost === null
              ? "n/a"
              : formatUsd(analysisCostEstimate.photoComparisonCost)}
            . Actual spend depends on CV length and model.
          </p>
        </div>
      </article>
      <article className="min-h-0 overflow-auto rounded-xl border border-[var(--line)] bg-[#fcfcfd] p-5">
        <div className="rounded-lg border border-[var(--line)] bg-white p-4">
          <p className="text-sm font-semibold text-slate-900">OpenRouter Status</p>
          <p className="mt-2 text-xs text-[var(--ink-muted)]">
            Tab indicator reflects configuration state, runtime errors, and latest remaining credit.
          </p>
          <p className="mt-2 text-xs text-[var(--ink-muted)]">
            {creditStatus?.label ?? "OpenRouter credit: checking..."}
          </p>
        </div>
      </article>
    </div>
  );
}