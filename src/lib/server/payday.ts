import "server-only";
import { createHmac, timingSafeEqual } from "crypto";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { getSiteUrl } from "@/lib/server/site-url";
import { monthRange, payroll, type PayLine } from "@/lib/server/staff";
import { MONTHS_EN, MONTHS_KM } from "@/lib/careers";

// Payday: the day the pay of one month is handed out. The admin "opens" it,
// which freezes everyone's payslip; each department then scans its own QR
// code in the staff app to collect. The QR codes are signed with a secret
// kept on the server, so they can't be made up.

export type Payday = {
  id: string;
  month: string;
  pay_date: string;
  start_time: string | null;
  end_time: string | null;
  place: string | null;
  note: string | null;
  status: "scheduled" | "open" | "closed";
  secret: string;
  opened_at: string | null;
  closed_at: string | null;
};
export type PayRequest = {
  id: string;
  payday_id: string;
  user_id: string;
  kind: "absent" | "leave";
  method: "later" | "proxy" | "transfer";
  pickup_date: string | null;
  proxy_name: string | null;
  reason: string;
  status: "pending" | "approved" | "rejected";
  admin_note: string | null;
  created_at: string;
};
export type SlipDetail = {
  position: string | null;
  position_km: string | null;
  pay_type: string;
  rate: number;
  segments?: { from: string; to: string; days: number; amount: number }[];
  units: number;
  days: number;
  hours: number;
  base: number;
  allowance: number;
  adjustments: { note: string; amount: number }[];
  attendance: { late: number; absent: number; deduction: number };
  leave_days: number;
};

/** How many days before payday a "can't come / on leave" request must be sent. */
export const REQUEST_DAYS_BEFORE = 4;

export const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Phnom_Penh" }).format(new Date());
export const addDays = (d: string, n: number) => new Date(Date.parse(`${d}T00:00:00Z`) + n * 864e5).toISOString().slice(0, 10);
/** The last day a request can still be sent for this payday. */
export const requestDeadline = (p: Pick<Payday, "pay_date">) => addDays(p.pay_date, -REQUEST_DAYS_BEFORE);

/** "ខែកញ្ញា 2026" / "September 2026": always say which month's pay it is. */
export const monthLabel = (month: string, km: boolean) => {
  const [y, m] = month.slice(0, 7).split("-").map(Number);
  return km ? `ខែ${MONTHS_KM[m - 1]} ${y}` : `${MONTHS_EN[m - 1]} ${y}`;
};
/** The next month, "2026-09" → "2026-10". */
export const nextMonth = (month: string) => {
  const [y, m] = month.slice(0, 7).split("-").map(Number);
  return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;
};
/** The same day one month later (31 Jan → 28/29 Feb). */
export const sameDayNextMonth = (date: string) => {
  const [y, m, d] = date.split("-").map(Number);
  const ny = m === 12 ? y + 1 : y;
  const nm = m === 12 ? 1 : m + 1;
  const last = new Date(Date.UTC(ny, nm, 0)).getUTCDate();
  return `${ny}-${String(nm).padStart(2, "0")}-${String(Math.min(d, last)).padStart(2, "0")}`;
};

const db = () => createServiceRoleClient();
const r2 = (n: number) => Math.round(n * 100) / 100;

export async function paydayFor(month: string) {
  const { data } = await db().from("staff_paydays").select("*").eq("month", monthRange(month).first).maybeSingle();
  return (data as Payday | null) ?? null;
}
export async function paydayById(id: string) {
  if (!/^[0-9a-f-]{36}$/.test(id)) return null;
  const { data } = await db().from("staff_paydays").select("*").eq("id", id).maybeSingle();
  return (data as Payday | null) ?? null;
}
/**
 * What a staff member should see: a payday whose money they still have to
 * collect, else the next one coming, else the last one.
 */
export async function currentPayday(userId?: string) {
  const { data: live } = await db().from("staff_paydays").select("*").neq("status", "closed").order("pay_date");
  const list = (live ?? []) as Payday[];
  if (userId) {
    const open = list.filter((p) => p.status === "open");
    if (open.length) {
      const { data: owed } = await db().from("staff_payslips").select("month").eq("user_id", userId).is("received_at", null).in("month", open.map((p) => p.month));
      const mine = open.find((p) => (owed ?? []).some((o: any) => o.month === p.month));
      if (mine) return mine;
    }
    const coming = list.find((p) => p.status === "scheduled");
    if (coming) return coming;
  }
  if (list.length) return list[0];
  const { data: last } = await db().from("staff_paydays").select("*").order("pay_date", { ascending: false }).limit(1).maybeSingle();
  return (last as Payday | null) ?? null;
}

