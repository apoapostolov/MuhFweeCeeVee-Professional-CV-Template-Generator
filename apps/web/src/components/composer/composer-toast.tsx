"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { JSX } from "react";

export type ComposerToastItem = {
  id: string;
  message: string;
};

const TOAST_VISIBLE_MS = 3200;

function nextToastId(): string {
  return `toast_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function useComposerToast() {
  const [toasts, setToasts] = useState<ComposerToastItem[]>([]);
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const dismissToast = useCallback((id: string) => {
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
    setToasts((current) => current.filter((entry) => entry.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string) => {
      const trimmed = message.trim();
      if (!trimmed) {
        return;
      }
      const id = nextToastId();
      setToasts((current) => [...current.slice(-2), { id, message: trimmed }]);
      const timer = setTimeout(() => dismissToast(id), TOAST_VISIBLE_MS);
      timersRef.current.set(id, timer);
    },
    [dismissToast],
  );

  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      for (const timer of timers.values()) {
        clearTimeout(timer);
      }
      timers.clear();
    };
  }, []);

  return { toasts, showToast, dismissToast };
}

export type ComposerToastHostProps = {
  toasts: ComposerToastItem[];
  onDismiss: (id: string) => void;
};

export function ComposerToastHost({ toasts, onDismiss }: ComposerToastHostProps): JSX.Element | null {
  if (toasts.length === 0) {
    return null;
  }

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed bottom-5 left-1/2 z-[80] flex w-full max-w-md -translate-x-1/2 flex-col items-center gap-2 px-4"
    >
      {toasts.map((toast) => (
        <div
          className="pointer-events-auto rounded-full border border-[var(--line)] bg-[var(--surface-1)] px-4 py-2 text-center text-xs font-medium text-slate-800 shadow-[0_8px_24px_rgba(15,23,42,0.18)]"
          key={toast.id}
          role="status"
        >
          <button
            className="w-full text-center"
            onClick={() => onDismiss(toast.id)}
            type="button"
          >
            {toast.message}
          </button>
        </div>
      ))}
    </div>
  );
}