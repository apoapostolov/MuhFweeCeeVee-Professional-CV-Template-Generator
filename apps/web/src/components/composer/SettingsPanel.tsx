"use client";

import type { JSX } from "react";

import { SettingsDataBackupCard } from "./SettingsDataBackupCard";
import { SettingsInterfaceLanguageCard } from "./SettingsInterfaceLanguageCard";
import { AiProviderSettingsCard } from "./AiProviderSettingsCard";
import type { useAiProviderSettings } from "./useAiProviderSettings";
import { formatUsd, type AnalysisCostEstimate } from "./openrouter-utils";
import { uiIsBg, type UiLanguageCode } from "./ui-language";

export type SettingsPanelProps = {
  analysisCostEstimate: AnalysisCostEstimate;
  aiProviders: ReturnType<typeof useAiProviderSettings>;
  uiLanguage: UiLanguageCode;
  onUiLanguageChange: (language: UiLanguageCode) => void;
};

const SETTINGS_COLUMN_CLASS =
  "flex min-h-0 min-w-0 flex-col overflow-auto rounded-xl border border-[var(--line)] bg-white p-4";

function RefreshIcon(): JSX.Element {
  return (
    <svg aria-hidden="true" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24">
      <path d="M20 11a8 8 0 0 0-14.7-4L4 9m0 0V4m0 5h5M4 13a8 8 0 0 0 14.7 4L20 15m0 0v5m0-5h-5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
    </svg>
  );
}

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
  const { analysisCostEstimate, aiProviders, uiLanguage, onUiLanguageChange } = props;
  const bg = uiIsBg(uiLanguage);

  return (
    <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 overflow-y-auto md:grid-cols-2 lg:grid-cols-4 lg:overflow-hidden">
      <article className={SETTINGS_COLUMN_CLASS}>
        <SettingsInterfaceLanguageCard
          onUiLanguageChange={onUiLanguageChange}
          uiLanguage={uiLanguage}
        />
      </article>

      <article className={`${SETTINGS_COLUMN_CLASS} lg:overflow-hidden`}>
        <SettingsDataBackupCard />
      </article>

      <article className={SETTINGS_COLUMN_CLASS}>
        <h2 className="text-xl font-bold text-slate-900">{bg ? "AI доставчик" : "AI Provider"}</h2>
        <p className="mt-2 text-sm text-[var(--ink-muted)]">
          {bg
            ? "Добавяйте доставчици, пазете ключове, презареждайте модели и задавайте роли."
            : "Add providers, save credentials, reload cached models, and assign AI roles."}
        </p>
        <div className="mt-4">
          <AiProviderSettingsCard controller={aiProviders} uiLanguage={uiLanguage} />
        </div>
        <div className="mt-4 rounded-md border border-[var(--line)] bg-[var(--surface-1)] p-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-slate-800">
              {bg ? "Приблизителна цена на проверка" : "Approximate Cost per Check"}
            </p>
            <button
              aria-label={bg ? "Обнови цените на моделите" : "Refresh model pricing"}
              className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded border border-[var(--line)] text-slate-600 hover:bg-slate-50 hover:text-slate-950 disabled:opacity-40"
              disabled={aiProviders.modelPricingLoading}
              onClick={() => void aiProviders.refreshModelPricing()}
              title={bg ? "Обнови цените на моделите" : "Refresh model pricing"}
              type="button"
            >
              <span className={aiProviders.modelPricingLoading ? "animate-spin" : ""}><RefreshIcon /></span>
            </button>
          </div>
          <p className="mt-1 text-[11px] text-slate-600">
            {bg
              ? "Груби токени и USD според размера на CV и цените на избраните модели от models.dev. Редовете за проучване използват Research модела. Реалните разходи може да се различават."
              : "Rough tokens and USD from the selected models' prices on models.dev. Research lines use the selected Research model. Actual spend may differ."}
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
    </div>
  );
}