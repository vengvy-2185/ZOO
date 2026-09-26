"use server";

import { revalidatePath } from "next/cache";
import { getVerifiedUserId } from "@/lib/auth/session";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { staffAccess, openShift, leaveUsage } from "@/lib/server/staff";
import { getStaffSettings } from "@/lib/server/staff-settings";

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
  // the admin sets how many times a year each person may ask
  if ((await leaveUsage(id, access.staff.leave_quota)).remaining <= 0) return { error: "quota" };
  const { error } = await createServiceRoleClient().from("staff_leave_requests").insert({ user_id: id, kind, start_date: start, end_date: end, reason });
  if (error) return { error: error.message };
  revalidatePath("/staff/leave");
  revalidatePath("/staff");
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

// ── Supplies ──────────────────────────────────────────────────────────
export type SupplyState = { ok?: boolean; error?: string };
const SECTIONS = ["tickets", "animals", "cleaning", "guide", "general"] as const;
/** Ask for something your section needs (paper rolls, food, trash bags…). */
export async function requestSupply(_prev: SupplyState, formData: FormData): Promise<SupplyState> {
  const { id, access } = await me();
  const section = String(formData.get("section") ?? "general") as (typeof SECTIONS)[number];
  const item = String(formData.get("item") ?? "").trim().slice(0, 80);
  const quantity = Math.round(Number(formData.get("quantity") ?? 1));
  const note = String(formData.get("note") ?? "").trim().slice(0, 300);
  if (!SECTIONS.includes(section) || !item || !Number.isFinite(quantity) || quantity < 1 || quantity > 9999) return { error: "invalid" };
  // your own section's list only (general is for everyone)
  if (section !== "general" && !access.perms.has(section)) return { error: "invalid" };
  const { error } = await createServiceRoleClient().from("staff_supply_requests").insert({ user_id: id, section, item, quantity, urgent: formData.get("urgent") === "on", note: note || null });
  if (error) return { error: error.message };
  revalidatePath("/staff/supplies");
  return { ok: true };
}
/** Managers / admins: approve, deliver or refuse a request. The asker may cancel (delete) their own while it waits. */
export async function setSupplyStatus(requestId: string, status: "pending" | "approved" | "delivered" | "rejected" | "cancel") {
  const { id, access } = await me();
  const db = createServiceRoleClient();
  if (status === "cancel") {
    await db.from("staff_supply_requests").delete().eq("id", requestId).eq("user_id", id).eq("status", "pending");
  } else {
    if (!access.admin && !access.perms.has("reports")) throw new Error("Only managers can do this.");
    await db.from("staff_supply_requests").update({ status, handled_by: status === "pending" ? null : id, handled_at: status === "pending" ? null : new Date().toISOString() }).eq("id", requestId);
  }
  revalidatePath("/staff/supplies");
}

// ── Guides: visitors at each show ─────────────────────────────────────
export async function saveEventCount(ref: string, formData: FormData) {
  const { id, access } = await me();
  if (!access.perms.has("guide")) throw new Error("Not allowed for your position.");
  const visitors = Math.round(Number(formData.get("visitors") ?? ""));
  if (!/^[\w-]{1,64}$/.test(ref) || !Number.isFinite(visitors) || visitors < 0 || visitors > 5000) return;
  const day = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Phnom_Penh" }).format(new Date());
  await createServiceRoleClient().from("staff_event_counts").upsert({ day, ref, visitors, user_id: id, updated_at: new Date().toISOString() });
  revalidatePath("/staff/schedule");
}

const isManager = (access: Awaited<ReturnType<typeof staffAccess>>) => access.admin || access.perms.has("reports");
const localToday = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Phnom_Penh" }).format(new Date());

