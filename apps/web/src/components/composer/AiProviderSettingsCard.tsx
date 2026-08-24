"use client";

import { useState, type JSX } from "react";

import type { AiProviderStatus, AiQuota, AiRole } from "@/lib/server/aiProviderTypes";
import type { useAiProviderSettings } from "./useAiProviderSettings";
import type { UiLanguageCode } from "./ui-language";

const CONTROL_CLASS =
  "w-full rounded-md border border-[var(--line)] bg-[var(--surface-1)] px-2 py-1.5 text-xs text-slate-800";

const ROLE_LABELS: Record<AiRole, [string, string]> = {
  assistant: ["Assistant", "Асистент"],
  analysis: ["Analysis", "Анализ"],
  research: ["Research", "Проучване"],
  vision: ["Vision", "Визия"],
  translation: ["Translation", "Превод"],
  "field-rewrite": ["Field rewrite", "Преписване на поле"],
  "image-generation": ["Image generation", "Генериране на изображения"],
};

type Controller = ReturnType<typeof useAiProviderSettings>;

export type AiProviderSettingsCardProps = {
  controller: Controller;
  uiLanguage: UiLanguageCode;
};

function roleLabel(role: AiRole, language: UiLanguageCode): string {
  return ROLE_LABELS[role][language === "bg" ? 1 : 0];
}

