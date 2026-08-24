"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type JSX } from "react";
import { Archive, BookmarkPlus, Copy, Download, FlaskConical, FolderOpen, Plus, Search, Trash2, UserPlus } from "lucide-react";

import { ApplicationActivityTimeline } from "./ApplicationActivityTimeline";
import { ApplicationAnalyticsView } from "./ApplicationAnalyticsView";
import { ApplicationQuickIntake } from "./ApplicationQuickIntake";
import { ApplicationSubmissionHistory } from "./ApplicationSubmissionHistory";
import { ApplicationTodayView } from "./ApplicationTodayView";
import { CareerEvidenceView } from "./CareerEvidenceView";
import {
  applicationMatchesFilters,
  DEFAULT_APPLICATION_FILTERS,
  loadSavedApplicationViews,
  saveApplicationViews,
  type Application,
  type ApplicationFilters,
  type ApplicationsView,
  type ApplicationStatus,
  type SavedApplicationView,
} from "./application-operations-types";
import { KanbanFloatingCard, useKanbanDrag } from "./applications-kanban";

const APPLICATION_STATUSES = [
  "wishlist",
  "applied",
  "interview",
  "offer",
  "rejected",
  "ghosted",
] as const;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function clampDwellDays(days: number): number {
  if (!Number.isFinite(days)) return 0;
  return Math.max(0, Math.min(9999, Math.floor(days)));
}

function daysWithoutProgress(app: Application): number {
  const since = app.status_since || app.created_at;
  const t = Date.parse(since);
  if (!Number.isFinite(t)) return 0;
  return Math.max(0, Math.floor((Date.now() - t) / MS_PER_DAY));
}

/** ISO for “this many whole days without forward progress”. */
function statusSinceFromDays(days: number, nowMs: number = Date.now()): string {
  return new Date(nowMs - clampDwellDays(days) * MS_PER_DAY).toISOString();
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

function kanbanPriorityClass(priority: Application["priority"]): string {
  if (priority === "low") return "bg-gradient-to-r from-blue-600 to-cyan-500";
  if (priority === "high") return "bg-gradient-to-r from-blue-600 to-purple-600";
  return "bg-gradient-to-r from-blue-700 to-indigo-600";
}

type CvOption = { id: string; displayName?: string; displayVersion?: string | null };
type PhotoOption = { id: string; name: string; mediaUrl?: string };
type LetterOption = { id: string; title: string };
type CompanyOption = { id: string; name: string };
type JobOption = { id: string; title: string; company_id: string };
type ApplicationEditorTab = "application" | "company" | "snapshots";

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
  /** Current Print Room template used to freeze submitted PDFs. */
  defaultTemplateId?: string;
  defaultTemplateTheme?: string;
  onAssistantSelectionChange?: (
    selection: {
      id: string;
      label: string;
      revision?: string;
    } | null,
  ) => void;
};

function emptyDraft(): Omit<
  Application,
  "id" | "created_at" | "updated_at" | "status_since"
