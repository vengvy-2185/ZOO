import { NextResponse } from "next/server";
import { z } from "zod";
import { pollKhqr } from "@/lib/server/payments";

// Polled by the payment page every few seconds. Requires the secret access
// key that only the payer received, so nobody can probe other payments.
const Schema = z.object({
  kind: z.enum(["booking", "adoption"]),
  code: z.string().min(4).max(40),
  key: z.string().regex(/^[a-f0-9]{16,64}$/i),
  regenerate: z.boolean().optional(),
});

export async function POST(req: Request) {
  const parsed = Schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  const { kind, code, key, regenerate } = parsed.data;
  const view = await pollKhqr(kind, code, key, { regenerate });
  if (!view) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(view, { headers: { "Cache-Control": "no-store" } });
}