// ── Tasks given by a manager ──────────────────────────────────────────
export type TaskState = { ok?: boolean; error?: string };
export async function createTask(_prev: TaskState, formData: FormData): Promise<TaskState> {
  const { id, access } = await me();
  if (!isManager(access)) return { error: "Only managers can give tasks." };
  const title = String(formData.get("title") ?? "").trim().slice(0, 120);
  const note = String(formData.get("note") ?? "").trim().slice(0, 500);
  const target = String(formData.get("target") ?? "");
  const priority = String(formData.get("priority") ?? "normal");
  const due = String(formData.get("due") ?? "");
  if (!title || !["low", "normal", "high"].includes(priority)) return { error: "invalid" };
  const section = target.startsWith("s:") ? target.slice(2) : null;
  const person = target.startsWith("u:") ? target.slice(2) : null;
  if (section && !["tickets", "animals", "cleaning", "guide", "reports"].includes(section)) return { error: "invalid" };
  if (person && !/^[0-9a-f-]{36}$/i.test(person)) return { error: "invalid" };
  if (!section && !person) return { error: "invalid" };
  // "HH:MM" today (zoo time) → a real instant
  const due_at = /^\d{2}:\d{2}$/.test(due) ? new Date(`${localToday()}T${due}:00+07:00`).toISOString() : null;
  const { error } = await createServiceRoleClient().from("staff_tasks").insert({ title, note: note || null, assigned_to: person, section, priority, due_at, created_by: id });
  if (error) return { error: error.message };
  revalidatePath("/staff/tasks");
  revalidatePath("/staff");
  return { ok: true };
}
/** Tick a task done (or open again). Yours, your section's, or any if you're a manager. */
export async function toggleStaffTask(taskId: string) {
  const { id, access } = await me();
  const db = createServiceRoleClient();
  const { data: t } = await db.from("staff_tasks").select("status, assigned_to, section").eq("id", taskId).maybeSingle();
  if (!t) return;
  const mine = t.assigned_to === id || (t.section && access.perms.has(t.section as any));
  if (!mine && !isManager(access)) throw new Error("Not your task.");
  const done = t.status !== "done";
  await db.from("staff_tasks").update({ status: done ? "done" : "open", done_by: done ? id : null, done_at: done ? new Date().toISOString() : null }).eq("id", taskId);
  revalidatePath("/staff/tasks");
  revalidatePath("/staff");
}
export async function deleteStaffTask(taskId: string) {
  const { access } = await me();
  if (!isManager(access)) throw new Error("Only managers.");
  await createServiceRoleClient().from("staff_tasks").delete().eq("id", taskId);
  revalidatePath("/staff/tasks");
}

// ── Lost and found ────────────────────────────────────────────────────
export type LostState = { ok?: boolean; error?: string };
const LOST_CATS = ["phone", "bag", "wallet", "keys", "clothes", "child", "other"];
export async function addLostItem(_prev: LostState, formData: FormData): Promise<LostState> {
  const { id } = await me();
  const item = String(formData.get("item") ?? "").trim().slice(0, 100);
  const place = String(formData.get("place") ?? "").trim().slice(0, 100);
  const description = String(formData.get("description") ?? "").trim().slice(0, 400);
  const category = String(formData.get("category") ?? "other");
  if (!item || !place || !LOST_CATS.includes(category)) return { error: "invalid" };
  const { error } = await createServiceRoleClient().from("lost_found").insert({ item, place, description: description || null, category, found_by: id });
  if (error) return { error: error.message };
  revalidatePath("/staff/lost");
  return { ok: true };
}
export async function returnLostItem(itemId: string, formData: FormData) {
  const { id } = await me();
  const owner_name = String(formData.get("owner_name") ?? "").trim().slice(0, 80);
  const owner_contact = String(formData.get("owner_contact") ?? "").trim().slice(0, 80);
  if (!owner_name) return;
  await createServiceRoleClient().from("lost_found").update({ status: "returned", owner_name, owner_contact: owner_contact || null, returned_by: id, returned_at: new Date().toISOString() }).eq("id", itemId).eq("status", "held");
  revalidatePath("/staff/lost");
}

