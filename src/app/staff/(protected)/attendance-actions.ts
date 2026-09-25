"use server";

import { revalidatePath } from "next/cache";
import { getVerifiedUserId } from "@/lib/auth/session";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { staffAccess } from "@/lib/server/staff";
import { distanceM, getAttendanceSettings, localDay, localMinutes, sessionFor, toMin, verifyQrToken, type Session } from "@/lib/server/attendance";

const refresh = () => {
  revalidatePath("/staff", "layout");
  revalidatePath("/admin/staff");
};

export type CheckInResult =
  | { ok: true; session: Session; late: number; time: string; distance: number | null; already?: boolean }
  | { ok: false; error: "signin" | "not-staff" | "qr" | "location" | "far" | "closed"; distance?: number; radius?: number };

/**
 * A staff member scanned the QR on the zoo's screen. Checked here: it's
 * them, the QR is this minute's, their phone is inside the zoo, and a
 * session (morning / afternoon) is open. Minutes late are saved with it.
 */
export async function checkInAttendance(token: string, lat: number | null, lng: number | null, accuracy: number | null): Promise<CheckInResult> {
  const id = getVerifiedUserId();
  if (!id) return { ok: false, error: "signin" };
  const access = await staffAccess(id);
  if (!access.ok || !access.staff) return { ok: false, error: "not-staff" };
  if (!(await verifyQrToken(String(token ?? "")))) return { ok: false, error: "qr" };

  const s = await getAttendanceSettings();
  let distance: number | null = null;
  const hasFix = typeof lat === "number" && typeof lng === "number" && Number.isFinite(lat) && Number.isFinite(lng);
  if (s.require_location && !hasFix) return { ok: false, error: "location" };
  if (hasFix && s.zoo_lat != null && s.zoo_lng != null) {
    distance = distanceM(lat!, lng!, s.zoo_lat, s.zoo_lng);
    // a little slack for the phone's own GPS accuracy (up to 100 m)
    const slack = Math.min(Math.max(accuracy ?? 0, 0), 100);
    if (s.require_location && distance > s.radius_m + slack) return { ok: false, error: "far", distance, radius: s.radius_m };
  }

  const now = sessionFor(s);
  if (!now) return { ok: false, error: "closed" };
  const day = localDay();
  const db = createServiceRoleClient();
  const { data: existing } = await db.from("staff_session_checks").select("checked_at, late_minutes, status").eq("user_id", id).eq("day", day).eq("session", now.session).maybeSingle();
  const fmt = (iso: string) => new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Phnom_Penh" }).format(new Date(iso));
  if (existing && existing.status === "present") return { ok: true, session: now.session, late: existing.late_minutes, time: fmt(existing.checked_at), distance, already: true };
  if (existing) await db.from("staff_session_checks").delete().eq("user_id", id).eq("day", day).eq("session", now.session);

  const at = new Date().toISOString();
  await db.from("staff_session_checks").insert({ user_id: id, day, session: now.session, checked_at: at, late_minutes: now.late, lat: hasFix ? lat : null, lng: hasFix ? lng : null, distance_m: distance, method: "qr" });
  refresh();
  return { ok: true, session: now.session, late: now.late, time: fmt(at), distance };
}

// ── For admins and managers ───────────────────────────────────────────
async function manager() {
  const id = getVerifiedUserId();
  if (!id) throw new Error("Please sign in.");
  const access = await staffAccess(id);
  if (!access.admin && !access.perms.has("reports")) throw new Error("Only admins and managers.");
  return id;
}
const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const hhmm = (v: string, d: string) => (/^\d{2}:\d{2}$/.test(v) ? v : d);

