"use server";

import { revalidatePath } from "next/cache";
import { getVerifiedUserId } from "@/lib/auth/session";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { staffAccess } from "@/lib/server/staff";
import { createStaffAccount } from "@/lib/server/staff-account";
import { announce, applyAgain, bot, canHr, closeJobIfFull, hrSettings, logEvent, mapPoint, site, tellApplicant, esc, type HrStatus } from "@/lib/server/hr";

// The HR team's work on applications. Every step is written in the
// application's timeline and, when the applicant linked Telegram, they are
// told there at once.

async function hr() {
  const id = getVerifiedUserId();
  if (!id) throw new Error("Please sign in.");
  const access = await staffAccess(id);
  if (!canHr(access)) throw new Error("HR only.");
  return { id, access };
}
const touch = (id: string) => {
  revalidatePath("/staff/hr");
  revalidatePath(`/staff/hr/${id}`);
};
/** Still being decided. Once passed / not selected / hired, the result is final. */
const OPEN: HrStatus[] = ["new", "screening", "interview"];
const LOCKED = { error: "locked" } as const;

export async function setHrStatus(applicantId: string, status: HrStatus) {
  const { id } = await hr();
  if (status !== "screening" && status !== "withdrawn") return;
  // one step at a time: a second tap (or another HR at the same moment) changes nothing
  const { data } = await createServiceRoleClient()
    .from("hr_applicants")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", applicantId)
    .in("status", status === "withdrawn" ? [...OPEN, "offer"] : OPEN)
    .neq("status", status)
    .select("id");
  if (!data?.length) return LOCKED;
  await logEvent(applicantId, `status:${status}`, null, id);
  await announce(applicantId, "status");
  touch(applicantId);
}