// ── Shift handover notes ──────────────────────────────────────────────
export type HandoverState = { ok?: boolean; error?: string };
export async function addHandover(_prev: HandoverState, formData: FormData): Promise<HandoverState> {
  const { id, access } = await me();
  const section = String(formData.get("section") ?? "general");
  const note = String(formData.get("note") ?? "").trim().slice(0, 600);
  if (!note || !["tickets", "animals", "cleaning", "guide", "general"].includes(section)) return { error: "invalid" };
  if (section !== "general" && !access.perms.has(section as any)) return { error: "invalid" };
  const { error } = await createServiceRoleClient().from("staff_handover").insert({ section, note, user_id: id });
  if (error) return { error: error.message };
  revalidatePath("/staff/handover");
  revalidatePath("/staff");
  return { ok: true };
}

// ── SOS ───────────────────────────────────────────────────────────────
export type SosState = { ok?: boolean; error?: string };
const SOS_KINDS = ["medical", "animal", "security", "fire", "child", "other"];
export async function sendSos(_prev: SosState, formData: FormData): Promise<SosState> {
  const { id } = await me();
  const kind = String(formData.get("kind") ?? "");
  const place = String(formData.get("place") ?? "").trim().slice(0, 100);
  const note = String(formData.get("note") ?? "").trim().slice(0, 300);
  const lat = Number(formData.get("lat"));
  const lng = Number(formData.get("lng"));
  if (!SOS_KINDS.includes(kind)) return { error: "invalid" };
  const db = createServiceRoleClient();
  // one open alert per person at a time (a double tap doesn't send two)
  const { data: open } = await db.from("staff_alerts").select("id").eq("user_id", id).eq("status", "open").gte("created_at", new Date(Date.now() - 120e3).toISOString()).maybeSingle();
  if (open) return { ok: true };
  const { error } = await db.from("staff_alerts").insert({ user_id: id, kind, place: place || null, note: note || null, lat: Number.isFinite(lat) && formData.get("lat") ? lat : null, lng: Number.isFinite(lng) && formData.get("lng") ? lng : null });
  if (error) return { error: error.message };
  revalidatePath("/staff", "layout");
  return { ok: true };
}
export async function resolveSos(alertId: string) {
  const { id, access } = await me();
  const db = createServiceRoleClient();
  const { data: a } = await db.from("staff_alerts").select("user_id").eq("id", alertId).maybeSingle();
  if (!a) return;
  if (!isManager(access) && a.user_id !== id) throw new Error("Only managers or the sender can close this.");
  await db.from("staff_alerts").update({ status: "resolved", resolved_by: id, resolved_at: new Date().toISOString() }).eq("id", alertId);
  revalidatePath("/staff", "layout");
}

