import "server-only";
import { createHmac, timingSafeEqual } from "crypto";
import { createServiceRoleClient } from "@/lib/supabase/server";

// Morning / afternoon attendance. A screen at the zoo shows a QR that
// changes every minute (signed with a secret); staff scan it with their
// phone, which must share its location, and the check-in is recorded for
// the current session with any minutes late. Rest days, holidays and
// approved leave are never counted as absent.

export type Session = "morning" | "afternoon";
export type AttendanceSettings = {
  morning_start: string;
  morning_end: string;
  afternoon_start: string;
  afternoon_end: string;
  grace_minutes: number;
  open_before_minutes: number;
  rest_days: number[];
  zoo_lat: number | null;
  zoo_lng: number | null;
  radius_m: number;
  require_location: boolean;
  late_fee: number;
  absence_fee: number;
  /** absences are only counted from this day on */
  tracking_from: string;
};

const TZ = "Asia/Phnom_Penh";
export const localDay = (d = new Date()) => new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(d);
export const localMinutes = (d = new Date()) => {
  const p = new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(d);
  return Number(p.find((x) => x.type === "hour")?.value) * 60 + Number(p.find((x) => x.type === "minute")?.value);
};
export const toMin = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};
/** 0 = Sunday … 6 = Saturday for a YYYY-MM-DD date. */
export const weekday = (day: string) => new Date(`${day}T12:00:00Z`).getUTCDay();

async function raw() {
  const { data } = await createServiceRoleClient().from("staff_attendance_settings").select("*").eq("id", 1).single();
  return data as AttendanceSettings & { qr_secret: string };
}
/** The rules (never the QR secret). */
export async function getAttendanceSettings(): Promise<AttendanceSettings> {
  const { qr_secret: _s, ...rest } = (await raw()) as any;
  return { ...rest, morning_start: rest.morning_start.slice(0, 5), morning_end: rest.morning_end.slice(0, 5), afternoon_start: rest.afternoon_start.slice(0, 5), afternoon_end: rest.afternoon_end.slice(0, 5), late_fee: Number(rest.late_fee), absence_fee: Number(rest.absence_fee), tracking_from: String(rest.tracking_from).slice(0, 10) };
}

// ── Rolling QR ────────────────────────────────────────────────────────
const slotNow = () => Math.floor(Date.now() / 60_000);
const sign = (secret: string, slot: number) => createHmac("sha256", secret).update(`gwz-attendance:${slot}`).digest("base64url").slice(0, 22);

/** The token for this minute (for the screen at the zoo). */
export async function currentQrToken() {
  const s = await raw();
  const slot = slotNow();
  return { token: `${slot}.${sign(s.qr_secret, slot)}`, expiresAt: (slot + 1) * 60_000 };
}
/** Valid for the minute it was shown and the next one (time to walk up and scan). */
export async function verifyQrToken(token: string) {
  const m = /^(\d{6,10})\.([\w-]{22})$/.exec(token.trim());
  if (!m) return false;
  const slot = Number(m[1]);
  const now = slotNow();
  if (slot > now || slot < now - 1) return false;
  const want = Buffer.from(sign((await raw()).qr_secret, slot));
  const got = Buffer.from(m[2]);
  return want.length === got.length && timingSafeEqual(want, got);
}

export function distanceM(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371e3;
  const toR = (x: number) => (x * Math.PI) / 180;
  const a = Math.sin(toR(lat2 - lat1) / 2) ** 2 + Math.cos(toR(lat1)) * Math.cos(toR(lat2)) * Math.sin(toR(lng2 - lng1) / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(a)));
}

/** Which session is open for check-in right now, and how late it would be. */
export function sessionFor(s: AttendanceSettings, minutes = localMinutes()): { session: Session; late: number } | null {
  for (const [session, start, end] of [
    ["morning", s.morning_start, s.morning_end],
    ["afternoon", s.afternoon_start, s.afternoon_end],
  ] as const) {
    const a = toMin(start);
    if (minutes >= a - s.open_before_minutes && minutes < toMin(end)) {
      return { session, late: minutes > a + s.grace_minutes ? minutes - a : 0 };
    }
  }
  return null;
}

