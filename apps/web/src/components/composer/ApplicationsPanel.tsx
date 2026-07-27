"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type JSX } from "react";
import { Copy, Download, FolderOpen, Trash2 } from "lucide-react";

import { KanbanFloatingCard, useKanbanDrag } from "./applications-kanban";

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
  /** ISO — clock for days without forward stage progress. */
  status_since?: string;
  updated_at: string;
  created_at: string;
};

function daysWithoutProgress(app: Application): number {
  const since = app.status_since || app.created_at;
  const t = Date.parse(since);
  if (!Number.isFinite(t)) return 0;
  return Math.max(0, Math.floor((Date.now() - t) / (24 * 60 * 60 * 1000)));
}

function formatDaysLabel(days: number, bg: boolean): string {
  if (bg) {
    if (days === 0) return "0д";
    if (days === 1) return "1д";
    return `${days}д`;
  }
  if (days === 0) return "0d";
  if (days === 1) return "1d";
  return `${days}d`;
}

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

const STATUS_LABELS: Record<
  ApplicationStatus,
  { en: string; bg: string }
> = {
  wishlist: { en: "Wishlist", bg: "Желани" },
  applied: { en: "Applied", bg: "Подадени" },
  interview: { en: "Interview", bg: "Интервю" },
  offer: { en: "Offer", bg: "Оферта" },
  rejected: { en: "Rejected", bg: "Отказани" },
  ghosted: { en: "Ghosted", bg: "Без отговор" },
};

function statusLabel(status: ApplicationStatus, bg: boolean): string {
  return bg ? STATUS_LABELS[status].bg : STATUS_LABELS[status].en;
}

