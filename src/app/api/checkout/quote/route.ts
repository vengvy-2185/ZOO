import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth/session";
import { quote } from "@/lib/server/quote";

export const dynamic = "force-dynamic";

const Body = z.object({
  items: z.array(z.object({ ticket_type_id: z.string().uuid(), quantity: z.number().int().min(1).max(50) })).min(1).max(20),
  code: z.string().trim().max(40).optional().nullable(),
  usePoints: z.boolean().optional(),
});

/** Checkout preview: subtotal, code discount, points discount and what is left to pay. */
export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });
  const user = await getSessionUser();
  const q = await quote(parsed.data.items, { code: parsed.data.code, usePoints: parsed.data.usePoints, userId: user?.id });
  if (!q) return NextResponse.json({ error: "invalid" }, { status: 400 });
  return NextResponse.json(q, { headers: { "cache-control": "no-store" } });
}