export async function scheduleInterview(applicantId: string, fd: FormData) {
  const { id } = await hr();
  const when = String(fd.get("at") ?? "");
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(when)) return { error: "time" };
  const at = new Date(`${when}:00+07:00`).toISOString(); // the time typed is Cambodia time
  const map = String(fd.get("map") ?? "").trim().slice(0, 500);
  if (map && !/^(https:\/\/|-?\d{1,2}\.\d+\s*,)/.test(map)) return { error: "map" };
  const point = map ? await mapPoint(map) : null;
  const { data } = await createServiceRoleClient()
    .from("hr_applicants")
    .update({
      status: "interview",
      interview_at: at,
      interview_place: String(fd.get("place") ?? "").trim().slice(0, 200) || null,
      interview_note: String(fd.get("note") ?? "").trim().slice(0, 1000) || null,
      interview_map: map.startsWith("https://") ? map : point ? `https://www.google.com/maps?q=${point.lat},${point.lng}` : null,
      interview_lat: point?.lat ?? null,
      interview_lng: point?.lng ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", applicantId)
    .in("status", OPEN)
    .select("id");
  if (!data?.length) return LOCKED;
  await logEvent(applicantId, "interview", when.replace("T", " "), id);
  await announce(applicantId, "interview");
  touch(applicantId);
  return { ok: true };
}

export async function setResult(applicantId: string, pass: boolean, note: string) {
  const { id } = await hr();
  // decided once only: this only changes an application that is still open
  const { data } = await createServiceRoleClient()
    .from("hr_applicants")
    .update({ status: pass ? "offer" : "rejected", result_note: note.trim().slice(0, 1000) || null, updated_at: new Date().toISOString() })
    .eq("id", applicantId)
    .in("status", OPEN)
    .select("id, job_id");
  if (!data?.length) return LOCKED;
  // the job has all the people it needs → it closes by itself
  if (pass) await closeJobIfFull(data[0].job_id);
  await logEvent(applicantId, pass ? "passed" : "not-selected", note || null, id);
  await announce(applicantId, pass ? "offer" : "rejected");
  touch(applicantId);
}

export async function saveHrNote(applicantId: string, fd: FormData) {
  const { id } = await hr();
  const rating = Number(fd.get("rating"));
  await createServiceRoleClient()
    .from("hr_applicants")
    .update({ hr_note: String(fd.get("hr_note") ?? "").slice(0, 4000) || null, rating: rating >= 1 && rating <= 5 ? rating : null, updated_at: new Date().toISOString() })
    .eq("id", applicantId);
  await logEvent(applicantId, "note", null, id);
  touch(applicantId);
}

/** A message to the applicant (in Telegram); kept in the conversation either way. */
export async function messageApplicant(applicantId: string, body: string) {
  const { id } = await hr();
  const text = body.trim().slice(0, 2000);
  if (!text) return { error: "empty" };
  const db = createServiceRoleClient();
  await db.from("hr_messages").insert({ applicant_id: applicantId, from_hr: true, author_id: id, body: text });
  await db.from("hr_messages").update({ read_at: new Date().toISOString() }).eq("applicant_id", applicantId).eq("from_hr", false).is("read_at", null);
  const sent = await announce(applicantId, "message", text);
  touch(applicantId);
  return { ok: true, sent };
}

/** The CV, for a few minutes (the files are private). */
export async function cvLink(applicantId: string) {
  await hr();
  const db = createServiceRoleClient();
  const { data: a } = await db.from("hr_applicants").select("cv_path").eq("id", applicantId).maybeSingle();
  if (!a?.cv_path) return null;
  const { data } = await db.storage.from("hr-files").createSignedUrl(a.cv_path, 600);
  return data?.signedUrl ?? null;
}

/** Hired: the applicant becomes a staff member (Staff ID + password), and is told in Telegram. */
export async function hireApplicant(applicantId: string, positionId: string, pay?: { start?: number | null; months?: number | null; after?: number | null }): Promise<{ error?: string; staffNo?: string; password?: string; told?: boolean }> {
  const { id, access } = await hr();
  if (!access.admin) return { error: "Only an admin can create the staff account." };
  const db = createServiceRoleClient();
  const { data: a } = await db.from("hr_applicants").select("*").eq("id", applicantId).maybeSingle();
  if (!a) return { error: "not found" };
  if (a.staff_user_id) return { error: "Already hired." };
  if (a.status !== "offer" && a.status !== "interview") return { error: "Only an applicant who passed can be hired." };
  if (!positionId) return { error: "Choose a position." };
  const r = await createStaffAccount({ name: a.full_name, nameKm: a.full_name_km, positionId, phone: a.phone, createdBy: id });
  if (!r.ok) return { error: r.error };
  await db.from("hr_applicants").update({ status: "hired", staff_user_id: r.userId, updated_at: new Date().toISOString() }).eq("id", applicantId);
  await logEvent(applicantId, "hired", r.staffNo, id);
  await closeJobIfFull(a.job_id);
  // the starting pay (and a raise after the probation months), when HR set one
  const ok = (n: unknown) => typeof n === "number" && Number.isFinite(n) && n >= 0 && n <= 100000;
  if (pay && ok(pay.start)) {
    const day = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Phnom_Penh" }).format(new Date());
    const rows: Record<string, unknown>[] = [{ user_id: r.userId, effective_from: day, amount: Math.round(pay.start! * 100) / 100, note: pay.months ? `សាកល្បង ${pay.months} ខែ · Probation` : "ប្រាក់ខែចាប់ផ្តើម · Starting pay", created_by: id }];
    if (ok(pay.after) && Number.isInteger(pay.months) && pay.months! >= 1 && pay.months! <= 24) {
      const [y, m, d] = day.split("-").map(Number);
      const t = new Date(Date.UTC(y, m - 1 + pay.months!, 1));
      const last = new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth() + 1, 0)).getUTCDate();
      rows.push({ user_id: r.userId, effective_from: `${t.getUTCFullYear()}-${String(t.getUTCMonth() + 1).padStart(2, "0")}-${String(Math.min(d, last)).padStart(2, "0")}`, amount: Math.round(pay.after! * 100) / 100, note: "ដំឡើងក្រោយសាកល្បង · After probation", created_by: id });
    }
    await db.from("staff_salary_steps").insert(rows);
  }
  const told = await tellApplicant(
    { ...a, status: "hired", staff_user_id: r.userId },
    a.tg_lang === "en"
      ? `✅ <b>Welcome to the Green Wild Zoo team!</b>\n\nStaff ID: <b>${esc(r.staffNo)}</b>\nPassword: <code>${esc(r.password)}</code>\n\nSign in: https://zoo-seven-rho.vercel.app/staff/login\nPlease change the password after your first sign-in.`
      : `✅ <b>សូមស្វាគមន៍មកកាន់ក្រុម Green Wild Zoo!</b>\n\nលេខសម្គាល់បុគ្គលិក៖ <b>${esc(r.staffNo)}</b>\nពាក្យសម្ងាត់៖ <code>${esc(r.password)}</code>\n\nចូលប្រព័ន្ធ៖ https://zoo-seven-rho.vercel.app/staff/login\nសូមប្តូរពាក្យសម្ងាត់ក្រោយចូលលើកដំបូង។`
  );
  touch(applicantId);
  revalidatePath("/admin/staff");
  return { staffNo: r.staffNo, password: r.password, told };
}

