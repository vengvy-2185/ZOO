import "server-only";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { checkDiscount, subtotalFor } from "./discounts";

/** 200 points = $1, and points can pay for at most half of what is left after a code. */
export const POINTS_PER_DOLLAR = 200;
export const POINTS_MAX_SHARE = 0.5;

type Item = { ticket_type_id: string; quantity: number };

/** How much a points balance can take off an amount (cents are exact). */
export function pointsFor(balance: number, amount: number) {
  const capCents = Math.floor(amount * 100 * POINTS_MAX_SHARE);
  const balanceCents = Math.floor((Math.max(0, balance) * 100) / POINTS_PER_DOLLAR);
  const cents = Math.max(0, Math.min(capCents, balanceCents));
  return { discount: cents / 100, used: Math.ceil((cents * POINTS_PER_DOLLAR) / 100) };
}

export type Quote = {
  subtotal: number;
  code: { ok: true; code: string; amount: number; name: string; nameKm: string | null } | { ok: false; reason: string; min?: number } | null;
  pointsBalance: number | null; // null when not signed in
  pointsUsed: number;
  pointsDiscount: number;
  totalDiscount: number;
  total: number;
};

/** The one place prices, codes and points are worked out (preview and real checkout use it). */
export async function quote(items: Item[], opts: { code?: string | null; usePoints?: boolean; userId?: string | null }): Promise<Quote | null> {
  const subtotal = await subtotalFor(items);
  if (subtotal == null) return null;

  let code: Quote["code"] = null;
  let codeAmount = 0;
  if (opts.code?.trim()) {
    const r = await checkDiscount(opts.code, subtotal);
    if (r.ok) {
      codeAmount = r.amount;
      code = { ok: true, code: opts.code.trim().toUpperCase(), amount: r.amount, name: r.name, nameKm: r.nameKm };
    } else code = { ok: false, reason: r.reason, min: r.min };
  }

  let pointsBalance: number | null = null;
  let pointsUsed = 0;
  let pointsDiscount = 0;
  if (opts.userId) {
    const { data } = await createServiceRoleClient().rpc("points_balance", { p_user: opts.userId });
    pointsBalance = Math.max(0, Number(data ?? 0));
    if (opts.usePoints && pointsBalance > 0) {
      const p = pointsFor(pointsBalance, subtotal - codeAmount);
      pointsDiscount = p.discount;
      pointsUsed = p.used;
    }
  }

  const totalDiscount = Math.round((codeAmount + pointsDiscount) * 100) / 100;
  return { subtotal, code, pointsBalance, pointsUsed, pointsDiscount, totalDiscount, total: Math.max(0, Math.round((subtotal - totalDiscount) * 100) / 100) };
}
