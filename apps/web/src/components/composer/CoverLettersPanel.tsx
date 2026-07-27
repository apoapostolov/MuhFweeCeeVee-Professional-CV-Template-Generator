"use client";

import { useCallback, useEffect, useState, type JSX } from "react";

export type CoverLetterItem = {
  id: string;
  cv_id: string;
  company_id?: string;
  job_id?: string;
  title: string;
  body: string;
  version?: number;
  updated_at: string;
};

type VersionMeta = {
  version: number;
  saved_at: string;
  source: string;
  title: string;
  body_preview: string;
};

type UndoSnapshot = { title: string; body: string };

const MAX_UNDO = 30;

export type CoverLettersPanelProps = {
  language: string;
  selectedCvId: string;
  selectedCompanyId: string;
  selectedJobId: string;
  researchCompanyName?: string;
  researchJobTitle?: string;
};

function sourceLabel(source: string, bg: boolean): string {
  const map: Record<string, { en: string; bg: string }> = {
    save: { en: "Save", bg: "Запис" },
    ai_draft: { en: "AI draft", bg: "AI чернова" },
    humanize: { en: "Humanize", bg: "Humanize" },
    restore: { en: "Restore", bg: "Възстановено" },
    manual: { en: "Edit", bg: "Редакция" },
  };
  const entry = map[source] ?? { en: source, bg: source };
  return bg ? entry.bg : entry.en;
}

