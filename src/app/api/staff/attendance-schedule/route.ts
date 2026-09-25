import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { staffAccess } from "@/lib/server/staff";
import { kioskSchedule } from "@/lib/server/attendance";
import { getI18n } from "@/lib/i18n/server";

// Today's attendance QR times, for the pop-up that shows on every page.
// Only admins and managers get it (they are the ones showing the QR).
export const dynamic = "force-dynamic";

export async function GET() {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ allowed: false }, { headers: { "Cache-Control": "no-store" } });
  const access = await staffAccess(me.id);
  if (!access.admin && !access.perms.has("reports")) return NextResponse.json({ allowed: false }, { headers: { "Cache-Control": "no-store" } });
  const sched = await kioskSchedule(getI18n().locale === "km");
  return NextResponse.json({ allowed: true, ...sched }, { headers: { "Cache-Control": "no-store" } });
}
