"use client";

import { useEffect, useState, type JSX } from "react";

import type { ApplicationAnalytics } from "@/lib/server/applicationAnalytics";

export function ApplicationAnalyticsView({
  language,
}: {
  language: string;
}): JSX.Element {
  const [analytics, setAnalytics] = useState<ApplicationAnalytics | null>(null);
  const [error, setError] = useState("");
  const bg = language === "bg";

  useEffect(() => {
    let active = true;
    void fetch("/api/applications/analytics")
      .then(async (response) => {
        const payload = (await response.json()) as {
          error?: string;
          analytics?: ApplicationAnalytics;
        };
        if (!response.ok || !payload.analytics) {
          throw new Error(payload.error ?? "Analytics unavailable.");
        }
        if (active) setAnalytics(payload.analytics);
      })
      .catch((reason) => {
        if (active) {
          setError(reason instanceof Error ? reason.message : "Analytics unavailable.");
        }
      });
    return () => {
      active = false;
    };
  }, []);

  if (error) {
    return (
      <p className="rounded-md border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800" role="alert">
        {error}
      </p>
    );
  }
  if (!analytics) {
    return (
      <div aria-busy="true" className="space-y-2" aria-label="Loading analytics">
        {Array.from({ length: 3 }).map((_, index) => (
          <div className="h-16 animate-pulse rounded-md bg-[var(--surface-2)]" key={index} />
        ))}
      </div>
    );
  }

  const metrics = [
    [bg ? "Подадени" : "Submitted", analytics.totals.submitted],
    [bg ? "Отговори" : "Responses", analytics.totals.responses],
    [bg ? "Интервюта" : "Interviews", analytics.totals.interviews],
    [bg ? "Оферти" : "Offers", analytics.totals.offers],
  ] as const;

  return (
    <div className="space-y-4">
      <section aria-labelledby="funnel-heading">
        <h3 className="text-sm font-semibold" id="funnel-heading">
          {bg ? "Фуния" : "Conversion funnel"}
        </h3>
        <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {metrics.map(([label, value]) => (
            <div className="rounded-md border border-[var(--line)] bg-white p-3" key={label}>
              <p className="text-[10px] uppercase tracking-wide text-[var(--ink-muted)]">
                {label}
              </p>
              <p className="mt-1 text-2xl font-bold tabular-nums">{value}</p>
            </div>
          ))}
        </div>
        <div className="mt-2 flex flex-wrap gap-2 text-xs">
          <span className="rounded bg-[var(--surface-2)] px-2 py-1">
            {bg ? "Отговор" : "Response"}: {analytics.conversion.responseRate}%
          </span>
          <span className="rounded bg-[var(--surface-2)] px-2 py-1">
            {bg ? "Интервю" : "Interview"}: {analytics.conversion.interviewRate}%
          </span>
          <span className="rounded bg-[var(--surface-2)] px-2 py-1">
            {bg ? "Оферта" : "Offer"}: {analytics.conversion.offerRate}%
          </span>
        </div>
      </section>

      <div className="grid gap-3 lg:grid-cols-2">
        {[
          {
            title: bg ? "По източник" : "By source",
            rows: analytics.bySource,
          },
          {
            title: bg ? "По семейство роли" : "By role family",
            rows: analytics.byRoleFamily,
          },
        ].map((group) => (
          <section
            className="rounded-md border border-[var(--line)] bg-white p-3"
            key={group.title}
          >
            <h3 className="text-sm font-semibold">{group.title}</h3>
            {group.rows.length === 0 ? (
              <p className="mt-2 text-xs text-[var(--ink-muted)]">
                {bg ? "Няма достатъчно данни." : "Not enough data yet."}
              </p>
            ) : (
              <table className="mt-2 w-full text-left text-xs">
                <thead className="text-[10px] uppercase text-[var(--ink-muted)]">
                  <tr>
                    <th className="py-1 font-semibold">{bg ? "Група" : "Group"}</th>
                    <th className="py-1 text-right font-semibold">{bg ? "Канд." : "Apps"}</th>
                    <th className="py-1 text-right font-semibold">{bg ? "Инт." : "Int."}</th>
                    <th className="py-1 text-right font-semibold">{bg ? "Оф." : "Off."}</th>
                  </tr>
                </thead>
                <tbody>
                  {group.rows.slice(0, 10).map((row) => (
                    <tr className="border-t border-[var(--line)]" key={row.name}>
                      <td className="max-w-48 truncate py-1.5">{row.name}</td>
                      <td className="py-1.5 text-right tabular-nums">{row.applications}</td>
                      <td className="py-1.5 text-right tabular-nums">{row.interviews}</td>
                      <td className="py-1.5 text-right tabular-nums">{row.offers}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        ))}
      </div>

      <section className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-950">
        <h3 className="font-semibold">{bg ? "Качество на данните" : "Data quality"}</h3>
        <p className="mt-1">
          {analytics.dataQuality.applicationsWithoutTimeline}{" "}
          {bg ? "кандидатствания без timeline;" : "applications lack timeline history;"}{" "}
          {analytics.dataQuality.submittedWithoutSnapshot}{" "}
          {bg ? "подадени без immutable snapshot." : "submitted records lack an immutable snapshot."}
        </p>
        <p className="mt-1 text-[10px]">
          {bg
            ? "Показателите са описателни; непълната история намалява надеждността."
            : "Metrics are descriptive; incomplete history lowers confidence."}
        </p>
      </section>
    </div>
  );
}
