import "server-only";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { cardTypeFor, type CardType } from "@/lib/members";

export type MemberRow = {
  id: string;
  name: string;
  email: string | null;
  avatar: string | null;
  role: string;
  since: string;
  visits: number; // tickets checked in at the gate
  bookings: number; // paid bookings
  spent: number; // total paid, USD
  card: CardType | null;
  cardStatus: "ready" | "printed" | "collected" | null;
  cardPrintedAs: string | null;
  verifyToken: string | null; // the secret in the card's QR
  issueCount: number; // how many printed cards were handed over (first + replacements)
  lastIssuedAt: string | null;
  // staff only: the Staff ID printed on the card, and their position
  staffNo: string | null;
  positionEn: string | null;
  positionKm: string | null;
  staffStatus: string | null;
};

/** Visits, spending and card status for every account (or one account). */
export async function getMembers(onlyUserId?: string): Promise<MemberRow[]> {
  const db = createServiceRoleClient();
  let profilesQ = db.from("profiles").select("id, role, full_name, avatar_url, created_at");
  if (onlyUserId) profilesQ = profilesQ.eq("id", onlyUserId);
  let bookingsQ = db.from("bookings").select("id, visitor_id, total_usd, status, visitor_checkins(id)").not("visitor_id", "is", null).eq("status", "confirmed");
  if (onlyUserId) bookingsQ = bookingsQ.eq("visitor_id", onlyUserId);
  let cardsQ = db.from("member_cards").select("user_id, card_type, status, verify_token");
  if (onlyUserId) cardsQ = cardsQ.eq("user_id", onlyUserId);
  let staffQ = db.from("staff_members").select("user_id, staff_no, full_name, status, position:staff_positions(name, name_km)");
  if (onlyUserId) staffQ = staffQ.eq("user_id", onlyUserId);
  let issuesQ = db.from("member_card_issues").select("user_id, issued_at").order("issued_at", { ascending: false });
  if (onlyUserId) issuesQ = issuesQ.eq("user_id", onlyUserId);

  const [{ data: profiles }, { data: bookings }, { data: cards }, { data: issues }, users, { data: staffRows }] = await Promise.all([
    profilesQ,
    bookingsQ,
    cardsQ,
    issuesQ,
    onlyUserId
      ? db.auth.admin.getUserById(onlyUserId).then((r) => (r.data.user ? [r.data.user] : []))
      : db.auth.admin.listUsers({ perPage: 1000 }).then((r) => r.data?.users ?? []),
    staffQ,
  ]);
  const staffMap = new Map((staffRows ?? []).map((s: any) => [s.user_id, s]));

  const byUser = new Map<string, { visits: number; bookings: number; spent: number }>();
  for (const b of bookings ?? []) {
    const s = byUser.get(b.visitor_id!) ?? { visits: 0, bookings: 0, spent: 0 };
    s.bookings += 1;
    s.spent += Number(b.total_usd);
    if ([b.visitor_checkins].flat().filter(Boolean).length) s.visits += 1;
    byUser.set(b.visitor_id!, s);
  }
  const auth = new Map(users.map((u: any) => [u.id, u]));
  const cardMap = new Map((cards ?? []).map((c) => [c.user_id, c]));
  const issueMap = new Map<string, { n: number; last: string }>();
  for (const i of issues ?? []) {
    const e = issueMap.get(i.user_id);
    if (e) e.n += 1;
    else issueMap.set(i.user_id, { n: 1, last: i.issued_at });
  }

  return (profiles ?? []).map((p) => {
    const u: any = auth.get(p.id);
    const meta = u?.user_metadata ?? {};
    const s = byUser.get(p.id) ?? { visits: 0, bookings: 0, spent: 0 };
    const c = cardMap.get(p.id);
    const st: any = staffMap.get(p.id);
    const internalEmail = (u?.email ?? "").endsWith("@staff.greenwildzoo.local");
    return {
      id: p.id,
      name: st?.full_name || meta.display_name || p.full_name || meta.full_name || meta.name || (u?.email ?? "").split("@")[0] || "Guest",
      email: internalEmail ? null : u?.email ?? null,
      avatar: meta.custom_avatar_url || p.avatar_url || meta.avatar_url || meta.picture || null,
      role: p.role,
      since: p.created_at,
      visits: s.visits,
      bookings: s.bookings,
      spent: Math.round(s.spent * 100) / 100,
      card: cardTypeFor(p.role, s.visits, s.spent),
      cardStatus: (c?.status as MemberRow["cardStatus"]) ?? null,
      cardPrintedAs: c?.card_type ?? null,
      verifyToken: c?.verify_token ?? null,
      issueCount: issueMap.get(p.id)?.n ?? 0,
      lastIssuedAt: issueMap.get(p.id)?.last ?? null,
      staffNo: st?.staff_no ?? null,
      positionEn: st?.position?.name ?? null,
      positionKm: st?.position?.name_km ?? null,
      staffStatus: st?.status ?? null,
    };
  });
}

/** Makes sure a person who has earned a card has a card record (with its QR token). */
export async function ensureCard(m: MemberRow): Promise<MemberRow> {
  if (!m.card) return m;
  const db = createServiceRoleClient();
  if (!m.verifyToken) {
    await db.from("member_cards").upsert({ user_id: m.id, card_type: m.card }, { onConflict: "user_id", ignoreDuplicates: true });
  } else if (m.cardPrintedAs !== m.card) {
    // Moved up a level (e.g. Silver to Gold): same QR, new card colour.
    await db.from("member_cards").update({ card_type: m.card, updated_at: new Date().toISOString() }).eq("user_id", m.id);
  } else return m;
  const [fresh] = await getMembers(m.id);
  return fresh ?? m;
}

/** Looks up a card from the QR token (for the public check page). */
export async function getCardByToken(token: string) {
  if (!/^[a-f0-9]{16,64}$/i.test(token)) return null;
  const { data } = await createServiceRoleClient().from("member_cards").select("user_id").eq("verify_token", token.toLowerCase()).maybeSingle();
  if (!data) return null;
  const [m] = await getMembers(data.user_id);
  return m ?? null;
}
