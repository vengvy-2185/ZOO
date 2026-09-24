import "server-only";
import { createServiceRoleClient } from "@/lib/supabase/server";

export type DiscountCheck =
  | { ok: true; amount: number; codeId: string; name: string; nameKm: string | null; kind: "percent" | "amount"; value: number }
  | { ok: false; reason: "invalid" | "not_started" | "expired" | "min_total" | "used_up"; min?: number };

type Item = { ticket_type_id: string; quantity: number };

/** Subtotal from the real prices in the database (never from the browser). Null if a ticket type isn't on sale. */
export async function subtotalFor(items: Item[]): Promise<number | null> {
  const db = createServiceRoleClient();
  const ids = [...new Set(items.map((i) => i.ticket_type_id))];
  const { data } = await db.from("ticket_types").select("id, price_usd").eq("is_active", true).in("id", ids);
  if (!data || data.length !== ids.length) return null;
  const price = new Map(data.map((t) => [t.id, Number(t.price_usd)]));
  return Math.round(items.reduce((s, i) => s + (price.get(i.ticket_type_id) ?? 0) * i.quantity, 0) * 100) / 100;
}

const toCheck = (r: any): DiscountCheck =>
  r?.ok
    ? { ok: true, amount: Number(r.amount), codeId: r.code_id, name: r.name, nameKm: r.name_km ?? null, kind: r.kind, value: Number(r.value) }
    : { ok: false, reason: r?.reason ?? "invalid", min: r?.min != null ? Number(r.min) : undefined };

/** Preview only: is this code valid for this subtotal, and how much does it take off? */
export async function checkDiscount(code: string, subtotal: number): Promise<DiscountCheck> {
  const { data } = await createServiceRoleClient().rpc("check_discount", { p_code: code, p_subtotal: subtotal });
  return toCheck(data);
}

/** Locks the code, re-checks it and records the use against this booking. */
export async function redeemDiscount(code: string, bookingId: string, subtotal: number): Promise<DiscountCheck> {
  const { data, error } = await createServiceRoleClient().rpc("redeem_discount", { p_code: code, p_booking_id: bookingId, p_subtotal: subtotal });
  if (error) return { ok: false, reason: "invalid" };
  return toCheck(data);
}

/** Readable, hard-to-guess code, e.g. GWZ-7KQ4M2 (no 0/O/1/I to avoid mix-ups). */
export function generateCode(prefix = "GWZ") {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  return `${prefix}-${Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("")}`;
}
