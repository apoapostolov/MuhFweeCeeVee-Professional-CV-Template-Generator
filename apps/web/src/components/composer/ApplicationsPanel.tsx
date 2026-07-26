"use client";

import { useCallback, useEffect, useMemo, useState, type JSX } from "react";

const APPLICATION_STATUSES = [
  "wishlist",
  "applied",
  "interview",
  "offer",
  "rejected",
  "ghosted",
] as const;

type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

type Application = {
  id: string;
  company_id?: string;
  job_id?: string;
  company_name: string;
  job_title: string;
  status: ApplicationStatus;
  url?: string;
  notes?: string;
  updated_at: string;
  created_at: string;
};

export type ApplicationsPanelProps = {
  language: string;
  defaultCompanyId?: string;
  defaultJobId?: string;
  defaultCompanyName?: string;
  defaultJobTitle?: string;
};

export function ApplicationsPanel(props: ApplicationsPanelProps): JSX.Element {
  const {
    language,
    defaultCompanyId,
    defaultJobId,
    defaultCompanyName,
    defaultJobTitle,
  } = props;
  const [applications, setApplications] = useState<Application[]>([]);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    const response = await fetch("/api/applications");
    const payload = (await response.json()) as { applications?: Application[] };
    setApplications(payload.applications ?? []);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const byStatus = useMemo(() => {
    const map = new Map<ApplicationStatus, Application[]>();
    for (const status of APPLICATION_STATUSES) {
      map.set(
        status,
        applications.filter((app) => app.status === status),
      );
    }
    return map;
  }, [applications]);

  async function upsert(app: Partial<Application> & { company_name: string; job_title: string }) {
    setBusy(true);
    setNotice("");
    try {
      const response = await fetch("/api/applications", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "upsert", ...app }),
      });
      const payload = (await response.json()) as {
        error?: string;
        applications?: Application[];
      };
      if (!response.ok) {
        setNotice(payload.error ?? "Save failed.");
        return;
      }
      setApplications(payload.applications ?? []);
    } catch {
      setNotice("Save failed.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    setBusy(true);
    try {
      const response = await fetch("/api/applications", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "delete", id }),
      });
      const payload = (await response.json()) as { applications?: Application[] };
      setApplications(payload.applications ?? []);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--line)] bg-white px-4 py-3">
        <div>
          <h3 className="text-lg font-bold text-slate-900">
            {language === "bg" ? "Кандидатствания" : "Applications"}
          </h3>
          <p className="text-xs text-[var(--ink-muted)]">
            {language === "bg"
              ? "Лека дъска по статус. Може да добавите от текущата Research цел."
              : "Lightweight status board. Add from the current Research target."}
          </p>
        </div>
        <button
          className="rounded-md bg-[var(--accent)] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
          disabled={busy || !defaultCompanyName || !defaultJobTitle}
          onClick={() =>
            void upsert({
              company_id: defaultCompanyId,
              job_id: defaultJobId,
              company_name: defaultCompanyName || "Company",
              job_title: defaultJobTitle || "Role",
              status: "wishlist",
            })
          }
          type="button"
        >
          {language === "bg" ? "Добави текущата цел" : "Add current target"}
        </button>
      </div>

      {notice ? (
        <p className="rounded-md border border-[var(--line)] bg-white px-3 py-2 text-xs">{notice}</p>
      ) : null}

      <div className="grid min-h-0 flex-1 gap-3 overflow-auto md:grid-cols-3 xl:grid-cols-6">
        {APPLICATION_STATUSES.map((status) => (
          <div
            className="flex min-h-[12rem] flex-col rounded-xl border border-[var(--line)] bg-white p-2"
            key={status}
          >
            <p className="px-1 text-xs font-semibold uppercase tracking-wide text-slate-700">
              {status}
            </p>
            <ul className="mt-2 flex-1 space-y-2 overflow-auto">
              {(byStatus.get(status) ?? []).map((app) => (
                <li
                  className="rounded-md border border-[var(--line)] bg-[var(--surface-1)] p-2 text-xs"
                  key={app.id}
                >
                  <p className="font-semibold text-slate-900">{app.job_title}</p>
                  <p className="text-[var(--ink-muted)]">{app.company_name}</p>
                  <label className="mt-2 block text-[10px] font-medium text-slate-600">
                    Status
                    <select
                      className="mt-0.5 w-full rounded border border-[var(--line)] bg-white px-1 py-1 text-xs"
                      disabled={busy}
                      onChange={(event) =>
                        void upsert({
                          ...app,
                          status: event.target.value as ApplicationStatus,
                        })
                      }
                      value={app.status}
                    >
                      {APPLICATION_STATUSES.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    className="mt-2 text-[10px] font-semibold text-rose-700"
                    disabled={busy}
                    onClick={() => void remove(app.id)}
                    type="button"
                  >
                    {language === "bg" ? "Премахни" : "Remove"}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