// ── the department QR codes ──────────────────────────────────────────
/** "all" = one code for everyone (staff without a department). */
export function qrSig(p: Pick<Payday, "id" | "secret">, dept: string) {
  return createHmac("sha256", p.secret).update(`${p.id}:${dept}`).digest("base64url").slice(0, 22);
}
export function qrUrl(p: Pick<Payday, "id" | "secret">, dept: string) {
  return `${getSiteUrl()}/staff/payday/claim?p=${p.id}&d=${encodeURIComponent(dept)}&s=${qrSig(p, dept)}`;
}
export function qrValid(p: Pick<Payday, "id" | "secret">, dept: string, sig: string) {
  const want = Buffer.from(qrSig(p, dept));
  const got = Buffer.from(String(sig));
  return want.length === got.length && timingSafeEqual(want, got);
}

/** Approved leave days that fall inside the month (shown on the payslip). */
async function leaveDays(month: string, ids: string[]) {
  const { first } = monthRange(month);
  const last = addDays(`${month.slice(0, 7)}-01`, 40).slice(0, 7) + "-01";
  const lastDay = addDays(last.slice(0, 7) + "-01", -1);
  const { data } = ids.length ? await db().from("staff_leave_requests").select("user_id, start_date, end_date").in("user_id", ids).eq("status", "approved").lte("start_date", lastDay).gte("end_date", first) : { data: [] as any[] };
  const out = new Map<string, number>();
  for (const r of data ?? []) {
    const from = r.start_date < first ? first : r.start_date;
    const to = r.end_date > lastDay ? lastDay : r.end_date;
    out.set(r.user_id, (out.get(r.user_id) ?? 0) + Math.round((Date.parse(to) - Date.parse(from)) / 864e5) + 1);
  }
  return out;
}

function detailOf(l: PayLine, leave: number): SlipDetail {
  const p = l.staff.position;
  return {
    position: p?.name ?? null,
    position_km: p?.name_km ?? null,
    pay_type: p?.pay_type ?? "monthly",
    rate: l.rate,
    segments: l.segments,
    units: l.units,
    days: l.days,
    hours: l.hours,
    base: l.base,
    allowance: l.allowance,
    adjustments: l.adjustments.map((a) => ({ note: a.note, amount: a.amount })),
    attendance: l.attendance,
    leave_days: leave,
  };
}

/**
 * Freezes the payslips of everyone active for this payday's month (anyone who
 * already collected keeps theirs untouched). Returns how many were written.
 */
export async function issuePayslips(p: Payday, adminId: string | null) {
  const month = p.month.slice(0, 7);
  const lines = (await payroll(month)).filter((l) => l.staff.status === "active");
  const { data: got } = await db().from("staff_payslips").select("user_id").eq("month", monthRange(month).first).not("received_at", "is", null);
  const done = new Set((got ?? []).map((r: any) => r.user_id));
  const leave = await leaveDays(month, lines.map((l) => l.staff.user_id));
  const rows = lines
    .filter((l) => !done.has(l.staff.user_id))
    .map((l) => ({
      user_id: l.staff.user_id,
      month: monthRange(month).first,
      payday_id: p.id,
      pay_type: l.staff.position?.pay_type ?? "monthly",
      rate: l.rate,
      units: l.units,
      base: l.base,
      allowance: l.allowance,
      adjustments: r2(l.adjTotal - l.attendance.deduction),
      gross: l.gross,
      detail: detailOf(l, leave.get(l.staff.user_id) ?? 0),
      paid_by: adminId,
      paid_at: new Date().toISOString(),
    }));
  if (rows.length) await db().from("staff_payslips").upsert(rows, { onConflict: "user_id,month" });
  return rows.length;
}

export type PaydayRow = {
  user_id: string;
  staff_no: string;
  name: string;
  name_km: string | null;
  dept: string;
  dept_name: string;
  dept_name_km: string | null;
  color: string;
  amount: number;
  issued: boolean;
  received_at: string | null;
  received_via: string | null;
  request: PayRequest | null;
};

