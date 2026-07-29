"use client";

import { useCallback, useEffect, useMemo, useState, type JSX } from "react";
import { Clipboard, Link2, Plus, Trash2 } from "lucide-react";

import type {
  CareerEvidenceEntry,
  CareerEvidenceKind,
} from "@/lib/server/careerEvidenceStore";

const KINDS: CareerEvidenceKind[] = [
  "achievement",
  "responsibility",
  "skill",
  "project",
  "leadership",
  "domain",
];

export function CareerEvidenceView({
  language,
  defaultCvId,
}: {
  language: string;
  defaultCvId?: string;
}): JSX.Element {
  const [entries, setEntries] = useState<CareerEvidenceEntry[]>([]);
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<CareerEvidenceKind>("achievement");
  const [title, setTitle] = useState("");
  const [statement, setStatement] = useState("");
  const [tags, setTags] = useState("");
  const [source, setSource] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const bg = language === "bg";

  const load = useCallback(async () => {
    const response = await fetch("/api/evidence");
    const payload = (await response.json()) as { entries?: CareerEvidenceEntry[] };
    setEntries(payload.entries ?? []);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return entries;
    return entries.filter((entry) =>
      [
        entry.title,
        entry.statement,
        entry.metric,
        entry.source,
        ...entry.tags,
        ...entry.role_families,
        ...entry.industries,
      ]
        .filter(Boolean)
        .join("\n")
        .toLowerCase()
        .includes(needle),
    );
  }, [entries, query]);

  async function save(): Promise<void> {
    if (!statement.trim()) {
      setNotice(bg ? "Твърдението е задължително." : "Evidence statement is required.");
      return;
    }
    setBusy(true);
    setNotice("");
    try {
      const response = await fetch("/api/evidence", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          kind,
          title: title || statement.slice(0, 60),
          statement,
          tags: tags.split(",").map((tag) => tag.trim()).filter(Boolean),
          source: source || undefined,
          source_cv_ids: defaultCvId ? [defaultCvId] : [],
          last_verified_at: new Date().toISOString(),
        }),
      });
      const payload = (await response.json()) as {
        error?: string;
        entries?: CareerEvidenceEntry[];
      };
      if (!response.ok) {
        setNotice(payload.error ?? "Save failed.");
        return;
      }
      setEntries(payload.entries ?? []);
      setTitle("");
      setStatement("");
      setTags("");
      setSource("");
      setNotice(bg ? "Доказателството е запазено." : "Evidence saved.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string): Promise<void> {
    const response = await fetch(`/api/evidence/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    const payload = (await response.json()) as { entries?: CareerEvidenceEntry[] };
    if (response.ok) setEntries(payload.entries ?? []);
  }

  async function link(entry: CareerEvidenceEntry): Promise<void> {
    if (!defaultCvId) {
      setNotice(bg ? "Изберете CV първо." : "Select a CV first.");
      return;
    }
    const response = await fetch(
      `/api/evidence/${encodeURIComponent(entry.id)}/links`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ cvId: defaultCvId }),
      },
    );
    const payload = (await response.json()) as { error?: string };
    setNotice(
      response.ok
        ? bg
          ? `Свързано с ${defaultCvId}.`
          : `Linked to ${defaultCvId}.`
        : payload.error ?? "Link failed.",
    );
  }

  return (
    <div className="grid min-h-0 gap-3 lg:grid-cols-[minmax(260px,360px)_1fr]">
      <section className="rounded-md border border-[var(--line)] bg-white p-3">
        <h3 className="text-sm font-semibold">
          {bg ? "Ново доказателство" : "New career evidence"}
        </h3>
        <p className="mt-0.5 text-[10px] text-[var(--ink-muted)]">
          {bg
            ? "Проверими факти за повторна употреба, със source и дата."
            : "Verified reusable facts with source and verification date."}
        </p>
        <div className="mt-3 space-y-2">
          <select
            aria-label={bg ? "Вид доказателство" : "Evidence kind"}
            className="w-full rounded border border-[var(--line)] px-2 py-1.5 text-xs"
            onChange={(event) => setKind(event.target.value as CareerEvidenceKind)}
            value={kind}
          >
            {KINDS.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
          <input
            aria-label={bg ? "Заглавие" : "Title"}
            className="w-full rounded border border-[var(--line)] px-2 py-1.5 text-xs"
            onChange={(event) => setTitle(event.target.value)}
            placeholder={bg ? "Кратко заглавие" : "Short title"}
            value={title}
          />
          <textarea
            aria-label={bg ? "Твърдение" : "Evidence statement"}
            className="min-h-28 w-full resize-y rounded border border-[var(--line)] px-2 py-1.5 text-xs"
            onChange={(event) => setStatement(event.target.value)}
            placeholder={
              bg
                ? "Напр. Намалих времето за доставка с 35%…"
                : "e.g. Reduced delivery time by 35%…"
            }
            value={statement}
          />
          <input
            aria-label={bg ? "Тагове" : "Tags"}
            className="w-full rounded border border-[var(--line)] px-2 py-1.5 text-xs"
            onChange={(event) => setTags(event.target.value)}
            placeholder={bg ? "product, fintech, leadership" : "product, fintech, leadership"}
            value={tags}
          />
          <input
            aria-label={bg ? "Източник" : "Source"}
            className="w-full rounded border border-[var(--line)] px-2 py-1.5 text-xs"
            onChange={(event) => setSource(event.target.value)}
            placeholder={bg ? "Източник / проект / роля" : "Source / project / role"}
            value={source}
          />
          <button
            className="inline-flex items-center gap-1.5 rounded-md bg-[var(--accent)] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
            disabled={busy}
            onClick={() => void save()}
            type="button"
          >
            <Plus aria-hidden className="h-3.5 w-3.5" />
            {bg ? "Запази" : "Save evidence"}
          </button>
          {notice ? <p className="text-xs text-[var(--ink-muted)]" role="status">{notice}</p> : null}
        </div>
      </section>

      <section className="min-h-0 rounded-md border border-[var(--line)] bg-white p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold">
            {bg ? "Библиотека" : "Evidence library"} ({entries.length})
          </h3>
          <input
            aria-label={bg ? "Търси доказателства" : "Search evidence"}
            className="rounded border border-[var(--line)] px-2 py-1.5 text-xs"
            onChange={(event) => setQuery(event.target.value)}
            placeholder={bg ? "Търси…" : "Search…"}
            type="search"
            value={query}
          />
        </div>
        {visible.length === 0 ? (
          <p className="mt-6 text-center text-xs text-[var(--ink-muted)]">
            {bg ? "Няма доказателства." : "No evidence yet."}
          </p>
        ) : (
          <ul className="mt-3 max-h-[60vh] space-y-2 overflow-y-auto">
            {visible.map((entry) => (
              <li className="rounded-md border border-[var(--line)] p-3" key={entry.id}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold">{entry.title}</p>
                    <p className="mt-1 text-xs leading-relaxed">{entry.statement}</p>
                    <p className="mt-1 text-[10px] text-[var(--ink-muted)]">
                      {entry.kind}
                      {entry.source ? ` · ${entry.source}` : ""}
                      {entry.last_verified_at
                        ? ` · verified ${new Date(entry.last_verified_at).toLocaleDateString()}`
                        : ""}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <button
                      aria-label={bg ? "Копирай" : "Copy statement"}
                      className="rounded p-1.5 hover:bg-[var(--surface-2)]"
                      onClick={() => void navigator.clipboard.writeText(entry.statement)}
                      title={bg ? "Копирай" : "Copy statement"}
                      type="button"
                    >
                      <Clipboard aria-hidden className="h-3.5 w-3.5" />
                    </button>
                    <button
                      aria-label={bg ? "Свържи с текущото CV" : "Link to current CV"}
                      className="rounded p-1.5 hover:bg-[var(--surface-2)]"
                      onClick={() => void link(entry)}
                      title={bg ? "Свържи с текущото CV" : "Link provenance to current CV"}
                      type="button"
                    >
                      <Link2 aria-hidden className="h-3.5 w-3.5" />
                    </button>
                    <button
                      aria-label={bg ? "Изтрий" : "Delete evidence"}
                      className="rounded p-1.5 text-rose-700 hover:bg-rose-50"
                      onClick={() => void remove(entry.id)}
                      title={bg ? "Изтрий" : "Delete evidence"}
                      type="button"
                    >
                      <Trash2 aria-hidden className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                {entry.tags.length ? (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {entry.tags.map((tag) => (
                      <span className="rounded bg-[var(--surface-2)] px-1.5 py-0.5 text-[9px]" key={tag}>
                        {tag}
                      </span>
                    ))}
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
