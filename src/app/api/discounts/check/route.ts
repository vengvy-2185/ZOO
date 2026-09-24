import { NextResponse } from "next/server";
import { z } from "zod";
import { checkDiscount, subtotalFor } from "@/lib/server/discounts";

const Body = z.object({
  code: z.string().trim().min(3).max(40),
  items: z.array(z.object({ ticket_type_id: z.string().uuid(), quantity: z.number().int().min(1).max(50) })).min(1).max(20),
});

// Checkout preview: how much a code takes off this basket (prices from the database).
export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, reason: "invalid" });
  const subtotal = await subtotalFor(parsed.data.items);
  if (subtotal == null) return NextResponse.json({ ok: false, reason: "invalid" });
  const res = await checkDiscount(parsed.data.code, subtotal);
  return NextResponse.json(
    res.ok ? { ok: true, amount: res.amount, name: res.name, nameKm: res.nameKm, subtotal, total: Math.max(0, subtotal - res.amount) } : res,
    { headers: { "cache-control": "no-store" } }
  );
}
