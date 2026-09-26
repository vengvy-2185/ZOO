import { createServiceRoleClient } from "@/lib/supabase/server";
import { zooToday } from "@/lib/data/gate";

export type ScanVerdict = "ok" | "already" | "unpaid" | "cancelled" | "wrong_date" | "invalid";
export type ScanTicket = {
  code: string;
  name: string | null;
  visitDate: string;
  total: number;
  visitors: number;
  items: { name: string; name_km: string | null; quantity: number }[];
};
export type ScanOutcome = { verdict: ScanVerdict; ticket?: ScanTicket; checkedInAt?: string; today?: string; error?: string };

/** Accepts either the raw ticket token or the ticket link printed in the QR (…/ticket/CODE?k=TOKEN). */
export function extractToken(raw: string) {
  const s = raw.trim();
  try {
    const k = new URL(s).searchParams.get("k");
    if (k) return k;
  } catch {
    /* not a URL — treat as the token itself */
  }
  return s;
}

/**
 * Looks a ticket up AND checks it in, in one step. Only call this for a
 * signed-in staff member or admin (the caller checks the role). Everything
 * is decided here from the database, never from the QR contents alone.
 */
export async function checkInTicket(rawToken: string, staffUserId: string, force = false): Promise<ScanOutcome> {
  const token = extractToken(rawToken);
  if (!/^[A-Za-z0-9_-]{6,128}$/.test(token)) return { verdict: "invalid" };

  const db = createServiceRoleClient();
  const { data: b } = await db
    .from("bookings")
    .select("id, booking_code, visit_date, status, total_usd, visitor_name, booking_items(quantity, ticket_types(name, khmer_name)), visitor_checkins(checked_in_at)")
    // Only the secret token inside the ticket's QR lets someone in: a paid
    // ticket must be scanned, a booking code typed by hand is not enough.
    .eq("qr_token", token)
    .maybeSingle();
  if (!b) return { verdict: "invalid" };

  const items = ((b.booking_items ?? []) as any[]).map((i) => ({ name: i.ticket_types?.name ?? "", name_km: i.ticket_types?.khmer_name ?? null, quantity: i.quantity as number }));
  const ticket: ScanTicket = {
    code: b.booking_code,
    name: b.visitor_name,
    visitDate: b.visit_date,
    total: Number(b.total_usd),
    visitors: items.reduce((s, i) => s + i.quantity, 0),
    items,
  };

  const previous = ([b.visitor_checkins].flat()[0] as { checked_in_at?: string } | undefined)?.checked_in_at;
  if (previous) return { verdict: "already", ticket, checkedInAt: previous };
  if (b.status === "cancelled") return { verdict: "cancelled", ticket };
  if (b.status !== "confirmed") return { verdict: "unpaid", ticket };
  if (b.visit_date !== zooToday() && !force) return { verdict: "wrong_date", ticket, today: zooToday() };

  const { data: checkin, error } = await db
    .from("visitor_checkins")
    .insert({ booking_id: b.id, checked_in_by: staffUserId, visitors_count: ticket.visitors })
    .select("checked_in_at")
    .single();
  if (error) {
    // Unique index: someone else scanned the same ticket a moment ago.
    if (error.code === "23505") return { verdict: "already", ticket, checkedInAt: new Date().toISOString() };
    return { verdict: "invalid", ticket, error: "Could not check in this ticket." };
  }
  return { verdict: "ok", ticket, checkedInAt: checkin.checked_in_at };
}
