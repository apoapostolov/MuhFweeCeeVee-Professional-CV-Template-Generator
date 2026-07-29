"use client";

import type { JSX } from "react";
import { CalendarClock, Check } from "lucide-react";

import type { Application } from "./application-operations-types";

export type ApplicationTodayViewProps = {
  applications: Application[];
  language: string;
  onOpen: (application: Application) => void;
  onComplete: (application: Application) => void;
};

function dayBucket(dueAt: string): "overdue" | "today" | "upcoming" {
  const due = new Date(dueAt);
  const now = new Date();
  const dueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate()).getTime();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  if (dueDay < today) return "overdue";
  if (dueDay === today) return "today";
  return "upcoming";
}

export function ApplicationTodayView({
  applications,
  language,
  onOpen,
  onComplete,
}: ApplicationTodayViewProps): JSX.Element {
  const bg = language === "bg";
  const actionable = applications
    .filter(
      (application) =>
        !application.archived_at &&
        application.next_action &&
        !application.next_action.completed_at,
    )
    .sort((a, b) =>
      (a.next_action?.due_at ?? "").localeCompare(b.next_action?.due_at ?? ""),
    );

  if (actionable.length === 0) {
    return (
      <div className="flex min-h-64 flex-col items-center justify-center rounded-xl border border-[var(--line)] bg-white p-8 text-center">
        <CalendarClock aria-hidden className="h-8 w-8 text-[var(--ink-muted)]" />
        <h3 className="mt-3 text-sm font-semibold">
          {bg ? "Няма планирани действия" : "No actions scheduled"}
        </h3>
        <p className="mt-1 max-w-md text-xs text-[var(--ink-muted)]">
          {bg
            ? "Отворете кандидатстване и добавете следващо действие и срок."
            : "Open an application and add a next action with a due date."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {(["overdue", "today", "upcoming"] as const).map((bucket) => {
        const items = actionable.filter(
          (application) =>
            application.next_action &&
            dayBucket(application.next_action.due_at) === bucket,
        );
        if (items.length === 0) return null;
        const label =
          bucket === "overdue"
            ? bg
              ? "Просрочени"
              : "Overdue"
            : bucket === "today"
              ? bg
                ? "Днес"
                : "Today"
              : bg
                ? "Предстоящи"
                : "Upcoming";
        return (
          <section aria-labelledby={`today-${bucket}`} key={bucket}>
            <h3
              className="mb-1.5 text-xs font-bold uppercase tracking-wide text-slate-700"
              id={`today-${bucket}`}
            >
              {label} ({items.length})
            </h3>
            <ul className="space-y-2">
              {items.map((application) => (
                <li
                  className="flex flex-wrap items-center gap-3 rounded-md border border-[var(--line)] bg-white px-3 py-2"
                  key={application.id}
                >
                  <button
                    className="min-w-0 flex-1 text-left"
                    onClick={() => onOpen(application)}
                    type="button"
                  >
                    <span className="block truncate text-sm font-semibold">
                      {application.next_action?.title}
                    </span>
                    <span className="block truncate text-xs text-[var(--ink-muted)]">
                      {application.job_title} · {application.company_name} ·{" "}
                      {new Date(
                        application.next_action?.due_at ?? "",
                      ).toLocaleString()}
                    </span>
                  </button>
                  <span className="rounded bg-[var(--surface-2)] px-2 py-1 text-[10px] font-semibold uppercase">
                    {application.next_action?.priority ?? "normal"}
                  </span>
                  <button
                    className="inline-flex items-center gap-1 rounded-md border border-[var(--line)] px-2 py-1 text-xs font-semibold"
                    onClick={() => onComplete(application)}
                    type="button"
                  >
                    <Check aria-hidden className="h-3.5 w-3.5" />
                    {bg ? "Готово" : "Done"}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
