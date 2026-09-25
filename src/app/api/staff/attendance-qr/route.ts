import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { staffAccess } from "@/lib/server/staff";
import { currentQrToken } from "@/lib/server/attendance";

// This minute's attendance QR token, for the screen at the zoo. Only admins
// and managers can show it (so nobody can get a code without being there).
export const dynamic = "force-dynamic";

export async function GET() {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "signin" }, { status: 401 });
  const access = await staffAccess(me.id);
  if (!access.admin && !access.perms.has("reports")) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  return NextResponse.json(await currentQrToken(), { headers: { "Cache-Control": "no-store" } });
}