export function CoverLettersPanel(props: CoverLettersPanelProps): JSX.Element {
  const {
    language,
    selectedCvId,
    selectedCompanyId,
    selectedJobId,
    researchCompanyName,
    researchJobTitle,
  } = props;
  const bg = language === "bg";

  const [items, setItems] = useState<CoverLetterItem[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  /** Saved head version on disk. */
  const [version, setVersion] = useState<number | null>(null);
  /** History version currently loaded into the editor (null = head / new edits). */
  const [loadedFromVersion, setLoadedFromVersion] = useState<number | null>(null);
  const [versions, setVersions] = useState<VersionMeta[]>([]);
  const [undoStack, setUndoStack] = useState<UndoSnapshot[]>([]);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    const response = await fetch("/api/cover-letters");
    const payload = (await response.json()) as { items?: CoverLetterItem[] };
    setItems(payload.items ?? []);
  }, []);

  const loadVersions = useCallback(async (id: string) => {
    if (!id) {
      setVersions([]);
      return;
    }
    try {
      const response = await fetch(
        `/api/cover-letters?id=${encodeURIComponent(id)}&versions=1`,
      );
      const payload = (await response.json()) as { versions?: VersionMeta[] };
      setVersions(payload.versions ?? []);
    } catch {
      setVersions([]);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const item = items.find((entry) => entry.id === selectedId);
    if (item) {
      setTitle(item.title);
      setBody(item.body);
      setVersion(item.version ?? null);
      setLoadedFromVersion(null);
      setUndoStack([]);
      void loadVersions(item.id);
    }
  }, [items, selectedId, loadVersions]);

  function pushUndo() {
    setUndoStack((prev) => {
      const next = [...prev, { title, body }];
      if (next.length > MAX_UNDO) next.shift();
      return next;
    });
  }

  function undo() {
    setUndoStack((prev) => {
      if (prev.length === 0) return prev;
      const stack = [...prev];
      const snap = stack.pop()!;
      setTitle(snap.title);
      setBody(snap.body);
      setNotice(bg ? "Отменено (локално)." : "Undone (local).");
      return stack;
    });
  }

  async function save(options: { draftWithAi?: boolean; humanize?: boolean } = {}) {
    if (!selectedCvId) {
      setNotice(
        bg ? "Изберете CV в Editor." : "Select a CV in the Editor first.",
      );
      return;
    }
    if (options.humanize && !body.trim()) {
      setNotice(bg ? "Няма текст за humanize." : "Nothing to humanize yet.");
      return;
    }

    if (options.draftWithAi || options.humanize) {
      pushUndo();
    }

    setBusy(true);
    setNotice("");
    try {
      const response = await fetch("/api/cover-letters", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "save",
          id: selectedId || undefined,
          cvId: selectedCvId,
          companyId: selectedCompanyId || undefined,
          jobId: selectedJobId || undefined,
          title: title || undefined,
          body,
          draftWithAi: options.draftWithAi === true,
          humanize: options.humanize === true,
        }),
      });
      const payload = (await response.json()) as {
        error?: string;
        item?: CoverLetterItem;
        versions?: VersionMeta[];
        skill?: {
          skillId?: string;
          skillName?: string;
          applied?: boolean;
          warning?: string;
        };
      };
      if (!response.ok || !payload.item) {
        setNotice(payload.error ?? "Save failed.");
        return;
      }
      setSelectedId(payload.item.id);
      setTitle(payload.item.title);
      setBody(payload.item.body);
      setVersion(payload.item.version ?? null);
      setLoadedFromVersion(null);
      if (payload.versions) setVersions(payload.versions);
      else void loadVersions(payload.item.id);
      await load();
      if (options.draftWithAi) {
        setNotice(
          bg
            ? "AI черновата е готова. Стартирайте Humanize отделно, ако искате."
            : "AI draft ready. Run Humanize separately if you want.",
        );
      } else if (options.humanize) {
        setNotice(
          bg
            ? `Humanizer приложен (v${payload.item.version ?? "?"}).`
            : `Humanizer applied (v${payload.item.version ?? "?"}).`,
        );
      } else {
        setNotice(
          bg
            ? `Запазено (v${payload.item.version ?? "?"}).`
            : `Saved (v${payload.item.version ?? "?"}).`,
        );
      }
    } catch {
      setNotice("Save failed.");
    } finally {
      setBusy(false);
    }
  }

  /** Load a history snapshot into the editor only — no new server version until Save. */
  async function loadVersionIntoEditor(versionNum: number) {
    if (!selectedId) return;
    pushUndo();
    setBusy(true);
    setNotice("");
    try {
      const response = await fetch(
        `/api/cover-letters?id=${encodeURIComponent(selectedId)}&version=${versionNum}`,
      );
      const payload = (await response.json()) as {
        error?: string;
        version?: {
          version: number;
          title: string;
          body: string;
        };
      };
      if (!response.ok || !payload.version) {
        setNotice(payload.error ?? "Load failed.");
        return;
      }
      setTitle(payload.version.title);
      setBody(payload.version.body);
      setLoadedFromVersion(payload.version.version);
      setNotice(
        bg
          ? `Заредена v${versionNum} в редактора (незаписана). Запази за нова версия.`
          : `Loaded v${versionNum} into the editor (unsaved). Save to create a new version.`,
      );
    } catch {
      setNotice("Load failed.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    setBusy(true);
    try {
      await fetch("/api/cover-letters", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "delete", id }),
      });
      if (selectedId === id) {
        setSelectedId("");
        setTitle("");
        setBody("");
        setVersion(null);
        setLoadedFromVersion(null);
        setVersions([]);
        setUndoStack([]);
      }
      await load();
    } finally {
      setBusy(false);
    }
  }

  function startNew() {
    setSelectedId("");
    setTitle(
      researchJobTitle || researchCompanyName
        ? `Cover letter — ${researchJobTitle || "Role"}${researchCompanyName ? ` @ ${researchCompanyName}` : ""}`
        : "Cover letter",
    );
    setBody("");
    setVersion(null);
    setLoadedFromVersion(null);
    setVersions([]);
    setUndoStack([]);
    setNotice("");
  }

  return (
    <div className="grid min-h-0 min-w-0 flex-1 gap-4 overflow-x-hidden md:grid-cols-[minmax(0,260px)_minmax(0,1fr)_minmax(0,200px)]">
      {/* List */}
      <aside className="flex min-h-0 min-w-0 flex-col overflow-x-hidden rounded-xl border border-[var(--line)] bg-white p-3">
        <p className="text-sm font-semibold text-slate-900">
          {bg ? "Писма" : "Cover letters"}
        </p>
        <p className="mt-1 text-xs text-[var(--ink-muted)]">
          {bg
            ? "CV + Research цел. AI и Humanize са отделни стъпки."
            : "CV + Research target. AI draft and Humanize are separate steps."}
        </p>
        <button
          className="mt-3 rounded-md bg-[var(--accent)] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
          disabled={busy}
          onClick={startNew}
          type="button"
        >
          {bg ? "Ново писмо" : "New letter"}
        </button>
        <ul className="mt-3 min-h-0 flex-1 space-y-1 overflow-x-hidden overflow-y-auto">
          {items.map((item) => (
            <li key={item.id}>
              <button
                className={`w-full min-w-0 rounded-md border px-2 py-1.5 text-left text-xs ${
                  selectedId === item.id
                    ? "border-[var(--accent)] bg-[var(--accent-soft)]"
                    : "border-[var(--line)] bg-[var(--surface-1)]"
                }`}
                onClick={() => setSelectedId(item.id)}
                type="button"
              >
                <span className="block truncate font-semibold">{item.title}</span>
                <span className="block text-[10px] text-[var(--ink-muted)]">
                  {item.updated_at.slice(0, 10)}
                  {item.version != null ? ` · v${item.version}` : ""}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </aside>

      {/* Editor — body fills remaining height; actions stay pinned */}
      <section className="flex min-h-0 min-w-0 flex-col overflow-hidden rounded-xl border border-[var(--line)] bg-white">
        <div className="shrink-0 space-y-3 px-4 pt-4">
          {notice ? (
            <p className="rounded-md border border-[var(--line)] bg-[var(--surface-1)] px-2 py-1.5 text-xs">
              {notice}
            </p>
          ) : null}
          <label className="block text-xs font-medium text-slate-800">
            {bg ? "Заглавие" : "Title"}
            <input
              className="mt-1 w-full rounded-md border border-[var(--line)] bg-[var(--surface-1)] px-2 py-1.5 text-xs"
              onChange={(event) => {
                setTitle(event.target.value);
                if (loadedFromVersion != null) setLoadedFromVersion(null);
              }}
              value={title}
            />
          </label>
        </div>

        <div className="flex min-h-0 flex-1 flex-col px-4 pt-3 pb-2">
          <div className="flex shrink-0 items-center justify-between gap-2 text-xs font-medium text-slate-800">
            <span>{bg ? "Текст" : "Body"}</span>
            <span className="text-[10px] font-normal text-[var(--ink-muted)]">
              {loadedFromVersion != null
                ? bg
                  ? `преглед v${loadedFromVersion}${version != null ? ` · записана v${version}` : ""}`
                  : `viewing v${loadedFromVersion}${version != null ? ` · saved v${version}` : ""}`
                : version != null
                  ? `v${version}`
                  : ""}
            </span>
          </div>
          {/* Absolute fill so the body uses the full remaining column height. */}
          <div className="relative mt-1 min-h-0 flex-1">
            <textarea
              className="absolute inset-0 h-full w-full resize-none rounded-md border border-[var(--line)] bg-[var(--surface-1)] px-2 py-1.5 text-xs leading-5"
              onChange={(event) => {
                setBody(event.target.value);
                if (loadedFromVersion != null) setLoadedFromVersion(null);
              }}
              value={body}
            />
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center justify-between gap-x-3 gap-y-2 border-t border-[var(--line)] bg-[var(--surface-1)] px-4 py-3">
          <div className="flex min-w-0 flex-wrap gap-2">
            <button
              className="rounded-md bg-[var(--accent)] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
              disabled={busy || !selectedCvId}
              onClick={() => void save({})}
              type="button"
            >
              {bg ? "Запази" : "Save"}
            </button>
            <button
              className="rounded-md border border-[var(--line)] bg-white px-3 py-1.5 text-xs font-semibold disabled:opacity-60"
              disabled={busy || undoStack.length === 0}
              onClick={undo}
              title={
                bg
                  ? "Отменя последната AI/Humanize/възстановена стъпка (локално)"
                  : "Undo last AI / Humanize / restore step (local stack)"
              }
              type="button"
            >
              {bg ? "Отмени" : "Undo"}
              {undoStack.length > 0 ? ` (${undoStack.length})` : ""}
            </button>
            <button
              className="rounded-md border border-[var(--line)] bg-white px-3 py-1.5 text-xs font-semibold disabled:opacity-60"
              disabled={busy || !selectedCvId}
              onClick={() => void save({ draftWithAi: true })}
              title={
                bg
                  ? "Генерира чернова (евтино, без уеб). Humanize е отделен бутон."
                  : "Generate draft (cheap, no web). Humanize is a separate step."
              }
              type="button"
            >
              {bg ? "AI чернова" : "AI draft"}
            </button>
            <button
              className="rounded-md border border-[var(--line)] bg-white px-3 py-1.5 text-xs font-semibold disabled:opacity-60"
              disabled={busy || !selectedCvId || !body.trim()}
              onClick={() => void save({ humanize: true })}
              title={
                bg
                  ? "Прилага humanizer skill към текущия текст (отделна стъпка)"
                  : "Apply humanizer skill to current body (separate step)"
              }
              type="button"
            >
              Humanize
            </button>
            {selectedId ? (
              <button
                className="rounded-md border border-rose-300 bg-white px-3 py-1.5 text-xs font-semibold text-rose-700 disabled:opacity-60"
                disabled={busy}
                onClick={() => void remove(selectedId)}
                type="button"
              >
                {bg ? "Изтрий" : "Delete"}
              </button>
            ) : null}
          </div>
          <p className="ml-auto max-w-full shrink-0 truncate text-right text-[10px] text-[var(--ink-muted)]">
            CV: {selectedCvId || "—"} · Co: {selectedCompanyId || "—"} · Job:{" "}
            {selectedJobId || "—"}
          </p>
        </div>
      </section>

      {/* Version history */}
      <aside className="flex min-h-0 min-w-0 flex-col overflow-hidden rounded-xl border border-[var(--line)] bg-white p-3">
        <p className="text-sm font-semibold text-slate-900">
          {bg ? "Версии" : "Versions"}
        </p>
        <p className="mt-1 text-[10px] text-[var(--ink-muted)]">
          {bg
            ? "Зареди версия в редактора (без нов запис). Save създава нова версия."
            : "Load a version into the editor (no new save). Save creates a new version."}
        </p>
        {!selectedId ? (
          <p className="mt-4 text-xs text-[var(--ink-muted)]">
            {bg ? "Изберете или запазете писмо." : "Select or save a letter."}
          </p>
        ) : versions.length === 0 ? (
          <p className="mt-4 text-xs text-[var(--ink-muted)]">
            {bg ? "Все още няма история." : "No history yet."}
          </p>
        ) : (
          <ul className="mt-3 min-h-0 flex-1 space-y-1.5 overflow-x-hidden overflow-y-auto">
            {versions.map((v) => {
              const isSavedHead = version === v.version;
              const isLoaded = loadedFromVersion === v.version;
              return (
                <li
                  className={`rounded-md border p-2 text-[10px] ${
                    isLoaded
                      ? "border-[var(--accent)] bg-[var(--accent-soft)]"
                      : "border-[var(--line)] bg-[var(--surface-1)]"
                  }`}
                  key={v.version}
                >
                  <div className="flex items-start justify-between gap-1">
                    <span className="font-semibold text-slate-800">
                      v{v.version}
                      {isSavedHead ? (
                        <span className="ml-1 font-normal text-[var(--ink-muted)]">
                          ({bg ? "записана" : "saved"})
                        </span>
                      ) : null}
                      {isLoaded && !isSavedHead ? (
                        <span className="ml-1 font-normal text-[var(--ink-muted)]">
                          ({bg ? "в редактора" : "in editor"})
                        </span>
                      ) : null}
                    </span>
                    <span className="text-[var(--ink-muted)]">
                      {sourceLabel(v.source, bg)}
                    </span>
                  </div>
                  <p className="mt-0.5 text-[var(--ink-muted)]">
                    {v.saved_at ? v.saved_at.slice(0, 19).replace("T", " ") : "—"}
                  </p>
                  {v.body_preview ? (
                    <p className="mt-1 line-clamp-2 text-slate-700">{v.body_preview}</p>
                  ) : null}
                  <button
                    className="mt-1.5 font-semibold text-slate-800 underline disabled:opacity-50"
                    disabled={busy || isLoaded}
                    onClick={() => void loadVersionIntoEditor(v.version)}
                    type="button"
                  >
                    {bg ? "Зареди" : "Load"}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </aside>
    </div>
  );
}
