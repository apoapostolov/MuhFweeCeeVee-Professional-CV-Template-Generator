"use client";

import { useState, type JSX } from "react";

import type { AiProviderStatus, AiRole } from "@/lib/server/aiProviderTypes";
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

function StatusLine({ provider }: { provider: AiProviderStatus }): JSX.Element {
  const status = provider.auth === "oauth"
    ? provider.connected ? "Connected" : "Not connected"
    : provider.configured ? "Configured" : "Not configured";
  return (
    <span className={provider.configured ? "text-emerald-700" : "text-slate-500"}>
      {status}
      {provider.apiKeyMasked ? ` · ${provider.apiKeyMasked}` : ""}
    </span>
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

  return (
    <section className="rounded-md border border-[var(--line)] bg-[var(--surface-1)] p-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">{provider.name}</h3>
          <p className="mt-0.5 text-[11px]">
            <StatusLine provider={provider} />
          </p>
        </div>
        <button
          aria-label={isBg ? `Премахни ${provider.name}` : `Remove ${provider.name}`}
          className="inline-flex h-6 w-6 items-center justify-center text-sm text-slate-500 hover:text-slate-900"
          disabled={assignedRoles.length > 0}
          onClick={() => controller.removeProvider(provider.id)}
          title={assignedRoles.length > 0 ? "Remove role assignments first" : "Remove provider"}
          type="button"
        >
          ×
        </button>
      </div>

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
      ) : provider.auth === "oauth" ? (
        <div className="mt-3 flex items-center gap-2">
          <button
            className={provider.connected
              ? "rounded-md border border-[var(--line)] bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-800 disabled:opacity-50"
              : "rounded-md bg-[var(--accent)] px-2.5 py-1.5 text-[11px] font-semibold text-white disabled:opacity-50"}
            disabled={controller.saving || controller.oauthActionProviderId === provider.id}
            onClick={() => void (provider.connected ? controller.disconnectOAuth(provider) : controller.openOAuthLogin(provider))}
            type="button"
          >
            {provider.connected ? "Disconnect" : "Log in with OAuth"}
          </button>
          {controller.oauthCode?.providerId === provider.id ? (
            <>
              <code className="rounded border border-[var(--line)] bg-white px-2 py-1 text-xs font-semibold tracking-widest text-slate-900">{controller.oauthCode.value}</code>
              <button
                aria-label={controller.oauthCodeCopiedProviderId === provider.id ? "OAuth login code copied" : "Copy OAuth login code"}
                className="inline-flex h-7 w-7 items-center justify-center border-0 text-slate-600 hover:text-slate-950"
                onClick={() => void controller.copyOAuthCode(provider.id, controller.oauthCode?.value ?? "")}
                title={controller.oauthCodeCopiedProviderId === provider.id ? "Copied" : "Copy OAuth login code"}
                type="button"
              >
                {controller.oauthCodeCopiedProviderId === provider.id ? (
                  <svg aria-hidden="true" className="h-4 w-4 text-emerald-600" fill="none" viewBox="0 0 24 24">
                    <path d="m5 12 4 4L19 6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                  </svg>
                ) : (
                  <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <rect height="12" rx="2" stroke="currentColor" strokeWidth="1.7" width="12" x="8" y="8" />
                    <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" stroke="currentColor" strokeLinecap="round" strokeWidth="1.7" />
                  </svg>
                )}
              </button>
            </>
          ) : null}
        </div>
      ) : (
        <p className="mt-3 text-[11px] text-slate-600">Local endpoint. No API key required.</p>
      )}

      <div className="mt-3 flex items-end gap-1.5">
        <label className="min-w-0 flex-1 text-[11px] font-medium text-slate-700">
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
        <button
          aria-label={isBg ? `Обнови моделите за ${provider.name}` : `Reload ${provider.name} models`}
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center text-slate-600 hover:text-slate-950 disabled:opacity-40"
          disabled={controller.reloadingProviderId === provider.id}
          onClick={() => void controller.reloadProvider(provider.id)}
          title={isBg ? "Обнови моделите" : "Reload models"}
          type="button"
        >
          <span className={controller.reloadingProviderId === provider.id ? "animate-spin" : ""}><ReloadIcon /></span>
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
  const availableProviders = controller.providers.filter(
    (provider) => !selectedIds.has(provider.id) && (provider.id !== "openrouter" || provider.configured),
  );
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
      {controller.aiSettings?.quotas.length ? (
        <div className="rounded-md border border-[var(--line)] bg-white p-2 text-[11px] text-slate-600">
          {controller.aiSettings.quotas.map((quota) => <p key={quota.providerId}>{quota.label}</p>)}
        </div>
      ) : null}
    </div>
  );
}
