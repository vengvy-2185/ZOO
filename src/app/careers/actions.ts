"use server";

import { z } from "zod";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { allow } from "@/lib/server/rate-limit";
import { esc, hrSettings, hrTeam, logEvent, notifyHr, site } from "@/lib/server/hr";
import { sendPush } from "@/lib/server/push";

// Anyone can apply for a job (no account needed). Everything is checked
// here: which job, the form, the CV (type and size, uploaded to a private
// place), and how often one internet address may apply.

const CV_TYPES = ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "image/jpeg", "image/png", "image/webp"];
const MAX = 10 * 1024 * 1024;

/** A one-time upload slot for the CV (the file goes straight to the private bucket). */
export async function cvUploadSlot(name: string, size: number, type: string): Promise<{ path?: string; token?: string; error?: string }> {
  if (!(await allow("hr-upload", 12, 3600))) return { error: "limit" };
  if (!CV_TYPES.includes(type)) return { error: "type" };
  if (!(size > 0) || size > MAX) return { error: "size" };
  const s = await hrSettings();
  if (!s.accept) return { error: "closed" };
  const ext = type === "application/pdf" ? "pdf" : type.includes("word") ? (type.includes("openxml") ? "docx" : "doc") : type.split("/")[1];
  const safe = (name.normalize("NFKD").replace(/\.[^.]+$/, "").replace(/[^\w-]+/g, "_").slice(0, 60) || "cv") + "." + ext;
  const path = `incoming/${crypto.randomUUID()}/${safe}`;
  const { data, error } = await createServiceRoleClient().storage.from("hr-files").createSignedUploadUrl(path);
  if (error || !data) return { error: "upload" };
  return { path, token: data.token };
}

const Form = z.object({
  job: z.string().uuid(),
  full_name: z.string().trim().min(2).max(100),
  full_name_km: z.string().trim().max(100).optional(),
  gender: z.enum(["male", "female", "other"]).optional(),
  birth_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  phone: z.string().trim().regex(/^[+\d][\d\s-]{5,25}$/),
  email: z.string().trim().email().max(120).optional(),
  address: z.string().trim().max(200).optional(),
  education: z.string().trim().max(1000).optional(),
  experience: z.string().trim().max(2000).optional(),
  languages: z.string().trim().max(200).optional(),
  skills: z.string().trim().max(500).optional(),
  expected_salary: z.string().trim().max(60).optional(),
  available_from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  about: z.string().trim().max(2000).optional(),
  cv_path: z.string().regex(/^incoming\/[0-9a-f-]{36}\/[\w.-]{1,80}$/),
  cv_name: z.string().max(200).optional(),
  consent: z.literal("on"),
});

export type ApplyState = { error?: string; token?: string; code?: string };

export async function applyForJob(_prev: ApplyState, fd: FormData): Promise<ApplyState> {
  // a hidden field real people never fill in (stops simple robots)
  if (String(fd.get("website") ?? "")) return { error: "invalid" };
  if (!(await allow("hr-apply", 5, 3600))) return { error: "limit" };
  const raw = Object.fromEntries([...fd.entries()].filter(([k, v]) => typeof v === "string" && v !== "" && k !== "website"));
  const parsed = Form.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0]?.path[0] === "cv_path" ? "cv" : parsed.error.issues[0]?.path[0] === "consent" ? "consent" : "invalid" };
  const f = parsed.data;
  const s = await hrSettings();
  if (!s.accept) return { error: "closed" };
  const db = createServiceRoleClient();
  const { data: job } = await db.from("hr_jobs").select("id, title, title_km, open").eq("id", f.job).maybeSingle();
  if (!job?.open) return { error: "closed" };
  // the CV really is there
  const folder = f.cv_path.split("/").slice(0, 2).join("/");
  const { data: files } = await db.storage.from("hr-files").list(folder);
  if (!files?.length) return { error: "cv" };
  const { data: code } = await db.rpc("next_hr_code");
  const { data: a, error } = await db
    .from("hr_applicants")
    .insert({
      code,
      job_id: job.id,
      full_name: f.full_name,
      full_name_km: f.full_name_km ?? null,
      gender: f.gender ?? null,
      birth_date: f.birth_date ?? null,
      phone: f.phone,
      email: f.email ?? null,
      address: f.address ?? null,
      education: f.education ?? null,
      experience: f.experience ?? null,
      languages: f.languages ?? null,
      skills: f.skills ?? null,
      expected_salary: f.expected_salary ?? null,
      available_from: f.available_from ?? null,
      about: f.about ?? null,
      cv_path: f.cv_path,
      cv_name: (f.cv_name ?? "").slice(0, 200) || null,
    })
    .select("id, code, token")
    .single();
  if (error || !a) return { error: "invalid" };
  await logEvent(a.id, "applied");
  // the HR team hears about it at once
  await sendPush(await hrTeam(), { title: `🧑‍💼 ពាក្យសុំការងារថ្មី · ${a.code}`, body: `${f.full_name} · ${job.title_km || job.title}`, url: `/staff/hr/${a.id}`, tag: `hr-${a.id}` }).catch(() => {});
  await notifyHr(`🧑‍💼 <b>ពាក្យសុំការងារថ្មី</b> ${esc(a.code)}\n👤 ${esc(f.full_name)} · ${esc(f.phone)}\n💼 ${esc(job.title_km || job.title)}\n\n${site()}/staff/hr/${a.id}`);
  return { token: a.token, code: a.code };
}
