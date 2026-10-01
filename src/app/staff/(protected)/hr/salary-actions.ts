"use server";

import { revalidatePath } from "next/cache";
import { getVerifiedUserId } from "@/lib/auth/session";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { staffAccess } from "@/lib/server/staff";
import { canHr } from "@/lib/server/hr";
import { sendPush } from "@/lib/server/push";
import { audit } from "@/lib/server/audit";
import { hrMayManage } from "@/lib/server/staff-guard";

// A person's own salary: the starting pay and raises from a date.
// Only an admin or HR may set it; the staff member only sees their own.

async function guard(targetUserId?: string) {
  const id = getVerifiedUserId();
  if (!id) throw new Error("Please sign in.");
  const access = await staffAccess(id);
  if (!access.admin && !canHr(access)) throw new Error("Admin or HR only.");
  // HR can't set their own salary, nor a manager's / another HR's (only the admin can)
  if (targetUserId && !(await hrMayManage({ id, admin: access.admin }, targetUserId))) throw new Error("Only the admin can set this person's salary.");
  return id;
}
const db = () => createServiceRoleClient();
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Phnom_Penh" }).format(new Date());
const dmy = (d: string) => d.split("-").reverse().join("/");
const done = () => {
  revalidatePath("/admin/staff");
  revalidatePath("/staff/hr");
  revalidatePath("/staff/pay");
};
const money = (v: unknown) => {
  const n = Math.round(Number(v) * 100) / 100;
  return Number.isFinite(n) && n >= 0 && n <= 100000 ? n : null;
};
/** The same day N months later (31 Jan + 1 → 28/29 Feb). */
const plusMonths = (date: string, n: number) => {
  const [y, m, d] = date.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1 + n, 1));
  const last = new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth() + 1, 0)).getUTCDate();
  return `${t.getUTCFullYear()}-${String(t.getUTCMonth() + 1).padStart(2, "0")}-${String(Math.min(d, last)).padStart(2, "0")}`;
};

async function tell(userId: string, _amount: number, from: string) {
  const future = from > today();
  await sendPush([userId], {
    title: future ? "💰 ប្រាក់ខែរបស់អ្នកនឹងផ្លាស់ប្តូរ" : "💰 ប្រាក់ខែរបស់អ្នកបានផ្លាស់ប្តូរ",
    // no amount here: notifications show on the lock screen; the amount is behind the PIN in the app
    body: future ? `ចាប់ពីថ្ងៃ ${dmy(from)} · បើកកម្មវិធី ហើយបញ្ចូលលេខកូដ ដើម្បីមើល` : `ចាប់ពីថ្ងៃ ${dmy(from)} · បើកកម្មវិធី ហើយបញ្ចូលលេខកូដ ដើម្បីមើល`,
    url: "/staff/pay",
    tag: `salary-${userId}`,
  }).catch(() => {});
}

export type SalaryState = { error?: string; ok?: boolean };

/** One step: this amount from this day (e.g. starting pay, or a raise). */
export async function setSalaryStep(userId: string, fd: FormData): Promise<SalaryState> {
  const by = await guard(userId);
  const amount = money(fd.get("amount"));
  const from = String(fd.get("from") ?? "");
  const note = String(fd.get("note") ?? "").trim().slice(0, 120) || null;
  if (amount === null) return { error: "amount" };
  if (!DATE.test(from)) return { error: "date" };
  const { data: s } = await db().from("staff_members").select("user_id").eq("user_id", userId).maybeSingle();
  if (!s) return { error: "staff" };
  await db().from("staff_salary_steps").upsert({ user_id: userId, effective_from: from, amount, note, created_by: by, created_at: new Date().toISOString() }, { onConflict: "user_id,effective_from" });
  await audit("salary.set", "staff_salary_steps", userId, { amount, from, note });
  await tell(userId, amount, from);
  done();
  return { ok: true };
}

/** Probation: a starting pay now, and a raise after N months, in one go. */
export async function setProbation(userId: string, fd: FormData): Promise<SalaryState> {
  const by = await guard(userId);
  const start = money(fd.get("start"));
  const after = money(fd.get("after"));
  const months = Number(fd.get("months"));
  const from = String(fd.get("from") ?? "");
  if (start === null || after === null) return { error: "amount" };
  if (!DATE.test(from)) return { error: "date" };
  if (!Number.isInteger(months) || months < 1 || months > 24) return { error: "months" };
  const raise = plusMonths(from, months);
  await db()
    .from("staff_salary_steps")
    .upsert(
      [
        { user_id: userId, effective_from: from, amount: start, note: `សាកល្បង ${months} ខែ · Probation`, created_by: by, created_at: new Date().toISOString() },
        { user_id: userId, effective_from: raise, amount: after, note: "ដំឡើងក្រោយសាកល្បង · After probation", created_by: by, created_at: new Date().toISOString() },
      ],
      { onConflict: "user_id,effective_from" }
    );
  await audit("salary.set", "staff_salary_steps", userId, { start, after, from, raise });
  await tell(userId, after, raise);
  done();
  return { ok: true };
}

export async function deleteSalaryStep(id: string) {
  const { data: step } = await db().from("staff_salary_steps").select("user_id").eq("id", id).maybeSingle();
  if (!step) return;
  await guard(step.user_id);
  const { data } = await db().from("staff_salary_steps").delete().eq("id", id).select("user_id, amount, effective_from").maybeSingle();
  if (data) await audit("salary.delete", "staff_salary_steps", data.user_id, { amount: data.amount, from: data.effective_from });
  done();
}
