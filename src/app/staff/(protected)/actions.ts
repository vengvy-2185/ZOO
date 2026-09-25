"use server";

import { revalidatePath } from "next/cache";
import { getVerifiedUserId } from "@/lib/auth/session";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { staffAccess, openShift } from "@/lib/server/staff";

// Staff actions run with the service role, so each one first checks who is
// signed in and what their position allows.

async function me() {
  const id = getVerifiedUserId();
  if (!id) throw new Error("Please sign in.");
  const access = await staffAccess(id);
  if (!access.ok) throw new Error("Not allowed.");
  return { id, access };
}

export async function clockIn() {
  const { id, access } = await me();
  if (!access.staff) return; // admins don't clock in
  if (await openShift(id)) return;
  await createServiceRoleClient().from("staff_attendance").insert({ user_id: id });
  revalidatePath("/staff");
}

export async function clockOut() {
  const { id } = await me();
  const open = await openShift(id);
  if (!open) return;
  await createServiceRoleClient().from("staff_attendance").update({ clock_out: new Date().toISOString() }).eq("id", open.id);
  revalidatePath("/staff");
}

const KINDS = ["feeding", "health", "cleaning", "enrichment", "note"];
export async function addCareLog(formData: FormData) {
  const { id, access } = await me();
  if (!access.perms.has("animals")) throw new Error("Not allowed for your position.");
  const animalId = String(formData.get("animal_id") ?? "");
  const kind = String(formData.get("kind") ?? "note");
  const note = String(formData.get("note") ?? "").trim().slice(0, 500);
  if (!animalId || !note || !KINDS.includes(kind)) return;
  await createServiceRoleClient().from("animal_care_logs").insert({ animal_id: animalId, user_id: id, kind, note });
  revalidatePath("/staff/animals");
}

// ── Leave ─────────────────────────────────────────────────────────────
export type LeaveState = { ok?: boolean; error?: string };
export async function requestLeave(_prev: LeaveState, formData: FormData): Promise<LeaveState> {
  const { id, access } = await me();
  if (!access.staff) return { error: "Only staff can ask for leave." };
  const kind = String(formData.get("kind") ?? "annual");
  const start = String(formData.get("start_date") ?? "");
  const end = String(formData.get("end_date") ?? "") || start;
  const reason = String(formData.get("reason") ?? "").trim().slice(0, 400);
  if (!["annual", "sick", "personal", "other"].includes(kind) || !/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end) || end < start || !reason)
    return { error: "invalid" };
  const { error } = await createServiceRoleClient().from("staff_leave_requests").insert({ user_id: id, kind, start_date: start, end_date: end, reason });
  if (error) return { error: error.message };
  revalidatePath("/staff/leave");
  return { ok: true };
}
export async function cancelLeave(requestId: string) {
  const { id } = await me();
  // only your own request, and only while it's still waiting
  await createServiceRoleClient().from("staff_leave_requests").update({ status: "cancelled" }).eq("id", requestId).eq("user_id", id).eq("status", "pending");
  revalidatePath("/staff/leave");
}

// ── Profile ───────────────────────────────────────────────────────────
// Staff may change their photo and phone. Name and Staff ID are on the
// printed ID card, so only an admin changes those.
export type ProfileState = { ok?: boolean; error?: string };
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
export async function updateMyProfile(_prev: ProfileState, formData: FormData): Promise<ProfileState> {
  const { id, access } = await me();
  const db = createServiceRoleClient();
  const phone = String(formData.get("phone") ?? "").trim().slice(0, 30);
  if (phone && !/^[+\d][\d\s-]{5,}$/.test(phone)) return { error: "phone" };

  let photo: string | null = null;
  const file = formData.get("photo_file");
  if (file instanceof File && file.size > 0) {
    if (!IMAGE_TYPES.includes(file.type)) return { error: "type" };
    if (file.size > 5 * 1024 * 1024) return { error: "size" };
    const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
    const path = `staff/${id}/${Date.now()}.${ext}`;
    const { error } = await db.storage.from("animal-images").upload(path, file, { contentType: file.type, upsert: false });
    if (error) return { error: error.message };
    photo = db.storage.from("animal-images").getPublicUrl(path).data.publicUrl;
  }

  if (access.staff) await db.from("staff_members").update({ phone: phone || null }).eq("user_id", id);
  if (photo) {
    await db.from("profiles").update({ avatar_url: photo }).eq("id", id);
    const { data } = await db.auth.admin.getUserById(id);
    await db.auth.admin.updateUserById(id, { user_metadata: { ...(data.user?.user_metadata ?? {}), custom_avatar_url: photo } });
  }
  revalidatePath("/staff", "layout");
  return { ok: true };
}

