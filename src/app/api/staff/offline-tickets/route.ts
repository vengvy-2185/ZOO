import { NextResponse } from "next/server";
import { createHash } from "crypto";
import { getSessionUser } from "@/lib/auth/session";
import { staffAccess } from "@/lib/server/staff";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { zooToday } from "@/lib/data/gate";
import { allow, tooMany } from "@/lib/server/rate-limit";

// Today's tickets for the gate scanner to keep on the device, so scanning
// still works when the internet drops. Each ticket is known only by a hash
// of its secret QR token (the token itself never leaves the server here).
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (!(await staffAccess(user.id)).perms.has("tickets")) return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  if (!(await allow("offline-tickets", 30, 60, user.id))) return tooMany();

  const today = zooToday();
  const { data, error } = await createServiceRoleClient()
    .from("bookings")
    .select("booking_code, qr_token, status, visit_date, visitor_name, booking_items(quantity, ticket_types(name, khmer_name)), visitor_checkins(checked_in_at)")
    .eq("visit_date", today)
    .neq("status", "cancelled")
    .limit(5000);
  if (error) return NextResponse.json({ error: "unavailable" }, { status: 503 });

  const tickets = ((data ?? []) as any[])
    .filter((b) => b.qr_token)
    .map((b) => {
      const items = ((b.booking_items ?? []) as any[]).map((i) => ({ name: i.ticket_types?.name ?? "", name_km: i.ticket_types?.khmer_name ?? null, quantity: i.quantity as number }));
      return {
        h: createHash("sha256").update(String(b.qr_token)).digest("hex"),
        code: b.booking_code as string,
        name: (b.visitor_name as string | null) ?? null,
        status: b.status as "pending" | "confirmed",
        visitDate: b.visit_date as string,
        visitors: items.reduce((n, i) => n + i.quantity, 0),
        items,
        checkedInAt: ([b.visitor_checkins].flat()[0] as { checked_in_at?: string } | undefined)?.checked_in_at ?? null,
      };
    });
  return NextResponse.json({ day: today, at: new Date().toISOString(), tickets }, { headers: { "Cache-Control": "no-store" } });
}
