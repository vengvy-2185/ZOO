import "server-only";
import { cookies } from "next/headers";
import { createServiceRoleClient } from "@/lib/supabase/server";

/** What points can buy. Prices are enforced in the database (redeem_points); these are for display. */
export const REWARDS = [
  { key: "p5", cost: 100, value: "5%", en: "5% off tickets", km: "បញ្ចុះតម្លៃសំបុត្រ 5%", from: "#8CCB63", to: "#2E8B57" },
  { key: "p10", cost: 200, value: "10%", en: "10% off tickets", km: "បញ្ចុះតម្លៃសំបុត្រ 10%", from: "#5EC4E8", to: "#1D6FA3" },
  { key: "usd2", cost: 250, value: "$2", en: "$2 off tickets", km: "បញ្ចុះតម្លៃសំបុត្រ $2", from: "#F4C95D", to: "#D98F2B" },
  { key: "p20", cost: 450, value: "20%", en: "20% off tickets", km: "បញ្ចុះតម្លៃសំបុត្រ 20%", from: "#F59E7B", to: "#C2410C" },
] as const;
export type RewardKey = (typeof REWARDS)[number]["key"];

export const REFERRAL = {
  join: 20, // to the person who shared the link, when a friend creates an account through it
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
/** When the invite link was opened (ms) — only accounts created after it count as "joined". */
export const REF_AT_COOKIE = "gwz_ref_at";
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
  // A friend who already joined through the link has a credit row without a booking: attach this one.
  const { data: joined } = await db.from("referral_credits").update({ booking_id: b.id }).eq("referrer_id", referrer.id).eq("buyer_key", buyerKey).is("booking_id", null).select("id");
  if (!joined?.length) {
    const { error } = await db.from("referral_credits").insert({ referrer_id: referrer.id, booking_id: b.id, buyer_key: buyerKey });
    if (error) return; // this friend already bought through this referrer
  }

  await addPoints(referrer.id, REFERRAL.perFriend, "referral", b.id);
  if (b.visitor_id) await addPoints(b.visitor_id, REFERRAL.welcome, "welcome", referrer.id);

  await milestoneBonuses(referrer.id);
}

async function milestoneBonuses(referrerId: string) {
  const { count } = await createServiceRoleClient().from("referral_credits").select("id", { count: "exact", head: true }).eq("referrer_id", referrerId);
  for (const m of REFERRAL.milestones) if ((count ?? 0) >= m.friends) await addPoints(referrerId, m.bonus, "milestone", String(m.friends));
}

/**
 * A friend opened an invite link and then created an account: the sharer
 * gets points now (not only once the friend pays), the friend gets a
 * welcome gift. Safe to call on every visit: it only counts accounts made
 * after the link was opened, never your own link, and each friend once.
 */
export async function claimSignupReferral(userId: string) {
  const jar = cookies();
  const code = jar.get(REF_COOKIE)?.value;
  const openedAt = Number(jar.get(REF_AT_COOKIE)?.value ?? 0);
  if (!isReferralCode(code) || !openedAt) return;
  const referrer = await referrerByCode(code);
  if (!referrer || referrer.id === userId) return;
  const db = createServiceRoleClient();
  const { data } = await db.auth.admin.getUserById(userId);
  const created = data?.user?.created_at ? Date.parse(data.user.created_at) : 0;
  if (!created || created < openedAt - 60_000) return; // an existing account can't claim a link
  const { error } = await db.from("referral_credits").insert({ referrer_id: referrer.id, booking_id: null, buyer_key: userId });
  if (error) return; // this friend already counted
  await addPoints(referrer.id, REFERRAL.join, "referral_join", userId);
  await addPoints(userId, REFERRAL.welcome, "welcome", referrer.id);
  await milestoneBonuses(referrer.id);
}
