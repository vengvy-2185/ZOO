import { NextResponse } from "next/server";
import { z } from "zod";
import { serviceClient } from "@/lib/server/private-settings";
import { startKhqr } from "@/lib/server/payments";
import { ADOPTION_TIERS } from "@/lib/data/adoption";
import { getSessionUser } from "@/lib/auth/session";

const Schema = z.object({
  animalCode: z.string().min(3).max(40),
  tier: z.enum(["friend", "guardian", "hero"]),
  name: z.string().trim().min(1).max(60),
  email: z.string().trim().email().max(120).optional().or(z.literal("")),
  message: z.string().trim().max(200).optional(),
});

// Starts an adoption: price comes from the tier on the server (never from
// the browser), then a KHQR is created; it's marked paid only once Bakong confirms.
export async function POST(req: Request) {
  if (!(await getSessionUser())) return NextResponse.json({ error: "signin" }, { status: 401 });
  const parsed = Schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  const { animalCode, tier, name, email, message } = parsed.data;
  const db = serviceClient();

  const { data: animal } = await db.from("animals").select("id").eq("animal_code", animalCode).eq("status", "active").maybeSingle();
  if (!animal) return NextResponse.json({ error: "Animal not found" }, { status: 404 });

  const amount = ADOPTION_TIERS[tier];
  const { data: adoption, error } = await db
    .from("adoptions")
    .insert({ animal_id: animal.id, adopter_name: name, adopter_email: email || null, message: message || null, tier, amount_usd: amount })
    .select("id, code, access_key")
    .single();
  if (error || !adoption) return NextResponse.json({ error: "Could not start the adoption." }, { status: 500 });

  try {
    // Stays "pending" until Bakong confirms the transfer (never auto-paid).
    await startKhqr("adoption", adoption.id, amount, adoption.code);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Could not create the KHQR payment." }, { status: 502 });
  }

  return NextResponse.json({ code: adoption.code, accessKey: adoption.access_key });
}
