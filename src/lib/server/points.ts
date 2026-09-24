import "server-only";
import { createServiceRoleClient } from "@/lib/supabase/server";

/** What points can buy. Prices are enforced in the database (redeem_points); these are for display. */
export const REWARDS = [
  { key: "p5", cost: 100, en: "5% off tickets", km: "បញ្ចុះតម្លៃសំបុត្រ 5%" },
  { key: "p10", cost: 200, en: "10% off tickets", km: "បញ្ចុះតម្លៃសំបុត្រ 10%" },
  { key: "usd2", cost: 250, en: "$2 off tickets", km: "បញ្ចុះតម្លៃសំបុត្រ $2" },
  { key: "p20", cost: 450, en: "20% off tickets", km: "បញ្ចុះតម្លៃសំបុត្រ 20%" },
] as const;
export type RewardKey = (typeof REWARDS)[number]["key"];

export const REFERRAL = {
  perFriend: 50, // to the person who shared the link, when a friend pays for tickets
  welcome: 20, // to the friend (if signed in)
  milestones: [
    { friends: 3, bonus: 50 },
    { friends: 5, bonus: 100 },
    { friends: 10, bonus: 300 },
  ],
};
export const QUEST_POINTS = { perAnimal: 10, allBonus: 100 };
/** Points per whole dollar of a paid booking. */
export const PURCHASE_RATE = 1;

export const REF_COOKIE = "gwz_ref";
export const isReferralCode = (c: string | undefined | null): c is string => !!c && /^[A-F0-9]{8}$/.test(c);

export type Wallet = {
  balance: number;
  questPoints: number;
  referralCode: string | null;
  friends: number;
  history: { delta: number; reason: string; ref: string; created_at: string }[];
  codes: { code: string; name: string; name_km: string | null; ends_on: string | null; used: boolean }[];
};

export async function getWallet(userId: string): Promise<Wallet> {
  const db = createServiceRoleClient();
  const [{ data: balance }, { data: quest }, { data: profile }, { count: friends }, { data: history }, { data: codes }] = await Promise.all([
    db.rpc("points_balance", { p_user: userId }),
    db.rpc("quest_points", { p_user: userId }),
    db.from("profiles").select("referral_code").eq("id", userId).maybeSingle(),
    db.from("referral_credits").select("id", { count: "exact", head: true }).eq("referrer_id", userId),
    db.from("point_ledger").select("delta, reason, ref, created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(30),
    db.from("discount_codes").select("id, code, name, name_km, ends_on").eq("owner_id", userId).order("created_at", { ascending: false }).limit(20),
  ]);
  const withUse = await Promise.all(
    (codes ?? []).map(async (c) => {
      const { data: uses } = await db.rpc("discount_uses", { p_code_id: c.id });
      return { code: c.code, name: c.name, name_km: c.name_km, ends_on: c.ends_on, used: Number(uses ?? 0) > 0 };
    })
  );
  return {
    balance: Number(balance ?? 0),
    questPoints: Number(quest ?? 0),
    referralCode: profile?.referral_code ?? null,
    friends: friends ?? 0,
    history: history ?? [],
    codes: withUse,
  };
}

export async function redeemReward(userId: string, reward: RewardKey) {
  const { data, error } = await createServiceRoleClient().rpc("redeem_points", { p_user: userId, p_reward: reward });
  if (error) return { ok: false as const, reason: "error" };
  return data as { ok: true; code: string; balance: number; ends_on: string } | { ok: false; reason: string; balance?: number };
}

/** Who owns an invite code (for the "your friend invited you" banner). */
export async function referrerByCode(code: string) {
  if (!isReferralCode(code)) return null;
  const { data } = await createServiceRoleClient().from("profiles").select("id, full_name").eq("referral_code", code).maybeSingle();
  return data;
}

const addPoints = (userId: string, delta: number, reason: string, ref: string) =>
  // unique (user_id, reason, ref): running this twice never pays twice
  createServiceRoleClient().from("point_ledger").upsert({ user_id: userId, delta, reason, ref }, { onConflict: "user_id,reason,ref", ignoreDuplicates: true });

/**
 * Called once a booking has really been paid (Bakong confirmed). Gives the
 * buyer purchase points, and if they came through a friend's invite link,
 * gives the friend referral points (once per buyer) plus milestone bonuses.
 */
export async function awardForPaidBooking(bookingId: string) {
  const db = createServiceRoleClient();
  const { data: b } = await db.from("bookings").select("id, status, visitor_id, visitor_email, total_usd, referral_code").eq("id", bookingId).maybeSingle();
  if (!b || b.status !== "confirmed" || Number(b.total_usd) <= 0) return;

  if (b.visitor_id) {
    const pts = Math.floor(Number(b.total_usd) * PURCHASE_RATE);
    if (pts > 0) await addPoints(b.visitor_id, pts, "purchase", b.id);
  }

  if (!isReferralCode(b.referral_code)) return;
  const referrer = await referrerByCode(b.referral_code);
  if (!referrer || referrer.id === b.visitor_id) return;
  // Not your own email either.
  const { data: refUser } = await db.auth.admin.getUserById(referrer.id);
  const buyerEmail = (b.visitor_email ?? "").trim().toLowerCase();
  if (buyerEmail && refUser?.user?.email?.toLowerCase() === buyerEmail) return;

  const buyerKey = b.visitor_id ?? `email:${buyerEmail}`;
  const { error } = await db.from("referral_credits").insert({ referrer_id: referrer.id, booking_id: b.id, buyer_key: buyerKey });
  if (error) return; // this friend already counted for this referrer

  await addPoints(referrer.id, REFERRAL.perFriend, "referral", b.id);
  if (b.visitor_id) await addPoints(b.visitor_id, REFERRAL.welcome, "welcome", referrer.id);

  const { count } = await db.from("referral_credits").select("id", { count: "exact", head: true }).eq("referrer_id", referrer.id);
  for (const m of REFERRAL.milestones) if ((count ?? 0) >= m.friends) await addPoints(referrer.id, m.bonus, "milestone", String(m.friends));
}
