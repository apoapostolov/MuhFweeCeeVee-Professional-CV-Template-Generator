"use client";

import type { JSX } from "react";

import type { AiQuota } from "@/lib/server/aiProviderTypes";
import { SettingsStatusIcon } from "./composer-ui";
import type { ActivePanel } from "./types";

export type ComposerNavProps = {
  activePanel: ActivePanel;
  onPanelChange: (panel: ActivePanel) => void;
  settingsTabState: "not_configured" | "configured" | "error";
  providerQuotas: AiQuota[];
  providerNames: Record<string, string>;
};

function quotaPills(quotas: AiQuota[]): AiQuota[] {
  const byProvider = new Map<string, AiQuota[]>();
  for (const quota of quotas) byProvider.set(quota.providerId, [...(byProvider.get(quota.providerId) ?? []), quota]);
  return [...byProvider.values()].flatMap((providerQuotas) => {
    const credit = providerQuotas.find((quota) => quota.unit === "USD");
    if (credit) return [credit];
    const ratio = providerQuotas
      .filter((quota) => (quota.period === "weekly" || quota.period === "monthly") && quota.limit !== null && quota.limit > 0 && quota.remaining !== null)
      .sort((left, right) => (right.remaining ?? 0) / (right.limit ?? 1) - (left.remaining ?? 0) / (left.limit ?? 1))[0];
    return ratio ? [ratio] : [];
  }).reverse();
}

function ProviderQuotaPill({ quota, providerName }: { quota: AiQuota; providerName: string }): JSX.Element {
  const ratio = quota.limit && quota.remaining !== null ? Math.max(0, Math.min(1, quota.remaining / quota.limit)) : 0;
  const value = quota.unit === "USD"
    ? `$${Math.round(quota.remaining ?? 0)}`
    : `${Math.round((quota.remaining ?? 0))}%`;
  return (
    <span aria-label={`${providerName} quota ${value}`} className="inline-flex w-max max-w-[12rem] flex-col rounded-md border border-[var(--line)] bg-[var(--surface-1)] px-1.5 py-1 leading-none shadow-sm" title={quota.label}>
      <span className="w-full max-w-[10rem] truncate text-center text-[8px] font-bold uppercase tracking-[0.08em] text-[var(--ink-muted)]">{providerName.replace(/\s*\(OAuth\)$/i, "")}</span>
      <span className="mt-1 flex w-full items-center gap-1 text-[10px] font-bold tabular-nums text-[var(--ink)]">
        <span className="shrink-0">{value}</span>
        <span aria-hidden="true" className="h-1 min-w-[1.25rem] flex-1 overflow-hidden rounded-full bg-[var(--surface-2)]">
          <span className="block h-full rounded-full bg-emerald-500" style={{ width: `${Math.round(ratio * 100)}%` }} />
        </span>
      </span>
    </span>
  );
}

export function ComposerNav({
  activePanel,
  onPanelChange,
  settingsTabState,
  providerQuotas,
  providerNames,
}: ComposerNavProps): JSX.Element {
  return (
    <div className="mb-4 flex items-center gap-2">
      <div className="flex flex-wrap gap-2">
        <button
          className={`rounded-md px-4 py-2 text-sm font-semibold ${
            activePanel === "workspace" ? "bg-[var(--accent)] text-white" : "bg-[var(--surface-2)] text-slate-800"
          }`}
          onClick={() => onPanelChange("workspace")}
          type="button"
        >
          Print Room
        </button>
        <button
          className={`rounded-md px-4 py-2 text-sm font-semibold ${
            activePanel === "editor" ? "bg-[var(--accent)] text-white" : "bg-[var(--surface-2)] text-slate-800"
          }`}
          onClick={() => onPanelChange("editor")}
          type="button"
        >
          Editor
        </button>
        <button
          className={`rounded-md px-4 py-2 text-sm font-semibold ${
            activePanel === "photo_booth" ? "bg-[var(--accent)] text-white" : "bg-[var(--surface-2)] text-slate-800"
          }`}
          onClick={() => onPanelChange("photo_booth")}
          type="button"
        >
          Photo Booth
        </button>
        <button
          className={`rounded-md px-4 py-2 text-sm font-semibold ${
            activePanel === "research" ? "bg-[var(--accent)] text-white" : "bg-[var(--surface-2)] text-slate-800"
          }`}
          onClick={() => onPanelChange("research")}
          type="button"
        >
          Research
        </button>
        <button
          className={`rounded-md px-4 py-2 text-sm font-semibold ${
            activePanel === "cover_letters" ? "bg-[var(--accent)] text-white" : "bg-[var(--surface-2)] text-slate-800"
          }`}
          onClick={() => onPanelChange("cover_letters")}
          type="button"
        >
          Letters
        </button>
        <button
          className={`rounded-md px-4 py-2 text-sm font-semibold ${
            activePanel === "applications" ? "bg-[var(--accent)] text-white" : "bg-[var(--surface-2)] text-slate-800"
          }`}
          onClick={() => onPanelChange("applications")}
          title="Job applications"
          type="button"
        >
          Applications
        </button>
        <button
          className={`rounded-md px-4 py-2 text-sm font-semibold ${
            activePanel === "templates" ? "bg-[var(--accent)] text-white" : "bg-[var(--surface-2)] text-slate-800"
          }`}
          onClick={() => onPanelChange("templates")}
          type="button"
        >
          Templates
        </button>
      </div>
      <div className="ml-auto flex min-w-0 items-center gap-1.5">
        <div className="flex min-w-0 items-center gap-1.5 overflow-x-auto">
          {quotaPills(providerQuotas).map((quota) => (
            <ProviderQuotaPill
              key={`${quota.providerId}:${quota.period}:${quota.unit}`}
              providerName={providerNames[quota.providerId] ?? quota.providerId}
              quota={quota}
            />
          ))}
        </div>
        <button
          className={`inline-flex shrink-0 items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold ${
            activePanel === "settings" ? "bg-[var(--accent)] text-white" : "bg-[var(--surface-2)] text-slate-800"
          }`}
          onClick={() => onPanelChange("settings")}
          type="button"
        >
          <SettingsStatusIcon state={settingsTabState} />
          <span>Settings</span>
        </button>
      </div>
    </div>
  );
}