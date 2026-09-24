import { NextResponse } from "next/server";
import { z } from "zod";
import { ensureNarration } from "@/lib/server/tts";

const Body = z.object({ code: z.string().min(1).max(40).regex(/^[A-Za-z0-9_-]+$/), lang: z.enum(["km", "en", "zh"]) });

// Returns the natural-voice MP3 URL for an animal, generating it once on
// first request. Later requests reuse the stored file, so Azure is only
// called when a script is new or has changed.
export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad-request" }, { status: 400 });
  try {
    const r = await ensureNarration(parsed.data.code, parsed.data.lang);
    if ("error" in r) return NextResponse.json(r, { status: r.error === "not-found" ? 404 : 503 });
    return NextResponse.json(r);
  } catch (e) {
    console.error("[tts]", e);
    return NextResponse.json({ error: "tts-failed" }, { status: 502 });
  }
}
