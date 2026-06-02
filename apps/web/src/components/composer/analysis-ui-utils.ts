export function scoreTone(theme: "light" | "dark", score: number): string {
  if (theme === "dark") {
    if (score >= 85) return "text-emerald-300";
    if (score >= 70) return "text-amber-300";
    return "text-rose-300";
  }
  if (score >= 85) return "text-emerald-700";
  if (score >= 70) return "text-amber-700";
  return "text-rose-700";
}