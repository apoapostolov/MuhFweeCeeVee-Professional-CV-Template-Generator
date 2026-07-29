import { ArrowRight } from "lucide-react";

import type { AssistantHandoff } from "@muhfweeceevee/schemas";

export function AssistantHandoffCard({
  handoff,
  onNavigate,
}: {
  handoff: AssistantHandoff;
  onNavigate: (handoff: AssistantHandoff) => void;
}) {
  return (
    <section className="rounded-lg border border-[var(--accent)]/40 bg-[var(--surface-2)] p-3">
      <p className="text-xs font-bold">{handoff.label}</p>
      <p className="mt-1 text-[11px] text-[var(--ink-muted)]">{handoff.description}</p>
      <button
        className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-[var(--accent)] underline"
        onClick={() => onNavigate(handoff)}
        type="button"
      >
        {handoff.label}
        <ArrowRight aria-hidden className="h-3 w-3" />
      </button>
    </section>
  );
}