// ── Monthly summary ───────────────────────────────────────────────────
export type DayMark = { morning: "ok" | "late" | "absent" | "off" | "leave" | "holiday" | "future" | "none"; afternoon: DayMark["morning"]; lateMin: number; mIn?: string; aIn?: string; mLate?: number; aLate?: number };
export type PersonMonth = {
  userId: string;
  name: string;
  staffNo: string;
  position: string | null;
  positionKm: string | null;
  days: Record<string, DayMark>;
  present: number; // sessions checked in
  late: number; // sessions late
  lateMinutes: number;
  absent: number; // work sessions missed
  leaveDays: number;
  deduction: number; // late + absence fees
};

export async function attendanceMonth(month: string, onlyUserId?: string) {
  const db = createServiceRoleClient();
  const s = await getAttendanceSettings();
  const [y, mo] = month.split("-").map(Number);
  const daysIn = new Date(Date.UTC(y, mo, 0)).getUTCDate();
  const all = Array.from({ length: daysIn }, (_, i) => `${month}-${String(i + 1).padStart(2, "0")}`);
  const today = localDay();
  const nowMin = localMinutes();
  let staffQ = db.from("staff_members").select("user_id, staff_no, full_name, status, hired_on, position:staff_positions(name, name_km)").order("staff_no");
  if (onlyUserId) staffQ = staffQ.eq("user_id", onlyUserId);
  const [{ data: staff }, { data: checks }, { data: holidays }, { data: leaves }] = await Promise.all([
    staffQ,
    db.from("staff_session_checks").select("user_id, day, session, checked_at, late_minutes").gte("day", all[0]).lte("day", all[all.length - 1]),
    db.from("staff_holidays").select("day, name").gte("day", all[0]).lte("day", all[all.length - 1]),
    db.from("staff_leave_requests").select("user_id, start_date, end_date").eq("status", "approved").lte("start_date", all[all.length - 1]).gte("end_date", all[0]),
  ]);
  const hol = new Map((holidays ?? []).map((h: any) => [h.day, h.name]));
  const time = (iso: string) => new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: TZ }).format(new Date(iso));
  const people: PersonMonth[] = (staff ?? [])
    .filter((p: any) => p.status === "active" || (checks ?? []).some((c: any) => c.user_id === p.user_id))
    .map((p: any) => {
      const mine = (checks ?? []).filter((c: any) => c.user_id === p.user_id);
      const onLeave = (d: string) => (leaves ?? []).some((l: any) => l.user_id === p.user_id && l.start_date <= d && l.end_date >= d);
      const out: PersonMonth = { userId: p.user_id, name: p.full_name, staffNo: p.staff_no, position: p.position?.name ?? null, positionKm: p.position?.name_km ?? null, days: {}, present: 0, late: 0, lateMinutes: 0, absent: 0, leaveDays: 0, deduction: 0 };
      for (const d of all) {
        const mark = (session: Session): DayMark["morning"] => {
          const c = mine.find((x: any) => x.day === d && x.session === session);
          if (c) return c.late_minutes > 0 ? "late" : "ok";
          if (d < p.hired_on || d < s.tracking_from) return "none";
          if (hol.has(d)) return "holiday";
          if (s.rest_days.includes(weekday(d))) return "off";
          if (onLeave(d)) return "leave";
          const end = toMin(session === "morning" ? s.morning_end : s.afternoon_end);
          if (d > today || (d === today && nowMin < end)) return "future";
          return "absent";
        };
        const m = mark("morning");
        const a = mark("afternoon");
        const cm = mine.find((x: any) => x.day === d && x.session === "morning");
        const ca = mine.find((x: any) => x.day === d && x.session === "afternoon");
        const lateMin = (cm?.late_minutes ?? 0) + (ca?.late_minutes ?? 0);
        out.days[d] = { morning: m, afternoon: a, lateMin, mIn: cm ? time(cm.checked_at) : undefined, aIn: ca ? time(ca.checked_at) : undefined, mLate: cm?.late_minutes, aLate: ca?.late_minutes };
        for (const x of [m, a]) {
          if (x === "ok" || x === "late") out.present++;
          if (x === "late") out.late++;
          if (x === "absent") out.absent++;
        }
        out.lateMinutes += lateMin;
        if (m === "leave") out.leaveDays++;
      }
      out.deduction = Math.round((out.late * s.late_fee + out.absent * s.absence_fee) * 100) / 100;
      return out;
    });
  return { settings: s, days: all, holidays: hol, people, today };
}
