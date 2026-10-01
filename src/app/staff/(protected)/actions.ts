"use server";

import { revalidatePath } from "next/cache";
import { chatDir, dmKey, inDm, isDm } from "@/lib/chat-dm";
import { getVerifiedUserId } from "@/lib/auth/session";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { staffAccess, openShift, leaveUsage } from "@/lib/server/staff";
import { getStaffSettings } from "@/lib/server/staff-settings";
import { planWeek, mondayOf, ROSTER_SECTIONS, type RosterSection } from "@/lib/server/roster";
import { notify, tg } from "@/lib/server/telegram";
import { announce, announceChanges, snapshot } from "@/lib/server/roster-notice";
import { sendPush, staffIds, managerIds } from "@/lib/server/push";
import { waitUntil } from "@vercel/functions";

import { audit } from "@/lib/server/audit";
// Staff actions run with the service role, so each one first checks who is
// signed in and what their position allows.

async function me() {
  const id = getVerifiedUserId();
  if (!id) throw new Error("Please sign in.");
  const access = await staffAccess(id);
  if (!access.ok) throw new Error("Not allowed.");
  return { id, access };
}

/** The name shown in Telegram messages. */
const who = (access: Awaited<ReturnType<typeof staffAccess>>) => (access.staff ? `${access.staff.full_name_km || access.staff.full_name} (${access.staff.staff_no})` : "Admin");

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
  const KIND_KM: Record<string, string> = { annual: "ច្បាប់ប្រចាំឆ្នាំ", sick: "ឈឺ", personal: "ផ្ទាល់ខ្លួន", other: "ផ្សេងៗ" };
  await notify("leave", `📝 <b>សំណើច្បាប់ឈប់ថ្មី</b>
👤 ${tg(who(access))}
📅 ${start}${end !== start ? ` → ${end}` : ""} · ${KIND_KM[kind]}
💬 ${tg(reason)}`);
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
  await notify("issue", `${formData.get("urgent") === "on" ? "🚨 <b>បញ្ហាបន្ទាន់</b>" : "🔧 <b>បញ្ហាថ្មី</b>"}
📍 ${tg(place)}
💬 ${tg(note)}${photo ? `
🖼 <a href="${tg(photo)}">រូបថត</a>` : ""}
👤 ${tg(who((await staffAccess(id))))}`);
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
  if (formData.get("urgent") === "on") await notify("supply", `📦 <b>សុំសម្ភារៈបន្ទាន់</b>
${tg(item)} × ${quantity}${note ? `
💬 ${tg(note)}` : ""}
👤 ${tg(who(access))}`);
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
/** Who may change the schedule: the admin, and positions the admin gave "change the schedule". */
const canPlan = (access: Awaited<ReturnType<typeof staffAccess>>) => access.admin || access.perms.has("roster");
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
  const SOS_KM: Record<string, string> = { medical: "សង្គ្រោះបន្ទាន់ / របួស", animal: "សត្វរត់ចេញ / គ្រោះថ្នាក់សត្វ", security: "សន្តិសុខ", fire: "អគ្គិភ័យ", child: "កុមារបាត់", other: "ផ្សេងៗ" };
  const hasGps = Number.isFinite(lat) && Number.isFinite(lng) && formData.get("lat");
  await sendPush([...(await staffIds()), ...(await managerIds())].filter((u) => u !== id), { title: `🆘 SOS · ${SOS_KM[kind]}`, body: `${who(await staffAccess(id))}${place ? ` · ${place}` : ""}${note ? ` · ${note}` : ""}`, url: "/staff/sos", tag: "sos", urgent: true });
  await notify("sos", `🆘 <b>SOS · ${SOS_KM[kind]}</b>
👤 ${tg(who((await staffAccess(id))))}${place ? `
📍 ${tg(place)}` : ""}${note ? `
💬 ${tg(note)}` : ""}${hasGps ? `
🗺 <a href="https://maps.google.com/?q=${lat},${lng}">ទីតាំងលើផែនទី</a>` : ""}`);
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
function canUseChannel(access: Awaited<ReturnType<typeof staffAccess>>, ch: string, userId: string) {
  // a private chat: only its two people (not even the admin)
  if (isDm(ch)) return inDm(ch, userId);
  if (access.admin || ch === "all") return true;
  if (ch === "managers") return access.perms.has("reports");
  return access.perms.has(ch as any);
}
export type ChatState = { ok?: boolean; error?: string; at?: number; msg?: any };
export async function sendChat(_prev: ChatState, formData: FormData): Promise<ChatState> {
  const { id, access } = await me();
  const channel = String(formData.get("channel") ?? "all");
  const body = String(formData.get("body") ?? "").trim().slice(0, 1000);
  const audio = formData.get("audio");
  const hasAudio = audio instanceof File && audio.size > 0;
  if (!canUseChannel(access, channel, id)) return { error: "invalid" };
  const db = createServiceRoleClient();
  let audio_url: string | null = null;
  let audio_secs: number | null = null;
  if (hasAudio) {
    const file = audio as File;
    if (file.size > 3 * 1024 * 1024) return { error: "too-long" };
    const type = (file.type || "audio/webm").split(";")[0];
    if (!/^audio\/(webm|ogg|mp4|mpeg|aac|wav|x-m4a)$/.test(type)) return { error: "type" };
    const ext = type === "audio/mp4" || type === "audio/x-m4a" || type === "audio/aac" ? "m4a" : type === "audio/ogg" ? "ogg" : type === "audio/mpeg" ? "mp3" : type === "audio/wav" ? "wav" : "webm";
    const path = `${chatDir(channel)}/${id}/${Date.now()}.${ext}`;
    const { error: upErr } = await db.storage.from("staff-voice").upload(path, file, { contentType: type, upsert: false });
    if (upErr) return { error: upErr.message };
    audio_url = db.storage.from("staff-voice").getPublicUrl(path).data.publicUrl;
    audio_secs = Math.max(1, Math.min(300, Math.round(Number(formData.get("secs")) || 1)));
  }
  // photos / files were uploaded straight to storage; only paths in my own folder are accepted
  let files: ChatFile[] | null = null;
  try {
    const raw = JSON.parse(String(formData.get("files") ?? "null"));
    if (Array.isArray(raw) && raw.length) {
      files = raw.slice(0, 10).map((f: any) => {
        const path = String(f.path ?? "");
        if (!path.startsWith(`${chatDir(channel)}/${id}/`) || path.includes("..")) throw new Error("path");
        return {
          url: db.storage.from("staff-files").getPublicUrl(path).data.publicUrl,
          name: String(f.name ?? "file").slice(0, 120),
          type: String(f.type ?? "application/octet-stream").slice(0, 100),
          size: Math.max(0, Number(f.size) || 0),
          w: Number(f.w) || undefined,
          h: Number(f.h) || undefined,
        };
      });
    }
  } catch {
    return { error: "invalid" };
  }
  // a shared location
  const lat = Number(formData.get("lat"));
  const lng = Number(formData.get("lng"));
  const isLocation = formData.get("lat") !== null && Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
  // an answer to another message in the same room
  let reply_to: string | null = String(formData.get("reply_to") ?? "") || null;
  if (reply_to) {
    const { data: r } = await db.from("staff_messages").select("channel").eq("id", reply_to).maybeSingle();
    if (r?.channel !== channel) reply_to = null;
  }
  if (!body && !hasAudio && !files && !isLocation) return { error: "invalid" };
  const { data: sent, error } = await db
    .from("staff_messages")
    .insert({ channel, body: body || null, user_id: id, audio_url, audio_secs, files, reply_to, kind: isLocation ? "location" : "text", meta: isLocation ? { lat, lng, acc: Math.round(Number(formData.get("acc")) || 0) } : null })
    .select("*")
    .single();
  if (error) return { error: error.message };
  await db.from("staff_chat_reads").upsert({ user_id: id, channel, last_read_at: sent.created_at });
  const images = (files ?? []).filter((f) => f.type.startsWith("image/")).length;
  const what = body || (isLocation ? "📍 ចែករំលែកទីតាំង" : hasAudio ? "🎤 សារសំឡេង" : images ? `📷 រូបភាព ${images > 1 ? images : ""}`.trim() : `📎 ${files?.[0]?.name ?? "ឯកសារ"}`);
  // the message is back on the sender's screen at once; phones are told in the background
  waitUntil(pushChat(channel, id, access, what).catch(() => {}));
  return { ok: true, at: Date.now(), msg: sent };
}

