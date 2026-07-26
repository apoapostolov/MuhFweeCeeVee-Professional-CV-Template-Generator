"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type JSX } from "react";

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
  cv_id?: string;
  photo_id?: string;
  cover_letter_id?: string;
  packet_title?: string;
  updated_at: string;
  created_at: string;
};

type CvOption = { id: string; displayName?: string };
type PhotoOption = { id: string; name: string; mediaUrl?: string };
type LetterOption = { id: string; title: string };
type CompanyOption = { id: string; name: string };
type JobOption = { id: string; title: string; company_id: string };

export type ApplicationsPanelProps = {
  language: string;
  defaultCompanyId?: string;
  defaultJobId?: string;
  defaultCompanyName?: string;
  defaultJobTitle?: string;
  /** Current Editor CV — used when creating packets. */
  defaultCvId?: string;
  /** Approved photo booth id — used when creating packets. */
  defaultPhotoId?: string;
};

function emptyDraft(): Omit<Application, "id" | "created_at" | "updated_at"> & {
  id?: string;
} {
  return {
    company_name: "",
    job_title: "",
    status: "wishlist",
    notes: "",
    url: "",
    company_id: "",
    job_id: "",
    cv_id: "",
    photo_id: "",
    cover_letter_id: "",
    packet_title: "",
  };
}

function Chip({
  label,
  ok,
}: {
  label: string;
  ok: boolean;
}): JSX.Element {
  return (
    <span
      className={`inline-flex rounded px-1 py-0.5 text-[9px] font-semibold uppercase tracking-wide ${
        ok
          ? "bg-[var(--accent-soft)] text-slate-800"
          : "bg-[var(--surface-2)] text-[var(--ink-muted)]"
      }`}
      title={ok ? `${label} linked` : `${label} missing`}
    >
      {label}
      {ok ? " ✓" : ""}
    </span>
  );
}

