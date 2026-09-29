// Shift names and colours, shared by the schedule page (server) and its grid (client).
export type Shift = "morning" | "afternoon" | "full" | "off";
export const SHIFTS: Shift[] = ["morning", "afternoon", "full", "off"];
export const SHIFT_UI: Record<Shift, { en: string; km: string; short: string; shortKm: string; cls: string; dot: string }> = {
  morning: { en: "Morning", km: "ព្រឹក", short: "AM", shortKm: "ព្រឹក", cls: "bg-amber-100 text-amber-800 ring-amber-200", dot: "bg-amber-400" },
  afternoon: { en: "Afternoon", km: "រសៀល", short: "PM", shortKm: "រសៀល", cls: "bg-sky-100 text-sky-800 ring-sky-200", dot: "bg-sky-400" },
  full: { en: "Full day", km: "ពេញថ្ងៃ", short: "Full", shortKm: "ពេញ", cls: "bg-emerald-100 text-emerald-800 ring-emerald-200", dot: "bg-emerald-500" },
  off: { en: "Day off", km: "ឈប់", short: "Off", shortKm: "ឈប់", cls: "bg-slate-100 text-slate-500 ring-slate-200", dot: "bg-slate-300" },
};

/**
 * Can someone who already has `mine` that day cover `theirs`?
 * "clash" = same hours (or either is a full day) · "merge" = the other half, it becomes a full day.
 */
export function coverFit(mine: string | null | undefined, theirs: string): "free" | "merge" | "clash" {
  if (!mine || mine === "off") return "free";
  if (mine === "full" || theirs === "full" || mine === theirs) return "clash";
  return "merge";
}
