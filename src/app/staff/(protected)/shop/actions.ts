"use server";

import { revalidatePath } from "next/cache";
import { getVerifiedUserId } from "@/lib/auth/session";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { staffAccess } from "@/lib/server/staff";
import { canSell, saleCode, shopKhqr, shopPayConfig } from "@/lib/server/shop";
import { pollShopSale } from "@/lib/server/payments";
import { notify, tg } from "@/lib/server/telegram";
import { audit } from "@/lib/server/audit";

async function seller() {
  const id = getVerifiedUserId();
  if (!id) throw new Error("Please sign in.");
  const access = await staffAccess(id);
  if (!canSell(access)) throw new Error("Only shop sellers can do this.");
  return { id, access };
}

export type SaleResult = {
  error?: string;
  id?: string;
  code?: string;
  total?: number;
  change?: number;
  qr?: string;
  amount?: number;
  currency?: string;
  expiresAt?: string;
  merchant?: string;
  logo?: string;
};

/** Ring up a sale. The browser only says which items and how many; prices come from the database. */
export async function createSale(items: { id: string; qty: number }[], method: "cash" | "khqr", cashGiven?: number): Promise<SaleResult> {
  const { id, access } = await seller();
  const lines = items.filter((i) => typeof i.id === "string" && Number.isInteger(i.qty) && i.qty > 0 && i.qty <= 999).slice(0, 60);
  if (!lines.length) return { error: "empty" };
  const db = createServiceRoleClient();
  const { data: prods } = await db.from("shop_products").select("id, name, name_km, price_usd, stock, active").in("id", lines.map((l) => l.id));
  const byId = new Map((prods ?? []).map((p: any) => [p.id, p]));
  for (const l of lines) {
    const p: any = byId.get(l.id);
    if (!p || !p.active) return { error: "gone" };
    if (p.stock < l.qty) return { error: `stock:${p.name_km || p.name}:${p.stock}` };
  }
  const total = Math.round(lines.reduce((s, l) => s + Number((byId.get(l.id) as any).price_usd) * l.qty, 0) * 100) / 100;
  let pay: Awaited<ReturnType<typeof shopPayConfig>> | null = null;
  if (method === "khqr") {
    pay = await shopPayConfig();
    if (!pay.ready) return { error: "khqr-off" };
  }
  if (method === "cash" && cashGiven != null && cashGiven + 1e-9 < total) return { error: "cash-short" };

  // a fresh code (tried again in the rare case it already exists)
  let sale: { id: string; code: string } | null = null;
  for (let i = 0; i < 4 && !sale; i++) {
    const code = saleCode();
    const q = pay ? shopKhqr(pay.settings, total, code) : null;
    const { data, error } = await db
      .from("shop_sales")
      .insert({
        code,
        seller_id: id,
        total_usd: total,
        method,
        cash_given: method === "cash" ? cashGiven ?? total : null,
        khqr: q?.qr ?? null,
        md5: q?.md5 ?? null,
        currency: q?.currency ?? "USD",
        amount: q?.amount ?? total,
        expires_at: q?.expiresAt.toISOString() ?? null,
      })
      .select("id, code")
      .single();
    if (!error && data) sale = data;
    else if (error && error.code !== "23505") return { error: error.message };
  }
  if (!sale) return { error: "code" };
  await db.from("shop_sale_items").insert(lines.map((l) => ({ sale_id: sale!.id, product_id: l.id, name: (byId.get(l.id) as any).name_km || (byId.get(l.id) as any).name, price_usd: (byId.get(l.id) as any).price_usd, qty: l.qty })));

  if (method === "cash") {
    await db.rpc("shop_finish_sale", { p_sale: sale.id, p_ref: null, p_from: null });
    await notify("shop", `🛍 <b>លក់វត្ថុអនុស្សាវរីយ៍ · សាច់ប្រាក់</b>\n${tg(sale.code)} · $${total.toFixed(2)}\n👤 ${tg(access.staff?.full_name ?? "Admin")}`);
    revalidatePath("/staff/shop");
    return { id: sale.id, code: sale.code, total, change: Math.max(0, Math.round(((cashGiven ?? total) - total) * 100) / 100) };
  }
  const { data: row } = await db.from("shop_sales").select("khqr, amount, currency, expires_at").eq("id", sale.id).single();
  return { id: sale.id, code: sale.code, total, qr: row!.khqr, amount: Number(row!.amount), currency: row!.currency, expiresAt: row!.expires_at, merchant: pay!.settings.merchant_name, logo: pay!.logo };
}

/** The till asks every few seconds; "check now" asks Bakong straight away. */
export async function checkSale(saleId: string, force = false) {
  await seller();
  const r = await pollShopSale(saleId, force);
  if (r.status === "paid") revalidatePath("/staff/shop");
  return r;
}

/** The QR ran out before paying: a new one for the same sale (same amount). */
export async function renewSaleQr(saleId: string): Promise<SaleResult> {
  await seller();
  const db = createServiceRoleClient();
  const { data: s } = await db.from("shop_sales").select("code, total_usd, status, method").eq("id", saleId).maybeSingle();
  if (!s || s.status !== "pending" || s.method !== "khqr") return { error: "invalid" };
  const pay = await shopPayConfig();
  if (!pay.ready) return { error: "khqr-off" };
  const q = shopKhqr(pay.settings, Number(s.total_usd), s.code);
  await db.from("shop_sales").update({ khqr: q.qr, md5: q.md5, currency: q.currency, amount: q.amount, expires_at: q.expiresAt.toISOString(), last_checked_at: null }).eq("id", saleId);
  return { id: saleId, code: s.code, total: Number(s.total_usd), qr: q.qr, amount: q.amount, currency: q.currency, expiresAt: q.expiresAt.toISOString(), merchant: pay.settings.merchant_name, logo: pay.logo };
}

/** A KHQR sale the customer didn't pay (nothing leaves the stock). */
export async function cancelSale(saleId: string) {
  const { id, access } = await seller();
  const db = createServiceRoleClient();
  let q = db.from("shop_sales").update({ status: "cancelled" }).eq("id", saleId).eq("status", "pending");
  if (!access.admin && !access.perms.has("reports")) q = q.eq("seller_id", id);
  await q;
  await audit("shop.cancel", "shop_sales", saleId);
  revalidatePath("/staff/shop");
}
