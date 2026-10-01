import "server-only";
import { createServiceRoleClient } from "@/lib/supabase/server";

// A person's own salary over time (starting pay, then raises from a date).
// For a month, the pay rate is worked out day by day: a raise from the 16th
// pays the old rate for the first half and the new one for the rest.

export type SalaryStep = { id: string; user_id: string; effective_from: string; amount: number; note: string | null; created_at: string };
export type RateSegment = { from: string; to: string; days: number; amount: number };

export async function salarySteps(ids: string[]): Promise<Map<string, SalaryStep[]>> {
  const out = new Map<string, SalaryStep[]>();
  if (!ids.length) return out;
  const { data } = await createServiceRoleClient().from("staff_salary_steps").select("*").in("user_id", ids).order("effective_from");
  for (const s of (data ?? []) as any[]) {
    const list = out.get(s.user_id) ?? [];
    list.push({ ...s, amount: Number(s.amount) });
    out.set(s.user_id, list);
  }
  return out;
}

/** The rate on one day: the latest step that has started, else the position's rate. */
export function rateOn(steps: SalaryStep[] | undefined, fallback: number, day: string) {
  let r = fallback;
  for (const s of steps ?? []) if (s.effective_from <= day) r = s.amount;
  return r;
}

const iso = (y: number, m: number, d: number) => `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

/**
 * The month split into parts with one rate each, and the month's average
 * rate (weighted by days). With no steps: one part at the position's rate.
 */
export function monthRate(steps: SalaryStep[] | undefined, fallback: number, month: string) {
  const [y, m] = month.slice(0, 7).split("-").map(Number);
  const n = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const segs: RateSegment[] = [];
  for (let d = 1; d <= n; d++) {
    const day = iso(y, m, d);
    const amount = rateOn(steps, fallback, day);
    const last = segs[segs.length - 1];
    if (last && last.amount === amount) {
      last.to = day;
      last.days++;
    } else segs.push({ from: day, to: day, days: 1, amount });
  }
  const avg = segs.reduce((t, s) => t + s.amount * s.days, 0) / n;
  return { rate: Math.round(avg * 100) / 100, segments: segs, daysInMonth: n };
}

/** The rate today and the next raise already planned (for the staff member's own page). */
export function salaryNow(steps: SalaryStep[] | undefined, fallback: number, today: string) {
  const current = rateOn(steps, fallback, today);
  const next = (steps ?? []).find((s) => s.effective_from > today) ?? null;
  return { current, next, custom: Boolean(steps?.some((s) => s.effective_from <= today)) };
}
