"use client";

import { useState, type JSX } from "react";
import { CalendarPlus, UserPlus } from "lucide-react";

import type { ApplicationActivityType } from "@/lib/server/applicationStore";

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
  const [contactName, setContactName] = useState("");
  const [contactRole, setContactRole] = useState("");
  const [busy, setBusy] = useState(false);
  const bg = language === "bg";

  async function request(
    method: "PATCH" | "POST",
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
            className="rounded border border-[var(--line)] px-2 py-1.5 text-xs"
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

      <div className="mt-3 grid gap-2 sm:grid-cols-[auto_1fr_auto]">
        <select
          aria-label={bg ? "Вид активност" : "Activity type"}
          className="rounded border border-[var(--line)] px-2 py-1.5 text-xs"
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
          className="rounded border border-[var(--line)] px-2 py-1.5 text-xs"
          onChange={(event) => setActivitySummary(event.target.value)}
          placeholder={bg ? "Какво се случи?" : "What happened?"}
          value={activitySummary}
        />
        <button
          className="rounded-md border border-[var(--line)] px-2 py-1.5 text-xs font-semibold disabled:opacity-60"
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

      <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
        <input
          aria-label={bg ? "Име на контакт" : "Contact name"}
          className="rounded border border-[var(--line)] px-2 py-1.5 text-xs"
          onChange={(event) => setContactName(event.target.value)}
          placeholder={bg ? "Име на контакт" : "Contact name"}
          value={contactName}
        />
        <input
          aria-label={bg ? "Роля на контакт" : "Contact role"}
          className="rounded border border-[var(--line)] px-2 py-1.5 text-xs"
          onChange={(event) => setContactRole(event.target.value)}
          placeholder={bg ? "Рекрутър, hiring manager…" : "Recruiter, hiring manager…"}
          value={contactRole}
        />
        <button
          className="inline-flex items-center justify-center gap-1 rounded-md border border-[var(--line)] px-2 py-1.5 text-xs font-semibold disabled:opacity-60"
          disabled={disabled || busy || !contactName.trim()}
          onClick={() =>
            void request(
              "POST",
              `/api/applications/${encodeURIComponent(application.id)}/contacts`,
              { name: contactName, role: contactRole || undefined },
              bg ? "Контактът е добавен." : "Contact added.",
            ).then((saved) => {
              if (!saved) return;
              setContactName("");
              setContactRole("");
            })
          }
          type="button"
        >
          <UserPlus aria-hidden className="h-3.5 w-3.5" />
          {bg ? "Контакт" : "Contact"}
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
            <p className="font-semibold">{activity.summary}</p>
            <p className="text-[var(--ink-muted)]">
              {activity.type.replaceAll("_", " ")} ·{" "}
              {new Date(activity.occurred_at).toLocaleString()}
            </p>
          </li>
        ))}
      </ol>
    </section>
  );
}
