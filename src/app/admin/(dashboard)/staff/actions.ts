"use server";

import { revalidatePath } from "next/cache";
import { getVerifiedUserId } from "@/lib/auth/session";
import { getCachedRole } from "@/lib/auth/role";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { resolveImage } from "@/lib/admin/upload";
import { getStaffSettings } from "@/lib/server/staff-settings";
import { getMembers, ensureCard } from "@/lib/server/members";
import { makePassword, staffEmail, monthRange, payroll, isStaffNo, type Permission, type PayType } from "@/lib/server/staff";

// Staff accounts are made here, and only here: an admin fills in the form,
// the server creates the sign-in account (Staff ID + password), the staff
// record, the "staff" role and the ID card in one go.

async function requireAdmin() {
  const id = getVerifiedUserId();
  if (!id || (await getCachedRole(id)).role !== "admin") throw new Error("Admins only.");
  return id;
}
const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const money = (f: FormData, k: string) => {
  const n = Number(str(f, k) || 0);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0;
};
const done = () => {
  revalidatePath("/admin/staff", "layout");
  revalidatePath("/staff", "layout");
};

export type CreateStaffState = { ok: false; error?: string } | { ok: true; staffNo: string; password: string; name: string; userId: string };

export async function createStaff(_prev: CreateStaffState, formData: FormData): Promise<CreateStaffState> {
  const adminId = await requireAdmin();
  const name = str(formData, "full_name");
  const positionId = str(formData, "position_id");
  if (!name || !positionId) return { ok: false, error: "Name and position are required." };
  const db = createServiceRoleClient();

  let photo: string | null = null;
  try {
    photo = await resolveImage(formData, "photo", "staff");
  } catch (e: any) {
    return { ok: false, error: e.message };
  }

  // Staff ID: typed by the admin, or the next automatic one (GWZ-S-0001, …).
  const typed = str(formData, "staff_no").toUpperCase();
  let staffNo: string;
  if (typed) {
    if (!isStaffNo(typed)) return { ok: false, error: "Staff ID: use 3-20 letters, numbers or dashes (e.g. GWZ-S-0101)." };
    const { data: taken } = await db.from("staff_members").select("user_id").eq("staff_no", typed).maybeSingle();
    if (taken) return { ok: false, error: `Staff ID ${typed} is already used.` };
    staffNo = typed;
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
    user_metadata: { full_name: name, display_name: name, ...(photo ? { custom_avatar_url: photo } : {}), staff_no: staffNo },
  });
  if (authErr || !created.user) return { ok: false, error: authErr?.message ?? "Could not create the account." };
  const userId = created.user.id;

  // The profile row is made by the auth trigger; give it the staff role.
  await db.from("profiles").update({ role: "staff", full_name: name, ...(photo ? { avatar_url: photo } : {}) }).eq("id", userId);
  const { error: staffErr } = await db.from("staff_members").insert({
    user_id: userId,
    staff_no: staffNo,
    full_name: name,
    full_name_km: str(formData, "full_name_km") || null,
    position_id: positionId,
    phone: str(formData, "phone") || null,
    hired_on: str(formData, "hired_on") || undefined,
    allowance: money(formData, "allowance"),
    leave_quota: (await getStaffSettings()).default_leave_quota,
    created_by: adminId,
  });
  if (staffErr) {
    await db.auth.admin.deleteUser(userId);
    return { ok: false, error: staffErr.message };
  }

  // ID card straight away (status "ready" = ready to print).
  const [m] = await getMembers(userId);
  if (m) await ensureCard(m);
  done();
  return { ok: true, staffNo, password, name, userId };
}

