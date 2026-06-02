"use client";

import type { JSX } from "react";

import {
  formatImageModelPricingBox,
  imageModelOptionLabel,
} from "@/lib/openrouter-image-pricing";
import {
  formatUsd,
  modelOptionLabel,
  type OpenRouterModelOption,
} from "./openrouter-utils";
import type { OpenRouterCreditResponse, OpenRouterSettingsResponse } from "./types";

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
  modelOptions: OpenRouterModelOption[];
  selectedAnalysisModelOption: OpenRouterModelOption | null;
  imageGenerationModelInput: string;
  onImageGenerationModelInputChange: (value: string) => void;
  imageGenerationModelOptions: OpenRouterModelOption[];
  selectedImageGenerationModelOption: OpenRouterModelOption | null;
  baseUrlInput: string;
  onBaseUrlInputChange: (value: string) => void;
  onSave: () => void;
};

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
    modelOptions,
    selectedAnalysisModelOption,
    imageGenerationModelInput,
    onImageGenerationModelInputChange,
    imageGenerationModelOptions,
    selectedImageGenerationModelOption,
    baseUrlInput,
    onBaseUrlInputChange,
    onSave,
  } = props;

  return (
    <div className="rounded-md border border-[var(--line)] bg-[var(--surface-1)] p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-slate-800">OpenRouter Settings</p>
        <button
          className="rounded-md border border-[var(--line)] bg-white px-2 py-1 text-xs font-semibold text-slate-700"
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
              className="mt-1 w-full rounded-md border border-[var(--line)] bg-white px-2 py-1.5 text-xs"
              onChange={(event) => onApiKeyInputChange(event.target.value)}
              placeholder={settings?.hasApiKey ? "Configured. Enter new key to replace." : "or-..."}
              type="password"
              value={apiKeyInput}
            />
          </label>
          <label className="block text-xs font-medium text-slate-700">
            Analysis Model
            <select
              className="mt-1 w-full rounded-md border border-[var(--line)] bg-white px-2 py-1.5 text-xs"
              onChange={(event) => onModelInputChange(event.target.value)}
              value={modelInput}
            >
              {!modelOptions.some((item) => item.id === modelInput) ? (
                <option value={modelInput}>{modelInput}</option>
              ) : null}
              {modelOptions.map((item) => (
                <option key={item.id} value={item.id}>
                  {modelOptionLabel(item)}
                </option>
              ))}
            </select>
          </label>
          <div className="rounded-md border border-[var(--line)] bg-white p-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
              Selected Analysis Model Pricing
            </p>
            <p className="mt-1 text-xs text-slate-700">
              {selectedAnalysisModelOption
                ? selectedAnalysisModelOption.isFree
                  ? "FREE model"
                  : `Input ${selectedAnalysisModelOption.promptPricePer1M !== null ? `${formatUsd(selectedAnalysisModelOption.promptPricePer1M)}/1M` : "N/A"} • Output ${selectedAnalysisModelOption.completionPricePer1M !== null ? `${formatUsd(selectedAnalysisModelOption.completionPricePer1M)}/1M` : "N/A"}`
                : "Model pricing unavailable."}
            </p>
          </div>
          <label className="block text-xs font-medium text-slate-700">
            Image Generation Model
            <select
              className="mt-1 w-full rounded-md border border-[var(--line)] bg-white px-2 py-1.5 text-xs"
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
            <p className="mt-1 text-[11px] text-slate-600">
              {selectedImageGenerationModelOption
                ? formatImageModelPricingBox({
                    isFree: selectedImageGenerationModelOption.isFree,
                    pricePerImageUsd: selectedImageGenerationModelOption.pricePerImageUsd ?? null,
                    pricePerImageMaxUsd: selectedImageGenerationModelOption.pricePerImageMaxUsd ?? null,
                    pricePerImageNote: selectedImageGenerationModelOption.pricePerImageNote ?? null,
                  })
                : "Not used yet. This is a future-facing selection."}
            </p>
          </label>
          <label className="block text-xs font-medium text-slate-700">
            Base URL
            <input
              className="mt-1 w-full rounded-md border border-[var(--line)] bg-white px-2 py-1.5 text-xs"
              onChange={(event) => onBaseUrlInputChange(event.target.value)}
              value={baseUrlInput}
            />
          </label>
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