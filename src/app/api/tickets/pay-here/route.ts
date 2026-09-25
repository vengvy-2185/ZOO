import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { staffAccess } from "@/lib/server/staff";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { extractToken } from "@/lib/server/checkin";

// Staff at the counter: an unpaid ticket was scanned, so hand the staff
// device this booking's code + key; it then shows the KHQR (same payment
// flow as the visitor's pay page, confirmed only by Bakong).
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  // admins, or active staff whose position includes ticket work
  if (!(await staffAccess(user.id)).perms.has("tickets")) return NextResponse.json({ error: "Not authorized" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const token = extractToken(String(body.token ?? ""));
  if (!/^[A-Za-z0-9_-]{6,128}$/.test(token)) return NextResponse.json({ error: "invalid" }, { status: 400 });
  const { data: b } = await createServiceRoleClient()
    .from("bookings")
    .select("booking_code, qr_token, status")
    .or(`qr_token.eq.${token},booking_code.eq.${token.toUpperCase()}`)
    .maybeSingle();
  if (!b || b.status !== "pending") return NextResponse.json({ error: "not payable" }, { status: 404 });
  return NextResponse.json({ code: b.booking_code, key: b.qr_token });
}
