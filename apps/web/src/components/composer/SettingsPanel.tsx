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
          <p className="text-sm font-semibold text-slate-800">
            {bg ? "Приблизителна цена на проверка" : "Approximate Cost per Check"}
          </p>
          <p className="mt-1 text-[11px] text-slate-600">
            {bg
              ? "Груби токени и USD според размера на CV и тарифите на OpenRouter. Редовете за проучване на компания/позиция използват Research модела по-горе (живо търсене). Реалните разходи може да се различават."
              : "Rough tokens and USD from CV size and selected model rates. Research company/job lines use the selected Research model (live web search). Actual spend may differ."}
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