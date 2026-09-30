import { NextResponse } from "next/server";
import { getTtsConfig, synthesize } from "@/lib/server/tts";
import { allow, tooMany } from "@/lib/server/rate-limit";

// Short messages read aloud (Khmer or English) with the natural Azure voice.
// Without an Azure key this answers 204 and the phone uses its own voice.
// GET, so the same sentence is cached by the browser and the CDN.
export async function GET(req: Request) {
  const u = new URL(req.url);
  const text = (u.searchParams.get("t") ?? "").replace(/\s+/g, " ").trim().slice(0, 300);
  const lang = u.searchParams.get("l") === "km" ? "km" : "en";
  if (!text) return new NextResponse(null, { status: 400 });
  const { settings, ready } = await getTtsConfig();
  if (!ready) return new NextResponse(null, { status: 204 });
  if (!(await allow("speak", 60, 60))) return tooMany();
  try {
    const { audio } = await synthesize(settings, lang, text);
    return new NextResponse(new Uint8Array(audio), { headers: { "Content-Type": "audio/mpeg", "Cache-Control": "public, max-age=86400, s-maxage=604800" } });
  } catch {
    return new NextResponse(null, { status: 204 });
  }
}
