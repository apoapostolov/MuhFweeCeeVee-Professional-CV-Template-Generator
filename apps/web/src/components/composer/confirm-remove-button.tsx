"use client";

import { useEffect, useState, type JSX } from "react";

const baseButtonClass =
  "inline-flex h-6 w-6 shrink-0 items-center justify-center rounded border text-xs font-bold transition-colors";

const idleButtonClass = `${baseButtonClass} border-[var(--line)] bg-white text-slate-700 hover:bg-[var(--surface-2)]`;

/** Fixed box for research catalog rows — idle and confirm must match (incl. 1px border). */
const catalogButtonBoxClass =
  "inline-flex h-5 w-5 shrink-0 items-center justify-center rounded border p-0 text-xs font-bold transition-colors";

const catalogIdleButtonClass = `${catalogButtonBoxClass} border-transparent bg-transparent hover:bg-transparent`;

const armedButtonClass = `${baseButtonClass} border-red-600 bg-red-50 text-red-700 hover:bg-red-100`;

const armedCatalogButtonClass = `${catalogButtonBoxClass} border-red-600 bg-red-50 text-red-700 hover:bg-red-100`;

const ARM_TIMEOUT_MS = 8000;

export type ConfirmRemoveKind = "field" | "section" | "item" | "company" | "job" | "version";

export type ConfirmRemoveButtonProps = {
  language: string;
  kind: ConfirmRemoveKind;
  onConfirm: () => void;
  className?: string;
  /** Research catalog rows: small ✕, no border until confirm (red). */
  appearance?: "default" | "catalog";
  catalogSelected?: boolean;
};

function labels(language: string, kind: ConfirmRemoveKind, armed: boolean): { aria: string; title: string } {
  const bg = language === "bg";
  if (armed) {
    if (kind === "company") {
      return bg
        ? { aria: "Потвърди изтриване на компания", title: "Натисни отново за изтриване" }
        : { aria: "Confirm delete company", title: "Click again to delete" };
    }
    if (kind === "job") {
      return bg
        ? { aria: "Потвърди изтриване на позиция", title: "Натисни отново за изтриване" }
        : { aria: "Confirm delete job position", title: "Click again to delete" };
    }
    if (kind === "version") {
      return bg
        ? { aria: "Потвърди изтриване на версия", title: "Натисни отново за изтриване" }
        : { aria: "Confirm delete version", title: "Click again to delete" };
    }
    if (kind === "section") {
      return bg
        ? { aria: "Потвърди изтриване на подраздел", title: "Натисни отново за изтриване" }
        : { aria: "Confirm delete subsection", title: "Click again to delete subsection" };
    }
    if (kind === "item") {
      return bg
        ? { aria: "Потвърди премахване на елемент", title: "Натисни отново за премахване" }
        : { aria: "Confirm remove item", title: "Click again to remove item" };
    }
    return bg
      ? { aria: "Потвърди премахване на поле", title: "Натисни отново за премахване" }
      : { aria: "Confirm remove field", title: "Click again to remove field" };
  }
  if (kind === "company") {
    return bg
      ? { aria: "Изтрий компания", title: "Изтрий компания" }
      : { aria: "Delete company", title: "Delete company" };
  }
  if (kind === "job") {
    return bg
      ? { aria: "Изтрий позиция", title: "Изтрий позиция" }
      : { aria: "Delete job position", title: "Delete job position" };
  }
  if (kind === "version") {
    return bg
      ? { aria: "Изтрий версия", title: "Изтрий версия" }
      : { aria: "Delete version", title: "Delete version" };
  }
  if (kind === "section") {
    return bg
      ? { aria: "Изтрий подраздел", title: "Изтрий подраздел" }
      : { aria: "Delete subsection", title: "Delete subsection" };
  }
  if (kind === "item") {
    return bg
      ? { aria: "Премахни елемент", title: "Премахни елемент" }
      : { aria: "Remove item", title: "Remove item" };
  }
  return bg
    ? { aria: "Премахни поле", title: "Премахни поле" }
    : { aria: "Remove field", title: "Remove field" };
}

function ApproveIcon({ compact = false }: { compact?: boolean }): JSX.Element {
  const sizeClass = compact ? "h-3 w-3" : "h-3.5 w-3.5";
  return (
    <svg aria-hidden className={sizeClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CatalogRemoveIcon(): JSX.Element {
  return (
    <svg aria-hidden className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
    </svg>
  );
}

export function ConfirmRemoveButton({
  language,
  kind,
  onConfirm,
  className = "",
  appearance = "default",
  catalogSelected = false,
}: ConfirmRemoveButtonProps): JSX.Element {
  const [armed, setArmed] = useState(false);
  const copy = labels(language, kind, armed);
  const isCatalog = appearance === "catalog";

  useEffect(() => {
    if (!armed) {
      return;
    }
    const timer = window.setTimeout(() => setArmed(false), ARM_TIMEOUT_MS);
    return () => window.clearTimeout(timer);
  }, [armed]);

  const catalogIdleTone = catalogSelected
    ? "text-white hover:opacity-80"
    : "text-slate-600 hover:text-slate-800";
  const idleClass = isCatalog ? `${catalogIdleButtonClass} ${catalogIdleTone}` : idleButtonClass;
  const armedClass = isCatalog ? armedCatalogButtonClass : armedButtonClass;

  return (
    <button
      aria-label={copy.aria}
      aria-pressed={armed}
      className={`${armed ? armedClass : idleClass} ${className}`.trim()}
      onClick={() => {
        if (!armed) {
          setArmed(true);
          return;
        }
        setArmed(false);
        onConfirm();
      }}
      onBlur={() => setArmed(false)}
      title={copy.title}
      type="button"
    >
      {armed ? (
        <ApproveIcon compact={isCatalog} />
      ) : isCatalog ? (
        <CatalogRemoveIcon />
      ) : (
        <span aria-hidden>✕</span>
      )}
    </button>
  );
}