import crypto from "node:crypto";

import type {
  AssistantApprovalProposal,
  AssistantEvent,
  AssistantHandoff,
} from "@muhfweeceevee/schemas";

const PANEL_BY_TOOL_TERM: Array<[string, string, string]> = [
  ["application", "applications", "Open Applications"],
  ["cover_letter", "cover_letters", "Open Cover Letters"],
  ["research", "research", "Open Research"],
  ["company", "research", "Open Research"],
  ["job", "research", "Open Research"],
  ["cv", "editor", "Open CV Editor"],
  ["export", "workspace", "Open Print Room"],
  ["preview", "workspace", "Open Print Room"],
];

export function assistantHandoffForProposal(
  proposal: AssistantApprovalProposal,
): AssistantEvent | null {
  const match = PANEL_BY_TOOL_TERM.find(([term]) => proposal.toolName.includes(term));
  if (!match) return null;
  const [, panel, label] = match;
  const record = proposal.context.records.find((item) => {
    if (panel === "applications") return item.type === "application";
    if (panel === "editor") return item.type === "cv";
    if (panel === "cover_letters") return item.type === "cover_letter";
    return item.type === "company" || item.type === "job";
  });
  const handoff: AssistantHandoff = {
    id: `handoff_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`,
    label,
    description: `Continue with ${proposal.targetDescription} in the workspace.`,
    panel,
    ...(record ? { record } : {}),
  };
  return {
    type: "handoff_available",
    handoff,
    timestamp: new Date().toISOString(),
  };
}
