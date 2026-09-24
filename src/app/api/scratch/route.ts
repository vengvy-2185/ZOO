import { NextResponse } from "next/server";
import { z } from "zod";
import { claimScratch } from "@/lib/server/scratch";

const Body = z.object({ code: z.string().regex(/^[A-Z0-9-]{4,32}$/), k: z.string().regex(/^[a-f0-9]{16,64}$/i) });

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad-request" }, { status: 400 });
  const prize = await claimScratch(parsed.data.code, parsed.data.k);
  if (!prize) return NextResponse.json({ error: "not-available" }, { status: 404 });
  return NextResponse.json(prize, { headers: { "cache-control": "no-store" } });
}
