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

/**
 * A new staff member: the sign-in account (Staff ID + password), the staff
 * record, the "staff" role and the ID card, in one go. Used by Admin → Staff
 * and by HR when an applicant is hired.
 */
export async function createStaffAccount(o: {
  name: string;
  nameKm?: string | null;
  positionId: string;
  phone?: string | null;
  hiredOn?: string;
  allowance?: number;
  photo?: string | null;
  staffNo?: string;
  createdBy: string;
}): Promise<{ ok: true; staffNo: string; password: string; userId: string } | { ok: false; error: string }> {
  const { createServiceRoleClient } = await import("@/lib/supabase/server");
  const { makePassword, staffEmail, isStaffNo } = await import("./staff");
  const { getStaffSettings } = await import("./staff-settings");
  const { getMembers, ensureCard } = await import("./members");
  const db = createServiceRoleClient();
  let staffNo: string;
  if (o.staffNo) {
    if (!isStaffNo(o.staffNo)) return { ok: false, error: "Staff ID: use 3-20 letters, numbers or dashes (e.g. GWZ-S-0101)." };
    const { data: taken } = await db.from("staff_members").select("user_id").eq("staff_no", o.staffNo).maybeSingle();
    if (taken) return { ok: false, error: `Staff ID ${o.staffNo} is already used.` };
    staffNo = o.staffNo;
  } else {
    const { data: next, error: seqErr } = await db.rpc("next_staff_no");
    if (seqErr || !next) return { ok: false, error: "Could not make a Staff ID." };
    staffNo = next;
  }
  const password = makePassword();
  const { data: created, error: authErr } = await db.auth.admin.createUser({
    email: staffEmail(staffNo),
    password,
    email_confirm: true, // internal address: nothing is ever mailed
    user_metadata: { full_name: o.name, display_name: o.name, ...(o.photo ? { custom_avatar_url: o.photo } : {}), staff_no: staffNo },
  });
  if (authErr || !created.user) return { ok: false, error: authErr?.message ?? "Could not create the account." };
  const userId = created.user.id;
  // The profile row is made by the auth trigger; give it the staff role.
  await db.from("profiles").update({ role: "staff", full_name: o.name, ...(o.photo ? { avatar_url: o.photo } : {}) }).eq("id", userId);
  const { error: staffErr } = await db.from("staff_members").insert({
    user_id: userId,
    staff_no: staffNo,
    full_name: o.name,
    full_name_km: o.nameKm || null,
    position_id: o.positionId,
    phone: o.phone || null,
    hired_on: o.hiredOn || undefined,
    allowance: o.allowance ?? 0,
    leave_quota: (await getStaffSettings()).default_leave_quota,
    created_by: o.createdBy,
  });
  if (staffErr) {
    await db.auth.admin.deleteUser(userId);
    return { ok: false, error: staffErr.message };
  }
  // ID card straight away (status "ready" = ready to print).
  const [m] = await getMembers(userId);
  if (m) await ensureCard(m);
  return { ok: true, staffNo, password, userId };
}
