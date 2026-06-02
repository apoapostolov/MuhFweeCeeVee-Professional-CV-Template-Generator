"use client";

import { useEffect, useState, type JSX } from "react";

const baseButtonClass =
  "inline-flex h-6 w-6 shrink-0 items-center justify-center rounded border text-xs font-bold transition-colors";

const idleButtonClass = `${baseButtonClass} border-[var(--line)] bg-white text-slate-700 hover:bg-[var(--surface-2)]`;

const armedButtonClass = `${baseButtonClass} border-red-600 bg-red-50 text-red-700 hover:bg-red-100`;

const ARM_TIMEOUT_MS = 8000;

export type ConfirmRemoveButtonProps = {
  language: string;
  /** `field` = object key / section field; `item` = array entry */
  kind: "field" | "item";
  onConfirm: () => void;
  className?: string;
};

function labels(language: string, kind: "field" | "item", armed: boolean): { aria: string; title: string } {
  if (language === "bg") {
    if (armed) {
      return {
        aria: kind === "item" ? "Потвърди премахване на елемент" : "Потвърди премахване на поле",
        title: kind === "item" ? "Натисни отново за премахване" : "Натисни отново за премахване",
      };
    }
    return {
      aria: kind === "item" ? "Премахни елемент" : "Премахни поле",
      title: kind === "item" ? "Премахни елемент" : "Премахни поле",
    };
  }
  if (armed) {
    return {
      aria: kind === "item" ? "Confirm remove item" : "Confirm remove field",
      title: kind === "item" ? "Click again to remove item" : "Click again to remove field",
    };
  }
  return {
    aria: kind === "item" ? "Remove item" : "Remove field",
    title: kind === "item" ? "Remove item" : "Remove field",
  };
}

function ApproveIcon(): JSX.Element {
  return (
    <svg aria-hidden className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ConfirmRemoveButton({
  language,
  kind,
  onConfirm,
  className = "",
}: ConfirmRemoveButtonProps): JSX.Element {
  const [armed, setArmed] = useState(false);
  const copy = labels(language, kind, armed);

  useEffect(() => {
    if (!armed) {
      return;
    }
    const timer = window.setTimeout(() => setArmed(false), ARM_TIMEOUT_MS);
    return () => window.clearTimeout(timer);
  }, [armed]);

  return (
    <button
      aria-label={copy.aria}
      aria-pressed={armed}
      className={`${armed ? armedButtonClass : idleButtonClass} ${className}`.trim()}
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
      {armed ? <ApproveIcon /> : <span aria-hidden>✕</span>}
    </button>
  );
}