import "server-only";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { getStaffSettings } from "./staff-settings";
import { coverFit } from "@/lib/roster-ui";

// An approved cover changes three things:
// 1. the schedule: the person who asked keeps their box as "off · covered by X"
//    (the shift they had is kept for the totals), and the helper gets the shift
//    "… · covering for Y";
// 2. attendance follows the schedule by itself: the helper is expected at work,
//    the person who asked is not (so they are not marked absent);
// 3. pay: for monthly pay, the shift's value is added to the helper and taken
//    from the person who asked, as adjustments on that month's payroll
//    (people paid by the day or the hour are paid from attendance already).

const SHIFT_KM: Record<string, string> = { morning: "ព្រឹក", afternoon: "រសៀល", full: "ពេញថ្ងៃ" };
const r2 = (n: number) => Math.round(n * 100) / 100;

async function payOf(userId: string) {
  const { data } = await createServiceRoleClient().from("staff_members").select("full_name, full_name_km, position:staff_positions(pay_type, rate)").eq("user_id", userId).maybeSingle();
  const pos = (data as any)?.position;
  return { name: (data as any)?.full_name_km || (data as any)?.full_name || "Admin", monthly: pos?.pay_type === "monthly", rate: Number(pos?.rate ?? 0) };
}

/** Applies an approved cover: `rosterId` is the shift of `fromUser`, taken by `helper`. */
export async function applyCover(requestId: string, rosterId: string, fromUser: string, helper: string, by: string) {
  const db = createServiceRoleClient();
  const { data: a } = await db.from("staff_roster").select("*").eq("id", rosterId).maybeSingle();
  if (!a || a.user_id !== fromUser || a.shift === "off") return false;
  const shift = a.shift as "morning" | "afternoon" | "full";
  const now = new Date().toISOString();
  // the helper's own box that day: empty / "off" → the shift; the other half → a full day;
  // the same hours → not possible (the schedule changed since they said yes)
  const { data: mine } = await db.from("staff_roster").select("id, shift").eq("user_id", helper).eq("day", a.day).maybeSingle();
  const fit = coverFit(mine?.shift, shift);
  if (fit === "clash") return false;
  if (fit === "merge") {
    await db.from("staff_roster").update({ shift: "full", note: "cover", cover_user: fromUser, cover_shift: shift, updated_at: now }).eq("id", mine!.id);
  } else {
    await db.from("staff_roster").delete().eq("user_id", helper).eq("day", a.day);
    await db.from("staff_roster").insert({ user_id: helper, day: a.day, shift, note: "cover", cover_user: fromUser, cover_shift: shift, updated_at: now, created_by: by });
  }
  await db.from("staff_roster").update({ shift: "off", note: "covered", cover_user: helper, cover_shift: shift, updated_at: now }).eq("id", a.id);

  // pay (once per request)
  const s = await getStaffSettings();
  if (!s.cover_pay) return true;
  const { data: done } = await db.from("staff_pay_adjustments").select("id").eq("ref", `cover:${requestId}`).limit(1);
  if (done?.length) return true;
  const [asker, taker] = await Promise.all([payOf(fromUser), payOf(helper)]);
  const share = shift === "full" ? 1 : 0.5;
  // the shift's value is what the person who asked would have earned for it
  const value = asker.monthly ? r2((asker.rate / Math.max(1, s.work_days_month)) * share) : taker.monthly ? r2((taker.rate / Math.max(1, s.work_days_month)) * share) : 0;
  if (!value) return true;
  const month = `${String(a.day).slice(0, 7)}-01`;
  const when = `${String(a.day).slice(8, 10)}/${String(a.day).slice(5, 7)} ${SHIFT_KM[shift]}`;
  const rows = [
    asker.monthly && { user_id: fromUser, month, amount: -value, note: `អ្នកផ្សេងជំនួស (${taker.name}) · ${when}`, created_by: by, ref: `cover:${requestId}` },
    taker.monthly && { user_id: helper, month, amount: value, note: `ជំនួស ${asker.name} · ${when}`, created_by: by, ref: `cover:${requestId}` },
  ].filter(Boolean);
  if (rows.length) await db.from("staff_pay_adjustments").insert(rows);
  return true;
}
