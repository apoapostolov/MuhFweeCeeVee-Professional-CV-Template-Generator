"use client";

import { useState, type JSX } from "react";
import { CalendarPlus, Pencil, X } from "lucide-react";

import type { ApplicationActivity, ApplicationActivityType } from "@/lib/server/applicationStore";

import type { Application } from "./application-operations-types";

const ACTIVITY_TYPES: ApplicationActivityType[] = [
  "recruiter_contact",
  "follow_up_sent",
  "phone_screen",
  "interview_round",
  "assessment",
  "offer",
  "rejection",
  "note",
];

function localDateTime(iso?: string): string {
  const date = iso ? new Date(iso) : new Date(Date.now() + 24 * 60 * 60 * 1000);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

export function ApplicationActivityTimeline({
  application,
  language,
  disabled,
  onChanged,
}: {
  application: Application;
  language: string;
  disabled?: boolean;
  onChanged: (message: string) => void;
}): JSX.Element {
  const [actionTitle, setActionTitle] = useState(
    application.next_action?.title ?? "",
  );
  const [dueAt, setDueAt] = useState(localDateTime(application.next_action?.due_at));
  const [activityType, setActivityType] =
    useState<ApplicationActivityType>("note");
  const [activitySummary, setActivitySummary] = useState("");
  const [editingActivity, setEditingActivity] = useState<ApplicationActivity | null>(null);
  const [editType, setEditType] = useState<ApplicationActivityType>("note");
  const [editSummary, setEditSummary] = useState("");
  const [editOccurredAt, setEditOccurredAt] = useState("");
  const [busy, setBusy] = useState(false);
  const bg = language === "bg";

  async function request(
    method: "PATCH" | "POST" | "DELETE",
    url: string,
    body: Record<string, unknown>,
    success: string,
  ): Promise<boolean> {
    setBusy(true);
    try {
      const response = await fetch(url, {
        method,
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = (await response.json()) as { error?: string };
      onChanged(response.ok ? success : payload.error ?? "Update failed.");
      return response.ok;
    } catch {
      onChanged(bg ? "Записът не успя." : "Update failed.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  function openActivityEditor(activity: ApplicationActivity): void {
    setEditingActivity(activity);
    setEditType(activity.type);
    setEditSummary(activity.summary);
    setEditOccurredAt(localDateTime(activity.occurred_at));
  }

  async function saveActivityEdit(): Promise<void> {
    if (!editingActivity || !editSummary.trim() || !editOccurredAt) return;
    const saved = await request(
      "PATCH",
      `/api/applications/${encodeURIComponent(application.id)}/activities`,
      {
        activityId: editingActivity.id,
        type: editType,
        summary: editSummary.trim(),
        occurred_at: new Date(editOccurredAt).toISOString(),
      },
      bg ? "Активността е редактирана." : "Activity updated.",
    );
    if (saved) setEditingActivity(null);
  }

  async function deleteActivity(activityId: string): Promise<void> {
    if (!window.confirm(bg ? "Изтриване на това събитие?" : "Delete this event?")) return;
    await request(
      "DELETE",
      `/api/applications/${encodeURIComponent(application.id)}/activities?activityId=${encodeURIComponent(activityId)}`,
      {},
      bg ? "Активността е изтрита." : "Activity deleted.",
    );
  }

  return (
    <section className="border-t border-[var(--line)] pt-3" aria-labelledby="activity-heading">
      <h4 className="text-xs font-semibold" id="activity-heading">
        {bg ? "Следващо действие и история" : "Next action & timeline"}
      </h4>

      <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_auto]">
        <div className="grid gap-2">
          <input
            aria-label={bg ? "Следващо действие" : "Next action"}
            className="rounded border border-[var(--line)] px-2 py-1.5 text-xs"
            onChange={(event) => setActionTitle(event.target.value)}
            placeholder={bg ? "Напр. Последващ имейл" : "e.g. Send follow-up email"}
            value={actionTitle}
          />
          <input
            aria-label={bg ? "Срок" : "Due date"}
            className="composer-date-input min-w-0 w-full rounded border border-[var(--line)] px-2 py-1.5 text-xs"
            onChange={(event) => setDueAt(event.target.value)}
            type="datetime-local"
            value={dueAt}
          />
        </div>
        <button
          className="inline-flex items-center justify-center gap-1 rounded-md border border-[var(--line)] px-2 py-1.5 text-xs font-semibold disabled:opacity-60"
          disabled={disabled || busy || !actionTitle.trim() || !dueAt}
          onClick={() =>
            void request(
              "PATCH",
              `/api/applications/${encodeURIComponent(application.id)}`,
              {
                next_action: {
                  title: actionTitle,
                  due_at: new Date(dueAt).toISOString(),
                  priority: application.priority ?? "normal",
                  reminder_state: "scheduled",
                },
              },
              bg ? "Следващото действие е запазено." : "Next action saved.",
            )
          }
          type="button"
        >
          <CalendarPlus aria-hidden className="h-3.5 w-3.5" />
          {bg ? "Планирай" : "Schedule"}
        </button>
      </div>

      <div className="mt-3 grid min-w-0 gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
        <select
          aria-label={bg ? "Вид активност" : "Activity type"}
          className="min-w-0 w-full rounded border border-[var(--line)] px-2 py-1.5 text-xs sm:col-span-2"
          onChange={(event) =>
            setActivityType(event.target.value as ApplicationActivityType)
          }
          value={activityType}
        >
          {ACTIVITY_TYPES.map((type) => (
            <option key={type} value={type}>
              {type.replaceAll("_", " ")}
            </option>
          ))}
        </select>
        <input
          aria-label={bg ? "Обобщение на активността" : "Activity summary"}
          className="min-w-0 w-full rounded border border-[var(--line)] px-2 py-1.5 text-xs"
          onChange={(event) => setActivitySummary(event.target.value)}
          placeholder={bg ? "Какво се случи?" : "What happened?"}
          value={activitySummary}
        />
        <button
          className="shrink-0 rounded-md border border-[var(--line)] px-2 py-1.5 text-xs font-semibold disabled:opacity-60"
          disabled={disabled || busy || !activitySummary.trim()}
          onClick={() =>
            void request(
              "POST",
              `/api/applications/${encodeURIComponent(application.id)}/activities`,
              { type: activityType, summary: activitySummary },
              bg ? "Активността е добавена." : "Activity added.",
            ).then((saved) => {
              if (saved) setActivitySummary("");
            })
          }
          type="button"
        >
          {bg ? "Добави" : "Add"}
        </button>
      </div>

      {(application.contacts?.length ?? 0) > 0 ? (
        <p className="mt-2 text-[10px] text-[var(--ink-muted)]">
          {bg ? "Контакти" : "Contacts"}:{" "}
          {application.contacts?.map((contact) =>
            `${contact.name}${contact.role ? ` (${contact.role})` : ""}`,
          ).join(", ")}
        </p>
      ) : null}

      <ol className="mt-3 space-y-1.5">
        {(application.activities ?? []).slice(0, 20).map((activity) => (
          <li
            className="border-l-2 border-[var(--line)] pl-2 text-[10px]"
            key={activity.id}
          >
            <div className="flex items-start gap-1">
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{activity.summary}</p>
                <p className="text-[var(--ink-muted)]">
                  {activity.type.replaceAll("_", " ")} ·{" "}
                  {new Date(activity.occurred_at).toLocaleString()}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1 leading-none">
                <button aria-label={bg ? "Редактиране на събитие" : "Edit event"} className="border-0 bg-transparent p-0 text-[var(--ink-muted)] hover:text-[var(--ink)]" onClick={() => openActivityEditor(activity)} type="button">
                  <Pencil aria-hidden className="h-[1em] w-[1em]" />
                </button>
                <button aria-label={bg ? "Изтриване на събитие" : "Delete event"} className="border-0 bg-transparent p-0 text-[var(--ink-muted)] hover:text-rose-600" onClick={() => void deleteActivity(activity.id)} type="button">
                  <X aria-hidden className="h-[1em] w-[1em]" />
                </button>
              </div>
            </div>
          </li>
        ))}
      </ol>

      {editingActivity ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="presentation">
          <div aria-modal="true" className="w-full max-w-sm rounded-lg border border-[var(--line)] bg-[var(--surface-1)] p-3 shadow-xl" role="dialog">
            <div className="flex items-center justify-between gap-2">
              <h5 className="text-xs font-semibold">{bg ? "Редактиране на събитие" : "Edit event"}</h5>
              <button aria-label={bg ? "Затвори" : "Close"} className="border-0 bg-transparent p-0 text-sm text-[var(--ink-muted)]" onClick={() => setEditingActivity(null)} type="button">×</button>
            </div>
            <div className="mt-2 grid gap-2">
              <select aria-label={bg ? "Вид активност" : "Activity type"} className="rounded border border-[var(--line)] px-2 py-1.5 text-xs" onChange={(event) => setEditType(event.target.value as ApplicationActivityType)} value={editType}>
                {ACTIVITY_TYPES.map((type) => <option key={type} value={type}>{type.replaceAll("_", " ")}</option>)}
              </select>
              <input aria-label={bg ? "Дата на събитието" : "Event date"} className="composer-date-input rounded border border-[var(--line)] px-2 py-1.5 text-xs" onChange={(event) => setEditOccurredAt(event.target.value)} type="datetime-local" value={editOccurredAt} />
              <textarea aria-label={bg ? "Описание" : "Summary"} className="min-h-20 resize-y rounded border border-[var(--line)] px-2 py-1.5 text-xs" onChange={(event) => setEditSummary(event.target.value)} value={editSummary} />
            </div>
            <div className="mt-3 flex justify-end gap-2">
              <button className="rounded border border-[var(--line)] px-2 py-1 text-xs" onClick={() => setEditingActivity(null)} type="button">{bg ? "Отказ" : "Cancel"}</button>
              <button className="rounded bg-[var(--accent)] px-2 py-1 text-xs font-semibold text-white disabled:opacity-50" disabled={busy || !editSummary.trim() || !editOccurredAt} onClick={() => void saveActivityEdit()} type="button">{bg ? "Запази" : "Save"}</button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
