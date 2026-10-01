"use server";

import { revalidatePath } from "next/cache";
import { getVerifiedUserId } from "@/lib/auth/session";
import { getCachedRole } from "@/lib/auth/role";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { monthRange } from "@/lib/server/staff";
import { issuePayslips, paydayById, paydayFor } from "@/lib/server/payday";
import { sendPush, staffIds } from "@/lib/server/push";
import { audit } from "@/lib/server/audit";

// Payday for the admin: set the day, open it (payslips are frozen and the
// QR codes start working), answer requests, mark late collections, close.

async function requireAdmin() {
  const id = getVerifiedUserId();
  if (!id || (await getCachedRole(id)).role !== "admin") throw new Error("Admins only.");
  return id;
}
const db = () => createServiceRoleClient();
const done = () => {
  revalidatePath("/admin/payday");
  revalidatePath("/staff/pay");
};
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^\d{2}:\d{2}$/;
const dmy = (d: string) => d.split("-").reverse().join("/");

export async function savePayday(fd: FormData): Promise<{ error?: string; ok?: boolean }> {
  const adminId = await requireAdmin();
  const month = String(fd.get("month") ?? "");
  const payDate = String(fd.get("pay_date") ?? "");
  if (!/^\d{4}-\d{2}$/.test(month) || !DATE.test(payDate)) return { error: "date" };
  const t = (k: string) => {
    const v = String(fd.get(k) ?? "");
    return TIME.test(v) ? v : null;
  };
  const row = {
    month: monthRange(month).first,
    pay_date: payDate,
    start_time: t("start_time"),
    end_time: t("end_time"),
    place: String(fd.get("place") ?? "").trim().slice(0, 120) || null,
    note: String(fd.get("note") ?? "").trim().slice(0, 500) || null,
  };
  const cur = await paydayFor(month);
  if (cur?.status === "closed") return { error: "closed" };
  if (cur) await db().from("staff_paydays").update(row).eq("id", cur.id);
  else await db().from("staff_paydays").insert({ ...row, created_by: adminId });
  await audit(cur ? "payday.update" : "payday.create", "staff_paydays", cur?.id ?? null, { month, pay_date: payDate });
  // everyone hears about the day (and again if it moves)
  if (!cur || cur.pay_date !== payDate)
    await sendPush(await staffIds(), {
      title: "💵 ថ្ងៃបើកប្រាក់ខែ",
      body: `ប្រាក់ខែ ${month} នឹងបើកនៅថ្ងៃ ${dmy(payDate)}${row.start_time ? ` ម៉ោង ${row.start_time}` : ""}${row.place ? ` · ${row.place}` : ""}`,
      url: "/staff/pay",
      tag: `payday-${month}`,
    }).catch(() => {});
  done();
  return { ok: true };
}

/** Opens payday: everyone's payslip is frozen and the QR codes work. */
export async function openPayday(id: string) {
  const adminId = await requireAdmin();
  const p = await paydayById(id);
  if (!p || p.status === "closed") return;
  const n = await issuePayslips(p, adminId);
  await db().from("staff_paydays").update({ status: "open", opened_at: p.opened_at ?? new Date().toISOString() }).eq("id", id);
  await audit("payday.open", "staff_paydays", id, { payslips: n });
  if (p.status !== "open")
    await sendPush(await staffIds(), { title: "💵 បើកប្រាក់ខែហើយ", body: "វិក្កយបត្រប្រាក់ខែរបស់អ្នករួចរាល់។ ស្កេន QR ផ្នែករបស់អ្នក ដើម្បីទទួលប្រាក់។", url: "/staff/pay", tag: `payday-open-${id}` }).catch(() => {});
  done();
}

/** Work the payslips out again (for anyone who hasn't collected yet), e.g. after a late bonus. */
export async function reissuePayslips(id: string) {
  const adminId = await requireAdmin();
  const p = await paydayById(id);
  if (!p || p.status !== "open") return;
  await issuePayslips(p, adminId);
  await audit("payday.reissue", "staff_paydays", id, {});
  done();
}

export async function closePayday(id: string) {
  await requireAdmin();
  await db().from("staff_paydays").update({ status: "closed", closed_at: new Date().toISOString() }).eq("id", id).eq("status", "open");
  await audit("payday.close", "staff_paydays", id, {});
  done();
}

/** Money handed over outside the scan (came later, someone collected for them, bank transfer). */
export async function markReceived(paydayId: string, userId: string, via: "manual" | "transfer" | "proxy") {
  const adminId = await requireAdmin();
  const p = await paydayById(paydayId);
  if (!p || p.status === "scheduled" || !["manual", "transfer", "proxy"].includes(via)) return;
  await db().from("staff_payslips").update({ received_at: new Date().toISOString(), received_via: via, received_by: adminId }).eq("user_id", userId).eq("month", p.month).is("received_at", null);
  await audit("payday.received", "staff_payslips", userId, { via, month: p.month });
  done();
}
export async function undoReceived(paydayId: string, userId: string) {
  await requireAdmin();
  const p = await paydayById(paydayId);
  if (!p || p.status === "closed") return;
  await db().from("staff_payslips").update({ received_at: null, received_via: null, received_by: null }).eq("user_id", userId).eq("month", p.month);
  await audit("payday.received_undo", "staff_payslips", userId, { month: p.month });
  done();
}

export async function decidePayRequest(id: string, approve: boolean, note: string) {
  const adminId = await requireAdmin();
  const { data: r } = await db()
    .from("staff_payday_requests")
    .update({ status: approve ? "approved" : "rejected", admin_note: note.trim().slice(0, 300) || null, decided_by: adminId, decided_at: new Date().toISOString() })
    .eq("id", id)
    .eq("status", "pending")
    .select("user_id")
    .maybeSingle();
  if (!r) return;
  await sendPush([r.user_id], { title: approve ? "✅ សំណើបើកប្រាក់ខែត្រូវបានយល់ព្រម" : "❌ សំណើបើកប្រាក់ខែមិនត្រូវបានយល់ព្រម", body: note.trim() || (approve ? "សូមមើលព័ត៌មានក្នុងទំព័រប្រាក់ខែ។" : "សូមមកទទួលប្រាក់នៅថ្ងៃបើកប្រាក់ខែ។"), url: "/staff/pay", tag: `payreq-${id}` }).catch(() => {});
  done();
}
