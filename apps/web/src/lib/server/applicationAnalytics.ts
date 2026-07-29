import type {
  Application,
  ApplicationActivity,
  ApplicationStatus,
} from "./applicationStore";

export type ApplicationAnalytics = {
  totals: {
    active: number;
    archived: number;
    submitted: number;
    responses: number;
    interviews: number;
    offers: number;
  };
  conversion: {
    responseRate: number;
    interviewRate: number;
    offerRate: number;
  };
  medianDaysByStage: Partial<Record<ApplicationStatus, number>>;
  bySource: Array<{ name: string; applications: number; interviews: number; offers: number }>;
  byRoleFamily: Array<{ name: string; applications: number; interviews: number; offers: number }>;
  followUps: { sent: number; followedByResponse: number };
  dataQuality: {
    applicationsWithoutTimeline: number;
    submittedWithoutSnapshot: number;
  };
};

const DAY = 24 * 60 * 60 * 1000;

function percent(numerator: number, denominator: number): number {
  return denominator > 0 ? Math.round((numerator / denominator) * 1000) / 10 : 0;
}

function hasType(application: Application, types: ApplicationActivity["type"][]): boolean {
  return (application.activities ?? []).some((activity) =>
    types.includes(activity.type),
  );
}

function median(values: number[]): number | undefined {
  if (values.length === 0) return undefined;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  const value =
    sorted.length % 2 === 0
      ? (sorted[middle - 1] + sorted[middle]) / 2
      : sorted[middle];
  return Math.round(value * 10) / 10;
}

function grouped(
  applications: Application[],
  readName: (application: Application) => string,
): ApplicationAnalytics["bySource"] {
  const groups = new Map<
    string,
    { applications: number; interviews: number; offers: number }
  >();
  for (const application of applications) {
    const name = readName(application).trim() || "Unspecified";
    const current = groups.get(name) ?? {
      applications: 0,
      interviews: 0,
      offers: 0,
    };
    current.applications += 1;
    if (
      application.status === "interview" ||
      application.status === "offer" ||
      hasType(application, ["phone_screen", "interview_round"])
    ) {
      current.interviews += 1;
    }
    if (application.status === "offer" || hasType(application, ["offer"])) {
      current.offers += 1;
    }
    groups.set(name, current);
  }
  return [...groups.entries()]
    .map(([name, values]) => ({ name, ...values }))
    .sort((a, b) => b.applications - a.applications || a.name.localeCompare(b.name));
}

export function computeApplicationAnalytics(
  applications: Application[],
): ApplicationAnalytics {
  const active = applications.filter((application) => !application.archived_at);
  const submitted = applications.filter(
    (application) =>
      Boolean(application.applied_at) ||
      (application.submission_snapshots?.length ?? 0) > 0 ||
      application.status !== "wishlist",
  );
  const responses = submitted.filter(
    (application) =>
      application.status === "interview" ||
      application.status === "offer" ||
      hasType(application, [
        "recruiter_contact",
        "phone_screen",
        "interview_round",
        "assessment",
        "offer",
      ]),
  );
  const interviews = submitted.filter(
    (application) =>
      application.status === "interview" ||
      application.status === "offer" ||
      hasType(application, ["phone_screen", "interview_round"]),
  );
  const offers = submitted.filter(
    (application) =>
      application.status === "offer" || hasType(application, ["offer"]),
  );

  const stageDurations = new Map<ApplicationStatus, number[]>();
  for (const application of applications) {
    const chronological = [...(application.activities ?? [])].sort((a, b) =>
      a.occurred_at.localeCompare(b.occurred_at),
    );
    for (let index = 0; index < chronological.length - 1; index += 1) {
      const activity = chronological[index];
      const next = chronological[index + 1];
      const stage = activity.to_status;
      if (!stage) continue;
      const duration =
        (Date.parse(next.occurred_at) - Date.parse(activity.occurred_at)) / DAY;
      if (!Number.isFinite(duration) || duration < 0) continue;
      const values = stageDurations.get(stage) ?? [];
      values.push(duration);
      stageDurations.set(stage, values);
    }
  }
  const medianDaysByStage: ApplicationAnalytics["medianDaysByStage"] = {};
  for (const [stage, values] of stageDurations) {
    const value = median(values);
    if (value !== undefined) medianDaysByStage[stage] = value;
  }

  let followUps = 0;
  let followedByResponse = 0;
  for (const application of applications) {
    const chronological = [...(application.activities ?? [])].sort((a, b) =>
      a.occurred_at.localeCompare(b.occurred_at),
    );
    for (let index = 0; index < chronological.length; index += 1) {
      if (chronological[index].type !== "follow_up_sent") continue;
      followUps += 1;
      if (
        chronological
          .slice(index + 1)
          .some((activity) =>
            [
              "recruiter_contact",
              "phone_screen",
              "interview_round",
              "assessment",
              "offer",
            ].includes(activity.type),
          )
      ) {
        followedByResponse += 1;
      }
    }
  }

  return {
    totals: {
      active: active.length,
      archived: applications.length - active.length,
      submitted: submitted.length,
      responses: responses.length,
      interviews: interviews.length,
      offers: offers.length,
    },
    conversion: {
      responseRate: percent(responses.length, submitted.length),
      interviewRate: percent(interviews.length, submitted.length),
      offerRate: percent(offers.length, submitted.length),
    },
    medianDaysByStage,
    bySource: grouped(applications, (application) => application.source ?? ""),
    byRoleFamily: grouped(
      applications,
      (application) => application.role_family ?? "",
    ),
    followUps: { sent: followUps, followedByResponse },
    dataQuality: {
      applicationsWithoutTimeline: applications.filter(
        (application) => (application.activities?.length ?? 0) === 0,
      ).length,
      submittedWithoutSnapshot: submitted.filter(
        (application) => (application.submission_snapshots?.length ?? 0) === 0,
      ).length,
    },
  };
}
