import type { KeywordSource } from "./types";

export function keywordSourceLabel(
  source?: "jd" | "senior_leadership" | "game_generic" | "combined",
): string {
  if (source === "senior_leadership") return "Seniority";
  if (source === "game_generic") return "Game Generic";
  if (source === "combined") return "Combined";
  return "JD";
}

export function keywordSourceBadgeClass(
  source: KeywordSource | undefined,
  theme: "light" | "dark",
): string {
  if (theme === "dark") {
    if (source === "senior_leadership") return "border-indigo-500 bg-indigo-900/55 text-indigo-100";
    if (source === "game_generic") return "border-cyan-500 bg-cyan-900/55 text-cyan-100";
    if (source === "combined") return "border-violet-500 bg-violet-900/55 text-violet-100";
    return "border-slate-600 bg-slate-800 text-slate-200";
  }
  if (source === "senior_leadership") return "border-indigo-300 bg-indigo-100 text-indigo-900";
  if (source === "game_generic") return "border-cyan-300 bg-cyan-100 text-cyan-900";
  if (source === "combined") return "border-violet-300 bg-violet-100 text-violet-900";
  return "border-slate-300 bg-slate-100 text-slate-700";
}

export function keywordStatusBadgeClass(
  status: "missing" | "underused" | "used" | undefined,
  theme: "light" | "dark",
): string {
  if (theme === "dark") {
    if (status === "missing") return "border-rose-500 bg-rose-900/55 text-rose-100";
    if (status === "underused") return "border-amber-500 bg-amber-900/50 text-amber-100";
    if (status === "used") return "border-emerald-500 bg-emerald-900/55 text-emerald-100";
    return "border-slate-600 bg-slate-800 text-slate-200";
  }
  if (status === "missing") return "border-red-300 bg-red-100 text-red-900";
  if (status === "underused") return "border-amber-300 bg-amber-100 text-amber-900";
  if (status === "used") return "border-emerald-300 bg-emerald-100 text-emerald-900";
  return "border-slate-300 bg-slate-100 text-slate-700";
}