export function ApplicationsPanel(props: ApplicationsPanelProps): JSX.Element {
  const {
    language,
    defaultCompanyId,
    defaultJobId,
    defaultCompanyName,
    defaultJobTitle,
    defaultCvId,
    defaultPhotoId,
  } = props;

  const [applications, setApplications] = useState<Application[]>([]);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [editorOpen, setEditorOpen] = useState(false);
  const [draft, setDraft] = useState(emptyDraft());

  const [cvOptions, setCvOptions] = useState<CvOption[]>([]);
  const [photoOptions, setPhotoOptions] = useState<PhotoOption[]>([]);
  const [letterOptions, setLetterOptions] = useState<LetterOption[]>([]);
  const [companyOptions, setCompanyOptions] = useState<CompanyOption[]>([]);
  const [jobOptions, setJobOptions] = useState<JobOption[]>([]);

  const importInputRef = useRef<HTMLInputElement>(null);

  const bg = language === "bg";

  const loadBoard = useCallback(async () => {
    const response = await fetch("/api/applications");
    const payload = (await response.json()) as { applications?: Application[] };
    setApplications(payload.applications ?? []);
  }, []);

  const loadLookups = useCallback(async () => {
    const [cvsRes, photosRes, lettersRes, researchRes] = await Promise.all([
      fetch("/api/cvs"),
      fetch("/api/photos"),
      fetch("/api/cover-letters"),
      fetch("/api/research/catalog"),
    ]);
    const cvsPayload = (await cvsRes.json()) as { items?: CvOption[] };
    setCvOptions(cvsPayload.items ?? []);
    const photosPayload = (await photosRes.json()) as { items?: PhotoOption[] };
    setPhotoOptions(photosPayload.items ?? []);
    const lettersPayload = (await lettersRes.json()) as { items?: LetterOption[] };
    setLetterOptions(lettersPayload.items ?? []);
    const researchPayload = (await researchRes.json()) as {
      catalog?: {
        companies?: CompanyOption[];
        job_positions?: JobOption[];
      };
      companies?: CompanyOption[];
      job_positions?: JobOption[];
    };
    const companies =
      researchPayload.catalog?.companies ?? researchPayload.companies ?? [];
    const jobs =
      researchPayload.catalog?.job_positions ?? researchPayload.job_positions ?? [];
    setCompanyOptions(companies);
    setJobOptions(jobs);
  }, []);

  useEffect(() => {
    void loadBoard();
    void loadLookups();
  }, [loadBoard, loadLookups]);

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

  const jobsForCompany = useMemo(() => {
    const companyId = draft.company_id?.trim();
    if (!companyId) return jobOptions;
    return jobOptions.filter((job) => job.company_id === companyId);
  }, [draft.company_id, jobOptions]);

  function openNew() {
    setDraft({
      ...emptyDraft(),
      company_id: defaultCompanyId || "",
      job_id: defaultJobId || "",
      company_name: defaultCompanyName || "",
      job_title: defaultJobTitle || "",
      cv_id: defaultCvId || "",
      photo_id: defaultPhotoId || "",
      packet_title:
        defaultJobTitle || defaultCompanyName
          ? `${defaultJobTitle || "Role"} @ ${defaultCompanyName || "Company"}`
          : "",
      status: "wishlist",
    });
    setEditorOpen(true);
    setNotice("");
  }

  function openEdit(app: Application) {
    setDraft({
      id: app.id,
      company_id: app.company_id || "",
      job_id: app.job_id || "",
      company_name: app.company_name,
      job_title: app.job_title,
      status: app.status,
      url: app.url || "",
      notes: app.notes || "",
      cv_id: app.cv_id || "",
      photo_id: app.photo_id || "",
      cover_letter_id: app.cover_letter_id || "",
      packet_title: app.packet_title || "",
    });
    setEditorOpen(true);
    setNotice("");
  }

  async function saveDraft() {
    if (!draft.company_name.trim() || !draft.job_title.trim()) {
      setNotice(
        bg
          ? "Име на компания и позиция са задължителни."
          : "Company name and job title are required.",
      );
      return;
    }
    setBusy(true);
    setNotice("");
    try {
      const response = await fetch("/api/applications", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "upsert",
          id: draft.id,
          company_id: draft.company_id || undefined,
          job_id: draft.job_id || undefined,
          company_name: draft.company_name,
          job_title: draft.job_title,
          status: draft.status,
          url: draft.url || undefined,
          notes: draft.notes || undefined,
          cv_id: draft.cv_id || "",
          photo_id: draft.photo_id || "",
          cover_letter_id: draft.cover_letter_id || "",
          packet_title: draft.packet_title || undefined,
        }),
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
      setEditorOpen(false);
      setNotice(bg ? "Пакетът е записан." : "Packet saved.");
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
      if (draft.id === id) {
        setEditorOpen(false);
        setDraft(emptyDraft());
      }
    } finally {
      setBusy(false);
    }
  }

  async function setStatus(app: Application, status: ApplicationStatus) {
    setBusy(true);
    try {
      const response = await fetch("/api/applications", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "upsert",
          ...app,
          status,
        }),
      });
      const payload = (await response.json()) as { applications?: Application[] };
      if (response.ok) {
        setApplications(payload.applications ?? []);
      }
    } finally {
      setBusy(false);
    }
  }

  async function exportPacket(id: string) {
    setBusy(true);
    setNotice("");
    try {
      const response = await fetch(`/api/applications?export=${encodeURIComponent(id)}`);
      const payload = (await response.json()) as {
        error?: string;
        packet?: unknown;
      };
      if (!response.ok || !payload.packet) {
        setNotice(payload.error ?? "Export failed.");
        return;
      }
      const blob = new Blob([JSON.stringify(payload.packet, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      const app = applications.find((a) => a.id === id);
      const slug = (app?.packet_title || app?.job_title || "packet")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .slice(0, 40);
      anchor.href = url;
      anchor.download = `mfcv-packet-${slug || id}.json`;
      anchor.click();
      URL.revokeObjectURL(url);
      setNotice(bg ? "Пакетът е експортиран." : "Packet exported.");
    } catch {
      setNotice("Export failed.");
    } finally {
      setBusy(false);
    }
  }

  async function importPacketFile(file: File) {
    setBusy(true);
    setNotice("");
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as unknown;
      const packet =
        parsed &&
        typeof parsed === "object" &&
        (parsed as { format?: string }).format === "muhfweeceevee.application_packet"
          ? parsed
          : parsed &&
              typeof parsed === "object" &&
              (parsed as { packet?: unknown }).packet
            ? (parsed as { packet: unknown }).packet
            : parsed;

      const response = await fetch("/api/applications", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "import",
          packet,
          restoreCv: true,
          restoreLetter: true,
        }),
      });
      const payload = (await response.json()) as {
        error?: string;
        applications?: Application[];
        application?: Application;
        restored?: string[];
      };
      if (!response.ok) {
        setNotice(payload.error ?? "Import failed.");
        return;
      }
      setApplications(payload.applications ?? []);
      if (payload.application) {
        openEdit(payload.application);
      }
      const restored = payload.restored?.length
        ? ` Restored: ${payload.restored.join(", ")}.`
        : "";
      setNotice(
        (bg ? "Пакетът е импортиран." : "Packet imported.") + restored,
      );
      void loadLookups();
    } catch {
      setNotice(bg ? "Невалиден JSON пакет." : "Invalid packet JSON.");
    } finally {
      setBusy(false);
      if (importInputRef.current) {
        importInputRef.current.value = "";
      }
    }
  }

  async function reusePacket(app: Application) {
    setBusy(true);
    setNotice("");
    try {
      const response = await fetch("/api/applications", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "duplicate",
          id: app.id,
          overrides: {
            // Keep CV + photo; clear letter for the new company
            cv_id: app.cv_id,
            photo_id: app.photo_id,
            cover_letter_id: "",
            status: "wishlist",
            packet_title: app.packet_title
              ? `${app.packet_title} (reuse)`
              : `${app.job_title} @ ${app.company_name} (reuse)`,
          },
        }),
      });
      const payload = (await response.json()) as {
        error?: string;
        applications?: Application[];
        application?: Application;
      };
      if (!response.ok) {
        setNotice(payload.error ?? "Reuse failed.");
        return;
      }
      setApplications(payload.applications ?? []);
      if (payload.application) {
        openEdit(payload.application);
      }
      setNotice(
        bg
          ? "Нов пакет с същите CV/снимка — редактирайте компанията."
          : "New packet with same CV/photo — edit company for the new target.",
      );
    } catch {
      setNotice("Reuse failed.");
    } finally {
      setBusy(false);
    }
  }

  function onCompanySelect(companyId: string) {
    const company = companyOptions.find((c) => c.id === companyId);
    setDraft((prev) => ({
      ...prev,
      company_id: companyId,
      company_name: company?.name || prev.company_name,
      job_id: "",
    }));
  }

  function onJobSelect(jobId: string) {
    const job = jobOptions.find((j) => j.id === jobId);
    setDraft((prev) => ({
      ...prev,
      job_id: jobId,
      job_title: job?.title || prev.job_title,
      company_id: job?.company_id || prev.company_id,
      company_name:
        companyOptions.find((c) => c.id === (job?.company_id || prev.company_id))
          ?.name || prev.company_name,
    }));
  }

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3 overflow-x-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--line)] bg-white px-4 py-3">
        <div className="min-w-0">
          <h3 className="text-lg font-bold text-slate-900">
            {bg ? "Кандидатствания · пакети" : "Applications · packets"}
          </h3>
          <p className="text-xs text-[var(--ink-muted)]">
            {bg
              ? "Пакет = CV + снимка + компания + писмо. Редактирайте, експорт, импорт, преизползване."
              : "Packet = CV + photo + company + letter. Edit anytime, export, import, reuse."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            className="rounded-md bg-[var(--accent)] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
            disabled={busy}
            onClick={openNew}
            type="button"
          >
            {bg ? "Нов пакет" : "New packet"}
          </button>
          <button
            className="rounded-md border border-[var(--line)] bg-white px-3 py-1.5 text-xs font-semibold disabled:opacity-60"
            disabled={busy || !defaultCompanyName || !defaultJobTitle}
            onClick={() => {
              openNew();
            }}
            title={
              bg
                ? "Попълва от Research цел + текущо CV/снимка"
                : "Prefills from Research target + current CV/photo"
            }
            type="button"
          >
            {bg ? "От текущата цел" : "From current target"}
          </button>
          <button
            className="rounded-md border border-[var(--line)] bg-white px-3 py-1.5 text-xs font-semibold disabled:opacity-60"
            disabled={busy}
            onClick={() => importInputRef.current?.click()}
            type="button"
          >
            {bg ? "Импорт…" : "Import…"}
          </button>
          <input
            accept="application/json,.json"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void importPacketFile(file);
            }}
            ref={importInputRef}
            type="file"
          />
        </div>
      </div>

      {notice ? (
        <p className="rounded-md border border-[var(--line)] bg-white px-3 py-2 text-xs">
          {notice}
        </p>
      ) : null}

      <div className="grid min-h-0 flex-1 gap-3 overflow-x-hidden overflow-y-auto md:grid-cols-[minmax(0,1fr)_minmax(280px,360px)]">
        <div className="grid min-h-0 min-w-0 gap-3 overflow-x-hidden overflow-y-auto md:grid-cols-3 xl:grid-cols-6">
          {APPLICATION_STATUSES.map((status) => (
            <div
              className="flex min-h-[12rem] min-w-0 flex-col rounded-xl border border-[var(--line)] bg-white p-2"
              key={status}
            >
              <p className="px-1 text-xs font-semibold uppercase tracking-wide text-slate-700">
                {status}
              </p>
              <ul className="mt-2 flex-1 space-y-2 overflow-x-hidden overflow-y-auto">
                {(byStatus.get(status) ?? []).map((app) => {
                  const hasCv = Boolean(app.cv_id);
                  const hasPhoto = Boolean(app.photo_id);
                  const hasCompany = Boolean(app.company_id || app.company_name);
                  const hasLetter = Boolean(app.cover_letter_id);
                  return (
                    <li
                      className={`rounded-md border p-2 text-xs ${
                        draft.id === app.id && editorOpen
                          ? "border-[var(--accent)] bg-[var(--accent-soft)]"
                          : "border-[var(--line)] bg-[var(--surface-1)]"
                      }`}
                      key={app.id}
                    >
                      <button
                        className="w-full min-w-0 text-left"
                        onClick={() => openEdit(app)}
                        type="button"
                      >
                        <p className="truncate font-semibold text-slate-900">
                          {app.packet_title || app.job_title}
                        </p>
                        <p className="truncate text-[var(--ink-muted)]">
                          {app.company_name}
                          {app.packet_title ? ` · ${app.job_title}` : ""}
                        </p>
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          <Chip label="CV" ok={hasCv} />
                          <Chip label="Photo" ok={hasPhoto} />
                          <Chip label="Co" ok={hasCompany} />
                          <Chip label="Letter" ok={hasLetter} />
                        </div>
                      </button>
                      <label className="mt-2 block text-[10px] font-medium text-slate-600">
                        Status
                        <select
                          className="mt-0.5 w-full rounded border border-[var(--line)] bg-[var(--surface-1)] px-1 py-1 text-xs"
                          disabled={busy}
                          onChange={(event) =>
                            void setStatus(app, event.target.value as ApplicationStatus)
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
                      <div className="mt-2 flex flex-wrap gap-x-2 gap-y-1">
                        <button
                          className="text-[10px] font-semibold text-slate-800 underline"
                          disabled={busy}
                          onClick={() => openEdit(app)}
                          type="button"
                        >
                          {bg ? "Редакция" : "Edit"}
                        </button>
                        <button
                          className="text-[10px] font-semibold text-slate-800 underline"
                          disabled={busy}
                          onClick={() => void exportPacket(app.id)}
                          type="button"
                        >
                          {bg ? "Експорт" : "Export"}
                        </button>
                        <button
                          className="text-[10px] font-semibold text-slate-800 underline"
                          disabled={busy}
                          onClick={() => void reusePacket(app)}
                          title={
                            bg
                              ? "Нов пакет със същите CV и снимка"
                              : "New packet reusing CV and photo"
                          }
                          type="button"
                        >
                          {bg ? "Преизползвай" : "Reuse"}
                        </button>
                        <button
                          className="text-[10px] font-semibold text-rose-700"
                          disabled={busy}
                          onClick={() => void remove(app.id)}
                          type="button"
                        >
                          {bg ? "Премахни" : "Remove"}
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>

        {/* Always-available packet editor */}
        <aside className="flex min-h-0 min-w-0 flex-col rounded-xl border border-[var(--line)] bg-white p-3">
          <p className="text-sm font-semibold text-slate-900">
            {editorOpen
              ? draft.id
                ? bg
                  ? "Редакция на пакет"
                  : "Edit packet"
                : bg
                  ? "Нов пакет"
                  : "New packet"
              : bg
                ? "Пакет"
                : "Packet"}
          </p>
          <p className="mt-0.5 text-[10px] text-[var(--ink-muted)]">
            {bg
              ? "CV · снимка · компания · писмо — винаги редактируеми."
              : "CV · photo · company · letter — always editable."}
          </p>

          {!editorOpen ? (
            <div className="mt-4 flex flex-1 flex-col items-start justify-center gap-2 text-xs text-[var(--ink-muted)]">
              <p>
                {bg
                  ? "Изберете карта или създайте нов пакет."
                  : "Select a card or create a new packet."}
              </p>
              <button
                className="rounded-md bg-[var(--accent)] px-3 py-1.5 text-xs font-semibold text-white"
                onClick={openNew}
                type="button"
              >
                {bg ? "Нов пакет" : "New packet"}
              </button>
            </div>
          ) : (
            <div className="mt-3 flex min-h-0 flex-1 flex-col gap-2 overflow-x-hidden overflow-y-auto">
              <label className="block text-[10px] font-medium text-slate-700">
                {bg ? "Заглавие на пакет" : "Packet title"}
                <input
                  className="mt-0.5 w-full rounded border border-[var(--line)] bg-[var(--surface-1)] px-2 py-1.5 text-xs"
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, packet_title: e.target.value }))
                  }
                  value={draft.packet_title || ""}
                />
              </label>

              <label className="block text-[10px] font-medium text-slate-700">
                CV
                <select
                  className="mt-0.5 w-full rounded border border-[var(--line)] bg-[var(--surface-1)] px-2 py-1.5 text-xs"
                  onChange={(e) => setDraft((d) => ({ ...d, cv_id: e.target.value }))}
                  value={draft.cv_id || ""}
                >
                  <option value="">—</option>
                  {cvOptions.map((cv) => (
                    <option key={cv.id} value={cv.id}>
                      {cv.displayName || cv.id}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-[10px] font-medium text-slate-700">
                {bg ? "Снимка" : "Photo"}
                <select
                  className="mt-0.5 w-full rounded border border-[var(--line)] bg-[var(--surface-1)] px-2 py-1.5 text-xs"
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, photo_id: e.target.value }))
                  }
                  value={draft.photo_id || ""}
                >
                  <option value="">—</option>
                  {photoOptions.map((photo) => (
                    <option key={photo.id} value={photo.id}>
                      {photo.name || photo.id}
                    </option>
                  ))}
                </select>
              </label>

              {draft.photo_id ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  alt=""
                  className="h-16 w-16 rounded border border-[var(--line)] object-cover"
                  src={
                    photoOptions.find((p) => p.id === draft.photo_id)?.mediaUrl ||
                    `/api/photos/raw?id=${encodeURIComponent(draft.photo_id)}`
                  }
                />
              ) : null}

              <label className="block text-[10px] font-medium text-slate-700">
                {bg ? "Компания (Research)" : "Company (Research)"}
                <select
                  className="mt-0.5 w-full rounded border border-[var(--line)] bg-[var(--surface-1)] px-2 py-1.5 text-xs"
                  onChange={(e) => onCompanySelect(e.target.value)}
                  value={draft.company_id || ""}
                >
                  <option value="">— {bg ? "ръчно име" : "manual name"} —</option>
                  {companyOptions.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-[10px] font-medium text-slate-700">
                {bg ? "Име на компания" : "Company name"}
                <input
                  className="mt-0.5 w-full rounded border border-[var(--line)] bg-[var(--surface-1)] px-2 py-1.5 text-xs"
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, company_name: e.target.value }))
                  }
                  value={draft.company_name}
                />
              </label>

              <label className="block text-[10px] font-medium text-slate-700">
                {bg ? "Позиция (Research)" : "Job (Research)"}
                <select
                  className="mt-0.5 w-full rounded border border-[var(--line)] bg-[var(--surface-1)] px-2 py-1.5 text-xs"
                  onChange={(e) => onJobSelect(e.target.value)}
                  value={draft.job_id || ""}
                >
                  <option value="">— {bg ? "ръчно" : "manual"} —</option>
                  {jobsForCompany.map((j) => (
                    <option key={j.id} value={j.id}>
                      {j.title}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-[10px] font-medium text-slate-700">
                {bg ? "Заглавие на позиция" : "Job title"}
                <input
                  className="mt-0.5 w-full rounded border border-[var(--line)] bg-[var(--surface-1)] px-2 py-1.5 text-xs"
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, job_title: e.target.value }))
                  }
                  value={draft.job_title}
                />
              </label>

              <label className="block text-[10px] font-medium text-slate-700">
                {bg ? "Писмо" : "Cover letter"}
                <select
                  className="mt-0.5 w-full rounded border border-[var(--line)] bg-[var(--surface-1)] px-2 py-1.5 text-xs"
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, cover_letter_id: e.target.value }))
                  }
                  value={draft.cover_letter_id || ""}
                >
                  <option value="">—</option>
                  {letterOptions.map((letter) => (
                    <option key={letter.id} value={letter.id}>
                      {letter.title || letter.id}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-[10px] font-medium text-slate-700">
                Status
                <select
                  className="mt-0.5 w-full rounded border border-[var(--line)] bg-[var(--surface-1)] px-2 py-1.5 text-xs"
                  onChange={(e) =>
                    setDraft((d) => ({
                      ...d,
                      status: e.target.value as ApplicationStatus,
                    }))
                  }
                  value={draft.status}
                >
                  {APPLICATION_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-[10px] font-medium text-slate-700">
                URL
                <input
                  className="mt-0.5 w-full rounded border border-[var(--line)] bg-[var(--surface-1)] px-2 py-1.5 text-xs"
                  onChange={(e) => setDraft((d) => ({ ...d, url: e.target.value }))}
                  value={draft.url || ""}
                />
              </label>

              <label className="block text-[10px] font-medium text-slate-700">
                {bg ? "Бележки" : "Notes"}
                <textarea
                  className="mt-0.5 min-h-[4rem] w-full resize-y rounded border border-[var(--line)] bg-[var(--surface-1)] px-2 py-1.5 text-xs"
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, notes: e.target.value }))
                  }
                  value={draft.notes || ""}
                />
              </label>

              <div className="mt-auto flex flex-wrap gap-2 pt-2">
                <button
                  className="rounded-md bg-[var(--accent)] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
                  disabled={busy}
                  onClick={() => void saveDraft()}
                  type="button"
                >
                  {bg ? "Запази пакет" : "Save packet"}
                </button>
                {draft.id ? (
                  <button
                    className="rounded-md border border-[var(--line)] bg-white px-3 py-1.5 text-xs font-semibold disabled:opacity-60"
                    disabled={busy}
                    onClick={() => void exportPacket(draft.id!)}
                    type="button"
                  >
                    {bg ? "Експорт" : "Export"}
                  </button>
                ) : null}
                <button
                  className="rounded-md border border-[var(--line)] bg-white px-3 py-1.5 text-xs font-semibold"
                  disabled={busy}
                  onClick={() => {
                    setEditorOpen(false);
                    setDraft(emptyDraft());
                  }}
                  type="button"
                >
                  {bg ? "Затвори" : "Close"}
                </button>
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
