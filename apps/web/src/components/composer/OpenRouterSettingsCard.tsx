"use client";

import { useMemo, type JSX, type ReactNode } from "react";

import {
  formatSelectedImageModelPricingLine,
  imageModelOptionLabel,
} from "@/lib/openrouter-image-pricing";
import {
  formatUsd,
  groupResearchModelOptions,
  modelOptionLabel,
  researchModelUsesWebSearch,
  type OpenRouterModelOption,
} from "./openrouter-utils";
import type { OpenRouterCreditResponse, OpenRouterSettingsResponse } from "./types";

const SETTINGS_CONTROL_CLASS =
  "mt-1.5 w-full rounded-md border border-[var(--line)] bg-[var(--surface-1)] px-2 py-1.5 text-xs text-slate-800";

export type OpenRouterSettingsCardProps = {
  settings: OpenRouterSettingsResponse | null;
  settingsLoading: boolean;
  settingsSaving: boolean;
  settingsNotice: string;
  creditStatus: OpenRouterCreditResponse | null;
  showAiSettings: boolean;
  onToggleShow: () => void;
  apiKeyInput: string;
  onApiKeyInputChange: (value: string) => void;
  modelInput: string;
  onModelInputChange: (value: string) => void;
  researchModelInput: string;
  onResearchModelInputChange: (value: string) => void;
  modelOptions: OpenRouterModelOption[];
  selectedAnalysisModelOption: OpenRouterModelOption | null;
  selectedResearchModelOption: OpenRouterModelOption | null;
  imageGenerationModelInput: string;
  onImageGenerationModelInputChange: (value: string) => void;
  imageGenerationModelOptions: OpenRouterModelOption[];
  selectedImageGenerationModelOption: OpenRouterModelOption | null;
  onSave: () => void;
};

function ModelPricingInline({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}): JSX.Element {
  return (
    <div className="mt-2 rounded-md border border-[var(--line)] bg-[var(--surface-1)] p-2">
      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">{title}</p>
      <div className="mt-1 text-xs text-slate-700">{children}</div>
    </div>
  );
}

function AiProviderModelSection({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}): JSX.Element {
  return (
    <section className="rounded-md border border-[var(--line)] bg-[var(--surface-1)] p-2.5">
      <p className="text-xs font-semibold text-slate-800">
        {title}
        {subtitle ? <span className="ml-1 font-normal text-slate-600">{subtitle}</span> : null}
      </p>
      <div className="mt-1">{children}</div>
    </section>
  );
}

function formatTokenPricing(model: OpenRouterModelOption | null): string {
  if (!model) {
    return "Model pricing unavailable.";
  }
  if (model.isFree) {
    return "FREE model";
  }
  const input =
    model.promptPricePer1M !== null ? `${formatUsd(model.promptPricePer1M)}/1M` : "N/A";
  const output =
    model.completionPricePer1M !== null ? `${formatUsd(model.completionPricePer1M)}/1M` : "N/A";
  return `Input ${input} • Output ${output}`;
}

