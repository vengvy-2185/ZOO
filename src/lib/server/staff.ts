import "server-only";
import { randomInt } from "crypto";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { getCachedRole } from "@/lib/auth/role";

// Staff are created only by an admin. Each gets a Staff ID (GWZ-S-0001) and
// signs in with it plus a password: the auth account behind it uses an
// internal, never-mailed address, so staff never need an email.

export const STAFF_EMAIL_DOMAIN = "staff.greenwildzoo.local";
export const staffEmail = (staffNo: string) => `${staffNo.toLowerCase()}@${STAFF_EMAIL_DOMAIN}`;
/** A Staff ID: the automatic GWZ-S-0001 style, or one typed by the admin (letters, numbers, dashes). */
export const isStaffNo = (s: string) => /^[A-Z0-9][A-Z0-9-]{2,19}$/i.test(s.trim());

export type Permission = "tickets" | "animals" | "reports" | "guide" | "cleaning";
export const ALL_PERMISSIONS: Permission[] = ["tickets", "animals", "reports", "guide", "cleaning"];
export const PERMISSIONS: { key: Permission; en: string; km: string }[] = [
  { key: "tickets", en: "Tickets & gate (scanner, counter, check-in)", km: "សំបុត្រ និងច្រកចូល (ស្កេន បញ្ជរ ចូល)" },
  { key: "animals", en: "Animal care log", km: "កំណត់ត្រាថែសត្វ" },
  { key: "reports", en: "Reports", km: "របាយការណ៍" },
  { key: "guide", en: "Tour guide (today's programme)", km: "មគ្គុទ្ទេសក៍ (កម្មវិធីថ្ងៃនេះ)" },
  { key: "cleaning", en: "Cleaning checklist", km: "បញ្ជីសម្អាត" },
];
export type PayType = "monthly" | "daily" | "hourly";
export const PAY_TYPE: Record<PayType, { en: string; km: string; unit: { en: string; km: string } }> = {
  monthly: { en: "Monthly salary", km: "ប្រាក់ខែ", unit: { en: "month", km: "ខែ" } },
  daily: { en: "Per day worked", km: "តាមថ្ងៃធ្វើការ", unit: { en: "days", km: "ថ្ងៃ" } },
  hourly: { en: "Per hour worked", km: "តាមម៉ោងធ្វើការ", unit: { en: "hours", km: "ម៉ោង" } },
};

export type Position = { id: string; name: string; name_km: string | null; pay_type: PayType; rate: number; permissions: Permission[]; color: string; sort: number };
export type StaffRow = {
  user_id: string;
  staff_no: string;
  full_name: string;
  full_name_km: string | null;
  position_id: string | null;
  phone: string | null;
  hired_on: string;
  allowance: number;
  status: "active" | "suspended" | "left";
  created_at: string;
  position: Position | null;
};

export async function getPositions(): Promise<Position[]> {
  const { data } = await createServiceRoleClient().from("staff_positions").select("*").order("sort").order("name");
  return (data ?? []).map((p: any) => ({ ...p, rate: Number(p.rate) }));
}

export async function getStaff(userId?: string): Promise<StaffRow[]> {
  let q = createServiceRoleClient().from("staff_members").select("*, position:staff_positions(*)").order("staff_no");
  if (userId) q = q.eq("user_id", userId);
  const { data } = await q;
  return (data ?? []).map((s: any) => ({ ...s, allowance: Number(s.allowance), position: s.position ? { ...s.position, rate: Number(s.position.rate) } : null }));
}

/**
 * What the signed-in person may do in the staff area. Admins may do
 * everything; staff only what their position allows, and nothing while
 * suspended or after leaving.
 */
export async function staffAccess(userId: string) {
  const { role } = await getCachedRole(userId);
  if (role === "admin") return { ok: true, admin: true, staff: null as StaffRow | null, perms: new Set<Permission>(ALL_PERMISSIONS) };
  if (role !== "staff") return { ok: false, admin: false, staff: null, perms: new Set<Permission>() };
  const [staff] = await getStaff(userId);
  if (!staff || staff.status !== "active") return { ok: false, admin: false, staff: staff ?? null, perms: new Set<Permission>() };
  return { ok: true, admin: false, staff, perms: new Set<Permission>(staff.position?.permissions ?? []) };
}

/** A readable one-time password, e.g. "Zoo-4827-kxmp". */
export function makePassword() {
  const letters = "abcdefghjkmnpqrstuvwxyz";
  const word = Array.from({ length: 4 }, () => letters[randomInt(letters.length)]).join("");
  return `Zoo-${randomInt(1000, 9999)}-${word}`;
}

