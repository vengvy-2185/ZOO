import { NextResponse } from "next/server";
import { liveNow } from "@/lib/server/live";

// Is the zoo live right now? (the small "LIVE" button on the website)
export const dynamic = "force-dynamic";

export async function GET() {
  const s = await liveNow();
  return NextResponse.json(s ? { id: s.id, title: s.title, place: s.place, viewers: s.viewers_now } : null, { headers: { "Cache-Control": "public, max-age=10, s-maxage=10" } });
}