export function OpenRouterSettingsCard(props: OpenRouterSettingsCardProps): JSX.Element {
  const {
    settings,
    settingsLoading,
    settingsSaving,
    settingsNotice,
    creditStatus,
    showAiSettings,
    onToggleShow,
    apiKeyInput,
    onApiKeyInputChange,
    modelInput,
    onModelInputChange,
    researchModelInput,
    onResearchModelInputChange,
    modelOptions,
    selectedAnalysisModelOption,
    selectedResearchModelOption,
    imageGenerationModelInput,
    onImageGenerationModelInputChange,
    imageGenerationModelOptions,
    selectedImageGenerationModelOption,
    onSave,
  } = props;

  const { recommended: researchRecommended, other: researchOther } = useMemo(
    () => groupResearchModelOptions(modelOptions),
    [modelOptions],
  );

  const researchWebSearchActive = researchModelUsesWebSearch(researchModelInput);

  const renderModelOptions = (items: OpenRouterModelOption[]) =>
    items.map((item) => (
      <option key={item.id} value={item.id}>
        {modelOptionLabel(item)}
      </option>
    ));

  return (
    <div className="rounded-md border border-[var(--line)] bg-[var(--surface-1)] p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-slate-800">OpenRouter Settings</p>
        <button
          className="rounded-md border border-[var(--line)] bg-[var(--surface-1)] px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-[var(--surface-2)]"
          onClick={onToggleShow}
          type="button"
        >
          {showAiSettings ? "Hide" : "Show"}
        </button>
      </div>
      <p
        className={`mt-1 break-all text-xs ${
          settings?.hasApiKey ? "font-semibold text-[var(--ink-muted)]" : "text-[var(--ink-muted)]"
        }`}
      >
        {settingsLoading
          ? "Loading..."
          : settings?.hasApiKey
            ? `OpenRouter API configured (${settings.apiKeyMasked})`
            : "No API key saved"}
      </p>

      {showAiSettings && (
        <div className="mt-3 space-y-2">
          <label className="block text-xs font-medium text-slate-700">
            API Key
            <input
              className={`${SETTINGS_CONTROL_CLASS} mt-1`}
              onChange={(event) => onApiKeyInputChange(event.target.value)}
              placeholder={settings?.hasApiKey ? "Configured. Enter new key to replace." : "or-..."}
              type="password"
              value={apiKeyInput}
            />
          </label>

          <AiProviderModelSection subtitle="CV scoring, rewrite, translate" title="Analysis Model">
            <select
              className={SETTINGS_CONTROL_CLASS}
              onChange={(event) => onModelInputChange(event.target.value)}
              value={modelInput}
            >
              {!modelOptions.some((item) => item.id === modelInput) ? (
                <option value={modelInput}>{modelInput}</option>
              ) : null}
              {renderModelOptions(modelOptions)}
            </select>
            <ModelPricingInline title="Selected Analysis Model Pricing">
              {formatTokenPricing(selectedAnalysisModelOption)}
            </ModelPricingInline>
          </AiProviderModelSection>

          <AiProviderModelSection subtitle="company/job catalog, field ✨" title="Research Model">
            <select
              className={SETTINGS_CONTROL_CLASS}
              onChange={(event) => onResearchModelInputChange(event.target.value)}
              value={researchModelInput}
            >
              {!modelOptions.some((item) => item.id === researchModelInput) ? (
                <option value={researchModelInput}>{researchModelInput}</option>
              ) : null}
              {researchRecommended.length > 0 ? (
                <optgroup label="Recommended — live web search (LinkedIn-first)">
                  {renderModelOptions(researchRecommended)}
                </optgroup>
              ) : null}
              {researchOther.length > 0 ? (
                <optgroup label="Other models (may use :online web plugin)">
                  {renderModelOptions(researchOther)}
                </optgroup>
              ) : null}
            </select>
            <p className="mt-2 text-[11px] leading-snug text-slate-600">
              Research tab and field ✨. Prefer Perplexity Sonar; others use :online web search.
            </p>
            <p
              className={`mt-1.5 text-[11px] font-semibold ${
                researchWebSearchActive ? "text-emerald-800" : "text-amber-800"
              }`}
            >
              {researchWebSearchActive
                ? "Live web search: enabled for this model"
                : "Live web search: will use :online plugin fallback"}
            </p>
            <ModelPricingInline title="Selected Research Model Pricing">
              {selectedResearchModelOption ? (
                <span className="block font-medium text-slate-800">
                  {modelOptionLabel(selectedResearchModelOption)}
                </span>
              ) : null}
              {formatTokenPricing(selectedResearchModelOption)}
            </ModelPricingInline>
          </AiProviderModelSection>

          <AiProviderModelSection subtitle="CV photo booth" title="Image Generation Model">
            <select
              className={SETTINGS_CONTROL_CLASS}
              onChange={(event) => onImageGenerationModelInputChange(event.target.value)}
              value={imageGenerationModelInput}
            >
              {imageGenerationModelOptions.length === 0 ? (
                <option value="">No image generation models in current catalog</option>
              ) : null}
              {imageGenerationModelOptions.map((item) => (
                <option key={item.id} value={item.id}>
                  {imageModelOptionLabel(item)}
                </option>
              ))}
            </select>
            <ModelPricingInline title="Selected Image Model Pricing">
              {selectedImageGenerationModelOption
                ? formatSelectedImageModelPricingLine({
                    isFree: selectedImageGenerationModelOption.isFree,
                    pricePerImageUsd: selectedImageGenerationModelOption.pricePerImageUsd ?? null,
                    pricePerImageMaxUsd: selectedImageGenerationModelOption.pricePerImageMaxUsd ?? null,
                    pricePerImageNote: selectedImageGenerationModelOption.pricePerImageNote ?? null,
                  })
                : "Model pricing unavailable."}
            </ModelPricingInline>
          </AiProviderModelSection>

          <button
            className="rounded-md bg-[var(--accent)] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
            disabled={settingsSaving}
            onClick={onSave}
            type="button"
          >
            Save Settings
          </button>
          {settingsNotice ? <p className="text-xs text-[var(--ink-muted)]">{settingsNotice}</p> : null}
        </div>
      )}
      <p className="mt-2 text-xs text-[var(--ink-muted)]">
        {creditStatus?.label ?? "OpenRouter credit: checking..."}
      </p>
    </div>
  );
}