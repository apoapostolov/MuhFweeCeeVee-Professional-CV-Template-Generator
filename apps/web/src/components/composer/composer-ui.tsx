"use client";

import type { JSX } from "react";

import type { ThemeMode } from "./types";

function ThemeSunIcon(): JSX.Element {
  return (
    <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="4" fill="currentColor" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M19.1 4.9L17 7M7 17l-2.1 2.1" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.7" />
    </svg>
  );
}

function ThemeMoonIcon(): JSX.Element {
  return (
    <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" strokeWidth="1.7" />
      <path d="M12 4a8 8 0 1 0 0 16a6 8 0 1 1 0-16z" fill="currentColor" opacity="0.85" />
    </svg>
  );
}

function ThemeSystemIcon(): JSX.Element {
  return (
    <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24">
      <rect x="3.5" y="4.5" width="17" height="12" rx="1.8" fill="none" stroke="currentColor" strokeWidth="1.7" />
      <path d="M9 19h6M11 16.5v2.5M13 16.5v2.5" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.7" />
    </svg>
  );
}

export function SettingsStatusIcon({ state }: { state: "not_configured" | "configured" | "error" }): JSX.Element {
  if (state === "configured") {
    return (
      <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24">
        <path d="M5 12.5 9.3 17 19 7.8" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.1" />
      </svg>
    );
  }
  if (state === "error") {
    return (
      <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <path d="M12 7.5v6.2M12 17.6h.01" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
      </svg>
    );
  }
  return (
    <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M8.8 8.8 15.2 15.2M15.2 8.8 8.8 15.2" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
    </svg>
  );
}

export type ThemeModeToggleProps = {
  themeMode: ThemeMode;
  onThemeModeChange: (mode: ThemeMode) => void;
  assistantOpen?: boolean;
};

export function ThemeModeToggle({
  themeMode,
  onThemeModeChange,
  assistantOpen = false,
}: ThemeModeToggleProps): JSX.Element {
  return (
    <div
      className={`${assistantOpen ? "absolute right-4 top-4 md:right-6 md:top-6" : "fixed right-4 top-4"} z-40 flex items-center gap-1 rounded-full border border-[var(--line)] bg-[var(--surface-1)]/85 px-1 py-1 shadow-sm backdrop-blur-sm`}
    >
      <button
        className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-sm ${themeMode === "light" ? "bg-[var(--surface-2)] text-slate-900" : "text-[var(--ink-muted)] hover:bg-[var(--surface-2)]"}`}
        onClick={() => onThemeModeChange("light")}
        title="Light mode"
        type="button"
      >
        <ThemeSunIcon />
      </button>
      <button
        className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-sm ${themeMode === "dark" ? "bg-[var(--surface-2)] text-slate-900" : "text-[var(--ink-muted)] hover:bg-[var(--surface-2)]"}`}
        onClick={() => onThemeModeChange("dark")}
        title="Dark mode"
        type="button"
      >
        <ThemeMoonIcon />
      </button>
      <button
        className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-sm ${themeMode === "system" ? "bg-[var(--surface-2)] text-slate-900" : "text-[var(--ink-muted)] hover:bg-[var(--surface-2)]"}`}
        onClick={() => onThemeModeChange("system")}
        title="System mode"
        type="button"
      >
        <ThemeSystemIcon />
      </button>
    </div>
  );
}