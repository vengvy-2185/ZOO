import "server-only";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { planTeam, type PlanRow, type Shift } from "@/lib/roster-plan";

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

type Row = PlanRow;

/**
 * Plans one week for every team (or one), following the admin's rules:
 * zoo rest days and approved leave are off; each person gets their days off
 * where the team can spare them; every day each team gets the number of
 * people it needs in the morning and in the afternoon; mornings and
 * afternoons are shared out evenly; if a team is short, someone works the
 * full day. Existing boxes are kept unless `replace`; with `onlyEmptyPeople`
 * only people with nothing planned that week are planned.
 */
export async function planWeek(weekStart: string, opts: { section?: RosterSection | null; replace?: boolean; onlyEmptyPeople?: boolean; by?: string | null; from?: string } = {}) {
  const db = createServiceRoleClient();
  const rules = await getRosterRules();
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const [{ data: staff }, { data: settings }, { data: leaves }, { data: holidays }, { data: existing }] = await Promise.all([
    db.from("staff_members").select("user_id, full_name, position:staff_positions(permissions)").eq("status", "active").order("full_name"),
    db.from("staff_attendance_settings").select("rest_days").eq("id", 1).maybeSingle(),
    db.from("staff_leave_requests").select("user_id, start_date, end_date").eq("status", "approved").lte("start_date", days[6]).gte("end_date", days[0]),
    db.from("staff_holidays").select("day").gte("day", days[0]).lte("day", days[6]),
    db.from("staff_roster").select("user_id, day, shift, note").gte("day", days[0]).lte("day", days[6]),
  ]);
  const rest = new Set<number>((settings?.rest_days ?? []) as number[]);
  const hol = new Set((holidays ?? []).map((h: any) => h.day));
  const closed = (d: string) => rest.has(new Date(`${d}T12:00:00Z`).getUTCDay()) || hol.has(d);
  const onLeave = (u: string, d: string) => (leaves ?? []).some((l: any) => l.user_id === u && l.start_date <= d && l.end_date >= d);
  const planned = new Set((existing ?? []).map((e: any) => e.user_id));
  // boxes that stay as they are: everything already there, unless re-planning.
  // In automatic mode, a person who already has any box that week is left alone.
  const fixedShift = new Map<string, string>();
  // re-planning keeps only agreed changes (cover / swap); otherwise every existing box stays
  // days before `from` (already past) never change
  for (const e of existing ?? []) if (!opts.replace || e.note === "cover" || e.note === "covered" || e.note === "swap" || (opts.from && e.day < opts.from)) fixedShift.set(`${e.user_id}_${e.day}`, e.shift);
  const isFixed = (u: string, d: string) => fixedShift.has(`${u}_${d}`) || (!!opts.onlyEmptyPeople && planned.has(u)) || (!!opts.from && d < opts.from);
  const seed = Math.floor(Date.parse(`${weekStart}T12:00:00Z`) / (7 * 864e5));
  const rows: Row[] = [];

  for (const sec of opts.section ? [opts.section] : ROSTER_SECTIONS) {
    const team = (staff ?? []).filter((p: any) => teamOf(p.position?.permissions ?? []) === sec).map((p: any) => p.user_id as string);
    rows.push(
      ...planTeam({
        team,
        days,
        closed,
        onLeave,
        fixed: (u, d) => fixedShift.get(`${u}_${d}`) as Shift | undefined,
        isFixed,
        need: rules.need[sec],
        daysOff: rules.days_off,
        allowFull: rules.allow_full,
        seed,
      })
    );
  }

  const toSave = rows; // fixed boxes were never planned, so everything here is new
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
