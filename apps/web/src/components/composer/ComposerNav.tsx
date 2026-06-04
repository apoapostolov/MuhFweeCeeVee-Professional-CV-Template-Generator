"use client";

import type { JSX } from "react";

import { SettingsStatusIcon } from "./composer-ui";
import type { ActivePanel } from "./types";

export type ComposerNavProps = {
  activePanel: ActivePanel;
  onPanelChange: (panel: ActivePanel) => void;
  settingsTabState: "not_configured" | "configured" | "error";
  settingsCreditCompact: string;
};

export function ComposerNav({
  activePanel,
  onPanelChange,
  settingsTabState,
  settingsCreditCompact,
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
            activePanel === "photo_booth" ? "bg-[var(--accent)] text-white" : "bg-[var(--surface-2)] text-slate-800"
          }`}
          onClick={() => onPanelChange("photo_booth")}
          type="button"
        >
          Photo Booth
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
            activePanel === "research" ? "bg-[var(--accent)] text-white" : "bg-[var(--surface-2)] text-slate-800"
          }`}
          onClick={() => onPanelChange("research")}
          type="button"
        >
          Research
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
      <button
        className={`ml-auto inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold ${
          activePanel === "settings" ? "bg-[var(--accent)] text-white" : "bg-[var(--surface-2)] text-slate-800"
        }`}
        onClick={() => onPanelChange("settings")}
        type="button"
      >
        <SettingsStatusIcon state={settingsTabState} />
        <span>Settings</span>
        <span
          className={`rounded border px-1.5 py-0.5 text-[10px] font-semibold ${activePanel === "settings" ? "border-white/60 text-white" : "border-[var(--line)] text-slate-700"}`}
        >
          {settingsCreditCompact}
        </span>
      </button>
    </div>
  );
}