/** I read this room up to here ("seen" for the others). Only moves forward. */
export async function markChatRead(channel: string, upTo: string) {
  const { id, access } = await me();
  if (!canUseChannel(access, channel, id) || !Number.isFinite(Date.parse(upTo))) return;
  const db = createServiceRoleClient();
  const { data: cur } = await db.from("staff_chat_reads").select("last_read_at").eq("user_id", id).eq("channel", channel).maybeSingle();
  if (cur && Date.parse(cur.last_read_at) >= Date.parse(upTo)) return;
  await db.from("staff_chat_reads").upsert({ user_id: id, channel, last_read_at: upTo });
}

/** Older messages of a room (scrolling up), with their reactions and the messages they answer. */
export async function olderChat(channel: string, before: string) {
  const { id, access } = await me();
  if (!canUseChannel(access, channel, id) || !Number.isFinite(Date.parse(before))) return { msgs: [], reactions: {}, replies: {} };
  const db = createServiceRoleClient();
  const { data: rows } = await db.from("staff_messages").select("*").eq("channel", channel).lt("created_at", before).order("created_at", { ascending: false }).limit(50);
  const msgs = (rows ?? []).reverse();
  const ids = msgs.map((m: any) => m.id);
  const replyIds = [...new Set(msgs.map((m: any) => m.reply_to).filter(Boolean))] as string[];
  const [{ data: reacts }, { data: replyRows }] = await Promise.all([
    ids.length ? db.from("staff_message_reactions").select("message_id, user_id, emoji").in("message_id", ids) : Promise.resolve({ data: [] as any[] }),
    replyIds.length ? db.from("staff_messages").select("id, user_id, body, kind, files, audio_url, meta").in("id", replyIds) : Promise.resolve({ data: [] as any[] }),
  ]);
  const reactions: Record<string, { user_id: string; emoji: string }[]> = {};
  for (const r of reacts ?? []) (reactions[r.message_id] ??= []).push({ user_id: r.user_id, emoji: r.emoji });
  const replies: Record<string, any> = {};
  for (const r of replyRows ?? []) replies[r.id] = r;
  return { msgs, reactions, replies, more: msgs.length === 50 };
}