// ── Team chat (admins and staff) ──────────────────────────────────────
function canUseChannel(access: Awaited<ReturnType<typeof staffAccess>>, ch: string) {
  if (access.admin || ch === "all") return true;
  if (ch === "managers") return access.perms.has("reports");
  return access.perms.has(ch as any);
}
export type ChatState = { ok?: boolean; error?: string; at?: number };
export async function sendChat(_prev: ChatState, formData: FormData): Promise<ChatState> {
  const { id, access } = await me();
  const channel = String(formData.get("channel") ?? "all");
  const body = String(formData.get("body") ?? "").trim().slice(0, 1000);
  const audio = formData.get("audio");
  const hasAudio = audio instanceof File && audio.size > 0;
  if ((!body && !hasAudio) || !canUseChannel(access, channel)) return { error: "invalid" };
  const db = createServiceRoleClient();
  let audio_url: string | null = null;
  let audio_secs: number | null = null;
  if (hasAudio) {
    const file = audio as File;
    if (file.size > 3 * 1024 * 1024) return { error: "too-long" };
    const type = (file.type || "audio/webm").split(";")[0];
    if (!/^audio\/(webm|ogg|mp4|mpeg|aac|wav|x-m4a)$/.test(type)) return { error: "type" };
    const ext = type === "audio/mp4" || type === "audio/x-m4a" || type === "audio/aac" ? "m4a" : type === "audio/ogg" ? "ogg" : type === "audio/mpeg" ? "mp3" : type === "audio/wav" ? "wav" : "webm";
    const path = `${channel}/${id}/${Date.now()}.${ext}`;
    const { error: upErr } = await db.storage.from("staff-voice").upload(path, file, { contentType: type, upsert: false });
    if (upErr) return { error: upErr.message };
    audio_url = db.storage.from("staff-voice").getPublicUrl(path).data.publicUrl;
    audio_secs = Math.max(1, Math.min(300, Math.round(Number(formData.get("secs")) || 1)));
  }
  const { data: sent, error } = await db.from("staff_messages").insert({ channel, body: body || null, user_id: id, audio_url, audio_secs }).select("created_at").single();
  if (error) return { error: error.message };
  await db.from("staff_chat_reads").upsert({ user_id: id, channel, last_read_at: sent.created_at });
  revalidatePath("/staff/chat");
  return { ok: true, at: Date.now() };
}
export async function deleteChat(messageId: string) {
  const { id, access } = await me();
  const db = createServiceRoleClient();
  let q = db.from("staff_messages").delete().eq("id", messageId);
  if (!access.admin && !access.perms.has("reports")) q = q.eq("user_id", id);
  await q;
  revalidatePath("/staff/chat");
}

