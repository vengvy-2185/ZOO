import "server-only";
import { createServiceRoleClient } from "@/lib/supabase/server";

// Turning a staff account off (or removing it) takes effect at once: the
// person can't sign in any more, is signed out on every device, disappears
// from the schedule from today on, and their open cover/swap requests close.
// Their history (attendance, pay, messages) is kept. Only an admin or a
// manager can turn the account back on.

export type StaffStatus = "active" | "suspended" | "left";

export async function setStaffStatus(userId: string, status: StaffStatus) {
  const db = createServiceRoleClient();
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Phnom_Penh" }).format(new Date());
  await db.from("staff_members").update({ status }).eq("user_id", userId);
  if (status === "active") {
    // can sign in again; the automatic schedule plans them on the next visit
    await db.auth.admin.updateUserById(userId, { ban_duration: "none" }).catch(() => {});
    return;
  }
  // no more sign-in, and every open session stops working
  await db.auth.admin.updateUserById(userId, { ban_duration: "876000h" }).catch(() => {});
  await db.from("staff_roster").delete().eq("user_id", userId).gte("day", today);
  await db.from("staff_shift_requests").update({ status: "cancelled" }).eq("from_user", userId).in("status", ["open", "accepted"]);
  await db.from("staff_shift_requests").update({ status: "open", taken_by: null }).eq("taken_by", userId).eq("status", "accepted");
  await db.from("staff_presence").delete().eq("user_id", userId);
}
