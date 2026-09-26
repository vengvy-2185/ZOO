import "server-only";
import { createServiceRoleClient } from "@/lib/supabase/server";

export type RosterSection = "tickets" | "animals" | "cleaning" | "guide";
export const ROSTER_SECTIONS: RosterSection[] = ["tickets", "animals", "cleaning", "guide"];
export type RosterRules = {
  /** make the schedule by itself for this week and the next */
  auto: boolean;
  /** days off each person gets per week (besides the zoo's rest days) */
  days_off: number;
  /** a person may work morning + afternoon when a team is short */
  allow_full: boolean;
  /** how many people each team needs in the morning / afternoon */
  need: Record<RosterSection, { am: number; pm: number }>;
};
export const DEFAULT_RULES: RosterRules = {
  auto: true,
  days_off: 1,
  allow_full: true,
  need: { tickets: { am: 1, pm: 1 }, animals: { am: 1, pm: 1 }, cleaning: { am: 1, pm: 1 }, guide: { am: 1, pm: 1 } },
};

export async function getRosterRules(): Promise<RosterRules> {
  const { data } = await createServiceRoleClient().from("staff_settings").select("data").eq("id", 1).maybeSingle();
  const r = ((data?.data as any)?.roster ?? {}) as Partial<RosterRules>;
  return { ...DEFAULT_RULES, ...r, need: { ...DEFAULT_RULES.need, ...(r.need ?? {}) } };
}

const addDays = (d: string, n: number) => {
  const t = new Date(`${d}T12:00:00Z`);
  t.setUTCDate(t.getUTCDate() + n);
  return t.toISOString().slice(0, 10);
};
export const mondayOf = (d: string) => addDays(d, -((new Date(`${d}T12:00:00Z`).getUTCDay() + 6) % 7));

/** Each person's main team from their position (managers are not planned). */
export function teamOf(perms: string[]): RosterSection | null {
  if (perms.includes("reports")) return null;
  return ROSTER_SECTIONS.find((s) => perms.includes(s)) ?? null;
}

type Row = { user_id: string; day: string; shift: "morning" | "afternoon" | "full" | "off"; note: string | null };

/**
 * Plans one week for every team (or one), following the admin's rules:
 * zoo rest days and approved leave are off; each person gets their days off
 * where the team can spare them; every day each team gets the number of
 * people it needs in the morning and in the afternoon; mornings and
 * afternoons are shared out evenly; if a team is short, someone works the
 * full day. Existing boxes are kept unless `replace`; with `onlyEmptyPeople`
 * only people with nothing planned that week are planned.
 */
