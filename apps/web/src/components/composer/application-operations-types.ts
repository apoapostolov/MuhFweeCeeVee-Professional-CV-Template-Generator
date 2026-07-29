import type {
  Application,
  ApplicationPriority,
  ApplicationStatus,
} from "@/lib/server/applicationStore";

export type { Application, ApplicationPriority, ApplicationStatus };

export type ApplicationsView = "board" | "today" | "analytics" | "evidence";

export type ApplicationFilters = {
  search: string;
  status: "all" | ApplicationStatus;
  priority: "all" | ApplicationPriority;
  packet: "all" | "complete" | "missing";
  archive: "active" | "archived" | "all";
};

export type SavedApplicationView = {
  id: string;
  name: string;
  filters: ApplicationFilters;
};

export const DEFAULT_APPLICATION_FILTERS: ApplicationFilters = {
  search: "",
  status: "all",
  priority: "all",
  packet: "all",
  archive: "active",
};

const STORAGE_KEY = "mfcv.applications.saved-views.v1";

export function loadSavedApplicationViews(): SavedApplicationView[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "[]");
    return Array.isArray(parsed)
      ? parsed.filter(
          (entry): entry is SavedApplicationView =>
            Boolean(entry) &&
            typeof entry.id === "string" &&
            typeof entry.name === "string" &&
            Boolean(entry.filters),
        )
      : [];
  } catch {
    return [];
  }
}

export function saveApplicationViews(views: SavedApplicationView[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(views));
}

export function applicationMatchesFilters(
  application: Application,
  filters: ApplicationFilters,
): boolean {
  if (
    filters.archive === "active" &&
    application.archived_at
  ) return false;
  if (
    filters.archive === "archived" &&
    !application.archived_at
  ) return false;
  if (filters.status !== "all" && application.status !== filters.status) {
    return false;
  }
  if (
    filters.priority !== "all" &&
    (application.priority ?? "normal") !== filters.priority
  ) {
    return false;
  }
  const complete = Boolean(
    application.cv_id &&
      application.photo_id &&
      (application.company_id || application.company_name) &&
      application.cover_letter_id,
  );
  if (filters.packet === "complete" && !complete) return false;
  if (filters.packet === "missing" && complete) return false;
  const needle = filters.search.trim().toLowerCase();
  if (!needle) return true;
  return [
    application.company_name,
    application.job_title,
    application.packet_title,
    application.notes,
    application.url,
    application.source,
    application.location,
    application.role_family,
    application.cv_family,
    application.raw_job_input,
    ...(application.activities ?? []).flatMap((activity) => [
      activity.summary,
      activity.notes,
    ]),
  ]
    .filter(Boolean)
    .join("\n")
    .toLowerCase()
    .includes(needle);
}