// ── Work schedule (roster), shift swaps and cover ─────────────────────
const SHIFTS = ["morning", "afternoon", "full", "off"];
const isDay = (d: string) => /^\d{4}-\d{2}-\d{2}$/.test(d);
/** Manager: save a week grid (cells named s_<userId>_<day>). */
export async function saveRosterWeek(formData: FormData) {
  const { id, access } = await me();
  if (!isManager(access)) throw new Error("Only managers can plan the schedule.");
  const db = createServiceRoleClient();
  const put: any[] = [];
  const del: { user_id: string; day: string }[] = [];
  for (const [k, v] of formData.entries()) {
    const m = /^s_([0-9a-f-]{36})_(\d{4}-\d{2}-\d{2})$/i.exec(k);
    if (!m) continue;
    const val = String(v);
    if (!val) del.push({ user_id: m[1], day: m[2] });
    else if (SHIFTS.includes(val)) put.push({ user_id: m[1], day: m[2], shift: val, created_by: id, updated_at: new Date().toISOString() });
  }
  if (put.length) await db.from("staff_roster").upsert(put, { onConflict: "user_id,day" });
  for (const d of del) await db.from("staff_roster").delete().eq("user_id", d.user_id).eq("day", d.day);
  revalidatePath("/staff/roster");
}
/** Manager: copy the week before into this week (for the people listed). */
export async function copyLastWeek(weekStart: string, userIds: string[]) {
  const { id, access } = await me();
  if (!isManager(access) || !isDay(weekStart)) throw new Error("Only managers.");
  const db = createServiceRoleClient();
  const from = new Date(`${weekStart}T12:00:00Z`);
  from.setUTCDate(from.getUTCDate() - 7);
  const f = from.toISOString().slice(0, 10);
  const { data } = await db.from("staff_roster").select("user_id, day, shift").in("user_id", userIds).gte("day", f).lt("day", weekStart);
  const rows = (data ?? []).map((r: any) => {
    const d = new Date(`${r.day}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() + 7);
    return { user_id: r.user_id, day: d.toISOString().slice(0, 10), shift: r.shift, created_by: id, updated_at: new Date().toISOString() };
  });
  if (rows.length) await db.from("staff_roster").upsert(rows, { onConflict: "user_id,day" });
  revalidatePath("/staff/roster");
}

export type ShiftReqState = { ok?: boolean; error?: string };
/** Ask for someone to cover my shift, or offer to trade it for a colleague's. */
export async function requestShiftChange(_prev: ShiftReqState, formData: FormData): Promise<ShiftReqState> {
  const { id } = await me();
  const kind = String(formData.get("kind") ?? "cover");
  const rosterId = String(formData.get("roster_id") ?? "");
  const swapId = String(formData.get("swap_roster_id") ?? "");
  const reason = String(formData.get("reason") ?? "").trim().slice(0, 300);
  if (!["cover", "swap"].includes(kind) || !reason) return { error: "invalid" };
  const db = createServiceRoleClient();
  const { data: mine } = await db.from("staff_roster").select("id, user_id, day, shift").eq("id", rosterId).maybeSingle();
  if (!mine || mine.user_id !== id || mine.shift === "off" || mine.day < localToday()) return { error: "invalid" };
  if (kind === "swap") {
    const { data: other } = await db.from("staff_roster").select("id, user_id, day").eq("id", swapId).maybeSingle();
    if (!other || other.user_id === id || other.day < localToday()) return { error: "invalid" };
  }
  const { data: dup } = await db.from("staff_shift_requests").select("id").eq("roster_id", rosterId).in("status", ["open", "accepted"]).maybeSingle();
  if (dup) return { error: "exists" };
  const { error } = await db.from("staff_shift_requests").insert({ kind, roster_id: rosterId, swap_roster_id: kind === "swap" ? swapId : null, from_user: id, reason });
  if (error) return { error: error.message };
  revalidatePath("/staff/roster");
  return { ok: true };
}
/** A colleague takes an open cover request, or the asked colleague agrees to a swap. */
export async function acceptShiftRequest(requestId: string) {
  const { id } = await me();
  const db = createServiceRoleClient();
  const { data: r } = await db.from("staff_shift_requests").select("*, roster:roster_id(day, shift), swap:swap_roster_id(user_id)").eq("id", requestId).eq("status", "open").maybeSingle();
  if (!r || r.from_user === id) return;
  if (r.kind === "swap" && (r as any).swap?.user_id !== id) return;
  if (r.kind === "cover") {
    // can't cover while already working that day
    const { data: busy } = await db.from("staff_roster").select("shift").eq("user_id", id).eq("day", (r as any).roster.day).maybeSingle();
    if (busy && busy.shift !== "off") return;
  }
  await db.from("staff_shift_requests").update({ status: "accepted", taken_by: id }).eq("id", requestId).eq("status", "open");
  revalidatePath("/staff/roster");
}
export async function cancelShiftRequest(requestId: string) {
  const { id } = await me();
  await createServiceRoleClient().from("staff_shift_requests").update({ status: "cancelled" }).eq("id", requestId).eq("from_user", id).in("status", ["open", "accepted"]);
  revalidatePath("/staff/roster");
}
/** Manager approves (the schedule changes) or refuses. */
export async function decideShiftRequest(requestId: string, approve: boolean) {
  const { id, access } = await me();
  if (!isManager(access)) throw new Error("Only managers.");
  const db = createServiceRoleClient();
  const { data: r } = await db.from("staff_shift_requests").select("*").eq("id", requestId).in("status", ["open", "accepted"]).maybeSingle();
  if (!r) return;
  if (approve) {
    if (!r.taken_by) return;
    const { data: a } = await db.from("staff_roster").select("*").eq("id", r.roster_id).maybeSingle();
    if (!a) return;
    if (r.kind === "cover") {
      // the helper's "off" (if any) that day goes, the shift becomes theirs
      await db.from("staff_roster").delete().eq("user_id", r.taken_by).eq("day", a.day);
      await db.from("staff_roster").update({ user_id: r.taken_by, note: "cover", updated_at: new Date().toISOString() }).eq("id", a.id);
    } else {
      const { data: b } = await db.from("staff_roster").select("*").eq("id", r.swap_roster_id).maybeSingle();
      if (!b) return;
      if (a.day === b.day) {
        await db.from("staff_roster").update({ shift: b.shift, note: "swap" }).eq("id", a.id);
        await db.from("staff_roster").update({ shift: a.shift, note: "swap" }).eq("id", b.id);
      } else {
        // clear anything in the way, then trade
        await db.from("staff_roster").delete().eq("user_id", a.user_id).eq("day", b.day);
        await db.from("staff_roster").delete().eq("user_id", b.user_id).eq("day", a.day);
        await db.from("staff_roster").update({ user_id: b.user_id, note: "swap" }).eq("id", a.id);
        await db.from("staff_roster").update({ user_id: a.user_id, note: "swap" }).eq("id", b.id);
      }
    }
  }
  await db.from("staff_shift_requests").update({ status: approve ? "approved" : "rejected", decided_by: id, decided_at: new Date().toISOString() }).eq("id", requestId);
  revalidatePath("/staff/roster");
}

/**
 * Manager: plan a week automatically. Staff are taken from each section by
 * their position (managers are left out), zoo rest days become "off",
 * mornings and afternoons alternate so both are always covered, and in
 * bigger teams everyone gets one extra day off in turn. Only empty boxes are
 * filled unless `replace` is set.
 */
export async function autoFillWeek(weekStart: string, section: string | null, replace: boolean) {
  const { id, access } = await me();
  if (!isManager(access) || !isDay(weekStart)) throw new Error("Only managers.");
  const db = createServiceRoleClient();
  const [{ data: staff }, { data: settings }] = await Promise.all([
    db.from("staff_members").select("user_id, full_name, position:staff_positions(permissions)").eq("status", "active").order("full_name"),
    db.from("staff_attendance_settings").select("rest_days").eq("id", 1).maybeSingle(),
  ]);
  const rest: number[] = (settings?.rest_days ?? []) as number[];
  const ORDER = ["tickets", "animals", "cleaning", "guide"];
  const primary = (perms: string[]) => ORDER.find((p) => perms.includes(p)) ?? null;
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(`${weekStart}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() + i);
    return { day: d.toISOString().slice(0, 10), weekday: d.getUTCDay() };
  });
  const weekNo = Math.floor(Date.parse(`${weekStart}T12:00:00Z`) / (7 * 864e5));
  const rows: any[] = [];
  for (const sec of section ? [section] : ORDER) {
    const team = (staff ?? []).filter((p: any) => {
      const perms: string[] = p.position?.permissions ?? [];
      return !perms.includes("reports") && primary(perms) === sec;
    });
    const n = team.length;
    team.forEach((p: any, i: number) => {
      days.forEach(({ day, weekday }, d) => {
        let shift: string;
        if (rest.includes(weekday)) shift = "off";
        else if (n >= 3 && d === (i * 2 + weekNo) % 7) shift = "off"; // one day off each, in turn
        else if (n === 1) shift = "full";
        else shift = (i + d) % 2 === 0 ? "morning" : "afternoon";
        rows.push({ user_id: p.user_id, day, shift, created_by: id, updated_at: new Date().toISOString() });
      });
    });
  }
  if (!rows.length) return;
  let toSave = rows;
  if (!replace) {
    const { data: existing } = await db.from("staff_roster").select("user_id, day").in("user_id", [...new Set(rows.map((r) => r.user_id))]).gte("day", days[0].day).lte("day", days[6].day);
    const have = new Set((existing ?? []).map((e: any) => `${e.user_id}_${e.day}`));
    toSave = rows.filter((r) => !have.has(`${r.user_id}_${r.day}`));
  }
  if (toSave.length) await db.from("staff_roster").upsert(toSave, { onConflict: "user_id,day" });
  revalidatePath("/staff/roster");
}
