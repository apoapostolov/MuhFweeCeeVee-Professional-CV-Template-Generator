"use client";

import type { JSX } from "react";

import type { AuxiliaryServiceKind, AuxiliaryServiceStatus } from "@/lib/server/auxiliaryServices";

import { useAuxiliaryServices } from "./useAuxiliaryServices";
import type { UiLanguageCode } from "./ui-language";

const CONTROL_CLASS =
  "w-full rounded-md border border-[var(--line)] bg-white px-2 py-1.5 text-xs text-slate-800";

type Props = { uiLanguage: UiLanguageCode };

function integrationLabel(status: AuxiliaryServiceStatus["integration"], bg: boolean): string {
  if (status === "ready") return bg ? "Конекторът е активен" : "Connector active";
  if (status === "manual") return bg ? "Ръчна проверка" : "Manual workflow";
  return bg ? "Конектор предстои" : "Connector planned";
}

function ServiceBlock({
  service,
  controller,
  bg,
}: {
  service: AuxiliaryServiceStatus;
  controller: ReturnType<typeof useAuxiliaryServices>;
  bg: boolean;
}): JSX.Element {
  const configured = service.configured;
  const input = controller.inputs[service.id] ?? "";
  return (
    <section className="rounded-md border border-[var(--line)] bg-[var(--surface-1)] p-2.5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-xs font-semibold text-slate-900">{service.name}</h3>
          <p className="mt-0.5 text-[10px] leading-snug text-slate-600">{service.description}</p>
        </div>
        <span className={`shrink-0 text-[10px] font-semibold ${configured ? "text-emerald-700" : "text-slate-500"}`}>
          {configured ? (bg ? "Ключът е зададен" : "Configured") : integrationLabel(service.integration, bg)}
        </span>
      </div>
      <div className="mt-2 flex items-end gap-1.5">
        <label className="min-w-0 flex-1 text-[10px] font-medium text-slate-700">
          API key
          <input
            aria-label={`${service.name} API key`}
            className={`${CONTROL_CLASS} mt-1`}
            onChange={(event) => controller.setInput(service.id, event.target.value)}
            placeholder={service.apiKeyMasked ? `${service.apiKeyMasked} · ${bg ? "нов ключ за замяна" : "enter new key to replace"}` : bg ? "Поставете API ключ" : "Paste API key"}
            type="password"
            value={input}
          />
        </label>
        <button
          className="rounded-md bg-[var(--accent)] px-2 py-1.5 text-[10px] font-semibold text-white disabled:opacity-50"
          disabled={!input.trim() || controller.savingId === service.id}
          onClick={() => void controller.save(service.id)}
          type="button"
        >
          {controller.savingId === service.id ? "…" : bg ? "Запази" : "Save"}
        </button>
      </div>
    </section>
  );
}

function ServiceGroup({
  kind,
  services,
  controller,
  bg,
}: {
  kind: AuxiliaryServiceKind;
  services: AuxiliaryServiceStatus[];
  controller: ReturnType<typeof useAuxiliaryServices>;
  bg: boolean;
}): JSX.Element | null {
  const items = services.filter((service) => service.kind === kind);
  if (items.length === 0) return null;
  return (
    <div className="mt-3">
      <h3 className="text-[11px] font-bold uppercase tracking-wide text-slate-700">
        {kind === "detector" ? (bg ? "AI детектори" : "AI Detectors") : (bg ? "Онлайн ATS услуги" : "Online ATS Services")}
      </h3>
      <div className="mt-1.5 grid gap-2">
        {items.map((service) => <ServiceBlock bg={bg} controller={controller} key={service.id} service={service} />)}
      </div>
    </div>
  );
}

export function AuxiliaryServicesCard({ uiLanguage }: Props): JSX.Element {
  const controller = useAuxiliaryServices();
  const bg = uiLanguage === "bg";
  return (
    <article className="flex min-h-0 min-w-0 flex-col overflow-auto rounded-xl border border-[var(--line)] bg-white p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="text-xl font-bold text-slate-900">{bg ? "Спомагателни услуги" : "Auxiliary Services"}</h2>
          <p className="mt-2 text-sm text-[var(--ink-muted)]">
            {bg ? "Ключове за AI детектори и онлайн ATS проверки." : "API keys for AI detectors and online ATS checks."}
          </p>
        </div>
        <button
          aria-label={bg ? "Презареди спомагателните услуги" : "Reload auxiliary services"}
          className="rounded border border-[var(--line)] px-2 py-1 text-xs text-[var(--ink-muted)] hover:bg-[var(--surface-2)]"
          disabled={controller.loading}
          onClick={() => void controller.reload()}
          type="button"
        >
          ↻
        </button>
      </div>
      {controller.error ? <p className="mt-3 rounded border border-red-200 bg-red-50 p-2 text-[11px] text-red-700">{controller.error}</p> : null}
      {controller.loading ? <p className="mt-4 text-xs text-slate-500">{bg ? "Зареждане…" : "Loading…"}</p> : null}
      {!controller.loading ? (
        <>
          <ServiceGroup bg={bg} controller={controller} kind="detector" services={controller.services} />
          <ServiceGroup bg={bg} controller={controller} kind="ats" services={controller.services} />
        </>
      ) : null}
      <p className="mt-4 text-[10px] leading-snug text-slate-500">
        {bg ? "Ключовете се пазят локално в .env. Планираните услуги запазват ключа, но конекторът още не е активен." : "Keys are stored locally in .env. Planned services keep the key, but their connector is not active yet."}
      </p>
    </article>
  );
}