export type ChatFile = { url: string; name: string; type: string; size: number; w?: number; h?: number };
const MAX_FILE = 25 * 1024 * 1024;
/** A one-time upload slot so a photo / file goes straight from the phone to storage (not through this server). */
export async function chatUploadSlot(channel: string, name: string, size: number): Promise<{ path?: string; token?: string; error?: string }> {
  const { id, access } = await me();
  if (!canUseChannel(access, channel, id)) return { error: "invalid" };
  if (!(size > 0) || size > MAX_FILE) return { error: "too-big" };
  const safe = (name.normalize("NFKD").replace(/[^\w.\-]+/g, "_").replace(/_+/g, "_").slice(-80) || "file").replace(/^\.+/, "");
  const path = `${chatDir(channel)}/${id}/${crypto.randomUUID()}/${safe}`;
  const { data, error } = await createServiceRoleClient().storage.from("staff-files").createSignedUploadUrl(path);
  if (error || !data) return { error: error?.message ?? "upload" };
  return { path, token: data.token };
}

const REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🙏"];
/** React to a message (the same emoji again takes it back). */
export async function reactChat(messageId: string, emoji: string) {
  const { id, access } = await me();
  if (!REACTIONS.includes(emoji)) return;
  const db = createServiceRoleClient();
  const { data: m } = await db.from("staff_messages").select("channel").eq("id", messageId).maybeSingle();
  if (!m || !canUseChannel(access, m.channel, id)) return;
  const { data: cur } = await db.from("staff_message_reactions").select("emoji").eq("message_id", messageId).eq("user_id", id).maybeSingle();
  if (cur?.emoji === emoji) await db.from("staff_message_reactions").delete().eq("message_id", messageId).eq("user_id", id);
  else await db.from("staff_message_reactions").upsert({ message_id: messageId, user_id: id, emoji, created_at: new Date().toISOString() });
}

