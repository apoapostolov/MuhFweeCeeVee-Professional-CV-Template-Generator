"use client";

import { useEffect, useState } from "react";
import { Archive, Play, Search, Trash2 } from "lucide-react";

import type { AssistantPlaybook, AssistantSession } from "@muhfweeceevee/schemas";

type SessionSummary = Pick<
  AssistantSession,
  "id" | "title" | "status" | "updatedAt" | "context"
>;

export function AssistantLibrary({
  activePanel,
  draft,
  onOpenSession,
  onUsePlaybook,
}: {
  activePanel: string;
  draft: string;
  onOpenSession: (id: string) => void;
  onUsePlaybook: (prompt: string) => void;
}) {
  const [tab, setTab] = useState<"conversations" | "playbooks">("conversations");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("active");
  const [scope, setScope] = useState("all");
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [playbooks, setPlaybooks] = useState<AssistantPlaybook[]>([]);

  async function refresh(): Promise<void> {
    const search = new URLSearchParams({
      q: query,
      status,
      panel: scope === "current" ? activePanel : scope,
    });
    const [sessionsResponse, playbooksResponse] = await Promise.all([
      fetch(`/api/assistant/sessions?${search}`),
      fetch("/api/assistant/playbooks"),
    ]);
    if (sessionsResponse.ok) {
      const payload = (await sessionsResponse.json()) as { sessions?: SessionSummary[] };
      setSessions(payload.sessions ?? []);
    }
    if (playbooksResponse.ok) {
      const payload = (await playbooksResponse.json()) as { playbooks?: AssistantPlaybook[] };
      setPlaybooks(payload.playbooks ?? []);
    }
  }

  useEffect(() => {
    void refresh();
    // Query changes intentionally refresh the private local index.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePanel, query, scope, status]);

  async function archive(session: SessionSummary): Promise<void> {
    await fetch(`/api/assistant/sessions/${encodeURIComponent(session.id)}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status: session.status === "active" ? "archived" : "active" }),
    });
    await refresh();
  }

  async function saveDraft(): Promise<void> {
    if (!draft.trim()) return;
    const title = window.prompt("Playbook name", draft.trim().slice(0, 60));
    if (!title?.trim()) return;
    await fetch("/api/assistant/playbooks", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        title,
        description: `Saved for ${activePanel}`,
        prompt: draft,
        scopePanels: [activePanel],
      }),
    });
    await refresh();
  }

  async function removePlaybook(id: string): Promise<void> {
    await fetch(`/api/assistant/playbooks/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    await refresh();
  }

  return (
    <section className="min-h-0 flex-1 overflow-y-auto border-b border-[var(--line)] bg-[var(--surface-2)] p-3">
      <div className="flex gap-2" role="tablist" aria-label="Assistant library">
        {(["conversations", "playbooks"] as const).map((value) => (
          <button
            aria-selected={tab === value}
            className={`rounded px-2 py-1 text-xs font-semibold ${tab === value ? "bg-[var(--accent)] text-white" : "border border-[var(--line)]"}`}
            key={value}
            onClick={() => setTab(value)}
            role="tab"
            type="button"
          >
            {value === "conversations" ? "Conversations" : "Playbooks"}
          </button>
        ))}
      </div>
      {tab === "conversations" ? (
        <>
          <div className="mt-3 flex gap-2">
            <label className="relative min-w-0 flex-1">
              <span className="sr-only">Search conversations</span>
              <Search aria-hidden className="absolute left-2 top-2 h-3.5 w-3.5" />
              <input
                className="w-full rounded border border-[var(--line)] bg-[var(--surface-1)] py-1.5 pl-7 pr-2 text-xs"
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search titles"
                value={query}
              />
            </label>
            <select
              aria-label="Conversation status"
              className="rounded border border-[var(--line)] bg-[var(--surface-1)] px-2 text-xs"
              onChange={(event) => setStatus(event.target.value)}
              value={status}
            >
              <option value="active">Active</option>
              <option value="archived">Archived</option>
              <option value="all">All</option>
            </select>
          </div>
          <select
            aria-label="Conversation workspace scope"
            className="mt-2 w-full rounded border border-[var(--line)] bg-[var(--surface-1)] px-2 py-1.5 text-xs"
            onChange={(event) => setScope(event.target.value)}
            value={scope}
          >
            <option value="all">All workspace scopes</option>
            <option value="current">Current panel: {activePanel}</option>
          </select>
          <div className="mt-3 space-y-2">
            {sessions.map((session) => (
              <article className="rounded border border-[var(--line)] bg-[var(--surface-1)] p-2" key={session.id}>
                <button className="block w-full text-left text-xs font-semibold" onClick={() => onOpenSession(session.id)} type="button">
                  {session.title}
                </button>
                <div className="mt-1 flex items-center justify-between text-[10px] text-[var(--ink-muted)]">
                  <span>{session.context.activePanel} · {new Date(session.updatedAt).toLocaleDateString()}</span>
                  <button aria-label={session.status === "active" ? "Archive conversation" : "Restore conversation"} onClick={() => void archive(session)} type="button">
                    <Archive aria-hidden className="h-3.5 w-3.5" />
                  </button>
                </div>
              </article>
            ))}
          </div>
        </>
      ) : (
        <>
          <button className="mt-3 w-full rounded border border-[var(--line)] px-2 py-1.5 text-xs font-semibold disabled:opacity-50" disabled={!draft.trim()} onClick={() => void saveDraft()} type="button">
            Save current draft as playbook
          </button>
          <div className="mt-3 space-y-2">
            {playbooks.map((playbook) => (
                <article className="rounded border border-[var(--line)] bg-[var(--surface-1)] p-2" key={playbook.id}>
                  <p className="text-xs font-semibold">{playbook.title}</p>
                  <p className="mt-1 text-[10px] text-[var(--ink-muted)]">{playbook.description}</p>
                  {playbook.scopePanels.length > 0 ? (
                    <p className="mt-1 text-[9px] uppercase tracking-wide text-[var(--ink-muted)]">
                      Best in {playbook.scopePanels.join(", ")}
                    </p>
                  ) : null}
                  <div className="mt-2 flex justify-end gap-2">
                    {!playbook.id.startsWith("builtin_") ? (
                      <button aria-label={`Delete ${playbook.title}`} onClick={() => void removePlaybook(playbook.id)} type="button"><Trash2 aria-hidden className="h-3.5 w-3.5" /></button>
                    ) : null}
                    <button className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--accent)]" onClick={() => onUsePlaybook(playbook.prompt)} type="button">
                      <Play aria-hidden className="h-3 w-3" /> Use
                    </button>
                  </div>
                </article>
              ))}
          </div>
        </>
      )}
    </section>
  );
}
