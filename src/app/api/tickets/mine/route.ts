import { NextResponse } from "next/server";
import { z } from "zod";
import { createServiceRoleClient } from "@/lib/supabase/server";

const Body = z.object({
  items: z
    .array(z.object({ code: z.string().regex(/^[A-Z0-9-]{4,32}$/), k: z.string().regex(/^[a-f0-9]{16,64}$/i) }))
    .max(30),
});

// Status of tickets remembered on this device (guests have no account).
// Each ticket is returned only when its secret key matches.
export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ tickets: [] });
  const items = parsed.data.items;
  if (!items.length) return NextResponse.json({ tickets: [] });

  const { data } = await createServiceRoleClient()
    .from("bookings")
    .select("booking_code, qr_token, visit_date, status, total_usd, booking_items(quantity), visitor_checkins(checked_in_at)")
    .in(
      "booking_code",
      items.map((i) => i.code)
    );
  const keyOf = new Map(items.map((i) => [i.code, i.k.toLowerCase()]));
  const tickets = ((data ?? []) as any[])
    .filter((b) => keyOf.get(b.booking_code) === String(b.qr_token).toLowerCase())
    .map((b) => ({
      code: b.booking_code,
      k: b.qr_token,
      visitDate: b.visit_date,
      status: b.status,
      total: Number(b.total_usd),
      visitors: (b.booking_items ?? []).reduce((s: number, i: any) => s + i.quantity, 0),
      usedAt: ([b.visitor_checkins].flat()[0] as any)?.checked_in_at ?? null,
    }));
  return NextResponse.json({ tickets }, { headers: { "cache-control": "no-store" } });
}