// ── Calls (voice / video) in a chat room ──────────────────────────────
/** Start a call in a room (or join the one already going on there), or call one person. */
export async function startCall(channel: string, video: boolean, toUser?: string): Promise<{ id?: string; error?: string }> {
  const { id, access } = await me();
  const db = createServiceRoleClient();
  if (toUser) {
    // one person: anyone on the team (staff or admin), not myself
    if (toUser === id || !(await staffAccess(toUser)).ok) return { error: "invalid" };
    const { data: call, error } = await db.from("staff_calls").insert({ channel: "all", started_by: id, video, to_user: toUser }).select("id").single();
    if (error || !call) return { error: error?.message ?? "call" };
    // the call shows in your private chat with them (and makes it, the first time)
    await db.from("staff_messages").insert({ channel: dmKey(id, toUser), user_id: id, kind: "call", meta: { call_id: call.id, video } });
    await sendPush([toUser], { title: `${video ? "📹" : "📞"} ${who(access)} កំពុងហៅអ្នក`, body: video ? "ហៅជាវីដេអូ — ចុចដើម្បីឆ្លើយ" : "ហៅជាសំឡេង — ចុចដើម្បីឆ្លើយ", url: `/staff/call/${call.id}`, tag: `call-${call.id}`, urgent: true });
    return { id: call.id };
  }
  if (!canUseChannel(access, channel, id)) return { error: "invalid" };
  const { data: open } = await db.from("staff_calls").select("id").eq("channel", channel).is("to_user", null).is("ended_at", null).gte("alive_at", new Date(Date.now() - 60e3).toISOString()).order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (open) return { id: open.id };
  const { data: call, error } = await db.from("staff_calls").insert({ channel, started_by: id, video }).select("id").single();
  if (error || !call) return { error: error?.message ?? "call" };
  await db.from("staff_messages").insert({ channel, user_id: id, kind: "call", meta: { call_id: call.id, video } });
  const ROOM: Record<string, string> = { all: "ទាំងអស់គ្នា", managers: "អ្នកគ្រប់គ្រង", tickets: "សំបុត្រ", animals: "ថែសត្វ", guide: "មគ្គុទ្ទេសក៍", cleaning: "សម្អាត", hr: "ក្រុម HR" };
  await sendPush((await chatMembers(channel)).filter((u) => u !== id), {
    title: `${video ? "📹" : "📞"} ${who(access)} កំពុងហៅ`,
    body: `${video ? "ហៅជាវីដេអូ" : "ហៅជាសំឡេង"} · ${isDm(channel) ? "សារផ្ទាល់" : ROOM[channel] ?? channel} — ចុចដើម្បីចូលរួម`,
    url: `/staff/call/${call.id}`,
    tag: `call-${call.id}`,
    urgent: true,
  });
  revalidatePath("/staff/chat");
  return { id: call.id };
}
/** The last person leaving ends the call. */
export async function endCall(callId: string) {
  const { access } = await me();
  const db = createServiceRoleClient();
  const { data: c } = await db.from("staff_calls").select("channel, to_user, started_by").eq("id", callId).maybeSingle();
  const { id } = await me();
  if (!c || (c.to_user ? ![c.to_user, c.started_by].includes(id) : !canUseChannel(access, c.channel, id))) return;
  await db.from("staff_calls").update({ ended_at: new Date().toISOString() }).eq("id", callId).is("ended_at", null);
  revalidatePath("/staff/chat");
}

/** Everyone who can read a room. */
async function chatMembers(channel: string) {
  if (isDm(channel)) return channel.split(":").slice(1);
  // the HR room: HR staff and admins
  if (channel === "hr") return (await import("@/lib/server/hr")).hrTeam();
  return channel === "all" ? [...(await staffIds()), ...(await managerIds())] : channel === "managers" ? await managerIds() : [...(await staffIds(channel)), ...(await managerIds())];
}
export async function deleteChat(messageId: string) {
  const { id, access } = await me();
  const db = createServiceRoleClient();
  let q = db.from("staff_messages").delete().eq("id", messageId);
  const { data: m } = await db.from("staff_messages").select("channel").eq("id", messageId).maybeSingle();
  if ((m && isDm(m.channel)) || (!access.admin && !access.perms.has("reports"))) q = q.eq("user_id", id);
  await q;
}

// ── Work schedule (roster), shift swaps and cover ─────────────────────
const SHIFTS = ["morning", "afternoon", "full", "off"];
const isDay = (d: string) => /^\d{4}-\d{2}-\d{2}$/.test(d);
/** Manager: save a week grid (cells named s_<userId>_<day>). */
export async function saveRosterWeek(formData: FormData) {
  const { id, access } = await me();
  await audit("roster.edit", "staff_roster", null, { boxes: [...formData.keys()].filter((k) => k.startsWith("s_")).length });
  if (!canPlan(access)) throw new Error("Only people allowed to change the schedule.");
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
  const { data: was } = put.length + del.length ? await db.from("staff_roster").select("user_id, day, shift").in("user_id", [...new Set([...put, ...del].map((x) => x.user_id))]).in("day", [...new Set([...put, ...del].map((x) => x.day))]) : { data: [] as any[] };
  if (put.length) await db.from("staff_roster").upsert(put, { onConflict: "user_id,day" });
  for (const d of del) await db.from("staff_roster").delete().eq("user_id", d.user_id).eq("day", d.day);
  // tell the team which days changed
  const before = new Map((was ?? []).map((r: any) => [`${r.user_id}_${r.day}`, r.shift]));
  const changed = [...put.filter((x) => before.get(`${x.user_id}_${x.day}`) !== x.shift), ...del.filter((x) => before.has(`${x.user_id}_${x.day}`))].map((x) => ({ user: x.user_id, day: x.day }));
  if (changed.length) await announce(changed, id);
  revalidatePath("/staff/roster");
}
/** Manager: copy the week before into this week (for the people listed). */
/**
 * Manager: repeat last week's pattern this week (same weekday → same shift).
 * Only the real pattern is copied: days off that came from approved leave,
 * a public holiday or a cover/swap last week are not. This week's own
 * holidays and leave win, and any box left empty is then planned by the rules.
 */
