"use client";

import type { JSX } from "react";

import { UI_LANGUAGE_OPTIONS, type UiLanguageCode, uiIsBg } from "./ui-language";

export type SettingsInterfaceLanguageCardProps = {
  uiLanguage: UiLanguageCode;
  onUiLanguageChange: (language: UiLanguageCode) => void;
};

export function SettingsInterfaceLanguageCard({
  uiLanguage,
  onUiLanguageChange,
}: SettingsInterfaceLanguageCardProps): JSX.Element {
  const bg = uiIsBg(uiLanguage);

  return (
    <div className="flex min-h-0 flex-col gap-4">
      <div>
        <h2 className="text-xl font-bold text-slate-900">
          {bg ? "Език на интерфейса" : "Interface language"}
        </h2>
        <p className="mt-2 text-sm text-[var(--ink-muted)]">
          {bg
            ? "Управлява етикетите, бутоните и съобщенията в приложението. Не променя езика на CV шаблона."
            : "Controls app labels, buttons, and messages. Does not change the CV template language."}
        </p>
      </div>

      <div className="flex w-full min-w-0 gap-2">
        {UI_LANGUAGE_OPTIONS.map((entry) => (
          <button
            key={entry.code}
            className={`min-w-0 flex-1 rounded-md border px-3 py-2 text-center text-sm font-semibold transition-colors ${
              uiLanguage === entry.code
                ? "border-[var(--accent)] bg-[var(--accent)] text-white"
                : "border-[var(--line)] bg-white text-slate-800 hover:bg-slate-50"
            }`}
            onClick={() => onUiLanguageChange(entry.code)}
            type="button"
          >
            {entry.label}
          </button>
        ))}
      </div>

      <p className="text-xs text-[var(--ink-muted)]">
        {bg
          ? "Езикът на CV варианта се сменя от Print Room или Editor — бутоните EN / BG / … там."
          : "CV variant language is changed from Print Room or Editor — the EN / BG / … pills there."}
      </p>
    </div>
  );
}