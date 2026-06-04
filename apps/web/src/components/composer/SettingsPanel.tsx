"use client";

import type { JSX } from "react";

import { SettingsDataBackupCard } from "./SettingsDataBackupCard";
import { OpenRouterSettingsCard, type OpenRouterSettingsCardProps } from "./OpenRouterSettingsCard";
import { formatUsd, type AnalysisCostEstimate } from "./openrouter-utils";

export type SettingsPanelProps = OpenRouterSettingsCardProps & {
  analysisCostEstimate: AnalysisCostEstimate;
};

const SETTINGS_COLUMN_CLASS =
  "flex min-h-0 min-w-0 flex-col overflow-auto rounded-xl border border-[var(--line)] bg-white p-4";

function CostEstimateCard({
  label,
  inputTokens,
  outputTokens,
  cost,
}: {
  label: string;
  inputTokens: number;
  outputTokens: number;
  cost: number | null;
}): JSX.Element {
  return (
    <div className="rounded-md border border-[var(--line)] bg-white p-2">
      <p className="text-xs font-semibold text-slate-900">{label}</p>
      <p className="mt-1 text-[11px] text-slate-600">
        Input ~{inputTokens.toLocaleString()} tok • Output ~{outputTokens.toLocaleString()} tok
      </p>
      <p className="mt-1 text-xs font-semibold text-slate-800">
        {cost === null ? "Estimated cost: N/A" : `Estimated cost: ${formatUsd(cost)}`}
      </p>
    </div>
  );
}

export function SettingsPanel(props: SettingsPanelProps): JSX.Element {
  const { analysisCostEstimate, creditStatus, ...cardProps } = props;

  return (
    <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 overflow-y-auto md:grid-cols-2 lg:grid-cols-4 lg:overflow-hidden">
        <article className={`${SETTINGS_COLUMN_CLASS} lg:overflow-hidden`}>
          <SettingsDataBackupCard />
        </article>

        <article className={SETTINGS_COLUMN_CLASS}>
          <h2 className="text-xl font-bold text-slate-900">AI Provider</h2>
          <p className="mt-2 text-sm text-[var(--ink-muted)]">
            Configure external model access and monitor remaining OpenRouter credit.
          </p>
          <div className="mt-4">
            <OpenRouterSettingsCard {...cardProps} creditStatus={creditStatus} />
          </div>
          <div className="mt-4 rounded-md border border-[var(--line)] bg-[var(--surface-1)] p-3">
            <p className="text-sm font-semibold text-slate-800">Approximate Cost per Check</p>
            <p className="mt-1 text-[11px] text-slate-600">
              Rough tokens and USD from CV size and OpenRouter model rates; Research company/job lines
              use the web-research model (Perplexity Sonar by default). Actual spend may differ.
            </p>
            <div className="mt-2 grid gap-2">
              {analysisCostEstimate.lines.map((line) => (
                <CostEstimateCard
                  key={line.label}
                  cost={line.cost}
                  inputTokens={line.inputTokens}
                  label={line.label}
                  outputTokens={line.outputTokens}
                />
              ))}
            </div>
          </div>
        </article>

        <article
          aria-hidden
          className={`${SETTINGS_COLUMN_CLASS} hidden bg-[var(--surface-1)] lg:flex`}
        />
        <article
          aria-hidden
          className={`${SETTINGS_COLUMN_CLASS} hidden bg-[var(--surface-1)] lg:flex`}
        />
    </div>
  );
}