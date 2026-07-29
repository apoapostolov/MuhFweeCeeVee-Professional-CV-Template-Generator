import { Check, Circle, ListChecks } from "lucide-react";

import type { AssistantPlan } from "@muhfweeceevee/schemas";

export function AssistantPlanCard({ plan }: { plan: AssistantPlan }) {
  return (
    <section className="rounded-lg border border-[var(--line)] bg-[var(--surface-2)] p-3">
      <div className="flex items-center gap-2">
        <ListChecks aria-hidden className="h-4 w-4 text-[var(--accent)]" />
        <h3 className="text-xs font-bold">{plan.title}</h3>
      </div>
      {plan.summary ? (
        <p className="mt-1 text-[11px] text-[var(--ink-muted)]">{plan.summary}</p>
      ) : null}
      <ol className="mt-3 space-y-2">
        {plan.steps.map((step) => (
          <li className="flex gap-2 text-xs" key={step.id}>
            {step.status === "completed" ? (
              <Check aria-hidden className="mt-0.5 h-3.5 w-3.5 text-emerald-600" />
            ) : (
              <Circle aria-hidden className="mt-0.5 h-3.5 w-3.5 text-[var(--ink-muted)]" />
            )}
            <span>
              {step.title}
              {step.targetDescription ? (
                <span className="block text-[10px] text-[var(--ink-muted)]">
                  {step.targetDescription}
                </span>
              ) : null}
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}
