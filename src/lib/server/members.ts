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
  cardStatus: "printed" | "collected" | null;
  cardPrintedAs: string | null;
};

/** Visits, spending and card status for every account (or one account). */
export async function getMembers(onlyUserId?: string): Promise<MemberRow[]> {
  const db = createServiceRoleClient();
  let profilesQ = db.from("profiles").select("id, role, full_name, avatar_url, created_at");
  if (onlyUserId) profilesQ = profilesQ.eq("id", onlyUserId);
  let bookingsQ = db.from("bookings").select("id, visitor_id, total_usd, status, visitor_checkins(id)").not("visitor_id", "is", null).eq("status", "confirmed");
  if (onlyUserId) bookingsQ = bookingsQ.eq("visitor_id", onlyUserId);
  let cardsQ = db.from("member_cards").select("user_id, card_type, status");
  if (onlyUserId) cardsQ = cardsQ.eq("user_id", onlyUserId);

  const [{ data: profiles }, { data: bookings }, { data: cards }, users] = await Promise.all([
    profilesQ,
    bookingsQ,
    cardsQ,
    onlyUserId
      ? db.auth.admin.getUserById(onlyUserId).then((r) => (r.data.user ? [r.data.user] : []))
      : db.auth.admin.listUsers({ perPage: 1000 }).then((r) => r.data?.users ?? []),
  ]);

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

  return (profiles ?? []).map((p) => {
    const u: any = auth.get(p.id);
    const meta = u?.user_metadata ?? {};
    const s = byUser.get(p.id) ?? { visits: 0, bookings: 0, spent: 0 };
    const c = cardMap.get(p.id);
    return {
      id: p.id,
      name: meta.display_name || p.full_name || meta.full_name || meta.name || (u?.email ?? "").split("@")[0] || "Guest",
      email: u?.email ?? null,
      avatar: meta.custom_avatar_url || p.avatar_url || meta.avatar_url || meta.picture || null,
      role: p.role,
      since: p.created_at,
      visits: s.visits,
      bookings: s.bookings,
      spent: Math.round(s.spent * 100) / 100,
      card: cardTypeFor(p.role, s.visits, s.spent),
      cardStatus: (c?.status as MemberRow["cardStatus"]) ?? null,
      cardPrintedAs: c?.card_type ?? null,
    };
  });
}