function Chip({
  label,
  ok,
  titleOk,
  titleMissing,
}: {
  label: string;
  ok: boolean;
  titleOk: string;
  titleMissing: string;
}): JSX.Element {
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded px-0.5 py-px text-[9px] font-semibold uppercase leading-none tracking-wide ${
        ok
          ? "bg-[var(--accent-soft)] text-slate-800"
          : "bg-[var(--surface-2)] text-[var(--ink-muted)]"
      }`}
      title={ok ? titleOk : titleMissing}
    >
      {label}
      {ok ? "✓" : ""}
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
  const t = {
    pageTitle: bg ? "Кандидатствания" : "Job applications",
    pageSubtitle: bg
      ? "Дъска по статус. Клик за детайли; дърпане на заглавието между колони. Пакет: CV, снимка, компания, писмо."
      : "Status board. Click for details; drag the header between columns. Pack: CV, photo, company, letter.",
    newApplication: bg ? "Ново кандидатстване" : "New application",
    addFromResearch: bg ? "От Research цел" : "Add from Research",
    addFromResearchTitle: bg
      ? "Попълва компания/позиция от Research плюс текущото CV и одобрената снимка"
      : "Fills company/role from Research plus the current CV and approved photo",
    importPacket: bg ? "Отвори пакет…" : "Open packet…",
    importPacketTitle: bg
      ? "Импортира JSON пакет като ново кандидатстване"
      : "Import a saved packet file as a new application",
    exportPacket: bg ? "Изтегли пакет" : "Download pack",
    exportPacketTitle: bg
      ? "Запазва CV, писмо и връзки във файл"
      : "Save CV, letter, and links to a file",
    reuseForSimilar: bg ? "Копирай за друга фирма" : "Copy for similar role",
    reuseTitle: bg
      ? "Нова карта със същото CV и снимка — сменете компанията"
      : "New card with the same CV and photo — change the company",
    open: bg ? "Отвори" : "Open",
    delete: bg ? "Изтрий" : "Delete",
    stage: bg ? "Етап" : "Stage",
    editorIdleTitle: bg ? "Детайли" : "Details",
    editorIdleHint: bg
      ? "Изберете карта от дъската или създайте ново кандидатстване."
      : "Select a card on the board or create a new application.",
    editorNew: bg ? "Ново кандидатстване" : "New application",
    editorEdit: bg ? "Редакция" : "Edit application",
    editorHint: bg
      ? "Свържете CV, снимка, компания и писмо. Може да променяте по всяко време."
      : "Link a CV, photo, company, and cover letter. Editable anytime.",
    applicationName: bg ? "Име на картата" : "Card name",
    applicationNameHint: bg
      ? "Кратко име за дъската (напр. „Acme — Senior FE“)"
      : "Short board label (e.g. “Acme — Senior FE”)",
    resumeCv: bg ? "CV / автобиография" : "Resume (CV)",
    noneSelected: bg ? "— не е избрано —" : "— none selected —",
    profilePhoto: bg ? "Профилна снимка" : "Profile photo",
    researchCompany: bg ? "Компания от Research" : "Company from Research",
    typeCompanyBelow: bg ? "— въведете име по-долу —" : "— type name below —",
    companyDisplayName: bg ? "Име на компанията" : "Company name",
    researchRole: bg ? "Позиция от Research" : "Role from Research",
    typeRoleBelow: bg ? "— въведете позиция по-долу —" : "— type role below —",
    roleTitle: bg ? "Позиция (заглавие)" : "Role title",
    coverLetter: bg ? "Мотивационно писмо" : "Cover letter",
    jobPostUrl: bg ? "Линк към обявата" : "Job post URL",
    notes: bg ? "Бележки" : "Notes",
    save: bg ? "Запази" : "Save",
    cancel: bg ? "Отказ" : "Cancel",
    chipCv: "CV",
    chipPhoto: bg ? "Фото" : "Photo",
    chipCompany: bg ? "Фирма" : "Co",
    chipLetter: bg ? "Писмо" : "Letter",
    chipOk: bg ? "свързано" : "linked",
    chipMissing: bg ? "липсва" : "missing",
    needCompanyRole: bg
      ? "Попълнете име на компания и позиция."
      : "Enter a company name and role title.",
    saved: bg ? "Запазено." : "Saved.",
    exported: bg ? "Пакетът е изтеглен." : "Packet downloaded.",
    imported: bg ? "Пакетът е отворен." : "Packet opened.",
    restored: bg ? "Възстановено" : "Restored",
    invalidPacket: bg ? "Невалиден JSON пакет." : "Invalid packet file.",
    reused: bg
      ? "Копие със същото CV и снимка — сменете компанията."
      : "Copy with the same CV and photo — update the company.",
    failedSave: bg ? "Записът не успя." : "Could not save.",
    failedExport: bg ? "Изтеглянето не успя." : "Could not download.",
    failedImport: bg ? "Отварянето не успя." : "Could not open packet.",
    failedReuse: bg ? "Копирането не успя." : "Could not copy.",
  };

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
      setNotice(t.needCompanyRole);
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
        setNotice(payload.error ?? t.failedSave);
        return;
      }
      setApplications(payload.applications ?? []);
      setEditorOpen(false);
      setNotice(t.saved);
    } catch {
      setNotice(t.failedSave);
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
    if (app.status === status) return;
    const prevIdx = APPLICATION_STATUSES.indexOf(app.status);
    const nextIdx = APPLICATION_STATUSES.indexOf(status);
    const now = new Date().toISOString();
    // Forward only: reset status_since. Backward keeps the clock.
    const status_since =
      nextIdx > prevIdx ? now : app.status_since || app.created_at || now;
    // Optimistic move for snappy kanban drops.
    setApplications((prev) =>
      prev.map((entry) =>
        entry.id === app.id
          ? { ...entry, status, status_since, updated_at: now }
          : entry,
      ),
    );
    if (draft.id === app.id) {
      setDraft((d) => ({ ...d, status }));
    }
    setBusy(true);
    try {
      const response = await fetch("/api/applications", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "upsert",
          ...app,
          status,
          // Let server recompute status_since; do not force client clock except via status change rules
        }),
      });
      const payload = (await response.json()) as { applications?: Application[] };
      if (response.ok) {
        setApplications(payload.applications ?? []);
      } else {
        // Revert optimistic update on failure.
        setApplications((prev) =>
          prev.map((entry) => (entry.id === app.id ? app : entry)),
        );
      }
    } catch {
      setApplications((prev) =>
        prev.map((entry) => (entry.id === app.id ? app : entry)),
      );
    } finally {
      setBusy(false);
    }
  }

  const onKanbanDrop = useCallback(
    (appId: string, status: string) => {
      const app = applications.find((entry) => entry.id === appId);
      if (!app) return;
      if (!(APPLICATION_STATUSES as readonly string[]).includes(status)) return;
      void setStatus(app, status as ApplicationStatus);
    },
    // setStatus closes over applications intentionally for the source app snapshot
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [applications],
  );

  const onKanbanClick = useCallback(
    (appId: string) => {
      const app = applications.find((entry) => entry.id === appId);
      if (app) openEdit(app);
    },
    // openEdit is stable enough via closure; applications is the lookup source
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [applications],
  );

  const { drag, onCardPointerDown, columnClassName, isDraggingId } = useKanbanDrag({
    busy,
    onDrop: onKanbanDrop,
    onClick: onKanbanClick,
  });

  const dragApp = drag
    ? applications.find((entry) => entry.id === drag.appId) ?? null
    : null;

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
        setNotice(payload.error ?? t.failedExport);
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
      setNotice(t.exported);
    } catch {
      setNotice(t.failedExport);
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
        setNotice(payload.error ?? t.failedImport);
        return;
      }
      setApplications(payload.applications ?? []);
      if (payload.application) {
        openEdit(payload.application);
      }
      const restored = payload.restored?.length
        ? ` ${t.restored}: ${payload.restored.join(", ")}.`
        : "";
      setNotice(t.imported + restored);
      void loadLookups();
    } catch {
      setNotice(t.invalidPacket);
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
              ? `${app.packet_title} (copy)`
              : `${app.job_title} @ ${app.company_name} (copy)`,
          },
        }),
      });
      const payload = (await response.json()) as {
        error?: string;
        applications?: Application[];
        application?: Application;
      };
      if (!response.ok) {
        setNotice(payload.error ?? t.failedReuse);
        return;
      }
      setApplications(payload.applications ?? []);
      if (payload.application) {
        openEdit(payload.application);
      }
      setNotice(t.reused);
    } catch {
      setNotice(t.failedReuse);
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
          <h3 className="text-lg font-bold text-slate-900">{t.pageTitle}</h3>
          <p className="text-xs text-[var(--ink-muted)]">{t.pageSubtitle}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            className="rounded-md bg-[var(--accent)] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
            disabled={busy}
            onClick={openNew}
            type="button"
          >
            {t.newApplication}
          </button>
          <button
            className="rounded-md border border-[var(--line)] bg-white px-3 py-1.5 text-xs font-semibold disabled:opacity-60"
            disabled={busy || !defaultCompanyName || !defaultJobTitle}
            onClick={() => {
              openNew();
            }}
            title={t.addFromResearchTitle}
            type="button"
          >
            {t.addFromResearch}
          </button>
          <button
            className="rounded-md border border-[var(--line)] bg-white px-3 py-1.5 text-xs font-semibold disabled:opacity-60"
            disabled={busy}
            onClick={() => importInputRef.current?.click()}
            title={t.importPacketTitle}
            type="button"
          >
            {t.importPacket}
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
              className={`flex min-h-[12rem] min-w-0 flex-col rounded-xl border border-[var(--line)] bg-white p-2 ${columnClassName(status)}`}
              data-kanban-status={status}
              key={status}
            >
              <p className="px-1 text-xs font-semibold tracking-wide text-slate-700">
                {statusLabel(status, bg)}
                <span className="ml-1 font-normal text-[var(--ink-muted)]">
                  ({(byStatus.get(status) ?? []).length})
                </span>
              </p>
              <ul className="mt-2 flex-1 space-y-2 overflow-x-hidden overflow-y-auto">
                {(byStatus.get(status) ?? []).map((app) => {
                  const hasCv = Boolean(app.cv_id);
                  const hasPhoto = Boolean(app.photo_id);
                  const hasCompany = Boolean(app.company_id || app.company_name);
                  const hasLetter = Boolean(app.cover_letter_id);
                  const dragging = isDraggingId(app.id);
                  return (
                    <li
                      className={`overflow-hidden rounded-md border text-xs transition-opacity ${
                        draft.id === app.id && editorOpen
                          ? "border-[var(--accent)] bg-[var(--accent-soft)]"
                          : "border-[var(--line)] bg-[var(--surface-1)]"
                      } ${dragging ? "opacity-30" : "opacity-100"}`}
                      data-kanban-card
                      key={app.id}
                    >
                      {/* Header: click opens details; drag starts after small move */}
                      <div
                        className={`select-none border-b border-white/25 bg-slate-700 px-2.5 py-2.5 ${
                          busy
                            ? "cursor-default"
                            : "cursor-grab active:cursor-grabbing"
                        }`}
                        onPointerDown={(event) => onCardPointerDown(app.id, event)}
                        style={{ touchAction: "none" }}
                        title={
                          bg
                            ? "Клик: детайли · дърпане: преместване"
                            : "Click: details · drag: move column"
                        }
                      >
                        <p className="truncate text-[11px] font-bold leading-snug text-white">
                          {app.job_title || app.packet_title || "—"}
                        </p>
                        <p className="mt-0.5 truncate text-[10px] font-medium leading-snug text-white/75">
                          {app.company_name || "—"}
                        </p>
                        {app.packet_title && app.packet_title !== app.job_title ? (
                          <p className="mt-0.5 truncate text-[9px] text-white/55">
                            {app.packet_title}
                          </p>
                        ) : null}
                      </div>

                      <button
                        className="w-full px-1.5 py-1.5 text-left"
                        data-no-dnd
                        onClick={() => openEdit(app)}
                        type="button"
                      >
                        <div className="flex flex-nowrap items-center justify-center gap-px overflow-hidden">
                          <Chip
                            label={t.chipCv}
                            ok={hasCv}
                            titleMissing={`${t.chipCv}: ${t.chipMissing}`}
                            titleOk={`${t.chipCv}: ${t.chipOk}`}
                          />
                          <Chip
                            label={t.chipPhoto}
                            ok={hasPhoto}
                            titleMissing={`${t.chipPhoto}: ${t.chipMissing}`}
                            titleOk={`${t.chipPhoto}: ${t.chipOk}`}
                          />
                          <Chip
                            label={t.chipCompany}
                            ok={hasCompany}
                            titleMissing={`${t.chipCompany}: ${t.chipMissing}`}
                            titleOk={`${t.chipCompany}: ${t.chipOk}`}
                          />
                          <Chip
                            label={t.chipLetter}
                            ok={hasLetter}
                            titleMissing={`${t.chipLetter}: ${t.chipMissing}`}
                            titleOk={`${t.chipLetter}: ${t.chipOk}`}
                          />
                        </div>
                        {(() => {
                          const days = daysWithoutProgress(app);
                          return (
                            <p
                              className="mt-1 text-center text-[9px] font-semibold tabular-nums text-[var(--ink-muted)]"
                              title={
                                bg
                                  ? `${days} дни без придвижване напред (назад не нулира)`
                                  : `${days} day${days === 1 ? "" : "s"} without moving up (moving back does not reset)`
                              }
                            >
                              {formatDaysLabel(days, bg)}
                            </p>
                          );
                        })()}
                      </button>
                      {/* Bottom border segmented into icon actions */}
                      <div
                        className="flex h-7 border-t border-white/25 bg-slate-700"
                        data-no-dnd
                      >
                        <button
                          aria-label={t.open}
                          className="flex min-w-0 flex-1 items-center justify-center text-white/90 transition-colors hover:bg-white/10 disabled:opacity-40"
                          disabled={busy}
                          onClick={() => openEdit(app)}
                          title={t.open}
                          type="button"
                        >
                          <FolderOpen aria-hidden className="h-3.5 w-3.5" strokeWidth={2} />
                        </button>
                        <span
                          aria-hidden
                          className="w-px shrink-0 self-stretch bg-white/20"
                        />
                        <button
                          aria-label={t.exportPacket}
                          className="flex min-w-0 flex-1 items-center justify-center text-white/90 transition-colors hover:bg-white/10 disabled:opacity-40"
                          disabled={busy}
                          onClick={() => void exportPacket(app.id)}
                          title={t.exportPacketTitle}
                          type="button"
                        >
                          <Download aria-hidden className="h-3.5 w-3.5" strokeWidth={2} />
                        </button>
                        <span
                          aria-hidden
                          className="w-px shrink-0 self-stretch bg-white/20"
                        />
                        <button
                          aria-label={t.reuseForSimilar}
                          className="flex min-w-0 flex-1 items-center justify-center text-white/90 transition-colors hover:bg-white/10 disabled:opacity-40"
                          disabled={busy}
                          onClick={() => void reusePacket(app)}
                          title={t.reuseTitle}
                          type="button"
                        >
                          <Copy aria-hidden className="h-3.5 w-3.5" strokeWidth={2} />
                        </button>
                        <span
                          aria-hidden
                          className="w-px shrink-0 self-stretch bg-white/20"
                        />
                        <button
                          aria-label={t.delete}
                          className="flex min-w-0 flex-1 items-center justify-center text-white/90 transition-colors hover:bg-white/10 disabled:opacity-40"
                          disabled={busy}
                          onClick={() => void remove(app.id)}
                          title={t.delete}
                          type="button"
                        >
                          <Trash2 aria-hidden className="h-3.5 w-3.5" strokeWidth={2} />
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>

        {drag && dragApp ? (
          <KanbanFloatingCard drag={drag}>
            <div className="border-b border-white/25 bg-slate-700 px-2.5 py-2.5">
              <p className="truncate text-[11px] font-bold leading-snug text-white">
                {dragApp.job_title || dragApp.packet_title || "—"}
              </p>
              <p className="mt-0.5 truncate text-[10px] font-medium text-white/75">
                {dragApp.company_name || "—"}
              </p>
            </div>
            <div className="px-1.5 py-1.5">
              <div className="flex flex-nowrap items-center justify-center gap-px overflow-hidden">
                <Chip
                  label={t.chipCv}
                  ok={Boolean(dragApp.cv_id)}
                  titleMissing=""
                  titleOk=""
                />
                <Chip
                  label={t.chipPhoto}
                  ok={Boolean(dragApp.photo_id)}
                  titleMissing=""
                  titleOk=""
                />
                <Chip
                  label={t.chipCompany}
                  ok={Boolean(dragApp.company_id || dragApp.company_name)}
                  titleMissing=""
                  titleOk=""
                />
                <Chip
                  label={t.chipLetter}
                  ok={Boolean(dragApp.cover_letter_id)}
                  titleMissing=""
                  titleOk=""
                />
              </div>
              {drag.overStatus ? (
                <p className="mt-1.5 text-[10px] font-semibold text-[var(--accent)]">
                  → {statusLabel(drag.overStatus as ApplicationStatus, bg)}
                </p>
              ) : null}
            </div>
          </KanbanFloatingCard>
        ) : null}

        <aside className="flex min-h-0 min-w-0 flex-col rounded-xl border border-[var(--line)] bg-white p-3">
          <p className="text-sm font-semibold text-slate-900">
            {editorOpen
              ? draft.id
                ? t.editorEdit
                : t.editorNew
              : t.editorIdleTitle}
          </p>
          <p className="mt-0.5 text-[10px] text-[var(--ink-muted)]">
            {editorOpen ? t.editorHint : t.editorIdleHint}
          </p>

          {!editorOpen ? (
            <div className="mt-4 flex flex-1 flex-col items-start justify-center gap-2 text-xs text-[var(--ink-muted)]">
              <button
                className="rounded-md bg-[var(--accent)] px-3 py-1.5 text-xs font-semibold text-white"
                onClick={openNew}
                type="button"
              >
                {t.newApplication}
              </button>
            </div>
          ) : (
            <div className="mt-3 flex min-h-0 flex-1 flex-col gap-2 overflow-x-hidden overflow-y-auto">
              <label className="block text-[10px] font-medium text-slate-700">
                {t.applicationName}
                <input
                  className="mt-0.5 w-full rounded border border-[var(--line)] bg-[var(--surface-1)] px-2 py-1.5 text-xs"
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, packet_title: e.target.value }))
                  }
                  placeholder={t.applicationNameHint}
                  value={draft.packet_title || ""}
                />
              </label>

              <label className="block text-[10px] font-medium text-slate-700">
                {t.resumeCv}
                <select
                  className="mt-0.5 w-full rounded border border-[var(--line)] bg-[var(--surface-1)] px-2 py-1.5 text-xs"
                  onChange={(e) => setDraft((d) => ({ ...d, cv_id: e.target.value }))}
                  value={draft.cv_id || ""}
                >
                  <option value="">{t.noneSelected}</option>
                  {cvOptions.map((cv) => (
                    <option key={cv.id} value={cv.id}>
                      {cv.displayName || cv.id}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-[10px] font-medium text-slate-700">
                {t.profilePhoto}
                <select
                  className="mt-0.5 w-full rounded border border-[var(--line)] bg-[var(--surface-1)] px-2 py-1.5 text-xs"
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, photo_id: e.target.value }))
                  }
                  value={draft.photo_id || ""}
                >
                  <option value="">{t.noneSelected}</option>
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
                {t.researchCompany}
                <select
                  className="mt-0.5 w-full rounded border border-[var(--line)] bg-[var(--surface-1)] px-2 py-1.5 text-xs"
                  onChange={(e) => onCompanySelect(e.target.value)}
                  value={draft.company_id || ""}
                >
                  <option value="">{t.typeCompanyBelow}</option>
                  {companyOptions.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-[10px] font-medium text-slate-700">
                {t.companyDisplayName}
                <input
                  className="mt-0.5 w-full rounded border border-[var(--line)] bg-[var(--surface-1)] px-2 py-1.5 text-xs"
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, company_name: e.target.value }))
                  }
                  value={draft.company_name}
                />
              </label>

              <label className="block text-[10px] font-medium text-slate-700">
                {t.researchRole}
                <select
                  className="mt-0.5 w-full rounded border border-[var(--line)] bg-[var(--surface-1)] px-2 py-1.5 text-xs"
                  onChange={(e) => onJobSelect(e.target.value)}
                  value={draft.job_id || ""}
                >
                  <option value="">{t.typeRoleBelow}</option>
                  {jobsForCompany.map((j) => (
                    <option key={j.id} value={j.id}>
                      {j.title}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-[10px] font-medium text-slate-700">
                {t.roleTitle}
                <input
                  className="mt-0.5 w-full rounded border border-[var(--line)] bg-[var(--surface-1)] px-2 py-1.5 text-xs"
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, job_title: e.target.value }))
                  }
                  value={draft.job_title}
                />
              </label>

              <label className="block text-[10px] font-medium text-slate-700">
                {t.coverLetter}
                <select
                  className="mt-0.5 w-full rounded border border-[var(--line)] bg-[var(--surface-1)] px-2 py-1.5 text-xs"
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, cover_letter_id: e.target.value }))
                  }
                  value={draft.cover_letter_id || ""}
                >
                  <option value="">{t.noneSelected}</option>
                  {letterOptions.map((letter) => (
                    <option key={letter.id} value={letter.id}>
                      {letter.title || letter.id}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-[10px] font-medium text-slate-700">
                {t.stage}
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
                      {statusLabel(s, bg)}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-[10px] font-medium text-slate-700">
                {t.jobPostUrl}
                <input
                  className="mt-0.5 w-full rounded border border-[var(--line)] bg-[var(--surface-1)] px-2 py-1.5 text-xs"
                  onChange={(e) => setDraft((d) => ({ ...d, url: e.target.value }))}
                  value={draft.url || ""}
                />
              </label>

              <label className="block text-[10px] font-medium text-slate-700">
                {t.notes}
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
                  {t.save}
                </button>
                {draft.id ? (
                  <button
                    className="rounded-md border border-[var(--line)] bg-white px-3 py-1.5 text-xs font-semibold disabled:opacity-60"
                    disabled={busy}
                    onClick={() => void exportPacket(draft.id!)}
                    title={t.exportPacketTitle}
                    type="button"
                  >
                    {t.exportPacket}
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
                  {t.cancel}
                </button>
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
