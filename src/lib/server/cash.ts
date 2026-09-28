import "server-only";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { GATE_CATEGORIES } from "@/lib/data/gate";
import { getStaffSettings } from "./staff-settings";

// The daily cash close: what a gate person should hand in is worked out
// here, on the server, from the visitors they counted at the gate that day
// and the walk-in prices the admin set. Nobody types the expected amount.

export type CashLine = { category: string; count: number; price: number };

export async function expectedCash(userId: string, day: string) {
  const [s, { data }] = await Promise.all([
    getStaffSettings(),
    createServiceRoleClient().from("gate_entries").select("category, count").eq("entry_date", day).eq("created_by", userId).eq("source", "gate"),
  ]);
  const counts = new Map<string, number>();
  for (const r of (data ?? []) as { category: string; count: number }[]) counts.set(r.category, (counts.get(r.category) ?? 0) + r.count);
  const lines: CashLine[] = GATE_CATEGORIES.map((c) => ({ category: c.key, count: Math.max(0, counts.get(c.key) ?? 0), price: s.gate_prices[c.key] ?? 0 }));
  const visitors = lines.reduce((n, l) => n + l.count, 0);
  const expected = Math.round(lines.reduce((n, l) => n + l.count * l.price, 0) * 100) / 100;
  return { lines, visitors, expected, rate: s.usd_to_khr, tolerance: s.cash_tolerance };
}

export const usd = (n: number) => `$${Number(n).toFixed(2)}`;