export async function saveAttendanceSettings(formData: FormData) {
  await manager();
  const num = (k: string, d: number, min: number, max: number) => {
    const n = Number(str(formData, k));
    return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : d;
  };
  const lat = str(formData, "zoo_lat");
  const lng = str(formData, "zoo_lng");
  await createServiceRoleClient()
    .from("staff_attendance_settings")
    .update({
      morning_start: hhmm(str(formData, "morning_start"), "07:30"),
      morning_end: hhmm(str(formData, "morning_end"), "11:30"),
      afternoon_start: hhmm(str(formData, "afternoon_start"), "13:30"),
      afternoon_end: hhmm(str(formData, "afternoon_end"), "17:30"),
      grace_minutes: num("grace_minutes", 10, 0, 120),
      open_before_minutes: 0, // the QR opens exactly at the start time
      rest_days: formData.getAll("rest_days").map(Number).filter((n) => n >= 0 && n <= 6),
      zoo_lat: lat && Number.isFinite(Number(lat)) ? Number(lat) : null,
      zoo_lng: lng && Number.isFinite(Number(lng)) ? Number(lng) : null,
      radius_m: num("radius_m", 300, 30, 5000),
      require_location: formData.get("require_location") === "on",
      late_fee: num("late_fee", 0, 0, 1000),
      absence_fee: num("absence_fee", 0, 0, 1000),
      ...(/^d{4}-d{2}-d{2}$/.test(str(formData, "tracking_from")) ? { tracking_from: str(formData, "tracking_from") } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq("id", 1);
  refresh();
}

export async function addHoliday(formData: FormData) {
  await manager();
  const day = str(formData, "day");
  const name = str(formData, "name").slice(0, 80);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || !name) return;
  await createServiceRoleClient().from("staff_holidays").upsert({ day, name });
  refresh();
}
export async function removeHoliday(day: string) {
  await manager();
  await createServiceRoleClient().from("staff_holidays").delete().eq("day", day);
  refresh();
}

/** Mark someone present by hand (no phone / GPS problem), or undo it. */
export async function markSession(userId: string, day: string, session: Session, present: boolean) {
  const by = await manager();
  const db = createServiceRoleClient();
  if (present) {
    await db.from("staff_session_checks").upsert({ user_id: userId, day, session, late_minutes: 0, method: "manual", marked_by: by, checked_at: new Date().toISOString() }, { onConflict: "user_id,day,session" });
  } else {
    await db.from("staff_session_checks").delete().eq("user_id", userId).eq("day", day).eq("session", session);
  }
  refresh();
}


/** "Leave today" from the attendance board: an approved one-day leave (or remove it again). */
export async function markLeaveToday(userId: string, day: string, on: boolean) {
  const by = await manager();
  const db = createServiceRoleClient();
  if (on) {
    await db.from("staff_leave_requests").insert({ user_id: userId, kind: "personal", start_date: day, end_date: day, reason: "Marked on the attendance board", status: "approved", decided_by: by, decided_at: new Date().toISOString() });
  } else {
    await db.from("staff_leave_requests").update({ status: "cancelled" }).eq("user_id", userId).eq("status", "approved").lte("start_date", day).gte("end_date", day);
  }
  refresh();
}

export type BoxKind = "arrived" | "late" | "leave" | "absent";
/**
 * Tap a box on the attendance list: arrived / late / leave / absent for one
 * half day. Tapping the box that is already set clears it again.
 */
export async function setSessionStatus(userId: string, day: string, session: Session, kind: BoxKind) {
  const by = await manager();
  const db = createServiceRoleClient();
  const { data: cur } = await db.from("staff_session_checks").select("status, late_minutes").eq("user_id", userId).eq("day", day).eq("session", session).maybeSingle();
  const curKind: BoxKind | null = !cur ? null : cur.status === "leave" ? "leave" : cur.status === "absent" ? "absent" : cur.late_minutes > 0 ? "late" : "arrived";
  if (curKind === kind) {
    await db.from("staff_session_checks").delete().eq("user_id", userId).eq("day", day).eq("session", session);
  } else {
    const s = await getAttendanceSettings();
    const start = toMin(session === "morning" ? s.morning_start : s.afternoon_start);
    const end = toMin(session === "morning" ? s.morning_end : s.afternoon_end);
    // during the session: minutes since it started; afterwards (or another day) we can't know, so just past the grace time
    const lateBy = day === localDay() && localMinutes() < end ? Math.max(s.grace_minutes + 1, localMinutes() - start) : s.grace_minutes + 1;
    await db.from("staff_session_checks").upsert(
      {
        user_id: userId,
        day,
        session,
        status: kind === "leave" ? "leave" : kind === "absent" ? "absent" : "present",
        late_minutes: kind === "late" ? lateBy : 0,
        method: "manual",
        marked_by: by,
        checked_at: new Date().toISOString(),
      },
      { onConflict: "user_id,day,session" }
    );
  }
  refresh();
}