> & {
  id?: string;
  status_since?: string;
  /** Editable dwell counter (days without forward stage progress). */
  days_without_progress: number;
} {
  return {
    company_name: "",
    job_title: "",
    status: "applied",
    notes: "",
    url: "",
    company_id: "",
    job_id: "",
    cv_id: "",
    photo_id: "",
    cover_letter_id: "",
    packet_title: "",
    priority: "normal",
    source: "",
    location: "",
    role_family: "",
    cv_family: "",
    days_without_progress: 0,
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
    defaultTemplateId,
    defaultTemplateTheme,
    onAssistantSelectionChange,
  } = props;

  const [applications, setApplications] = useState<Application[]>([]);
  const [duplicates, setDuplicates] = useState<Record<string, string[]>>({});
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorTab, setEditorTab] = useState<ApplicationEditorTab>("application");
  const [draft, setDraft] = useState(emptyDraft());
  const [contactName, setContactName] = useState("");
  const [contactRole, setContactRole] = useState("");
  const [contactBusy, setContactBusy] = useState(false);
  const [view, setView] = useState<ApplicationsView>("board");
  const [filters, setFilters] = useState<ApplicationFilters>(
    DEFAULT_APPLICATION_FILTERS,
  );
  const [savedViews, setSavedViews] = useState<SavedApplicationView[]>([]);
  const [savedViewName, setSavedViewName] = useState("");

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
    daysStuck: bg ? "Дни без напредък" : "Days without progress",
    daysStuckHint: bg
      ? "Броячът на картата. Поправете при грешка или случаен нулев ресет."
      : "Card dwell counter. Fix a stuck value or an accidental reset.",
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
    resumeCv: bg ? "Резюме (CV)" : "Résumé (CV)",
    noneSelected: bg ? "— не е избрано —" : "— none selected —",
    profilePhoto: bg ? "Профилна снимка" : "Profile photo",
    researchCompany: bg ? "Компания от Research" : "Company from Research",
    typeCompanyBelow: bg ? "— въведете име по-долу —" : "— type name below —",
    companyDisplayName: bg ? "Име на компанията" : "Company name",
    researchRole: bg ? "Позиция от Research" : "Role from Research",
    typeRoleBelow: bg ? "— въведете позиция по-долу —" : "— type role below —",
    roleTitle: bg ? "Позиция" : "Position",
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
    const payload = (await response.json()) as {
      applications?: Application[];
      duplicates?: Record<string, string[]>;
    };
    setApplications(payload.applications ?? []);
    setDuplicates(payload.duplicates ?? {});
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
    setSavedViews(loadSavedApplicationViews());
  }, [loadBoard, loadLookups]);

  useEffect(() => {
    const refresh = () => void loadBoard();
    window.addEventListener("mfcv:assistant-mutation", refresh);
    return () => window.removeEventListener("mfcv:assistant-mutation", refresh);
  }, [loadBoard]);

  const filteredApplications = useMemo(
    () =>
      applications.filter((application) =>
        applicationMatchesFilters(application, filters),
      ),
    [applications, filters],
  );

  const byStatus = useMemo(() => {
    const map = new Map<ApplicationStatus, Application[]>();
    for (const status of APPLICATION_STATUSES) {
      map.set(
        status,
        filteredApplications.filter((app) => app.status === status),
      );
    }
    return map;
  }, [filteredApplications]);

  const jobsForCompany = useMemo(() => {
    const companyId = draft.company_id?.trim();
    if (!companyId) return jobOptions;
    return jobOptions.filter((job) => job.company_id === companyId);
  }, [draft.company_id, jobOptions]);

  const selectedApplication = useMemo(
    () => applications.find((application) => application.id === draft.id),
    [applications, draft.id],
  );

  function openNew() {
    onAssistantSelectionChange?.(null);
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
      status: "applied",
      priority: "normal",
    });
    setEditorTab("application");
    setEditorOpen(true);
    setNotice("");
  }

  const openEdit = useCallback((app: Application) => {
    onAssistantSelectionChange?.({
      id: app.id,
      label: `${app.company_name} · ${app.job_title}`,
      revision: app.updated_at,
    });
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
      priority: app.priority || "normal",
      source: app.source || "",
      location: app.location || "",
      role_family: app.role_family || "",
      cv_family: app.cv_family || "",
      archived_at: app.archived_at,
      raw_job_input: app.raw_job_input,
      deadline_at: app.deadline_at,
      salary_text: app.salary_text,
      employment_type: app.employment_type,
      next_action: app.next_action,
      contacts: app.contacts,
      activities: app.activities,
      submission_snapshots: app.submission_snapshots,
      status_since: app.status_since || app.created_at,
      days_without_progress: daysWithoutProgress(app),
    });
    setEditorTab("application");
    setEditorOpen(true);
    setNotice("");
  }, [onAssistantSelectionChange]);

  async function addContact(): Promise<void> {
    if (!draft.id || !contactName.trim()) return;
    setContactBusy(true);
    try {
      const response = await fetch(`/api/applications/${encodeURIComponent(draft.id)}/contacts`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: contactName.trim(), role: contactRole.trim() || undefined }),
      });
      if (response.ok) {
        setContactName("");
        setContactRole("");
        await refreshApplication(draft.id, bg ? "Контактът е добавен." : "Contact added.");
      } else {
        setNotice(bg ? "Контактът не беше добавен." : "Could not add contact.");
      }
    } catch {
      setNotice(bg ? "Контактът не беше добавен." : "Could not add contact.");
    } finally {
      setContactBusy(false);
    }
  }

  async function saveDraft() {
    if (!draft.company_name.trim() || !draft.job_title.trim()) {
      setNotice(t.needCompanyRole);
      return;
    }
    setBusy(true);
    setNotice("");
    try {
      const days = clampDwellDays(draft.days_without_progress ?? 0);
      const cardName = draft.packet_title?.trim() || `${draft.job_title.trim()} @ ${draft.company_name.trim()}`;
      const response = await fetch("/api/applications", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "upsert",
          id: draft.id,
          company_id: draft.company_id || "",
          job_id: draft.job_id || "",
          company_name: draft.company_name,
          job_title: draft.job_title,
          status: draft.status,
          url: draft.url || "",
          notes: draft.notes || "",
          cv_id: draft.cv_id || "",
          photo_id: draft.photo_id || "",
          cover_letter_id: draft.cover_letter_id || "",
          packet_title: cardName,
          priority: draft.priority || "normal",
          source: draft.source || "",
          location: draft.location || "",
          role_family: draft.role_family || "",
          cv_family: "",
          // Explicit clock so sidebar edits stick (and survive stage changes on save).
          status_since: statusSinceFromDays(days),
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
        onAssistantSelectionChange?.(null);
        setEditorOpen(false);
        setDraft(emptyDraft());
      }
    } finally {
      setBusy(false);
    }
  }

  async function refreshApplication(
    id: string,
    message?: string,
  ): Promise<void> {
    await loadBoard();
    const response = await fetch(
      `/api/applications/${encodeURIComponent(id)}`,
    );
    const payload = (await response.json()) as { application?: Application };
    if (payload.application) {
      openEdit(payload.application);
    }
    if (message) setNotice(message);
  }

  async function completeNextAction(application: Application): Promise<void> {
    const title = application.next_action?.title;
    const response = await fetch(
      `/api/applications/${encodeURIComponent(application.id)}`,
      {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ next_action: null }),
      },
    );
    if (response.ok) {
      if (title) {
        await fetch(
          `/api/applications/${encodeURIComponent(application.id)}/activities`,
          {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              type: "note",
              summary: `Completed next action: ${title}`,
            }),
          },
        );
      }
      await loadBoard();
      setNotice(bg ? "Действието е завършено." : "Action completed.");
    }
  }

  async function setArchived(application: Application): Promise<void> {
    const response = await fetch(
      `/api/applications/${encodeURIComponent(application.id)}`,
      {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ archived: !application.archived_at }),
      },
    );
    if (response.ok) {
      await loadBoard();
      setEditorOpen(false);
      setNotice(
        application.archived_at
          ? bg
            ? "Кандидатстването е възстановено."
            : "Application restored."
          : bg
            ? "Кандидатстването е архивирано."
            : "Application archived.",
      );
    }
  }

  function saveCurrentView(): void {
    const name = savedViewName.trim();
    if (!name) return;
    const next = [
      ...savedViews.filter(
        (entry) => entry.name.toLowerCase() !== name.toLowerCase(),
      ),
      {
        id: crypto.randomUUID(),
        name,
        filters: { ...filters },
      },
    ];
    setSavedViews(next);
    saveApplicationViews(next);
    setSavedViewName("");
  }

  async function setStatus(app: Application, status: ApplicationStatus) {
    if (app.status === status) return;
    const prevIdx = APPLICATION_STATUSES.indexOf(app.status);
    const nextIdx = APPLICATION_STATUSES.indexOf(status);
    const now = new Date().toISOString();
    // Reset only on real pipeline progress (not rejected/ghosted, not backward).
    const isTerminal = status === "rejected" || status === "ghosted";
    const fromTerminal = app.status === "rejected" || app.status === "ghosted";
    const movedForward =
      !isTerminal && !fromTerminal && nextIdx > prevIdx;
    const status_since = movedForward
      ? now
      : app.status_since || app.created_at || now;
    // Optimistic move for snappy kanban drops.
    setApplications((prev) =>
      prev.map((entry) =>
        entry.id === app.id
          ? { ...entry, status, status_since, updated_at: now }
          : entry,
      ),
    );
    if (draft.id === app.id) {
      setDraft((d) => ({
        ...d,
        status,
        status_since,
        days_without_progress: daysWithoutProgress({
          ...app,
          status,
          status_since,
        }),
      }));
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
          status_since: undefined,
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
    [applications, openEdit],
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
        <div className="flex min-w-0 flex-1 items-baseline gap-3">
          <h3 className="shrink-0 text-lg font-bold text-slate-900">{t.pageTitle}</h3>
          <p className="min-w-0 text-xs text-[var(--ink-muted)]">{t.pageSubtitle}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ApplicationQuickIntake
            disabled={busy}
            language={language}
            onComplete={(application, deduplicated) => {
              void loadBoard();
              openEdit(application);
              setNotice(
                deduplicated
                  ? bg
                    ? "Отворено е съществуващото кандидатстване; дубликат не е създаден."
                    : "Opened the existing application; no duplicate was created."
                  : bg
                    ? "Обявата е добавена в Wishlist."
                    : "Job added to Wishlist.",
              );
            }}
          />
          <button
            className="inline-flex items-center gap-1.5 rounded-md bg-[var(--accent)] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
            disabled={busy}
            onClick={openNew}
            type="button"
          >
            <Plus aria-hidden className="h-3.5 w-3.5" strokeWidth={2.2} />
            {t.newApplication}
          </button>
          <button
            className="inline-flex items-center gap-1.5 rounded-md border border-[var(--line)] bg-white px-3 py-1.5 text-xs font-semibold disabled:opacity-60"
            disabled={busy || !defaultCompanyName || !defaultJobTitle}
            onClick={() => {
              openNew();
            }}
            title={t.addFromResearchTitle}
            type="button"
          >
            <FlaskConical aria-hidden className="h-3.5 w-3.5" strokeWidth={2} />
            {t.addFromResearch}
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

      <div className="flex flex-wrap items-center gap-2 rounded-md border border-[var(--line)] bg-white px-3 py-2">
        <div className="flex rounded-md border border-[var(--line)] p-0.5" role="group" aria-label={bg ? "Изглед" : "Application view"}>
          {(
            [
              ["board", bg ? "Дъска" : "Board"],
              ["today", bg ? "Днес" : "Today"],
              ["analytics", bg ? "Анализи" : "Analytics"],
              ["evidence", bg ? "Доказателства" : "Evidence"],
            ] as Array<[ApplicationsView, string]>
          ).map(([value, label]) => (
            <button
              aria-pressed={view === value}
              className={`rounded px-2.5 py-1 text-xs font-semibold ${
                view === value
                  ? "bg-slate-800 text-white"
                  : "text-slate-700 hover:bg-[var(--surface-2)]"
              }`}
              key={value}
              onClick={() => setView(value)}
              type="button"
            >
              {label}
            </button>
          ))}
        </div>

        {view === "board" || view === "today" ? (
          <>
            <label className="relative min-w-48 flex-1">
              <span className="sr-only">{bg ? "Търси" : "Search applications"}</span>
              <Search aria-hidden className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--ink-muted)]" />
              <input
                className="w-full rounded border border-[var(--line)] py-1.5 pl-7 pr-2 text-xs"
                onChange={(event) =>
                  setFilters((current) => ({
                    ...current,
                    search: event.target.value,
                  }))
                }
                placeholder={bg ? "Компания, роля, бележки, ключови думи…" : "Company, role, notes, keywords…"}
                type="search"
                value={filters.search}
              />
            </label>
            <select
              aria-label={bg ? "Филтър по етап" : "Filter by stage"}
              className="rounded border border-[var(--line)] px-2 py-1.5 text-xs"
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  status: event.target.value as ApplicationFilters["status"],
                }))
              }
              value={filters.status}
            >
              <option value="all">{bg ? "Всички етапи" : "All stages"}</option>
              {APPLICATION_STATUSES.map((status) => (
                <option key={status} value={status}>{statusLabel(status, bg)}</option>
              ))}
            </select>
            <select
              aria-label={bg ? "Филтър по приоритет" : "Filter by priority"}
              className="rounded border border-[var(--line)] px-2 py-1.5 text-xs"
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  priority: event.target.value as ApplicationFilters["priority"],
                }))
              }
              value={filters.priority}
            >
              <option value="all">{bg ? "Всички приоритети" : "All priorities"}</option>
              <option value="high">{bg ? "Висок" : "High"}</option>
              <option value="normal">{bg ? "Нормален" : "Normal"}</option>
              <option value="low">{bg ? "Нисък" : "Low"}</option>
            </select>
            <select
              aria-label={bg ? "Филтър архив" : "Archive filter"}
              className="rounded border border-[var(--line)] px-2 py-1.5 text-xs"
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  archive: event.target.value as ApplicationFilters["archive"],
                }))
              }
              value={filters.archive}
            >
              <option value="active">{bg ? "Активни" : "Active"}</option>
              <option value="archived">{bg ? "Архивирани" : "Archived"}</option>
              <option value="all">{bg ? "Всички" : "All"}</option>
            </select>
            <select
              aria-label={bg ? "Филтър пакет" : "Packet filter"}
              className="rounded border border-[var(--line)] px-2 py-1.5 text-xs"
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  packet: event.target.value as ApplicationFilters["packet"],
                }))
              }
              value={filters.packet}
            >
              <option value="all">{bg ? "Всички пакети" : "All packets"}</option>
              <option value="complete">{bg ? "Пълни" : "Complete"}</option>
              <option value="missing">{bg ? "С липси" : "Missing items"}</option>
            </select>
            <select
              aria-label={bg ? "Запазен изглед" : "Saved view"}
              className="rounded border border-[var(--line)] px-2 py-1.5 text-xs"
              onChange={(event) => {
                const saved = savedViews.find((entry) => entry.id === event.target.value);
                if (saved) setFilters(saved.filters);
              }}
              value=""
            >
              <option value="">{bg ? "Запазени изгледи…" : "Saved views…"}</option>
              {savedViews.map((saved) => (
                <option key={saved.id} value={saved.id}>{saved.name}</option>
              ))}
            </select>
            <div className="flex">
              <input
                aria-label={bg ? "Име на изглед" : "Saved view name"}
                className="w-32 rounded-l border border-[var(--line)] px-2 py-1.5 text-xs"
                onChange={(event) => setSavedViewName(event.target.value)}
                placeholder={bg ? "Име на изглед" : "View name"}
                value={savedViewName}
              />
              <button
                aria-label={bg ? "Запази изгледа" : "Save current view"}
                className="rounded-r border border-l-0 border-[var(--line)] px-2"
                disabled={!savedViewName.trim()}
                onClick={saveCurrentView}
                title={bg ? "Запази изгледа" : "Save current view"}
                type="button"
              >
                <BookmarkPlus aria-hidden className="h-3.5 w-3.5" />
              </button>
            </div>
          </>
        ) : null}
      </div>

      {view === "analytics" ? (
        <div className="min-h-0 flex-1 overflow-y-auto">
          <ApplicationAnalyticsView language={language} />
        </div>
      ) : view === "evidence" ? (
        <div className="min-h-0 flex-1 overflow-y-auto">
          <CareerEvidenceView defaultCvId={defaultCvId} language={language} />
        </div>
      ) : (
      <div className="grid min-h-0 flex-1 gap-3 overflow-x-hidden overflow-y-auto md:grid-cols-[minmax(0,1fr)_minmax(280px,360px)]">
        {view === "today" ? (
          <ApplicationTodayView
            applications={filteredApplications}
            language={language}
            onComplete={(application) => void completeNextAction(application)}
            onOpen={openEdit}
          />
        ) : (
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
                        className={`flex select-none items-start gap-1.5 border-b border-white/25 px-2.5 py-2.5 ${kanbanPriorityClass(app.priority)} ${
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
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[11px] font-bold leading-snug text-white">
                            {app.job_title || app.packet_title || "—"}
                          </p>
                          <div className="mt-0.5 flex min-w-0 items-baseline justify-between gap-2">
                            <p className="min-w-0 truncate text-[10px] font-medium leading-snug text-white/75">
                              {app.company_name || "—"}
                            </p>
                            <p className="shrink-0 truncate text-right text-[9px] leading-snug text-white/65">
                              {app.location || "—"}
                            </p>
                          </div>
                        </div>
                        {(() => {
                          const days = daysWithoutProgress(app);
                          const stale = days > 30;
                          return (
                            <span
                              className={`shrink-0 pt-0.5 text-[13px] font-bold tabular-nums leading-none ${
                                stale ? "text-rose-300" : "text-white/90"
                              }`}
                              title={
                                bg
                                  ? `${days} дни без придвижване напред (назад / rejected / ghosted не нулират)`
                                  : `${days} day${days === 1 ? "" : "s"} without moving up (back / rejected / ghosted do not reset)`
                              }
                            >
                              {formatDaysLabel(days, bg)}
                            </span>
                          );
                        })()}
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
                        {app.next_action ? (
                          <p className="mt-1 truncate text-[9px] text-[var(--ink-muted)]">
                            {new Date(app.next_action.due_at).toLocaleDateString()} ·{" "}
                            {app.next_action.title}
                          </p>
                        ) : null}
                        <div className="mt-1 flex items-center justify-end gap-1 text-[8px] uppercase tracking-wide text-[var(--ink-muted)]">
                          {duplicates[app.id]?.length ? (
                            <span>{bg ? "Дубликат" : "Duplicate"}</span>
                          ) : null}
                        </div>
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
                          onClick={() => {
                            const confirmed = window.confirm(
                              bg
                                ? `Изтриване на кандидатстването за ${app.job_title} в ${app.company_name}?`
                                : `Delete the application for ${app.job_title} at ${app.company_name}?`,
                            );
                            if (confirmed) void remove(app.id);
                          }}
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
        )}

        {view === "board" && drag && dragApp ? (
          <KanbanFloatingCard drag={drag}>
            <div className={`flex items-start gap-1.5 border-b border-white/25 px-2.5 py-2.5 ${kanbanPriorityClass(dragApp.priority)}`}>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[11px] font-bold leading-snug text-white">
                  {dragApp.job_title || dragApp.packet_title || "—"}
                </p>
                <div className="mt-0.5 flex min-w-0 items-baseline justify-between gap-2">
                  <p className="min-w-0 truncate text-[10px] font-medium text-white/75">
                    {dragApp.company_name || "—"}
                  </p>
                  <p className="shrink-0 truncate text-right text-[9px] text-white/65">
                    {dragApp.location || "—"}
                  </p>
                </div>
              </div>
              {(() => {
                const days = daysWithoutProgress(dragApp);
                const stale = days > 30;
                return (
                  <span
                    className={`shrink-0 pt-0.5 text-[13px] font-bold tabular-nums leading-none ${
                      stale ? "text-rose-300" : "text-white/90"
                    }`}
                  >
                    {formatDaysLabel(days, bg)}
                  </span>
                );
              })()}
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
          {!editorOpen || draft.id ? (
            <p className="text-sm font-semibold text-slate-900">
              {editorOpen ? t.editorEdit : t.editorIdleTitle}
            </p>
          ) : null}
          {!editorOpen ? (
            <p className="mt-0.5 text-[10px] text-[var(--ink-muted)]">{t.editorIdleHint}</p>
          ) : null}

          {editorOpen ? (
            <div className="mx-auto mt-3 grid w-full grid-cols-3 gap-1 rounded-md border border-[var(--line)] bg-[var(--surface-2)] p-0.5 text-center" role="tablist">
              {(["application", "company", "snapshots"] as const).map((tab) => (
                <button
                  aria-selected={editorTab === tab}
                  className={`rounded px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wide ${editorTab === tab ? "bg-[var(--accent)] text-white" : "text-[var(--ink-muted)] hover:bg-white"}`}
                  key={tab}
                  onClick={() => setEditorTab(tab)}
                  role="tab"
                  type="button"
                >
                  {tab === "application" ? (bg ? "Кандидатстване" : "Application") : tab === "company" ? (bg ? "Информация за компанията" : "Company info") : (bg ? "Версии" : "Snapshots")}
                </button>
              ))}
            </div>
          ) : null}

          {editorOpen ? (
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

              {editorTab === "application" ? (
                <label className="block text-[10px] font-medium text-slate-700">
                  {t.roleTitle}
                  <input
                    className="mt-0.5 w-full rounded border border-[var(--line)] bg-[var(--surface-1)] px-2 py-1.5 text-xs"
                    onChange={(e) => setDraft((d) => ({ ...d, job_title: e.target.value }))}
                    value={draft.job_title}
                  />
                </label>
              ) : null}

              {draft.id && duplicates[draft.id]?.length ? (
                <p className="rounded border border-amber-200 bg-amber-50 px-2 py-1.5 text-[10px] text-amber-900">
                  {bg
                    ? `Възможен дубликат: ${duplicates[draft.id].length} друго кандидатстване със същия URL или компания/позиция.`
                    : `Possible duplicate: ${duplicates[draft.id].length} other application with the same URL or company/role.`}
                </p>
              ) : null}

              {editorTab === "application" ? (
                <>
              <div className="grid gap-2 sm:grid-cols-2">
                <label className="order-1 block text-[10px] font-medium text-slate-700">
                  {bg ? "Компания" : "Company"}
                  <input
                    className="mt-0.5 w-full rounded border border-[var(--line)] bg-[var(--surface-1)] px-2 py-1.5 text-xs"
                    onChange={(event) => setDraft((current) => ({ ...current, company_name: event.target.value }))}
                    value={draft.company_name}
                  />
                </label>
                <label className="order-3 block text-[10px] font-medium text-slate-700">
                  {bg ? "Източник" : "Source"}
                  <input
                    className="mt-0.5 w-full rounded border border-[var(--line)] bg-[var(--surface-1)] px-2 py-1.5 text-xs"
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        source: event.target.value,
                      }))
                    }
                    placeholder="LinkedIn"
                    value={draft.source ?? ""}
                  />
                </label>
                <label className="order-2 block text-[10px] font-medium text-slate-700">
                  {bg ? "Локация" : "Location"}
                  <input
                    className="mt-0.5 w-full rounded border border-[var(--line)] bg-[var(--surface-1)] px-2 py-1.5 text-xs"
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        location: event.target.value,
                      }))
                    }
                    value={draft.location ?? ""}
                  />
                </label>
                <label className="order-4 block text-[10px] font-medium text-slate-700">
                  {bg ? "Приоритет" : "Priority"}
                  <select
                    className="mt-0.5 w-full rounded border border-[var(--line)] bg-[var(--surface-1)] px-2 py-1.5 text-xs"
                    onChange={(event) => setDraft((current) => ({ ...current, priority: event.target.value as Application["priority"] }))}
                    value={draft.priority ?? "normal"}
                  >
                    <option value="high">{bg ? "Висок" : "High"}</option>
                    <option value="normal">{bg ? "Нормален" : "Normal"}</option>
                    <option value="low">{bg ? "Нисък" : "Low"}</option>
                  </select>
                </label>
                </div>
              {draft.id ? (
                <div className="grid min-w-0 gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
                  <input
                    aria-label={bg ? "Име на контакт" : "Contact name"}
                    className="min-w-0 w-full rounded border border-[var(--line)] bg-[var(--surface-1)] px-2 py-1.5 text-xs"
                    onChange={(event) => setContactName(event.target.value)}
                    placeholder={bg ? "Име на контакт" : "Contact name"}
                    value={contactName}
                  />
                  <input
                    aria-label={bg ? "Рекрутър" : "Recruiter"}
                    className="min-w-0 w-full rounded border border-[var(--line)] bg-[var(--surface-1)] px-2 py-1.5 text-xs"
                    onChange={(event) => setContactRole(event.target.value)}
                    placeholder={bg ? "Рекрутър, hiring manager…" : "Recruiter, hiring manager…"}
                    value={contactRole}
                  />
                  <button
                    className="inline-flex shrink-0 items-center justify-center gap-1 rounded-md border border-[var(--line)] px-2 py-1.5 text-xs font-semibold disabled:opacity-60"
                    disabled={busy || contactBusy || !contactName.trim()}
                    onClick={() => void addContact()}
                    type="button"
                  >
                    <UserPlus aria-hidden className="h-3.5 w-3.5" />
                    {bg ? "Контакт" : "Contact"}
                  </button>
                </div>
              ) : null}

              <div className="flex items-end gap-2">
                <div className="min-w-0 flex-1 space-y-2">
                  <label className="block text-[10px] font-medium text-slate-700">
                    {t.resumeCv}
                    <select
                      className="mt-0.5 w-full rounded border border-[var(--line)] bg-[var(--surface-1)] px-2 py-1.5 text-xs"
                      onChange={(e) => setDraft((d) => ({ ...d, cv_id: e.target.value }))}
                      value={draft.cv_id || ""}
                    >
                      <option value="">{t.noneSelected}</option>
                      {cvOptions.map((cv) => <option key={cv.id} value={cv.id}>{[cv.displayName || cv.id, cv.displayVersion].filter(Boolean).join(" ")}</option>)}
                    </select>
                  </label>
                  <label className="block text-[10px] font-medium text-slate-700">
                    {t.profilePhoto}
                    <select
                      className="mt-0.5 w-full rounded border border-[var(--line)] bg-[var(--surface-1)] px-2 py-1.5 text-xs"
                      onChange={(e) => setDraft((d) => ({ ...d, photo_id: e.target.value }))}
                      value={draft.photo_id || ""}
                    >
                      <option value="">{t.noneSelected}</option>
                      {photoOptions.map((photo) => <option key={photo.id} value={photo.id}>{photo.name || photo.id}</option>)}
                    </select>
                  </label>
                </div>
                {draft.photo_id ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    alt=""
                    className="aspect-square h-[84px] w-[84px] shrink-0 rounded border border-[var(--line)] object-cover"
                    src={photoOptions.find((p) => p.id === draft.photo_id)?.mediaUrl || `/api/photos/raw?id=${encodeURIComponent(draft.photo_id)}`}
                  />
                ) : null}
              </div>

                </>
              ) : null}

              {editorTab === "company" ? (
                <>
              <div className="grid gap-2 sm:grid-cols-2">
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
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
              <label className="block text-[10px] font-medium text-slate-700">
                {t.coverLetter}
                <select
                  className="mt-0.5 w-full rounded border border-[var(--line)] bg-[var(--surface-1)] px-2 py-1.5 text-xs"
                  onChange={(e) => setDraft((d) => ({ ...d, cover_letter_id: e.target.value }))}
                  value={draft.cover_letter_id || ""}
                >
                  <option value="">{t.noneSelected}</option>
                  {letterOptions.map((letter) => <option key={letter.id} value={letter.id}>{letter.title || letter.id}</option>)}
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
                {t.daysStuck}
                <input
                  className="mt-0.5 w-full rounded border border-[var(--line)] bg-[var(--surface-1)] px-2 py-1.5 text-xs tabular-nums"
                  inputMode="numeric"
                  max={9999}
                  min={0}
                  onChange={(e) => {
                    const raw = e.target.value;
                    if (raw === "") {
                      setDraft((d) => ({ ...d, days_without_progress: 0 }));
                      return;
                    }
                    const n = Number(raw);
                    if (!Number.isFinite(n)) return;
                    setDraft((d) => ({
                      ...d,
                      days_without_progress: clampDwellDays(n),
                    }));
                  }}
                  step={1}
                  title={t.daysStuckHint}
                  type="number"
                  value={draft.days_without_progress ?? 0}
                />
                <span className="mt-0.5 block text-[10px] font-normal text-[var(--ink-muted)]">
                  {t.daysStuckHint}
                </span>
              </label>
              </div>

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
                  className="mt-0.5 min-h-[4rem] min-w-0 max-w-full w-full resize-y rounded border border-[var(--line)] bg-[var(--surface-1)] px-2 py-1.5 text-xs"
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, notes: e.target.value }))
                  }
                  value={draft.notes || ""}
                />
              </label>
              </>
              ) : null}

              {selectedApplication && editorTab === "snapshots" ? (
                <ApplicationSubmissionHistory
                  application={selectedApplication}
                  disabled={busy}
                  language={language}
                  onChanged={(message) =>
                    void refreshApplication(selectedApplication.id, message)
                  }
                  templateId={defaultTemplateId}
                  theme={defaultTemplateTheme}
                />
              ) : null}

              {selectedApplication && editorTab === "application" ? (
                <ApplicationActivityTimeline
                    application={selectedApplication}
                    disabled={busy}
                    language={language}
                    onChanged={(message) =>
                      void refreshApplication(selectedApplication.id, message)
                    }
                />
              ) : null}

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
                {selectedApplication ? (
                  <button
                    className="inline-flex items-center gap-1 rounded-md border border-[var(--line)] bg-white px-3 py-1.5 text-xs font-semibold disabled:opacity-60"
                    disabled={busy}
                    onClick={() => void setArchived(selectedApplication)}
                    type="button"
                  >
                    <Archive aria-hidden className="h-3.5 w-3.5" />
                    {selectedApplication.archived_at
                      ? bg
                        ? "Възстанови"
                        : "Restore"
                      : bg
                        ? "Архивирай"
                        : "Archive"}
                  </button>
                ) : null}
                <button
                  className="rounded-md border border-[var(--line)] bg-white px-3 py-1.5 text-xs font-semibold"
                  disabled={busy}
                  onClick={() => {
                    onAssistantSelectionChange?.(null);
                    setEditorOpen(false);
                    setDraft(emptyDraft());
                  }}
                  type="button"
                >
                  {t.cancel}
                </button>
              </div>
            </div>
          ) : null}
        </aside>
      </div>
      )}
    </div>
  );
}