// ── Pay ───────────────────────────────────────────────────────────────
/** "2026-09" → the month's first/next-first instants in Cambodia time. */
export function monthRange(month: string) {
  const [y, m] = month.split("-").map(Number);
  const start = new Date(Date.UTC(y, m - 1, 1, -7)); // 00:00 at UTC+7
  const end = new Date(Date.UTC(y, m, 1, -7));
  return { start, end, first: `${month}-01` };
}
export const thisMonth = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Phnom_Penh", year: "numeric", month: "2-digit" }).format(new Date()).slice(0, 7);
const localDate = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Phnom_Penh" }).format(d);

export type PayLine = {
  staff: StaffRow;
  days: number;
  hours: number;
  units: number;
  base: number;
  allowance: number;
  adjustments: { id: string; amount: number; note: string }[];
  adjTotal: number;
  /** late / absence deductions from the attendance rules */
  attendance: { late: number; absent: number; deduction: number };
  gross: number;
  payslip: { gross: number; paid_at: string } | null;
  openShift: string | null;
};

const r2 = (n: number) => Math.round(n * 100) / 100;

/** Pay for everyone (or one person) for a month, from attendance + position rate. */
export async function payroll(month: string, userId?: string): Promise<PayLine[]> {
  const db = createServiceRoleClient();
  const { start, end, first } = monthRange(month);
  const staff = await getStaff(userId);
  const { attendanceMonth } = await import("./attendance");
  const sessions = await attendanceMonth(month, userId).catch(() => null);
  if (!staff.length) return [];
  const ids = staff.map((s) => s.user_id);
  const [{ data: att }, { data: adj }, { data: slips }] = await Promise.all([
    db.from("staff_attendance").select("user_id, clock_in, clock_out").in("user_id", ids).gte("clock_in", start.toISOString()).lt("clock_in", end.toISOString()),
    db.from("staff_pay_adjustments").select("id, user_id, amount, note").in("user_id", ids).eq("month", first),
    db.from("staff_payslips").select("user_id, gross, paid_at").in("user_id", ids).eq("month", first),
  ]);
  const now = Date.now();
  return staff.map((s) => {
    const mine = (att ?? []).filter((a: any) => a.user_id === s.user_id);
    // days worked: clocked shifts or QR check-ins (morning / afternoon)
    const person = sessions?.people.find((x) => x.userId === s.user_id);
    const checkDays = person ? Object.entries(person.days).filter(([, d]) => ["ok", "late"].includes(d.morning) || ["ok", "late"].includes(d.afternoon)).map(([d]) => d) : [];
    const days = new Set([...mine.map((a: any) => localDate(new Date(a.clock_in))), ...checkDays]).size;
    const attendance = { late: person?.late ?? 0, absent: person?.absent ?? 0, deduction: person?.deduction ?? 0 };
    const hours = r2(
      mine.reduce((sum: number, a: any) => {
        const from = Date.parse(a.clock_in);
        const to = a.clock_out ? Date.parse(a.clock_out) : Math.min(now, from + 12 * 3600e3); // an open shift counts up to now (max 12 h)
        return sum + Math.max(0, to - from) / 3600e3;
      }, 0)
    );
    const p = s.position;
    const hiredInTime = s.hired_on <= localDate(new Date(end.getTime() - 1));
    const units = !p || !hiredInTime ? 0 : p.pay_type === "monthly" ? 1 : p.pay_type === "daily" ? days : hours;
    const base = r2((p?.rate ?? 0) * units);
    const adjustments = (adj ?? []).filter((a: any) => a.user_id === s.user_id).map((a: any) => ({ id: a.id, amount: Number(a.amount), note: a.note }));
    const adjTotal = r2(adjustments.reduce((t, a) => t + a.amount, 0));
    const allowance = hiredInTime ? s.allowance : 0;
    const slip = (slips ?? []).find((x: any) => x.user_id === s.user_id);
    const open = mine.find((a: any) => !a.clock_out);
    return {
      staff: s,
      days,
      hours,
      units,
      base,
      allowance,
      adjustments,
      adjTotal,
      attendance,
      gross: r2(Math.max(0, base + allowance + adjTotal - attendance.deduction)),
      payslip: slip ? { gross: Number(slip.gross), paid_at: slip.paid_at } : null,
      openShift: open?.clock_in ?? null,
    };
  });
}

/** The person's open shift, if they are clocked in. */
export async function openShift(userId: string) {
  const { data } = await createServiceRoleClient().from("staff_attendance").select("id, clock_in").eq("user_id", userId).is("clock_out", null).maybeSingle();
  return data;
}

/** Browser-tab title for a staff page, e.g. "Bookings · GWZ Staff", in the chosen language. */
export async function staffTitle(en: string, km: string) {
  const { getI18n } = await import("@/lib/i18n/server");
  const isKm = getI18n().locale === "km";
  return { title: `${isKm ? km : en} · ${isKm ? "បុគ្គលិក GWZ" : "GWZ Staff"}` };
}
