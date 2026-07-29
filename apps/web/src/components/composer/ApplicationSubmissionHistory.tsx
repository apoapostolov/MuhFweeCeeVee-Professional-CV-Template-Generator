"use client";

import { useEffect, useState, type JSX } from "react";
import { Download, LockKeyhole } from "lucide-react";

import type { ApplicationSubmissionComparison } from "@/lib/server/applicationSubmissionStore";

import type { Application } from "./application-operations-types";

export function ApplicationSubmissionHistory({
  application,
  language,
  templateId,
  theme,
  disabled,
  onChanged,
}: {
  application: Application;
  language: string;
  templateId?: string;
  theme?: string;
  disabled?: boolean;
  onChanged: (message: string) => void;
}): JSX.Element {
  const [source, setSource] = useState(application.source ?? "");
  const [reference, setReference] = useState("");
  const [busy, setBusy] = useState(false);
  const [comparison, setComparison] =
    useState<ApplicationSubmissionComparison | null>(null);
  const bg = language === "bg";
  const snapshots = application.submission_snapshots ?? [];

  useEffect(() => {
    let active = true;
    void fetch(`/api/applications/${encodeURIComponent(application.id)}`)
      .then((response) => response.json())
      .then((payload: { submissionComparison?: ApplicationSubmissionComparison }) => {
        if (active) setComparison(payload.submissionComparison ?? null);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [application.id, snapshots.length]);

  async function freezeSubmission(): Promise<void> {
    if (!templateId) {
      onChanged(
        bg
          ? "Изберете шаблон в Print Room преди подаване."
          : "Select a template in Print Room before submission.",
      );
      return;
    }
    setBusy(true);
    try {
      const response = await fetch(
        `/api/applications/${encodeURIComponent(application.id)}/submissions`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            templateId,
            theme,
            source: source || undefined,
            submissionUrl: application.url,
            confirmationReference: reference || undefined,
          }),
        },
      );
      const payload = (await response.json()) as { error?: string };
      onChanged(
        response.ok
          ? bg
            ? "Подадената версия е замразена с PDF и хешове."
            : "Submitted version frozen with PDF and file hashes."
          : payload.error ?? "Submission snapshot failed.",
      );
    } catch {
      onChanged(bg ? "Подаването не успя." : "Submission snapshot failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="border-t border-[var(--line)] pt-3" aria-labelledby="submission-history-heading">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h4 className="text-xs font-semibold" id="submission-history-heading">
            {bg ? "Подадени версии" : "Submission snapshots"}
          </h4>
          <p className="text-[10px] text-[var(--ink-muted)]">
            {bg
              ? "Неизменяем PDF, CV, писмо, снимка, обява, ATS и хешове."
              : "Immutable PDF, CV, letter, photo, job record, ATS report, and hashes."}
          </p>
        </div>
        <LockKeyhole aria-hidden className="h-4 w-4 text-[var(--ink-muted)]" />
      </div>

      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        <input
          aria-label={bg ? "Източник на кандидатстването" : "Application source"}
          className="rounded border border-[var(--line)] px-2 py-1.5 text-xs"
          onChange={(event) => setSource(event.target.value)}
          placeholder={bg ? "LinkedIn, сайт, препоръка…" : "LinkedIn, careers site, referral…"}
          value={source}
        />
        <input
          aria-label={bg ? "Референтен номер" : "Confirmation reference"}
          className="rounded border border-[var(--line)] px-2 py-1.5 text-xs"
          onChange={(event) => setReference(event.target.value)}
          placeholder={bg ? "Референтен номер (по избор)" : "Confirmation/reference (optional)"}
          value={reference}
        />
      </div>
      <button
        className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-slate-800 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
        disabled={disabled || busy || !application.cv_id}
        onClick={() => void freezeSubmission()}
        type="button"
      >
        <LockKeyhole aria-hidden className="h-3.5 w-3.5" />
        {busy
          ? bg
            ? "Замразяване…"
            : "Freezing…"
          : bg
            ? "Замрази и маркирай като подадено"
            : "Freeze & mark applied"}
      </button>

      {comparison ? (
        <div className="mt-2 rounded-md border border-[var(--line)] bg-[var(--surface-1)] p-2 text-[10px]">
          <p className="font-semibold">
            {bg ? "Подадено срещу работно" : "Submitted vs current working"}
          </p>
          <p className="mt-1">
            CV: {comparison.cv.submittedId}
            {comparison.cv.submittedRevision
              ? ` @ ${comparison.cv.submittedRevision}`
              : ""}
            {" → "}
            {comparison.cv.currentId ?? "none"} ·{" "}
            <strong>
              {comparison.cv.hasChanged
                ? bg
                  ? "променено"
                  : "changed"
                : bg
                  ? "същото"
                  : "unchanged"}
            </strong>
          </p>
          {comparison.coverLetter ? (
            <p>
              {bg ? "Писмо" : "Letter"}: v
              {comparison.coverLetter.submittedVersion ?? "—"} → v
              {comparison.coverLetter.currentVersion ?? "—"} ·{" "}
              {comparison.coverLetter.hasChanged
                ? bg
                  ? "променено"
                  : "changed"
                : bg
                  ? "същото"
                  : "unchanged"}
            </p>
          ) : null}
        </div>
      ) : null}

      {snapshots.length ? (
        <ul className="mt-2 space-y-1.5">
          {snapshots.map((snapshot) => (
            <li
              className="flex items-center justify-between gap-2 rounded border border-[var(--line)] px-2 py-1.5 text-[10px]"
              key={snapshot.id}
            >
              <span className="min-w-0 truncate">
                {new Date(snapshot.submitted_at).toLocaleString()} ·{" "}
                {snapshot.template_id} · {snapshot.cv_sha256.slice(0, 10)}
              </span>
              <a
                className="inline-flex shrink-0 items-center gap-1 font-semibold text-[var(--accent)]"
                href={`/api/applications/${encodeURIComponent(application.id)}/submissions?snapshotId=${encodeURIComponent(snapshot.id)}&asset=cv_pdf`}
              >
                <Download aria-hidden className="h-3 w-3" />
                PDF
              </a>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-[10px] text-[var(--ink-muted)]">
          {bg ? "Все още няма замразена подадена версия." : "No immutable submitted version yet."}
        </p>
      )}
    </section>
  );
}
