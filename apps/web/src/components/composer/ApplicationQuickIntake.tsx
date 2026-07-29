"use client";

import { useState, type JSX } from "react";
import { ClipboardPaste, X } from "lucide-react";

import type { Application } from "./application-operations-types";

export type ApplicationQuickIntakeProps = {
  language: string;
  disabled?: boolean;
  onComplete: (application: Application, deduplicated: boolean) => void;
};

export function ApplicationQuickIntake({
  language,
  disabled,
  onComplete,
}: ApplicationQuickIntakeProps): JSX.Element {
  const [open, setOpen] = useState(false);
  const [raw, setRaw] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const bg = language === "bg";

  async function submit(): Promise<void> {
    if (!raw.trim()) {
      setError(bg ? "Поставете линк или описание." : "Paste a URL or job description.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/applications/intake", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          raw,
          companyName: companyName || undefined,
          jobTitle: jobTitle || undefined,
        }),
      });
      const payload = (await response.json()) as {
        error?: string;
        application?: Application;
        deduplicated?: boolean;
      };
      if (!response.ok || !payload.application) {
        setError(payload.error ?? (bg ? "Импортът не успя." : "Intake failed."));
        return;
      }
      onComplete(payload.application, Boolean(payload.deduplicated));
      setRaw("");
      setCompanyName("");
      setJobTitle("");
      setOpen(false);
    } catch {
      setError(bg ? "Импортът не успя." : "Intake failed.");
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button
        className="inline-flex items-center gap-1.5 rounded-md border border-[var(--line)] bg-white px-3 py-1.5 text-xs font-semibold disabled:opacity-60"
        disabled={disabled}
        onClick={() => setOpen(true)}
        type="button"
      >
        <ClipboardPaste aria-hidden className="h-3.5 w-3.5" />
        {bg ? "Бърз прием" : "Quick Intake"}
      </button>
    );
  }

  return (
    <section
      aria-labelledby="quick-intake-heading"
      className="w-full rounded-md border border-[var(--line)] bg-[var(--surface-1)] p-3"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h4 className="text-sm font-semibold" id="quick-intake-heading">
            {bg ? "Бърз прием на обява" : "Quick job intake"}
          </h4>
          <p className="text-[10px] text-[var(--ink-muted)]">
            {bg
              ? "Линк или текст → компания, позиция и Wishlist карта. Оригиналът се пази."
              : "URL or text → company, role, and Wishlist card. The original input is preserved."}
          </p>
        </div>
        <button
          aria-label={bg ? "Затвори" : "Close Quick Intake"}
          className="rounded p-1 hover:bg-[var(--surface-2)]"
          onClick={() => setOpen(false)}
          type="button"
        >
          <X aria-hidden className="h-4 w-4" />
        </button>
      </div>
      <textarea
        aria-label={bg ? "Линк или описание на обява" : "Job URL or description"}
        className="mt-2 min-h-28 w-full resize-y rounded border border-[var(--line)] bg-white px-2 py-2 text-xs"
        onChange={(event) => setRaw(event.target.value)}
        placeholder={
          bg
            ? "Поставете линк или пълното описание…"
            : "Paste a URL or the full job description…"
        }
        value={raw}
      />
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        <input
          aria-label={bg ? "Корекция на компания" : "Company override"}
          className="rounded border border-[var(--line)] bg-white px-2 py-1.5 text-xs"
          onChange={(event) => setCompanyName(event.target.value)}
          placeholder={bg ? "Компания (по избор)" : "Company override (optional)"}
          value={companyName}
        />
        <input
          aria-label={bg ? "Корекция на позиция" : "Role override"}
          className="rounded border border-[var(--line)] bg-white px-2 py-1.5 text-xs"
          onChange={(event) => setJobTitle(event.target.value)}
          placeholder={bg ? "Позиция (по избор)" : "Role override (optional)"}
          value={jobTitle}
        />
      </div>
      {error ? (
        <p className="mt-2 text-xs text-rose-700" role="alert">
          {error}
        </p>
      ) : null}
      <button
        className="mt-2 rounded-md bg-[var(--accent)] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
        disabled={busy}
        onClick={() => void submit()}
        type="button"
      >
        {busy
          ? bg
            ? "Създаване…"
            : "Creating…"
          : bg
            ? "Създай или отвори съществуващото"
            : "Create or open existing"}
      </button>
    </section>
  );
}