/** The payday table: who collected, who hasn't, and the money. */
export async function paydayTable(p: Payday) {
  const month = p.month.slice(0, 7);
  const [lines, { data: slips }, { data: reqs }] = await Promise.all([
    payroll(month),
    db().from("staff_payslips").select("user_id, gross, received_at, received_via, payday_id").eq("month", p.month),
    db().from("staff_payday_requests").select("*").eq("payday_id", p.id),
  ]);
  const rows: PaydayRow[] = lines
    .filter((l) => l.staff.status === "active" || (slips ?? []).some((s: any) => s.user_id === l.staff.user_id))
    .map((l) => {
      const slip = (slips ?? []).find((s: any) => s.user_id === l.staff.user_id);
      const pos = l.staff.position;
      return {
        user_id: l.staff.user_id,
        staff_no: l.staff.staff_no,
        name: l.staff.full_name,
        name_km: l.staff.full_name_km,
        dept: pos?.id ?? "all",
        dept_name: pos?.name ?? "—",
        dept_name_km: pos?.name_km ?? null,
        color: pos?.color ?? "#64748B",
        amount: slip ? Number(slip.gross) : l.gross,
        issued: Boolean(slip),
        // an old payslip (marked paid before paydays existed) counts as collected
        received_at: slip ? (slip.received_at ?? (slip.payday_id ? null : "before")) : null,
        received_via: slip?.received_via ?? null,
        request: ((reqs ?? []) as PayRequest[]).find((r) => r.user_id === l.staff.user_id) ?? null,
      };
    });
  const total = r2(rows.reduce((t, r) => t + r.amount, 0));
  const paid = r2(rows.filter((r) => r.received_at).reduce((t, r) => t + r.amount, 0));
  return {
    rows,
    total,
    paid,
    owed: r2(total - paid),
    count: rows.length,
    collected: rows.filter((r) => r.received_at).length,
    requests: ((reqs ?? []) as PayRequest[]).sort((a, b) => a.created_at.localeCompare(b.created_at)),
  };
}

/**
 * Runs by itself (every 10 minutes, and when payday pages open):
 * 1. on the pay date a scheduled payday opens on its own (payslips frozen);
 * 2. once a payday's date has passed (or it was closed), next month's payday
 *    is set up automatically: same day of the month, same hours and place.
 *    The admin only sets it once; each month can still be moved by hand.
 */
export async function ensurePaydays() {
  const now = today();
  let opened = 0;
  let created = 0;
  // (a payday more than a week late is left for the admin to open by hand)
  const { data: due } = await db().from("staff_paydays").select("*").eq("status", "scheduled").lte("pay_date", now).gte("pay_date", addDays(now, -7));
  for (const p of (due ?? []) as Payday[]) {
    // only one caller wins the switch to "open"
    const { data: won } = await db().from("staff_paydays").update({ status: "open", opened_at: new Date().toISOString() }).eq("id", p.id).eq("status", "scheduled").select("id");
    if (!won?.length) continue;
    await issuePayslips(p, null);
    opened++;
    const { sendPush, staffIds } = await import("@/lib/server/push");
    await sendPush(await staffIds(), { title: `💵 បើកប្រាក់ខែ ${monthLabel(p.month, true)}`, body: "ថ្ងៃនេះជាថ្ងៃបើកប្រាក់ខែ។ ស្កេន QR នៃផ្នែករបស់អ្នក ដើម្បីទទួលប្រាក់។", url: "/staff/pay", tag: `payday-open-${p.id}` }).catch(() => {});
  }
  // keep the following month ready (catch up at most a year)
  for (let i = 0; i < 12; i++) {
    const { data: last } = await db().from("staff_paydays").select("*").order("month", { ascending: false }).limit(1).maybeSingle();
    const l = last as Payday | null;
    if (!l || (l.status !== "closed" && l.pay_date > now)) break;
    // never build a chain of old months (e.g. an old month set up by hand)
    const [y, m] = now.split("-").map(Number);
    const twoBack = `${m <= 2 ? y - 1 : y}-${String(((m + 9) % 12) + 1).padStart(2, "0")}`;
    if (l.month.slice(0, 7) < twoBack) break;
    const month = nextMonth(l.month);
    const { error } = await db().from("staff_paydays").insert({ month: `${month}-01`, pay_date: sameDayNextMonth(l.pay_date), start_time: l.start_time, end_time: l.end_time, place: l.place });
    if (error) break; // someone else just made it
    created++;
  }
  return { opened, created };
}
