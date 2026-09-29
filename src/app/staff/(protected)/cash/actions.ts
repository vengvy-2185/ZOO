"use server";

import { revalidatePath } from "next/cache";
import { getVerifiedUserId } from "@/lib/auth/session";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { staffAccess } from "@/lib/server/staff";
import { expectedCash, usd } from "@/lib/server/cash";
import { zooToday } from "@/lib/data/gate";
import { notify, tg } from "@/lib/server/telegram";

import { audit } from "@/lib/server/audit";
export type CashState = { ok?: boolean; error?: string };

async function me() {
  const id = getVerifiedUserId();
  if (!id) throw new Error("Please sign in.");
  const access = await staffAccess(id);
  if (!access.ok) throw new Error("Not allowed.");
  return { id, access };
}

/** A gate person hands in today's cash: they type what they counted, the server works out the rest. */
export async function submitCashClose(_prev: CashState, formData: FormData): Promise<CashState> {
  const { id, access } = await me();
  if (!access.perms.has("tickets")) return { error: "perm" };
  const day = zooToday();
  const counted = Number(String(formData.get("counted_usd") ?? "0").replace(/,/g, "") || 0);
  const khr = Number(String(formData.get("counted_khr") ?? "0").replace(/,/g, "") || 0);
  const note = String(formData.get("note") ?? "").trim().slice(0, 400);
  if (!Number.isFinite(counted) || counted < 0 || counted > 100000 || !Number.isFinite(khr) || khr < 0 || khr > 400_000_000) return { error: "invalid" };

  const db = createServiceRoleClient();
  const { data: prev } = await db.from("staff_cash_closes").select("status, total_usd, first_total_usd, edits").eq("day", day).eq("user_id", id).maybeSingle();
  if (prev?.status === "approved") return { error: "approved" };

  const e = await expectedCash(id, day);
  const total = Math.round((counted + khr / e.rate) * 100) / 100;
  const diff = Math.round((total - e.expected) * 100) / 100;
  if (Math.abs(diff) > e.tolerance && !note) return { error: "note" };
  const { error } = await db.from("staff_cash_closes").upsert(
    {
      day,
      user_id: id,
      visitors: e.visitors,
      breakdown: e.lines,
      expected_usd: e.expected,
      counted_usd: Math.round(counted * 100) / 100,
      counted_khr: Math.round(khr),
      usd_to_khr: e.rate,
      total_usd: total,
      diff_usd: diff,
      note: note || null,
      first_total_usd: prev ? (prev.first_total_usd ?? prev.total_usd) : total,
      edits: prev ? (prev.edits ?? 0) + 1 : 0,
      status: "submitted",
      reviewed_by: null,
      reviewed_at: null,
      review_note: null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "day,user_id" }
  );
  if (error) return { error: error.message };

  const name = access.staff ? `${access.staff.full_name_km || access.staff.full_name} (${access.staff.staff_no})` : "Admin";
  const state = Math.abs(diff) <= e.tolerance ? "✅ ត្រូវគ្នា" : diff < 0 ? `⚠️ ខ្វះ ${usd(-diff)}` : `⚠️ លើស ${usd(diff)}`;
  await notify(
    "cash",
    `💵 <b>បិទបញ្ជីប្រាក់ · ${day}</b>\n👤 ${tg(name)}\n👥 ភ្ញៀវ ${e.visitors} នាក់\nត្រូវមាន ${usd(e.expected)} · រាប់បាន ${usd(total)}${khr ? ` (${usd(counted)} + ${Math.round(khr).toLocaleString("en-US")}៛)` : ""}\n${state}${prev ? `\n✏️ កែលើកទី ${(prev.edits ?? 0) + 1} (រាប់ដំបូង ${usd(Number(prev.first_total_usd ?? prev.total_usd))})` : ""}${note ?`\n💬 ${tg(note)}` : ""}`
  );
  revalidatePath("/staff/cash");
  return { ok: true };
}

/** Managers check a close: approve it, or flag it to look into. */
export async function reviewCashClose(closeId: string, status: "approved" | "flagged" | "submitted") {
  const { id, access } = await me();
  await audit("cash.review", "staff_cash_closes", closeId, { status });
  if (!(access.admin || access.perms.has("reports"))) throw new Error("Only managers.");
  if (!["approved", "flagged", "submitted"].includes(status)) throw new Error("invalid");
  await createServiceRoleClient()
    .from("staff_cash_closes")
    .update({ status, reviewed_by: status === "submitted" ? null : id, reviewed_at: status === "submitted" ? null : new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", closeId);
  revalidatePath("/staff/cash");
}