export async function planWeek(weekStart: string, opts: { section?: RosterSection | null; replace?: boolean; onlyEmptyPeople?: boolean; by?: string | null } = {}) {
  const db = createServiceRoleClient();
  const rules = await getRosterRules();
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const [{ data: staff }, { data: settings }, { data: leaves }, { data: holidays }, { data: existing }] = await Promise.all([
    db.from("staff_members").select("user_id, full_name, position:staff_positions(permissions)").eq("status", "active").order("full_name"),
    db.from("staff_attendance_settings").select("rest_days").eq("id", 1).maybeSingle(),
    db.from("staff_leave_requests").select("user_id, start_date, end_date").eq("status", "approved").lte("start_date", days[6]).gte("end_date", days[0]),
    db.from("staff_holidays").select("day").gte("day", days[0]).lte("day", days[6]),
    db.from("staff_roster").select("user_id, day").gte("day", days[0]).lte("day", days[6]),
  ]);
  const rest = new Set<number>((settings?.rest_days ?? []) as number[]);
  const hol = new Set((holidays ?? []).map((h: any) => h.day));
  const closed = (d: string) => rest.has(new Date(`${d}T12:00:00Z`).getUTCDay()) || hol.has(d);
  const onLeave = (u: string, d: string) => (leaves ?? []).some((l: any) => l.user_id === u && l.start_date <= d && l.end_date >= d);
  const have = new Set((existing ?? []).map((e: any) => `${e.user_id}_${e.day}`));
  const planned = new Set((existing ?? []).map((e: any) => e.user_id));
  const seed = Math.floor(Date.parse(`${weekStart}T12:00:00Z`) / (7 * 864e5));
  const rows: Row[] = [];

  for (const sec of opts.section ? [opts.section] : ROSTER_SECTIONS) {
    const team = (staff ?? []).filter((p: any) => teamOf(p.position?.permissions ?? []) === sec).map((p: any) => p.user_id as string);
    if (!team.length) continue;
    const n = team.length;
    const { am, pm } = rules.need[sec];
    const minPeople = rules.allow_full ? Math.max(am, pm) : am + pm;
    const open = days.filter((d) => !closed(d));
    // who can come each open day (not on leave)
    const avail = new Map(open.map((d) => [d, team.filter((u) => !onLeave(u, d))]));
    // days off: put each one where the team has the most people to spare
    const off = new Map<string, Set<string>>(team.map((u) => [u, new Set<string>()]));
    const slack = new Map(open.map((d) => [d, (avail.get(d)!.length) - minPeople]));
    team.forEach((u, i) => {
      for (let k = 0; k < rules.days_off; k++) {
        const order = open.map((d, j) => ({ d, j })).sort((a, b) => slack.get(b.d)! - slack.get(a.d)! || ((a.j + i * 2 + seed) % open.length) - ((b.j + i * 2 + seed) % open.length));
        const pick = order.find((o) => slack.get(o.d)! > 0 && !off.get(u)!.has(o.d) && avail.get(o.d)!.includes(u));
        if (!pick) break;
        off.get(u)!.add(pick.d);
        slack.set(pick.d, slack.get(pick.d)! - 1);
      }
    });
    // share out mornings / afternoons evenly over the week
    const count = new Map(team.map((u) => [u, { am: 0, pm: 0, full: 0 }]));
    for (const d of days) {
      if (closed(d)) {
        team.forEach((u) => rows.push({ user_id: u, day: d, shift: "off", note: null }));
        continue;
      }
      const working = avail.get(d)!.filter((u) => !off.get(u)!.has(d));
      team.filter((u) => !working.includes(u)).forEach((u) => rows.push({ user_id: u, day: d, shift: "off", note: onLeave(u, d) ? "leave" : null }));
      const fulls = rules.allow_full ? Math.max(0, am + pm - working.length) : 0;
      const byFull = [...working].sort((a, b) => count.get(a)!.full - count.get(b)!.full || ((team.indexOf(a) + seed) % n) - ((team.indexOf(b) + seed) % n));
      const fullSet = new Set(byFull.slice(0, Math.min(fulls, working.length)));
      let amCount = fullSet.size;
      let pmCount = fullSet.size;
      const rest2 = working.filter((u) => !fullSet.has(u)).sort((a, b) => count.get(a)!.am - count.get(a)!.pm - (count.get(b)!.am - count.get(b)!.pm) || ((team.indexOf(a) + seed) % n) - ((team.indexOf(b) + seed) % n));
      for (const u of working) {
        if (fullSet.has(u)) {
          rows.push({ user_id: u, day: d, shift: "full", note: null });
          count.get(u)!.full++;
          count.get(u)!.am++;
          count.get(u)!.pm++;
        }
      }
      for (const u of rest2) {
        // fill what's still needed first, then keep the two sessions even
        const c = count.get(u)!;
        const wantAm = amCount < am ? true : pmCount < pm ? false : c.am <= c.pm ? amCount <= pmCount : false;
        const shift = wantAm ? "morning" : "afternoon";
        if (wantAm) {
          amCount++;
          c.am++;
        } else {
          pmCount++;
          c.pm++;
        }
        rows.push({ user_id: u, day: d, shift, note: null });
      }
    }
    void n;
  }

  let toSave = rows;
  if (opts.onlyEmptyPeople) toSave = rows.filter((r) => !planned.has(r.user_id));
  else if (!opts.replace) toSave = rows.filter((r) => !have.has(`${r.user_id}_${r.day}`));
  if (toSave.length) await db.from("staff_roster").upsert(toSave.map((r) => ({ ...r, created_by: opts.by ?? null, updated_at: new Date().toISOString() })), { onConflict: "user_id,day" });
  return toSave.length;
}

/** "Automatic" mode: this week and next week get planned for anyone who has nothing yet. */
export async function ensureAutoRoster(today: string) {
  const rules = await getRosterRules();
  if (!rules.auto) return;
  const w = mondayOf(today);
  await planWeek(w, { onlyEmptyPeople: true });
  await planWeek(addDays(w, 7), { onlyEmptyPeople: true });
}
