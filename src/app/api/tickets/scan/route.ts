import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { getCachedRole } from "@/lib/auth/role";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { zooToday } from "@/lib/data/gate";

export type ScanVerdict = "ok" | "already" | "unpaid" | "cancelled" | "wrong_date" | "invalid";

/** Accepts either the raw ticket token or the ticket link printed in the QR (…/ticket/CODE?k=TOKEN). */
function extractToken(raw: string) {
  const s = raw.trim();
  try {
    const k = new URL(s).searchParams.get("k");
    if (k) return k;
  } catch {
    /* not a URL — treat as the token itself */
  }
  return s;
}

// Staff-only, one step: look the ticket up AND check it in, so the gate
// staff just scan and read the big coloured answer. Everything is decided
// here on the server from the database, never from the QR contents alone.
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const { role } = await getCachedRole(user.id);
  if (role !== "staff" && role !== "admin") return NextResponse.json({ error: "Not authorized" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const token = extractToken(String(body.token ?? ""));
  const force = body.force === true;
  if (!/^[A-Za-z0-9_-]{6,128}$/.test(token)) return NextResponse.json({ verdict: "invalid" satisfies ScanVerdict });

  const db = createServiceRoleClient();
  const { data: b } = await db
    .from("bookings")
    .select("id, booking_code, visit_date, status, total_usd, visitor_name, booking_items(quantity, ticket_types(name, khmer_name)), visitor_checkins(checked_in_at)")
    // Token from the QR, or the booking code typed by staff (charset already restricted above).
    .or(`qr_token.eq.${token},booking_code.eq.${token.toUpperCase()}`)
    .maybeSingle();
  if (!b) return NextResponse.json({ verdict: "invalid" satisfies ScanVerdict });

  const items = ((b.booking_items ?? []) as any[]).map((i) => ({ name: i.ticket_types?.name ?? "", name_km: i.ticket_types?.khmer_name ?? null, quantity: i.quantity as number }));
  const ticket = {
    code: b.booking_code,
    name: b.visitor_name,
    visitDate: b.visit_date,
    total: Number(b.total_usd),
    visitors: items.reduce((s, i) => s + i.quantity, 0),
    items,
  };
  const reply = (verdict: ScanVerdict, extra: object = {}) => NextResponse.json({ verdict, ticket, ...extra });

  const previous = ([b.visitor_checkins].flat()[0] as { checked_in_at?: string } | undefined)?.checked_in_at;
  if (previous) return reply("already", { checkedInAt: previous });
  if (b.status === "cancelled") return reply("cancelled");
  if (b.status !== "confirmed") return reply("unpaid");
  if (b.visit_date !== zooToday() && !force) return reply("wrong_date", { today: zooToday() });

  const { data: checkin, error } = await db
    .from("visitor_checkins")
    .insert({ booking_id: b.id, checked_in_by: user.id, visitors_count: ticket.visitors })
    .select("checked_in_at")
    .single();
  if (error) {
    // Unique index: someone else scanned the same ticket a moment ago.
    if (error.code === "23505") return reply("already", { checkedInAt: new Date().toISOString() });
    return NextResponse.json({ error: "Could not check in this ticket." }, { status: 500 });
  }
  return reply("ok", { checkedInAt: checkin.checked_in_at });
}
