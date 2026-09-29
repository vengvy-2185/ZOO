import "server-only";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { getPrivateSetting, type PaymentSettings, type ShopPaymentSettings } from "./private-settings";
import { createKhqr, khqrLogo } from "./bakong";
import type { staffAccess } from "./staff";

// The souvenir shop: products with stock, and sales made at the till by an
// admin or a seller. Prices always come from the database (never from the
// browser). KHQR sales use the shop's own Bakong account and are marked paid
// only when Bakong reports the transfer; cash sales are paid on the spot.

export type Product = {
  id: string;
  sku: string | null;
  name: string;
  name_km: string | null;
  description: string | null;
  category: string;
  price_usd: number;
  stock: number;
  low_stock: number;
  image_url: string | null;
  active: boolean;
  sort: number;
};

export const CATEGORIES: Record<string, [string, string]> = {
  plush: ["Plush toys", "តុក្កតា"],
  apparel: ["Clothes", "សម្លៀកបំពាក់"],
  accessories: ["Accessories", "គ្រឿងតុបតែង"],
  home: ["Home", "ប្រើប្រាស់ក្នុងផ្ទះ"],
  stationery: ["Stationery", "សម្ភារៈសិក្សា"],
  gifts: ["Gifts", "កាដូ"],
};

export const canSell = (access: Awaited<ReturnType<typeof staffAccess>>) => access.ok && (access.admin || access.perms.has("shop"));

export async function getProducts(all = false): Promise<Product[]> {
  let q = createServiceRoleClient().from("shop_products").select("*").order("sort").order("name");
  if (!all) q = q.eq("active", true);
  const { data } = await q;
  return (data ?? []).map((p: any) => ({ ...p, price_usd: Number(p.price_usd) }));
}

/** The shop's KHQR settings, on top of the ticket ones (API token, rate, logo). */
export async function shopPayConfig() {
  const [pay, shop] = await Promise.all([getPrivateSetting<PaymentSettings>("payment"), getPrivateSetting<ShopPaymentSettings>("shop_payment")]);
  const merged: PaymentSettings = {
    ...pay,
    bakong_account_id: shop.bakong_account_id,
    merchant_name: shop.merchant_name || "GWZ Souvenir Shop",
    merchant_city: shop.merchant_city || pay.merchant_city,
    bank_account: shop.bank_account,
    bank_name: shop.bank_name,
    currency: shop.currency ?? "USD",
    api_token: shop.api_token || pay.api_token,
  };
  const ready = Boolean(shop.enabled && shop.bakong_account_id && merged.api_token);
  return { settings: merged, ready, rate: pay.usd_to_khr || 4100, logo: khqrLogo(pay) };
}

export function shopKhqr(settings: PaymentSettings, totalUsd: number, code: string) {
  return createKhqr(settings, totalUsd, code);
}

/** SH-240929-4821: the day and a short number, easy to read out. */
export function saleCode() {
  const d = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Phnom_Penh", year: "2-digit", month: "2-digit", day: "2-digit" }).format(new Date()).replace(/-/g, "");
  return `SH-${d}-${String(Math.floor(1000 + Math.random() * 9000))}`;
}

export const dayStart = (daysAgo = 0) => {
  const d = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Phnom_Penh" }).format(new Date(Date.now() - daysAgo * 864e5));
  return new Date(`${d}T00:00:00+07:00`).toISOString();
};