/** Admin: remove an application completely (details, CV, messages). */
export async function deleteApplicant(applicantId: string) {
  const { access } = await hr();
  if (!access.admin) return;
  const db = createServiceRoleClient();
  const { data: a } = await db.from("hr_applicants").select("cv_path, photo_path").eq("id", applicantId).maybeSingle();
  // a CV can be shared with a later application (invited again): keep it then
  const files: string[] = [];
  for (const f of [a?.cv_path, a?.photo_path].filter(Boolean) as string[]) {
    const { count } = await db.from("hr_applicants").select("id", { count: "exact", head: true }).neq("id", applicantId).or(`cv_path.eq.${f},photo_path.eq.${f}`);
    if (!count) files.push(f);
  }
  if (files.length) await db.storage.from("hr-files").remove(files);
  await db.from("hr_applicants").delete().eq("id", applicantId);
  revalidatePath("/staff/hr");
}

// ── jobs ──────────────────────────────────────────────────────────────
export async function saveJob(fd: FormData) {
  await hr();
  const s = (k: string, n = 2000) => String(fd.get(k) ?? "").trim().slice(0, n) || null;
  const title = s("title", 120);
  if (!title) return { error: "title" };
  const slug = (s("slug", 60) ?? title).toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || `job-${Date.now().toString(36)}`;
  const row = {
    title,
    title_km: s("title_km", 120),
    slug,
    department: s("department", 80),
    description: s("description"),
    description_km: s("description_km"),
    requirements: s("requirements"),
    requirements_km: s("requirements_km"),
    salary: s("salary", 60),
    job_type: ["full-time", "part-time", "intern", "volunteer"].includes(String(fd.get("job_type"))) ? String(fd.get("job_type")) : "full-time",
    open: fd.get("open") === "on",
    openings: /^\d{1,3}$/.test(String(fd.get("openings") ?? "")) && Number(fd.get("openings")) > 0 ? Number(fd.get("openings")) : null,
    ...(fd.get("open") === "on" ? { filled_at: null } : {}),
  };
  const db = createServiceRoleClient();
  const id = String(fd.get("id") ?? "");
  const { data: saved, error } = id ? await db.from("hr_jobs").update(row).eq("id", id).select("id").single() : await db.from("hr_jobs").insert(row).select("id").single();
  if (error) return { error: error.code === "23505" ? "slug" : error.message };
  // e.g. the number was lowered to what is already picked
  const closed = await closeJobIfFull(saved?.id);
  if (closed) return { ok: true, closed: true };
  revalidatePath("/staff/hr");
  revalidatePath("/careers");
  return { ok: true };
}

// ── asking a past applicant to come back ─────────────────────────────
const PAST = ["rejected", "withdrawn"];

