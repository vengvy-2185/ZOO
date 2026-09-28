import "server-only";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { holidaysOf } from "@/lib/khmer-calendar";
import { planWeek, mondayOf } from "./roster";

// Public holidays from the Khmer calendar are days off by themselves: they
// are added to staff_holidays (used by attendance and the schedule) for this
// year and the next. A manager can turn one into a working day; that is
// remembered in staff_holiday_skips so it is not added back.

const addDays = (d: string, n: number) => {
  const x = new Date(`${d}T12:00:00Z`);
  x.setUTCDate(x.getUTCDate() + n);
  return x.toISOString().slice(0, 10);
};

/** The official public holidays of a year, one name per day. */
export function officialDays(year: number) {
  const byDay = new Map<string, string>();
  for (const h of holidaysOf(year).filter((h) => h.kind === "public")) byDay.set(h.date, byDay.has(h.date) ? `${byDay.get(h.date)} · ${h.km}` : h.km);
  return byDay;
}

/** Re-plans the schedule of this week and next (from today on) after days off changed. */
export async function replanAround(today: string, changed: string[]) {
  const monday = mondayOf(today);
  const next = addDays(monday, 7);
  const end = addDays(monday, 13);
  if (!changed.some((d) => d >= today && d <= end)) return;
  await planWeek(monday, { replace: true, by: null, from: today });
  await planWeek(next, { replace: true, by: null, from: today });
}

let lastRun = 0;
/** Adds any missing public holiday (this year and next) as a day off. Cheap: runs at most every 10 minutes per server. */
export async function ensureHolidays(today: string) {
  if (Date.now() - lastRun < 10 * 60e3) return;
  lastRun = Date.now();
  const year = Number(today.slice(0, 4));
  const db = createServiceRoleClient();
  const [{ data: have }, { data: skips }] = await Promise.all([
    db.from("staff_holidays").select("day").gte("day", `${year}-01-01`).lte("day", `${year + 1}-12-31`),
    db.from("staff_holiday_skips").select("day").gte("day", `${year}-01-01`).lte("day", `${year + 1}-12-31`),
  ]);
  const taken = new Set([...(have ?? []), ...(skips ?? [])].map((r: any) => r.day as string));
  const add: { day: string; name: string }[] = [];
  for (const y of [year, year + 1]) for (const [day, name] of officialDays(y)) if (!taken.has(day) && day >= today) add.push({ day, name: name.slice(0, 80) });
  if (!add.length) return;
  await db.from("staff_holidays").upsert(add, { onConflict: "day", ignoreDuplicates: true });
  await replanAround(today, add.map((a) => a.day));
}

/** Manager: make a day a day off (with a name) or a working day. */
export async function setDayOff(day: string, off: boolean, name: string, by: string, today: string) {
  const db = createServiceRoleClient();
  const official = officialDays(Number(day.slice(0, 4))).get(day);
  if (off) {
    await db.from("staff_holiday_skips").delete().eq("day", day);
    await db.from("staff_holidays").upsert({ day, name: (name || official || "ថ្ងៃឈប់").slice(0, 80) });
  } else {
    await db.from("staff_holidays").delete().eq("day", day);
    // an official holiday stays a working day until turned back on
    if (official) await db.from("staff_holiday_skips").upsert({ day, name: official.slice(0, 80), created_by: by });
  }
  await replanAround(today, [day]);
}
