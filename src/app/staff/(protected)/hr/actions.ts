"use server";

import { revalidatePath } from "next/cache";
import { getVerifiedUserId } from "@/lib/auth/session";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { staffAccess } from "@/lib/server/staff";
import { createStaffAccount } from "@/lib/server/staff-account";
import { announce, canHr, logEvent, tellApplicant, esc, type HrStatus } from "@/lib/server/hr";

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
const STATUSES: HrStatus[] = ["new", "screening", "interview", "offer", "hired", "rejected", "withdrawn"];

export async function setHrStatus(applicantId: string, status: HrStatus) {
  const { id } = await hr();
  if (!STATUSES.includes(status) || status === "hired") return;
  await createServiceRoleClient().from("hr_applicants").update({ status, updated_at: new Date().toISOString() }).eq("id", applicantId);
  await logEvent(applicantId, `status:${status}`, null, id);
  await announce(applicantId, status === "offer" ? "offer" : status === "rejected" ? "rejected" : "status");
  touch(applicantId);
}

export async function scheduleInterview(applicantId: string, fd: FormData) {
  const { id } = await hr();
  const when = String(fd.get("at") ?? "");
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(when)) return { error: "time" };
  const at = new Date(`${when}:00+07:00`).toISOString(); // the time typed is Cambodia time
  await createServiceRoleClient()
    .from("hr_applicants")
    .update({ status: "interview", interview_at: at, interview_place: String(fd.get("place") ?? "").trim().slice(0, 200) || null, interview_note: String(fd.get("note") ?? "").trim().slice(0, 1000) || null, updated_at: new Date().toISOString() })
    .eq("id", applicantId);
  await logEvent(applicantId, "interview", when.replace("T", " "), id);
  await announce(applicantId, "interview");
  touch(applicantId);
  return { ok: true };
}

export async function setResult(applicantId: string, pass: boolean, note: string) {
  const { id } = await hr();
  await createServiceRoleClient().from("hr_applicants").update({ status: pass ? "offer" : "rejected", result_note: note.trim().slice(0, 1000) || null, updated_at: new Date().toISOString() }).eq("id", applicantId);
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
export async function hireApplicant(applicantId: string, positionId: string): Promise<{ error?: string; staffNo?: string; password?: string; told?: boolean }> {
  const { id, access } = await hr();
  if (!access.admin) return { error: "Only an admin can create the staff account." };
  const db = createServiceRoleClient();
  const { data: a } = await db.from("hr_applicants").select("*").eq("id", applicantId).maybeSingle();
  if (!a) return { error: "not found" };
  if (a.staff_user_id) return { error: "Already hired." };
  if (!positionId) return { error: "Choose a position." };
  const r = await createStaffAccount({ name: a.full_name, nameKm: a.full_name_km, positionId, phone: a.phone, createdBy: id });
  if (!r.ok) return { error: r.error };
  await db.from("hr_applicants").update({ status: "hired", staff_user_id: r.userId, updated_at: new Date().toISOString() }).eq("id", applicantId);
  await logEvent(applicantId, "hired", r.staffNo, id);
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
  const files = [a?.cv_path, a?.photo_path].filter(Boolean) as string[];
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
  };
  const db = createServiceRoleClient();
  const id = String(fd.get("id") ?? "");
  const { error } = id ? await db.from("hr_jobs").update(row).eq("id", id) : await db.from("hr_jobs").insert(row);
  if (error) return { error: error.code === "23505" ? "slug" : error.message };
  revalidatePath("/staff/hr");
  revalidatePath("/careers");
  return { ok: true };
}