export async function copyLastWeek(weekStart: string, userIds: string[]) {
  const { id, access } = await me();
  await audit("roster.copy", "staff_roster", null, { weekStart });
  if (!canPlan(access) || !isDay(weekStart)) throw new Error("Only managers.");
  const db = createServiceRoleClient();
  const shift = (d: string, n: number) => {
    const t = new Date(`${d}T12:00:00Z`);
    t.setUTCDate(t.getUTCDate() + n);
    return t.toISOString().slice(0, 10);
  };
  const f = shift(weekStart, -7);
  const end = shift(weekStart, 6);
  const [{ data }, { data: hol }, { data: leaves }] = await Promise.all([
    db.from("staff_roster").select("user_id, day, shift, note").in("user_id", userIds).gte("day", f).lt("day", weekStart),
    db.from("staff_holidays").select("day").gte("day", f).lte("day", end),
    db.from("staff_leave_requests").select("user_id, start_date, end_date").eq("status", "approved").lte("start_date", end).gte("end_date", f),
  ]);
  const holidays = new Set((hol ?? []).map((h: any) => h.day));
  const onLeave = (u: string, d: string) => (leaves ?? []).some((l: any) => l.user_id === u && l.start_date <= d && l.end_date >= d);
  const rows = (data ?? [])
    // skip last week's leave, holiday and cover/swap days
    .filter((r: any) => !r.note && !holidays.has(r.day) && !onLeave(r.user_id, r.day))
    .map((r: any) => ({ user_id: r.user_id, day: shift(r.day, 7), shift: r.shift }))
    // this week's holidays and leave win
    .filter((r) => !holidays.has(r.day) && !onLeave(r.user_id, r.day))
    .map((r) => ({ ...r, note: null, created_by: id, updated_at: new Date().toISOString() }));
  const before = await snapshot(weekStart, end);
  // this week becomes last week's pattern (cover/swap/leave boxes stay)
  await db.from("staff_roster").delete().in("user_id", userIds).gte("day", weekStart).lte("day", end).is("note", null);
  if (rows.length) await db.from("staff_roster").upsert(rows, { onConflict: "user_id,day" });
  // the boxes that were left out (holidays, leave, new people) are planned by the rules
  await planWeek(weekStart, { by: id });
  await announceChanges(before, await snapshot(weekStart, end), id);
  revalidatePath("/staff/roster");
}