function thinkingLabel(level: string): string {
  const normalized = level.trim().toLowerCase();
  if (normalized === "none") return "None";
  if (normalized === "xhigh") return "Very High";
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function StatusLine({ provider }: { provider: AiProviderStatus }): JSX.Element {
  const status = provider.kind === "local"
    ? provider.connected ? "Connected" : provider.endpoint ? "Endpoint unavailable" : "Endpoint not configured"
    : provider.auth === "oauth"
      ? provider.connected ? "Connected" : "Not connected"
      : provider.configured ? "Configured" : "Not configured";
  return (
    <span className={provider.configured ? "text-emerald-700" : "text-slate-500"}>
      {status}
      {provider.apiKeyMasked ? ` · ${provider.apiKeyMasked}` : ""}
    </span>
  );
}

function ProviderQuota({ quotas }: { quotas: AiQuota[] }): JSX.Element | null {
  const creditQuota = quotas.find((quota) => quota.unit === "USD");
  const ratioQuota = quotas
    .filter((quota) => (quota.period === "weekly" || quota.period === "monthly") && quota.limit !== null && quota.limit > 0 && quota.remaining !== null)
    .map((quota) => ({ quota, ratio: Math.max(0, Math.min(1, (quota.remaining ?? 0) / (quota.limit ?? 1))) }))
    .sort((a, b) => b.ratio - a.ratio)[0];
  if (!creditQuota && !ratioQuota) return null;
  if (creditQuota && !ratioQuota) {
    return (
      <div className="mt-3 flex w-full items-center justify-between px-1 text-xs font-semibold tabular-nums" title={creditQuota.label}>
        <span className="text-slate-700">Available credit</span>
        <span className="text-emerald-700">{creditQuota.remaining === null ? "$—" : `$${creditQuota.remaining.toFixed(2)}`}</span>
      </div>
    );
  }
  const percent = Math.round((ratioQuota?.ratio ?? 0) * 100);
  const period = ratioQuota?.quota.period === "monthly" ? "Monthly" : "Weekly";
  const progressBackground = percent < 80
    ? "var(--quota-fill)"
    : "var(--quota-gradient)";
  return (
    <div className="mt-3 w-full text-[11px] text-slate-800" title={ratioQuota?.quota.label}>
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span className="font-medium text-slate-700">{period} quota</span>
        <span className="font-bold tabular-nums text-slate-800">{percent}% remaining</span>
      </div>
      <div aria-label={`${period} quota: ${percent}% remaining`} className="h-2 w-full overflow-hidden rounded-full bg-[var(--quota-track)]" role="progressbar" aria-valuemax={100} aria-valuemin={0} aria-valuenow={percent}>
        <div className="h-full rounded-full transition-[width] duration-500" style={{ background: progressBackground, width: `${percent}%` }} />
      </div>
    </div>
  );
}

function ReloadIcon(): JSX.Element {
  return (
    <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
      <path d="M20 11a8 8 0 0 0-14.7-4L4 9m0 0V4m0 5h5M4 13a8 8 0 0 0 14.7 4L20 15m0 0v5m0-5h-5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" />
    </svg>
  );
}

function ProviderBlock({
  provider,
  controller,
  uiLanguage,
}: {
  provider: AiProviderStatus;
  controller: Controller;
  uiLanguage: UiLanguageCode;
}): JSX.Element {
  const models = controller.models.filter((model) => model.providerId === provider.id);
  const block = controller.blocks.find((item) => item.providerId === provider.id);
  const isBg = uiLanguage === "bg";
  const assignedRoles = block?.roles ?? [];
  const roleNames = assignedRoles.map((role) => roleLabel(role, uiLanguage)).join(", ");
  const quotas = controller.aiSettings?.quotas.filter((quota) => quota.providerId === provider.id) ?? [];

  return (
    <section className="rounded-md border border-[var(--line)] bg-[var(--surface-1)] p-3">
      <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold text-slate-900">{provider.name}</h3>
          <p className="mt-0.5 text-[11px]"><StatusLine provider={provider} /></p>
        </div>
        {controller.oauthCode?.providerId === provider.id ? (
          <div className="flex items-center justify-center gap-1.5">
            <code className="rounded border border-[var(--line)] bg-[var(--surface-2)] px-2 py-1 text-xs font-semibold tracking-widest text-[var(--ink)]">{controller.oauthCode.value}</code>
            <button
              aria-label={controller.oauthCodeCopiedProviderId === provider.id ? "OAuth login code copied" : "Copy OAuth login code"}
              className="inline-flex h-7 w-7 items-center justify-center border-0 text-[var(--ink-muted)] hover:text-[var(--ink)]"
              onClick={() => void controller.copyOAuthCode(provider.id, controller.oauthCode?.value ?? "")}
              title={controller.oauthCodeCopiedProviderId === provider.id ? "Copied" : "Copy OAuth login code"}
              type="button"
            >
              {controller.oauthCodeCopiedProviderId === provider.id ? "✓" : "⧉"}
            </button>
          </div>
        ) : <span />}
        <div className="flex items-center justify-end gap-1">
          {provider.auth === "oauth" ? (
            <button
              className={provider.connected
                ? "rounded-md border border-[var(--line)] bg-[var(--surface-2)] px-2.5 py-1.5 text-[11px] font-semibold text-[var(--ink)] disabled:opacity-50"
                : "rounded-md bg-[var(--accent)] px-2.5 py-1.5 text-[11px] font-semibold text-white disabled:opacity-50"}
              disabled={controller.saving || controller.oauthActionProviderId === provider.id}
              onClick={() => void (provider.connected ? controller.disconnectOAuth(provider) : controller.openOAuthLogin(provider))}
              type="button"
            >
              {provider.connected ? (isBg ? "Прекъсни" : "Disconnect") : (isBg ? "Свържи" : "Connect")}
            </button>
          ) : null}
          <button
            aria-label={isBg ? `Премахни ${provider.name}` : `Remove ${provider.name}`}
            className="inline-flex h-7 w-7 items-center justify-center rounded border border-transparent text-sm text-slate-500 hover:border-red-300 hover:bg-red-50 hover:text-red-700"
            disabled={assignedRoles.length > 0}
            onClick={() => {
              if (window.confirm(isBg ? `Премахване на ${provider.name}?` : `Remove ${provider.name} from AI providers?`)) controller.removeProvider(provider.id);
            }}
            title={assignedRoles.length > 0 ? "Remove role assignments first" : "Remove provider"}
            type="button"
          >
            ×
          </button>
        </div>
      </div>
      {provider.kind === "local" ? (
        <div className="mt-3 flex items-end gap-2">
          <label className="min-w-0 flex-1 text-[11px] font-medium text-slate-700">
            {isBg ? "URL на endpoint" : "Endpoint URL"}
            <input
              className={`${CONTROL_CLASS} mt-1`}
              onChange={(event) => controller.setEndpointInput(provider.id, event.target.value)}
              placeholder="http://127.0.0.1:11434/v1"
              type="url"
              value={controller.endpointInputs[provider.id] ?? provider.endpoint ?? ""}
            />
          </label>
          <button
            className="rounded-md bg-[var(--accent)] px-2.5 py-1.5 text-[11px] font-semibold text-white disabled:opacity-50"
            disabled={!controller.endpointInputs[provider.id]?.trim() || controller.saving}
            onClick={() => void controller.saveEndpoint(provider.id)}
            type="button"
          >
            {isBg ? "Запази" : "Save URL"}
          </button>
        </div>
      ) : <ProviderQuota quotas={quotas} />}

      {provider.auth === "api_key" ? (
        <div className="mt-3 flex items-end gap-2">
          <label className="min-w-0 flex-1 text-[11px] font-medium text-slate-700">
            API key
            <input
              className={`${CONTROL_CLASS} mt-1`}
              onChange={(event) => controller.setApiKeyInput(provider.id, event.target.value)}
              placeholder={provider.apiKeyMasked ? "Configured. Enter new key to replace." : "Paste API key"}
              type="password"
              value={controller.apiKeyInputs[provider.id] ?? ""}
            />
          </label>
          <button
            className="rounded-md bg-[var(--accent)] px-2.5 py-1.5 text-[11px] font-semibold text-white disabled:opacity-50"
            disabled={!controller.apiKeyInputs[provider.id]?.trim() || controller.saving}
            onClick={() => void controller.saveApiKey(provider.id)}
            type="button"
          >
            Save key
          </button>
        </div>
      ) : null}

      <div className="mt-3 flex items-end gap-1.5">
        <label className="min-w-0 flex-[2_2_0%] text-[11px] font-medium text-slate-700">
          {isBg ? "Модел" : "Model"}
          <select
            className={`${CONTROL_CLASS} mt-1`}
            disabled={models.length === 0}
            onChange={(event) => controller.setModel(provider.id, event.target.value)}
            value={block?.modelId ?? ""}
          >
            {models.length === 0 ? <option value="">Reload models to choose</option> : null}
            {!models.some((model) => model.id === block?.modelId) && block?.modelId ? (
              <option value={block.modelId}>{block.modelId}</option>
            ) : null}
            {models.map((model) => (
              <option key={model.id} value={model.id}>{model.name}</option>
            ))}
          </select>
        </label>
        <label className="min-w-0 flex-[1_1_0%] text-[11px] font-medium text-slate-700">
          {isBg ? "Мислене" : "Thinking"}
          <select
            className={`${CONTROL_CLASS} mt-1`}
            disabled={!block?.modelId}
            onChange={(event) => controller.setThinking(provider.id, event.target.value)}
            value={controller.selectedThinking[provider.id] ?? "none"}
          >
            <option value="none">None</option>
            {(models.find((model) => model.id === block?.modelId)?.thinkingLevels ?? []).map((level) => (
              <option key={level} value={level}>{thinkingLabel(level)}</option>
            ))}
          </select>
        </label>
        <button
          aria-label={isBg ? `Обнови моделите за ${provider.name}` : `Reload ${provider.name} models`}
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center text-slate-600 hover:text-slate-950 disabled:opacity-40"
          disabled={controller.reloadingProviderId === provider.id}
          onClick={() => void controller.reloadProvider(provider.id)}
          title={isBg ? "Обнови моделите" : "Reload models"}
          type="button"
        >
          <span className={`${controller.reloadingProviderId === provider.id ? "animate-spin" : ""} ${controller.reloadedProviderId === provider.id ? "text-emerald-500" : ""}`}><ReloadIcon /></span>
        </button>
      </div>

      <fieldset className="mt-3 rounded-md border border-[var(--line)] p-2">
        <legend className="px-1 text-[11px] font-semibold text-slate-700">{isBg ? "Роли" : "Roles"}</legend>
        <div className="grid gap-1 sm:grid-cols-2">
          {controller.roles.map((role) => (
            <label className="inline-flex items-center gap-1.5 text-[11px] text-slate-700" key={role}>
              <input
                checked={assignedRoles.includes(role)}
                disabled={!block?.modelId || controller.saving}
                onChange={() => void controller.toggleRole(provider.id, role)}
                className="accent-[var(--accent)]"
                type="checkbox"
              />
              {roleLabel(role, uiLanguage)}
            </label>
          ))}
        </div>
        <p className="mt-2 text-[10px] text-slate-500">
          {roleNames || (isBg ? "Няма зададени роли" : "No roles assigned")}
        </p>
      </fieldset>
    </section>
  );
}

export function AiProviderSettingsCard({ controller, uiLanguage }: AiProviderSettingsCardProps): JSX.Element {
  const isBg = uiLanguage === "bg";
  const selectedIds = new Set(controller.blocks.map((block) => block.providerId));
  const availableProviders = controller.providers.filter((provider) => !selectedIds.has(provider.id));
  const [selectedProviderId, setSelectedProviderId] = useState("");

  return (
    <div className="space-y-3 rounded-md border border-[var(--line)] bg-[var(--surface-1)] p-3">
      <div className="flex items-end gap-1.5">
        <label className="min-w-0 flex-1 text-xs font-medium text-slate-700">
          {isBg ? "Добави доставчик" : "Select Provider"}
          <select
            className={`${CONTROL_CLASS} mt-1`}
            onChange={(event) => setSelectedProviderId(event.target.value)}
            value={selectedProviderId}
          >
            <option value="">{isBg ? "Избери доставчик…" : "Choose a provider…"}</option>
            {availableProviders.map((provider) => <option key={provider.id} value={provider.id}>{provider.name}</option>)}
          </select>
        </label>
        <button
          aria-label={isBg ? "Добави доставчик" : "Add provider"}
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center text-lg font-light text-slate-700 hover:text-slate-950"
          disabled={!selectedProviderId}
          onClick={() => {
            controller.addProvider(selectedProviderId);
            setSelectedProviderId("");
          }}
          title={isBg ? "Добави доставчик" : "Add provider"}
          type="button"
        >
          +
        </button>
      </div>
      {controller.blocks.length > 0 ? (
        <p className="text-[11px] text-slate-600">
          {isBg ? "Всеки доставчик пази отделен списък модели и роли." : "Each provider has its own cached models and roles."}
        </p>
      ) : null}
      {controller.loading ? <p className="text-xs text-slate-600">Loading AI providers…</p> : null}
      {controller.blocks.map((block) => {
        const provider = controller.providers.find((item) => item.id === block.providerId);
        return provider ? <ProviderBlock controller={controller} key={provider.id} provider={provider} uiLanguage={uiLanguage} /> : null;
      })}
      {controller.notice ? <p className="text-xs text-[var(--ink-muted)]">{controller.notice}</p> : null}

    </div>
  );
}