export async function updateStaff(userId: string, formData: FormData) {
  await requireAdmin();
  const db = createServiceRoleClient();
  const status = str(formData, "status");
  const name = str(formData, "full_name");
  await db
    .from("staff_members")
    .update({
      ...(name ? { full_name: name } : {}),
      full_name_km: str(formData, "full_name_km") || null,
      position_id: str(formData, "position_id") || null,
      phone: str(formData, "phone") || null,
      allowance: money(formData, "allowance"),
      ...(/^\d{1,3}$/.test(str(formData, "leave_quota")) ? { leave_quota: Math.min(365, Number(str(formData, "leave_quota"))) } : {}),
      ...(["active", "suspended", "left"].includes(status) ? { status } : {}),
    })
    .eq("user_id", userId);
  if (name) await db.from("profiles").update({ full_name: name }).eq("id", userId);
  // Suspended / left: they can no longer sign in to the staff area (checked on every request)
  // and their card's QR shows "not valid". Signing out other sessions right away:
  if (status === "suspended" || status === "left") await db.auth.admin.signOut(userId).catch(() => {});
  done();
}

export type ResetState = { password?: string; error?: string };
export async function resetStaffPassword(userId: string, _prev: ResetState): Promise<ResetState> {
  await requireAdmin();
  const password = makePassword();
  const { error } = await createServiceRoleClient().auth.admin.updateUserById(userId, { password });
  return error ? { error: error.message } : { password };
}

// ── Positions ─────────────────────────────────────────────────────────
function positionFields(f: FormData) {
  const pay = str(f, "pay_type");
  return {
    name: str(f, "name"),
    name_km: str(f, "name_km") || null,
    pay_type: (["monthly", "daily", "hourly"].includes(pay) ? pay : "monthly") as PayType,
    rate: money(f, "rate"),
    permissions: f.getAll("permissions").map(String).filter((p): p is Permission => ["tickets", "animals", "reports", "guide", "cleaning"].includes(p)),
    color: /^#[0-9a-f]{6}$/i.test(str(f, "color")) ? str(f, "color") : "#2563EB",
  };
}
export async function savePosition(id: string | null, formData: FormData) {
  await requireAdmin();
  const row = positionFields(formData);
  if (!row.name) return;
  const db = createServiceRoleClient();
  if (id) await db.from("staff_positions").update(row).eq("id", id);
  else await db.from("staff_positions").insert({ ...row, sort: 99 });
  done();
}
export async function deletePosition(id: string) {
  await requireAdmin();
  await createServiceRoleClient().from("staff_positions").delete().eq("id", id);
  done();
}

// ── Payroll ───────────────────────────────────────────────────────────
export async function addAdjustment(userId: string, month: string, formData: FormData) {
  const adminId = await requireAdmin();
  const amount = money(formData, "amount") * (str(formData, "sign") === "-" ? -1 : 1);
  const note = str(formData, "note");
  if (!amount || !note) return;
  await createServiceRoleClient().from("staff_pay_adjustments").insert({ user_id: userId, month: monthRange(month).first, amount, note, created_by: adminId });
  done();
}
export async function removeAdjustment(id: string) {
  await requireAdmin();
  await createServiceRoleClient().from("staff_pay_adjustments").delete().eq("id", id);
  done();
}
/** Freezes this month's figures into a payslip, marked paid now. */
export async function markPaid(userId: string, month: string) {
  const adminId = await requireAdmin();
  const [line] = await payroll(month, userId);
  if (!line) return;
  await createServiceRoleClient().from("staff_payslips").upsert(
    {
      user_id: userId,
      month: monthRange(month).first,
      pay_type: line.staff.position?.pay_type ?? "monthly",
      rate: line.staff.position?.rate ?? 0,
      units: line.units,
      base: line.base,
      allowance: line.allowance,
      adjustments: Math.round((line.adjTotal - line.attendance.deduction) * 100) / 100,
      gross: line.gross,
      paid_by: adminId,
      paid_at: new Date().toISOString(),
    },
    { onConflict: "user_id,month" }
  );
  done();
}
export async function unmarkPaid(userId: string, month: string) {
  await requireAdmin();
  await createServiceRoleClient().from("staff_payslips").delete().eq("user_id", userId).eq("month", monthRange(month).first);
  done();
}