export type PasswordState = { ok?: boolean; error?: "current" | "weak" | "match" | "same" | "busy" | "other" };
/**
 * Change your own password: the current one must be right first (checked
 * with a throwaway sign-in that doesn't touch this browser's session), the
 * new one must be strong, and it's typed twice.
 */
export async function changeMyPassword(_prev: PasswordState, formData: FormData): Promise<PasswordState> {
  const { id } = await me();
  const current = String(formData.get("current") ?? "");
  const next = String(formData.get("next") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  if (next.length < 8 || !/[A-Za-z]/.test(next) || !/\d/.test(next)) return { error: "weak" };
  if (next !== confirm) return { error: "match" };
  if (next === current) return { error: "same" };

  const db = createServiceRoleClient();
  const { data } = await db.auth.admin.getUserById(id);
  const email = data.user?.email;
  if (!email) return { error: "other" };
  const check = createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error: wrong } = await check.auth.signInWithPassword({ email, password: current });
  if (wrong) return { error: /rate|too many/i.test(wrong.message) ? "busy" : "current" };
  await check.auth.signOut({ scope: "local" }); // end only that throwaway session

  const { error } = await db.auth.admin.updateUserById(id, { password: next });
  return error ? { error: "other" } : { ok: true };
}

// ── Daily task ticks (cleaning checklist, guide programme) ────────────
/** Ticks (or un-ticks) one cleaning spot or one programme event for today. */
export async function toggleTask(kind: "cleaning" | "event", ref: string) {
  const { id, access } = await me();
  if (!access.perms.has(kind === "cleaning" ? "cleaning" : "guide")) throw new Error("Not allowed for your position.");
  if (!/^[\w-]{1,64}$/.test(ref)) return;
  const db = createServiceRoleClient();
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Phnom_Penh" }).format(new Date());
  const { data: done } = await db.from("staff_task_checks").select("id").eq("kind", kind).eq("ref", ref).eq("check_date", today).maybeSingle();
  if (done) await db.from("staff_task_checks").delete().eq("id", done.id);
  else await db.from("staff_task_checks").insert({ kind, ref, user_id: id, check_date: today });
  revalidatePath(kind === "cleaning" ? "/staff/cleaning" : "/staff/schedule");
}

/** One tap on the animal board: "fed just now". */
export async function markFed(animalId: string) {
  const { id, access } = await me();
  if (!access.perms.has("animals")) throw new Error("Not allowed for your position.");
  await createServiceRoleClient().from("animal_care_logs").insert({ animal_id: animalId, user_id: id, kind: "feeding", note: "Fed" });
  revalidatePath("/staff/animals");
}

// ── Report a problem ──────────────────────────────────────────────────
export type IssueState = { ok?: boolean; error?: string };
const ISSUE_CATS = ["repair", "cleaning", "animal", "safety", "visitor", "other"];
export async function reportIssue(_prev: IssueState, formData: FormData): Promise<IssueState> {
  const { id } = await me();
  const category = String(formData.get("category") ?? "other");
  const place = String(formData.get("place") ?? "").trim().slice(0, 120);
  const note = String(formData.get("note") ?? "").trim().slice(0, 600);
  if (!ISSUE_CATS.includes(category) || !place || !note) return { error: "invalid" };
  const db = createServiceRoleClient();
  let photo: string | null = null;
  const file = formData.get("photo_file");
  if (file instanceof File && file.size > 0) {
    if (!IMAGE_TYPES.includes(file.type)) return { error: "type" };
    if (file.size > 5 * 1024 * 1024) return { error: "size" };
    const path = `issues/${Date.now()}-${id.slice(0, 8)}.${file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg"}`;
    const { error } = await db.storage.from("animal-images").upload(path, file, { contentType: file.type });
    if (!error) photo = db.storage.from("animal-images").getPublicUrl(path).data.publicUrl;
  }
  const { error } = await db.from("staff_issues").insert({ user_id: id, category, place, note, urgent: formData.get("urgent") === "on", photo_url: photo });
  if (error) return { error: error.message };
  revalidatePath("/staff/issues");
  return { ok: true };
}
/** Managers (reports permission) and admins move a problem along: open → in progress → done. */
export async function setIssueStatus(issueId: string, status: "open" | "in_progress" | "done") {
  const { id, access } = await me();
  if (!access.perms.has("reports")) throw new Error("Only managers can update problems.");
  await createServiceRoleClient()
    .from("staff_issues")
    .update({ status, handled_by: status === "open" ? null : id, handled_at: status === "open" ? null : new Date().toISOString() })
    .eq("id", issueId);
  revalidatePath("/staff/issues");
}
