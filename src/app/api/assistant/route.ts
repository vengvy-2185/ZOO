import { NextResponse } from "next/server";
import { z } from "zod";
import { answer } from "@/lib/server/assistant";

const Body = z.object({ q: z.string().trim().min(1).max(300), lang: z.enum(["en", "km"]) });

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ text: "" }, { status: 400 });
  return NextResponse.json(await answer(parsed.data.q, parsed.data.lang), { headers: { "cache-control": "no-store" } });
}
