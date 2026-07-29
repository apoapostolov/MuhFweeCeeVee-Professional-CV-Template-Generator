"use client";

import { forwardRef } from "react";
import { Bot } from "lucide-react";

export const AssistantLauncher = forwardRef<
  HTMLButtonElement,
  { onOpen: () => void }
>(function AssistantLauncher({ onOpen }, ref) {
  return (
    <button
      aria-label="Open MuhFwee AI copilot"
      className="fixed bottom-5 right-5 z-40 inline-flex h-12 w-12 items-center justify-center rounded-full border border-[var(--line)] bg-[var(--accent)] text-white shadow-lg transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2"
      onClick={onOpen}
      ref={ref}
      title="Open MuhFwee AI"
      type="button"
    >
      <Bot aria-hidden className="h-5 w-5" />
    </button>
  );
});
