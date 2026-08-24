"use client";

import { useState, type JSX } from "react";

export function DuplicateCvDialog({ open, initialName, busy, error, onClose, onSubmit }: { open: boolean; initialName: string; busy: boolean; error: string; onClose: () => void; onSubmit: (name: string) => void }): JSX.Element | null {
  const [name, setName] = useState(initialName);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div aria-labelledby="duplicate-cv-title" aria-modal="true" className="w-full max-w-md rounded-xl border border-[var(--line)] bg-white p-5 shadow-2xl" role="dialog">
        <h2 className="text-lg font-bold text-slate-900" id="duplicate-cv-title">Create CV version</h2>
        <p className="mt-1 text-sm text-[var(--ink-muted)]">Create an editable copy of the current CV for a new direction.</p>
        <label className="mt-4 block text-sm font-medium text-slate-800">New version name<input autoFocus className="mt-1 w-full rounded-md border border-[var(--line)] bg-[var(--surface-1)] px-3 py-2" onChange={(event) => setName(event.target.value)} value={name} /></label>
        {error ? <p className="mt-2 text-xs text-red-600">{error}</p> : null}
        <div className="mt-5 flex justify-end gap-2"><button className="rounded-md border border-[var(--line)] px-3 py-2 text-sm" disabled={busy} onClick={onClose} type="button">Cancel</button><button className="rounded-md bg-[var(--accent)] px-3 py-2 text-sm font-semibold text-white disabled:opacity-50" disabled={busy || !name.trim()} onClick={() => onSubmit(name.trim())} type="button">{busy ? "Creating…" : "Create copy"}</button></div>
      </div>
    </div>
  );
}