export type ShiftReqState = { ok?: boolean; error?: string };
/** Ask for someone to cover my shift, or offer to trade it for a colleague's. */
export async function requestShiftChange(_prev: ShiftReqState, formData: FormData): Promise<ShiftReqState> {
  const { id, access } = await me();
  const kind = String(formData.get("kind") ?? "cover");
  const rosterId = String(formData.get("roster_id") ?? "");
  const swapId = String(formData.get("swap_roster_id") ?? "");
  const reason = String(formData.get("reason") ?? "").trim().slice(0, 300);
  if (!["cover", "swap", "dayoff"].includes(kind) || !reason) return { error: "invalid" };
  const db = createServiceRoleClient();
  const { data: mine } = await db.from("staff_roster").select("id, user_id, day, shift, note").eq("id", rosterId).maybeSingle();
  // a cover or swap can be for today (sick this morning); a day-off swap is for a later day
  if (!mine || mine.user_id !== id || mine.day < localToday() || (kind === "dayoff" && mine.day === localToday())) return { error: "invalid" };
  if (kind === "dayoff" ? mine.shift !== "off" || mine.note : mine.shift === "off") return { error: "invalid" };
  let otherUser: string | null = null;
  if (kind !== "cover") {
    const { data: other } = await db.from("staff_roster").select("id, user_id, day, shift, note").eq("id", swapId).maybeSingle();
    if (!other || other.user_id === id || other.day < localToday() || (kind === "dayoff" && other.day === localToday())) return { error: "invalid" };
    otherUser = other.user_id;
    if (kind === "dayoff") {
      // a plain day off each, on different days, and each works on the other's day off
      if (other.shift !== "off" || other.note || other.day === mine.day) return { error: "invalid" };
      const { data: cross } = await db.from("staff_roster").select("user_id, day, shift").in("user_id", [id, other.user_id]).in("day", [mine.day, other.day]);
      const on = (u: string, d: string) => (cross ?? []).find((x: any) => x.user_id === u && x.day === d)?.shift;
      const theyWorkMine = ["morning", "afternoon", "full"].includes(on(other.user_id, mine.day) ?? "");
      const iWorkTheirs = ["morning", "afternoon", "full"].includes(on(id, other.day) ?? "");
      if (!theyWorkMine || !iWorkTheirs) return { error: "dayoff" };
    }
  }
  const { data: dup } = await db.from("staff_shift_requests").select("id").eq("roster_id", rosterId).in("status", ["open", "accepted"]).maybeSingle();
  if (dup) return { error: "exists" };
  const { error } = await db.from("staff_shift_requests").insert({ kind, roster_id: rosterId, swap_roster_id: kind === "cover" ? null : swapId, from_user: id, reason });
  if (error) return { error: error.message };
  // phones: a cover goes to the team; a swap / day-off swap to the colleague asked
  const name = who(access);
  const dayTxt = new Intl.DateTimeFormat("km-KH", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC", numberingSystem: "latn" }).format(new Date(`${mine.day}T12:00:00Z`));
  if (kind === "cover") {
    const { teamOf } = await import("@/lib/server/roster");
    const team = teamOf((access.staff as any)?.position?.permissions ?? []);
    await sendPush((await staffIds(team)).filter((u) => u !== id), { title: "🆘 រកអ្នកជំនួសវេន", body: `${name} · ${dayTxt} · «${reason}»`, url: "/staff/roster", tag: `cover-${rosterId}` });
  } else if (otherUser) {
    await sendPush([otherUser], { title: kind === "dayoff" ? "📅 សំណើដូរថ្ងៃឈប់" : "🔁 សំណើដូរវេន", body: `${name} · ${dayTxt} · «${reason}»`, url: "/staff/roster", tag: `swap-${rosterId}` });
  }
  revalidatePath("/staff/roster");
  return { ok: true };
}
/** A colleague takes an open cover request, or the asked colleague agrees to a swap. */
export async function acceptShiftRequest(requestId: string) {
  const { id, access } = await me();
  // only people on the staff list can cover (an admin account has no shifts or pay)
  if (!access.staff) throw new Error("Only staff members can cover a shift.");
  const db = createServiceRoleClient();
  const { data: r } = await db.from("staff_shift_requests").select("*, roster:roster_id(day, shift), swap:swap_roster_id(user_id)").eq("id", requestId).eq("status", "open").maybeSingle();
  if (!r || r.from_user === id) return;
  if ((r.kind === "swap" || r.kind === "dayoff") && (r as any).swap?.user_id !== id) return;
  if (r.kind === "cover") {
    // not for someone who already works those hours that day (the other half is fine: it becomes a full day)
    const { data: busy } = await db.from("staff_roster").select("shift").eq("user_id", id).eq("day", (r as any).roster.day).maybeSingle();
    const { coverFit } = await import("@/lib/roster-ui");
    if (coverFit(busy?.shift, (r as any).roster.shift) === "clash") throw new Error("Same hours as your own shift.");
  }
  await db.from("staff_shift_requests").update({ status: "accepted", taken_by: id }).eq("id", requestId).eq("status", "open");
  await sendPush([r.from_user], { title: "✅ មានអ្នកទទួលសំណើរបស់អ្នក", body: `${who(access)} · រង់ចាំអ្នកគ្រប់គ្រងអនុម័ត`, url: "/staff/roster", tag: `req-${requestId}` });
  await sendPush(await managerIds(), { title: "⏳ សំណើរង់ចាំអនុម័ត", body: `${who(access)} ${r.kind === "cover" ? "ជំនួស" : r.kind === "dayoff" ? "ដូរថ្ងៃឈប់ជាមួយ" : "ដូរវេនជាមួយ"} មិត្តរួមការងារ`, url: "/staff/roster", tag: `approve-${requestId}` });
  revalidatePath("/staff/roster");
}
/** The helper changes their mind before a manager decides: the request is open again. */
export async function withdrawCover(requestId: string) {
  const { id } = await me();
  await createServiceRoleClient().from("staff_shift_requests").update({ status: "open", taken_by: null }).eq("id", requestId).eq("taken_by", id).eq("status", "accepted");
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
  await audit(approve ? "roster.approve" : "roster.refuse", "staff_shift_requests", requestId);
  if (!canPlan(access)) throw new Error("Only managers.");
  const db = createServiceRoleClient();
  const { data: r } = await db.from("staff_shift_requests").select("*").eq("id", requestId).in("status", ["open", "accepted"]).maybeSingle();
  if (!r) return;
  if (approve) {
    if (!r.taken_by) return;
    const { data: a } = await db.from("staff_roster").select("*").eq("id", r.roster_id).maybeSingle();
    if (!a) return;
    if (r.kind === "dayoff") {
      const { data: b } = await db.from("staff_roster").select("*").eq("id", r.swap_roster_id).maybeSingle();
      if (!b) return;
      for (const day of [a.day, b.day]) {
        const { data: rows } = await db.from("staff_roster").select("id, user_id, shift").in("user_id", [r.from_user, r.taken_by]).eq("day", day);
        const x = (rows ?? []).find((q: any) => q.user_id === r.from_user);
        const y = (rows ?? []).find((q: any) => q.user_id === r.taken_by);
        if (!x || !y) return;
        await db.from("staff_roster").update({ shift: y.shift, note: "swap", updated_at: new Date().toISOString() }).eq("id", x.id);
        await db.from("staff_roster").update({ shift: x.shift, note: "swap", updated_at: new Date().toISOString() }).eq("id", y.id);
      }
      await announce([{ user: r.from_user, day: a.day }, { user: r.taken_by, day: b.day }], id, "ដូរថ្ងៃឈប់");
    } else if (r.kind === "cover") {
      // schedule, attendance and pay follow (see lib/server/cover.ts)
      const { applyCover } = await import("@/lib/server/cover");
      if (!(await applyCover(r.id, r.roster_id, r.from_user, r.taken_by, id))) return;
      await announce([{ user: r.from_user, day: a.day }], id, "មានអ្នកជំនួស");
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
  if (approve && r.kind === "swap") {
    const { data: b2 } = await db.from("staff_roster").select("day").eq("id", r.swap_roster_id).maybeSingle();
    const { data: a2 } = await db.from("staff_roster").select("day").eq("id", r.roster_id).maybeSingle();
    await announce([a2 && { user: r.from_user, day: a2.day }, b2 && { user: r.taken_by, day: b2.day }].filter(Boolean) as { user: string; day: string }[], id, "ដូរវេន");
  }
  await db.from("staff_shift_requests").update({ status: approve ? "approved" : "rejected", decided_by: id, decided_at: new Date().toISOString() }).eq("id", requestId);
  await sendPush([r.from_user, r.taken_by].filter(Boolean), { title: approve ? "✅ សំណើត្រូវបានអនុម័ត" : "❌ សំណើមិនត្រូវបានអនុម័ត", body: approve ? "កាលវិភាគត្រូវបានកែតាមសំណើ។ សូមពិនិត្យវេនរបស់អ្នក។" : "កាលវិភាគនៅដដែល។", url: "/staff/roster", tag: `req-${requestId}` });
  revalidatePath("/staff/roster");
}

/** Manager: plan a week by the rules (fill empty boxes, or re-plan everything). */
export async function autoFillWeek(weekStart: string, section: string | null, replace: boolean) {
  const { id, access } = await me();
  await audit("roster.plan", "staff_roster", null, { weekStart, section, replace });
  if (!canPlan(access) || !isDay(weekStart)) throw new Error("Only managers.");
  // past days stay as they were (attendance was already counted on them)
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Phnom_Penh" }).format(new Date());
  const weekEnd = (() => {
    const t = new Date(`${weekStart}T12:00:00Z`);
    t.setUTCDate(t.getUTCDate() + 6);
    return t.toISOString().slice(0, 10);
  })();
  const before = await snapshot(weekStart, weekEnd);
  await planWeek(weekStart, { section: (ROSTER_SECTIONS as string[]).includes(section ?? "") ? (section as RosterSection) : null, replace, by: id, from: today });
  await announceChanges(before, await snapshot(weekStart, weekEnd), id);
  revalidatePath("/staff/roster");
}

/** Manager: the rules the automatic schedule follows. */
export async function saveRosterRules(formData: FormData) {
  const { id, access } = await me();
  await audit("roster.rules", "staff_settings");
  if (!canPlan(access)) throw new Error("Only managers.");
  const num = (k: string, d: number, max: number) => {
    const v = Number(formData.get(k));
    return Number.isFinite(v) && String(formData.get(k) ?? "") !== "" ? Math.max(0, Math.min(max, Math.round(v))) : d;
  };
  const need = Object.fromEntries(ROSTER_SECTIONS.map((sec) => [sec, { am: num(`am_${sec}`, 1, 50), pm: num(`pm_${sec}`, 1, 50) }]));
  const roster = { auto: formData.get("auto") === "on", allow_full: formData.get("allow_full") === "on", days_off: num("days_off", 1, 6), need };
  const db = createServiceRoleClient();
  const { data } = await db.from("staff_settings").select("data").eq("id", 1).maybeSingle();
  await db.from("staff_settings").upsert({ id: 1, data: { ...((data?.data as object) ?? {}), roster }, updated_at: new Date().toISOString() });
  // new rules apply straight away: this week (from today) and next week are planned again
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Phnom_Penh" }).format(new Date());
  const monday = mondayOf(today);
  const next = new Date(`${monday}T12:00:00Z`);
  next.setUTCDate(next.getUTCDate() + 7);
  const end = new Date(next.getTime() + 6 * 864e5).toISOString().slice(0, 10);
  const before = await snapshot(today, end);
  await planWeek(monday, { replace: true, by: null, from: today });
  await planWeek(next.toISOString().slice(0, 10), { replace: true, by: null, from: today });
  await announceChanges(before, await snapshot(today, end), id, "ច្បាប់កាលវិភាគថ្មី");
  revalidatePath("/staff/roster");
}

/**
 * Manager: make the zoo's days off for a year match the Khmer calendar's
 * public holidays (lunar ones included). Days that were set by hand on a
 * date that isn't a holiday are left alone unless they carry a holiday name
 * the calendar places on another date (e.g. Pchum Ben typed on the wrong day).
 */
/** Manager: turn a day into a day off (holiday) or back into a working day. */
export async function toggleDayOff(day: string, off: boolean) {
  const { id, access } = await me();
  await audit("roster.dayoff", "staff_holidays", null, { day, off });
  if (!isManager(access) || !/^\d{4}-\d{2}-\d{2}$/.test(day)) throw new Error("Only managers.");
  const { setDayOff } = await import("@/lib/server/holidays");
  await setDayOff(day, off, "", id, new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Phnom_Penh" }).format(new Date()));
  revalidatePath("/staff", "layout");
}
/** Manager: add the zoo's own day off (staff party, repairs…). */
export async function addDayOff(formData: FormData) {
  const { id, access } = await me();
  const day = String(formData.get("day") ?? "");
  const name = String(formData.get("name") ?? "").trim().slice(0, 80);
  if (!isManager(access) || !/^\d{4}-\d{2}-\d{2}$/.test(day) || !name) throw new Error("invalid");
  const { setDayOff } = await import("@/lib/server/holidays");
  await setDayOff(day, true, name, id, new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Phnom_Penh" }).format(new Date()));
  revalidatePath("/staff", "layout");
}

/**
 * Admin or manager: turn a staff account off, remove it, or turn it back on.
 * Off / removed: can't sign in, signed out everywhere, taken off the schedule
 * from today. Only an admin or a manager can turn it on again.
 */
export async function setStaffAccount(userId: string, status: "active" | "suspended" | "left") {
  const { id, access } = await me();
  await audit("staff.account", "staff_members", userId, { status });
  if (!isManager(access) || userId === id || !["active", "suspended", "left"].includes(status)) throw new Error("Not allowed.");
  const { data: target } = await createServiceRoleClient().from("staff_members").select("position:staff_positions(permissions)").eq("user_id", userId).maybeSingle();
  if (!target) throw new Error("Not a staff member.");
  // a manager can't switch off another manager (only the admin can)
  if (!access.admin && ((target as any).position?.permissions ?? []).some((p: string) => ["reports", "hr", "roster"].includes(p))) throw new Error("Only the admin can change a manager's or HR's account.");
  const { setStaffStatus } = await import("@/lib/server/staff-account");
  await setStaffStatus(userId, status);
  revalidatePath("/staff", "layout");
  revalidatePath("/admin/staff");
}

/** A new chat message reaches the phones of everyone who can read that chat (not the sender). */
async function pushChat(channel: string, senderId: string, access: Awaited<ReturnType<typeof staffAccess>>, text: string) {
  const ids = await chatMembers(channel);
  const room: Record<string, string> = { all: "ទាំងអស់គ្នា", managers: "អ្នកគ្រប់គ្រង", tickets: "សំបុត្រ", animals: "ថែសត្វ", guide: "មគ្គុទ្ទេសក៍", cleaning: "សម្អាត", hr: "ក្រុម HR" };
  await sendPush(
    ids.filter((u) => u !== senderId),
    { title: isDm(channel) ? `💬 ${who(access)} · សារផ្ទាល់` : `💬 ${who(access)} · ${room[channel] ?? channel}`, body: text.slice(0, 140), url: `/staff/chat?c=${channel}`, tag: `chat-${channel}` }
  );
}

// ── Notices (managers and admins) ─────────────────────────────────────
export type NoticeState = { ok?: boolean; error?: string };
/** A notice for every staff member: shown on the staff home page and sent to their phones. */
export async function postStaffNotice(_prev: NoticeState, formData: FormData): Promise<NoticeState> {
  const { id, access } = await me();
  if (!isManager(access)) return { error: "Only managers can post notices." };
  const title = String(formData.get("title") ?? "").trim().slice(0, 120);
  const body = String(formData.get("body") ?? "").trim().slice(0, 2000);
  if (!title || !body) return { error: "invalid" };
  const { error } = await createServiceRoleClient().from("staff_announcements").insert({ title, body, pinned: formData.get("pinned") === "on", created_by: id });
  if (error) return { error: error.message };
  await sendPush((await staffIds()).filter((u) => u !== id), { title: `📢 ${title}`, body: body.slice(0, 160), url: "/staff", tag: "notice" });
  revalidatePath("/staff", "layout");
  return { ok: true };
}
export async function removeStaffNotice(noticeId: string) {
  const { access } = await me();
  if (!isManager(access)) throw new Error("Only managers.");
  await createServiceRoleClient().from("staff_announcements").delete().eq("id", noticeId);
  revalidatePath("/staff", "layout");
}
