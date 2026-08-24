import type { Application } from "./application-operations-types";

type ApplicationBoardPayload = {
  applications?: Application[];
  duplicates?: Record<string, string[]>;
};

let boardRequest: Promise<ApplicationBoardPayload> | null = null;

export function loadPrefetchedApplications(force = false): Promise<ApplicationBoardPayload> {
  if (force || !boardRequest) {
    boardRequest = fetch("/api/applications", { cache: "no-store" }).then(async (response) => {
      if (!response.ok) throw new Error("Could not load applications.");
      return (await response.json()) as ApplicationBoardPayload;
    });
  }
  return boardRequest;
}

export function prefetchApplications(): void {
  void loadPrefetchedApplications().catch(() => undefined);
}
