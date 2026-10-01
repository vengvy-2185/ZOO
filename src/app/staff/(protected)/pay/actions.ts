"use server";

import { revalidatePath } from "next/cache";
import { getVerifiedUserId } from "@/lib/auth/session";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { staffAccess } from "@/lib/server/staff";
import { ensurePaydays, monthLabel, paydayById, qrValid, requestDeadline, today } from "@/lib/server/payday";
import { managerIds, sendPush } from "@/lib/server/push";

// The staff side of payday: ask in advance when you can't come, and collect
// your pay by scanning your department's QR code.

async function me() {
  const id = getVerifiedUserId();
  if (!id) throw new Error("Please sign in.");
  const access = await staffAccess(id);
  if (!access.ok || !access.staff) throw new Error("Staff only.");
  return { id, staff: access.staff };
}
const db = () => createServiceRoleClient();
const done = () => {
  revalidatePath("/staff/pay");
  revalidatePath("/admin/payday");
};

export type PayReqState = { error?: string; ok?: boolean };

/** "I can't come on payday" / "I'm on leave": at least 4 days before. */
export async function requestPayday(_prev: PayReqState, fd: FormData): Promise<PayReqState> {
  const { id, staff } = await me();
  const p = await paydayById(String(fd.get("payday") ?? ""));
  if (!p || p.status === "closed") return { error: "closed" };
  if (today() > requestDeadline(p)) return { error: "late" };
  const kind = String(fd.get("kind"));
  const method = String(fd.get("method"));
  const reason = String(fd.get("reason") ?? "").trim().slice(0, 500);
  const pickup = String(fd.get("pickup_date") ?? "");
  const proxy = String(fd.get("proxy_name") ?? "").trim().slice(0, 100);
  if (!["absent", "leave"].includes(kind) || !["later", "proxy", "transfer"].includes(method)) return { error: "invalid" };
  if (reason.length < 3) return { error: "reason" };
  if (method === "later" && (!/^\d{4}-\d{2}-\d{2}$/.test(pickup) || pickup <= p.pay_date)) return { error: "pickup" };
  if (method === "proxy" && proxy.length < 2) return { error: "proxy" };
  const { data: cur } = await db().from("staff_payday_requests").select("status").eq("payday_id", p.id).eq("user_id", id).maybeSingle();
  if (cur && cur.status !== "pending") return { error: "decided" };
  await db()
    .from("staff_payday_requests")
    .upsert({ payday_id: p.id, user_id: id, kind, method, reason, pickup_date: method === "later" ? pickup : null, proxy_name: method === "proxy" ? proxy : null, status: "pending", created_at: new Date().toISOString() }, { onConflict: "payday_id,user_id" });
  await sendPush(await managerIds(), { title: `💵 សំណើបើកប្រាក់ខែ ${monthLabel(p.month, true)}`, body: `${staff.full_name_km || staff.full_name}: ${kind === "leave" ? "ឈប់សម្រាក" : "មិនអាចមកបាន"} · ${reason.slice(0, 80)}`, url: "/admin/payday", tag: `payreq-new-${id}` }).catch(() => {});
  done();
  return { ok: true };
}

export async function cancelPayRequest(paydayId: string) {
  const { id } = await me();
  await db().from("staff_payday_requests").delete().eq("payday_id", paydayId).eq("user_id", id).eq("status", "pending");
  done();
}

export type ClaimResult = { ok?: boolean; amount?: number; error?: "invalid" | "not_open" | "not_today" | "closed" | "dept" | "no_slip" | "already"; at?: string };

/** Scanned the department QR: the pay is marked as collected (only once, only your own). */
export async function claimPay(paydayId: string, dept: string, sig: string): Promise<ClaimResult> {
  const { id, staff } = await me();
  await ensurePaydays(); // on the pay date it opens by itself
  const p = await paydayById(paydayId);
  if (!p || !qrValid(p, dept, sig)) return { error: "invalid" };
  if (p.status === "closed") return { error: "closed" };
  if (p.status !== "open") return { error: "not_open" };
  if (today() < p.pay_date) return { error: "not_today" };
  // each department collects with its own code ("all" = the shared one)
  if (dept !== "all" && dept !== (staff.position_id ?? "all")) return { error: "dept" };
  const { data: slip } = await db().from("staff_payslips").select("gross, received_at").eq("user_id", id).eq("month", p.month).maybeSingle();
  if (!slip) return { error: "no_slip" };
  if (slip.received_at) return { error: "already", amount: Number(slip.gross), at: slip.received_at };
  const at = new Date().toISOString();
  const { data: got } = await db().from("staff_payslips").update({ received_at: at, received_via: "scan", received_by: id }).eq("user_id", id).eq("month", p.month).is("received_at", null).select("gross").maybeSingle();
  if (!got) return { error: "already" };
  done();
  return { ok: true, amount: Number(got.gross), at };
}
