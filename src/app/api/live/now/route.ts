import { NextResponse } from "next/server";
import { liveNow } from "@/lib/server/live";
import { iceServers } from "@/lib/server/ice";

// Is the zoo live right now? (the LIVE button and the big live video on the home page)
export const dynamic = "force-dynamic";

export async function GET() {
  const s = await liveNow();
  if (!s) return NextResponse.json(null, { headers: { "Cache-Control": "no-store" } });
  return NextResponse.json({ id: s.id, title: s.title, place: s.place, viewers: s.viewers_now, likes: s.likes, ice: await iceServers() }, { headers: { "Cache-Control": "no-store" } });
}
