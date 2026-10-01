import { NextResponse } from "next/server";
import { z } from "zod";
import { answer } from "@/lib/server/assistant";
import { aiAnswer } from "@/lib/server/ai-assistant";

import { allow, tooMany } from "@/lib/server/rate-limit";
const Body = z.object({
  q: z.string().trim().min(1).max(300),
  lang: z.enum(["en", "km"]),
  // the conversation so far (the AI follows it; the keyword answers ignore it)
  history: z.array(z.object({ from: z.enum(["me", "bot"]), text: z.string().max(1500) })).max(16).optional(),
});

export async function POST(req: Request) {
  if (!(await allow("assistant", 120, 60))) return tooMany();
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ text: "" }, { status: 400 });
  const { q, lang, history = [] } = parsed.data;
  // a visitor may ask the AI at most 20 times a minute (it costs money)
  const ai = (await allow("assistant-ai", 20, 60)) ? await aiAnswer(q, lang, history) : null;
  return NextResponse.json(ai ?? (await answer(q, lang)), { headers: { "cache-control": "no-store" } });
}
