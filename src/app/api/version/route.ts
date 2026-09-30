import { NextResponse } from "next/server";

// The version that is live right now (an open app compares it with its own).
export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({ v: process.env.NEXT_PUBLIC_BUILD_ID ?? "" }, { headers: { "Cache-Control": "no-store" } });
}
