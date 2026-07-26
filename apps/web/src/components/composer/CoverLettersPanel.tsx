"use client";

import { useCallback, useEffect, useState, type JSX } from "react";

export type CoverLetterItem = {
  id: string;
  cv_id: string;
  company_id?: string;
  job_id?: string;
  title: string;
  body: string;
  updated_at: string;
};

export type CoverLettersPanelProps = {
  language: string;
  selectedCvId: string;
  selectedCompanyId: string;
  selectedJobId: string;
  researchCompanyName?: string;
  researchJobTitle?: string;
};

export function CoverLettersPanel(props: CoverLettersPanelProps): JSX.Element {
  const {
    language,
    selectedCvId,
    selectedCompanyId,
    selectedJobId,
    researchCompanyName,
    researchJobTitle,
  } = props;
  const [items, setItems] = useState<CoverLetterItem[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    const response = await fetch("/api/cover-letters");
    const payload = (await response.json()) as { items?: CoverLetterItem[] };
    setItems(payload.items ?? []);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const item = items.find((entry) => entry.id === selectedId);
    if (item) {
      setTitle(item.title);
      setBody(item.body);
    }
  }, [items, selectedId]);

  async function save(options: { draftWithAi?: boolean; humanize?: boolean } = {}) {
    if (!selectedCvId) {
      setNotice(
        language === "bg" ? "Изберете CV в Editor." : "Select a CV in the Editor first.",
      );
      return;
    }
    if (options.humanize && !body.trim()) {
      setNotice(
        language === "bg" ? "Няма текст за humanize." : "Nothing to humanize yet.",
      );
      return;
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
      await load();
      if (options.draftWithAi) {
        const skillBit =
          payload.skill?.applied === true
            ? language === "bg"
              ? ` + ${payload.skill.skillName ?? "humanizer"}`
              : ` + ${payload.skill.skillName ?? "humanizer"}`
            : payload.skill?.warning
              ? language === "bg"
                ? ` (humanizer пропуснат: ${payload.skill.warning})`
                : ` (humanizer skipped: ${payload.skill.warning})`
              : "";
        setNotice(
          language === "bg"
            ? `Черновата е генерирана (без уеб)${skillBit}.`
            : `Draft generated (no web)${skillBit}.`,
        );
      } else if (options.humanize) {
        setNotice(
          language === "bg"
            ? `Humanizer приложен (${payload.skill?.skillName ?? "humanizer"}).`
            : `Humanizer applied (${payload.skill?.skillName ?? "humanizer"}).`,
        );
      } else {
        setNotice(language === "bg" ? "Запазено." : "Saved.");
      }
    } catch {
      setNotice("Save failed.");
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
      }
      await load();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid min-h-0 flex-1 gap-4 md:grid-cols-[280px_1fr]">
      <aside className="flex min-h-0 flex-col rounded-xl border border-[var(--line)] bg-white p-3">
        <p className="text-sm font-semibold text-slate-900">
          {language === "bg" ? "Писма" : "Cover letters"}
        </p>
        <p className="mt-1 text-xs text-[var(--ink-muted)]">
          {language === "bg"
            ? "Свързва се с текущото CV и Research цел."
            : "Uses the current CV and Research target."}
        </p>
        <button
          className="mt-3 rounded-md bg-[var(--accent)] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
          disabled={busy}
          onClick={() => {
            setSelectedId("");
            setTitle(
              researchJobTitle || researchCompanyName
                ? `Cover letter — ${researchJobTitle || "Role"}${researchCompanyName ? ` @ ${researchCompanyName}` : ""}`
                : "Cover letter",
            );
            setBody("");
          }}
          type="button"
        >
          {language === "bg" ? "Ново писмо" : "New letter"}
        </button>
        <ul className="mt-3 min-h-0 flex-1 space-y-1 overflow-auto">
          {items.map((item) => (
            <li key={item.id}>
              <button
                className={`w-full rounded-md border px-2 py-1.5 text-left text-xs ${
                  selectedId === item.id
                    ? "border-[var(--accent)] bg-[var(--accent-soft)]"
                    : "border-[var(--line)] bg-[var(--surface-1)]"
                }`}
                onClick={() => setSelectedId(item.id)}
                type="button"
              >
                <span className="font-semibold">{item.title}</span>
                <span className="block text-[10px] text-[var(--ink-muted)]">
                  {item.updated_at.slice(0, 10)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </aside>

      <section className="flex min-h-0 flex-col rounded-xl border border-[var(--line)] bg-white p-4">
        {notice ? (
          <p className="mb-2 rounded-md border border-[var(--line)] bg-[var(--surface-1)] px-2 py-1.5 text-xs">
            {notice}
          </p>
        ) : null}
        <label className="block text-xs font-medium text-slate-800">
          {language === "bg" ? "Заглавие" : "Title"}
          <input
            className="mt-1 w-full rounded-md border border-[var(--line)] bg-[var(--surface-1)] px-2 py-1.5 text-xs"
            onChange={(event) => setTitle(event.target.value)}
            value={title}
          />
        </label>
        <label className="mt-3 block min-h-0 flex-1 text-xs font-medium text-slate-800">
          {language === "bg" ? "Текст" : "Body"}
          <textarea
            className="mt-1 h-[min(50vh,28rem)] w-full resize-y rounded-md border border-[var(--line)] bg-[var(--surface-1)] px-2 py-1.5 text-xs leading-5"
            onChange={(event) => setBody(event.target.value)}
            value={body}
          />
        </label>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            className="rounded-md bg-[var(--accent)] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
            disabled={busy || !selectedCvId}
            onClick={() => void save({})}
            type="button"
          >
            {language === "bg" ? "Запази" : "Save"}
          </button>
          <button
            className="rounded-md border border-[var(--line)] bg-white px-3 py-1.5 text-xs font-semibold disabled:opacity-60"
            disabled={busy || !selectedCvId}
            onClick={() => void save({ draftWithAi: true })}
            type="button"
          >
            {language === "bg" ? "AI чернова + humanizer" : "AI draft + humanizer"}
          </button>
          <button
            className="rounded-md border border-[var(--line)] bg-white px-3 py-1.5 text-xs font-semibold disabled:opacity-60"
            disabled={busy || !selectedCvId || !body.trim()}
            onClick={() => void save({ humanize: true })}
            type="button"
            title={
              language === "bg"
                ? "Прилага skill humanizer към текущия текст"
                : "Run the humanizer skill on the current body"
            }
          >
            {language === "bg" ? "Humanize" : "Humanize"}
          </button>
          {selectedId ? (
            <button
              className="rounded-md border border-rose-300 bg-white px-3 py-1.5 text-xs font-semibold text-rose-700 disabled:opacity-60"
              disabled={busy}
              onClick={() => void remove(selectedId)}
              type="button"
            >
              {language === "bg" ? "Изтрий" : "Delete"}
            </button>
          ) : null}
        </div>
        <p className="mt-2 text-[10px] text-[var(--ink-muted)]">
          CV: {selectedCvId || "—"} · Company: {selectedCompanyId || "—"} · Job:{" "}
          {selectedJobId || "—"} · Skill: humanizer (ai-skills/)
        </p>
      </section>
    </div>
  );
}