/** "We have a new opening — are you interested?" in the bot, with Yes / No buttons. */
export async function inviteAgain(applicantId: string, jobId: string, note: string): Promise<{ error?: string; ok?: boolean; telegram?: boolean; phone?: string }> {
  const { id } = await hr();
  const db = createServiceRoleClient();
  const [{ data: a }, { data: job }] = await Promise.all([
    db.from("hr_applicants").select("id, code, full_name, phone, status, tg_chat_id, tg_lang").eq("id", applicantId).maybeSingle(),
    db.from("hr_jobs").select("id, slug, title, title_km, salary, open").eq("id", jobId).maybeSingle(),
  ]);
  if (!a || !PAST.includes(a.status)) return { error: "status" };
  if (!job?.open) return { error: "job" };
  const s = await hrSettings();
  const tg = Boolean(s.telegram_on && s.bot_token && a.tg_chat_id);
  const { data: inv } = await db.from("hr_invites").insert({ applicant_id: a.id, job_id: job.id, note: note.trim().slice(0, 500) || null, telegram: tg, created_by: id }).select("id").single();
  let sent = false;
  if (tg && inv) {
    const km = a.tg_lang !== "en";
    const title = (km && job.title_km) || job.title;
    const text = km
      ? `💼 <b>ឱកាសការងារថ្មី</b>\n\nសួស្តី ${esc(a.full_name)}! Green Wild Zoo កំពុងត្រូវការ <b>${esc(title)}</b>${job.salary ? ` (${esc(job.salary)})` : ""}។\nយើងនៅចាំពាក្យរបស់អ្នកពីមុន ហើយចង់សួរថា តើអ្នកចាប់អារម្មណ៍មកធ្វើការទេ?${note.trim() ? `\n\n📝 ${esc(note.trim())}` : ""}`
      : `💼 <b>A new opening</b>\n\nHello ${esc(a.full_name)}! Green Wild Zoo needs a <b>${esc(title)}</b>${job.salary ? ` (${esc(job.salary)})` : ""}.\nWe remember your earlier application — would you like to come and work with us?${note.trim() ? `\n\n📝 ${esc(note.trim())}` : ""}`;
    const r = await bot("sendMessage", {
      chat_id: a.tg_chat_id,
      text,
      parse_mode: "HTML",
      disable_web_page_preview: true,
      reply_markup: { inline_keyboard: [[{ text: km ? "✅ ចង់មកធ្វើការ" : "✅ Yes, I'm interested", callback_data: `inv:${inv.id}:y`, style: "success" }, { text: km ? "❌ មិនអាចទេ" : "❌ No, thanks", callback_data: `inv:${inv.id}:n`, style: "danger" }], [{ text: km ? "💼 មើលការងារ" : "💼 See the job", url: `${site()}/careers/${job.slug}` }]] },
    }, s.bot_token);
    sent = Boolean(r?.ok);
  }
  await logEvent(a.id, "invited", (job.title_km || job.title) + (sent ? " · Telegram" : ""), id);
  touch(applicantId);
  return { ok: true, telegram: sent, phone: a.phone };
}

/** They said yes on the phone (or HR decides): a new application for the job right away. */
export async function addToJobAgain(applicantId: string, jobId: string): Promise<{ error?: string; id?: string; code?: string }> {
  const { id } = await hr();
  const db = createServiceRoleClient();
  const [{ data: a }, { data: job }] = await Promise.all([
    db.from("hr_applicants").select("id, status").eq("id", applicantId).maybeSingle(),
    db.from("hr_jobs").select("id, title, title_km, open").eq("id", jobId).maybeSingle(),
  ]);
  if (!a || !PAST.includes(a.status)) return { error: "status" };
  if (!job?.open) return { error: "job" };
  const n = await applyAgain(a.id, job.id, id);
  if (!n) return { error: "failed" };
  await db.from("hr_invites").insert({ applicant_id: a.id, job_id: job.id, status: "added", new_applicant_id: n.id, created_by: id, answered_at: new Date().toISOString() });
  await tellApplicant(n, n.tg_lang === "en" ? `💼 HR added you for <b>${esc(job.title)}</b> (application ${esc(n.code)}). We'll message you here.` : `💼 HR បានបញ្ចូលអ្នកសម្រាប់ការងារ <b>${esc(job.title_km || job.title)}</b> (ពាក្យ ${esc(n.code)})។ យើងនឹងផ្ញើដំណឹងមកទីនេះ។`);
  touch(applicantId);
  revalidatePath("/staff/hr");
  return { id: n.id, code: n.code };
}