// ── Leave requests ────────────────────────────────────────────────────
export async function decideLeave(id: string, formData: FormData) {
  const adminId = await requireAdmin();
  const status = str(formData, "decision");
  if (!["approved", "rejected"].includes(status)) return;
  await createServiceRoleClient()
    .from("staff_leave_requests")
    .update({ status, admin_note: str(formData, "admin_note") || null, decided_by: adminId, decided_at: new Date().toISOString() })
    .eq("id", id)
    .eq("status", "pending");
  done();
}

// ── Notices ───────────────────────────────────────────────────────────
export async function postNotice(formData: FormData) {
  const adminId = await requireAdmin();
  const title = str(formData, "title").slice(0, 120);
  const body = str(formData, "body").slice(0, 2000);
  if (!title || !body) return;
  await createServiceRoleClient().from("staff_announcements").insert({ title, body, pinned: formData.get("pinned") === "on", created_by: adminId });
  done();
}
export async function deleteNotice(id: string) {
  await requireAdmin();
  await createServiceRoleClient().from("staff_announcements").delete().eq("id", id);
  done();
}
export async function togglePin(id: string, pinned: boolean) {
  await requireAdmin();
  await createServiceRoleClient().from("staff_announcements").update({ pinned }).eq("id", id);
  done();
}

// ── Numbers and lists for the staff area ──────────────────────────────
export async function saveStaffSettings(formData: FormData) {
  await requireAdmin();
  const num = (k: string, d: number, min: number, max: number) => {
    const n = Number(str(formData, k));
    return Number.isFinite(n) && str(formData, k) !== "" ? Math.round(Math.min(max, Math.max(min, n))) : d;
  };
  const phones = Array.from({ length: 6 }, (_, i) => ({
    label: str(formData, `ph_label_${i}`).slice(0, 40),
    label_km: str(formData, `ph_km_${i}`).slice(0, 40),
    number: str(formData, `ph_num_${i}`).replace(/[^\d+*#\s-]/g, "").slice(0, 20),
  })).filter((p) => p.number && (p.label || p.label_km));
  const text = (k: string) => str(formData, k).slice(0, 1200);
  const data = {
    phones,
    office_phone: str(formData, "office_phone").replace(/[^\d+*#\s-]/g, "").slice(0, 20),
    sound_enabled: formData.get("sound_enabled") === "on",
    sound_volume: num("sound_volume", 80, 0, 100),
    siren_every: num("siren_every", 3, 1, 30),
    chime_tasks: formData.get("chime_tasks") === "on",
    chime_notices: formData.get("chime_notices") === "on",
    chime_manager: formData.get("chime_manager") === "on",
    kudos_per_day: num("kudos_per_day", 10, 1, 100),
    default_leave_quota: num("default_leave_quota", 12, 0, 365),
    handover_new_hours: num("handover_new_hours", 12, 1, 168),
    task_keep_days: num("task_keep_days", 3, 1, 60),
    lost_old_days: num("lost_old_days", 7, 1, 365),
    supplies: { tickets: text("sup_tickets"), animals: text("sup_animals"), cleaning: text("sup_cleaning"), guide: text("sup_guide"), general: text("sup_general") },
  };
  await createServiceRoleClient().from("staff_settings").upsert({ id: 1, data, updated_at: new Date().toISOString() });
  revalidatePath("/admin/staff");
  revalidatePath("/staff", "layout");
}

/** Everyone who still has the old default gets the new one (people with a custom number keep theirs). */
export async function applyLeaveQuotaToAll(oldQuota: number, newQuota: number) {
  await requireAdmin();
  if (!Number.isInteger(newQuota) || newQuota < 0 || newQuota > 365) return;
  await createServiceRoleClient().from("staff_members").update({ leave_quota: newQuota }).eq("leave_quota", oldQuota);
  revalidatePath("/admin/staff");
  revalidatePath("/staff", "layout");
}
