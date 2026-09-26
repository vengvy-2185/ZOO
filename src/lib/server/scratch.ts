import "server-only";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { generateCode } from "./discounts";
import { zooToday } from "@/lib/data/gate";

export type ScratchPrize = { code: string; percent: number; endsOn: string };
/** What a scratch card shows: a discount code, or a thank-you. */
export type ScratchResult = ScratchPrize | { thanks: true; en: string; km: string };

export type ScratchSettings = {
  enabled: boolean;
  /** chance weights: each prize, and "thank you" (no prize) */
  prizes: { percent: number; weight: number }[];
  thanks_weight: number;
  thanks_en: string;
  thanks_km: string;
  valid_days: number;
  /** who can win */
  min_total: number; // booking total in USD
  min_visitors: number; // people on the booking
  members_only: boolean; // only bookings made while signed in
  max_wins_per_day: number; // 0 = no limit
  once_per_member_days: number; // a signed-in visitor wins at most once in this many days (0 = no limit)
};

export const DEFAULT_SCRATCH: ScratchSettings = {
  enabled: true,
  prizes: [
    { percent: 10, weight: 45 },
    { percent: 15, weight: 17 },
    { percent: 20, weight: 6 },
    { percent: 30, weight: 2 },
  ],
  thanks_weight: 30,
  thanks_en: "Thank you for visiting Green Wild Zoo! Better luck next time.",
  thanks_km: "អរគុណដែលបានមកលេងសួនសត្វ Green Wild Zoo! សំណាងល្អលើកក្រោយ។",
  valid_days: 60,
  min_total: 0,
  min_visitors: 1,
  members_only: false,
  max_wins_per_day: 0,
  once_per_member_days: 0,
};

/** The admin's scratch-card rules (Admin → Discounts), on top of the defaults. */
export async function getScratchSettings(): Promise<ScratchSettings> {
  const { data } = await createServiceRoleClient().from("app_settings").select("value").eq("key", "scratch_card").maybeSingle();
  const v = (data?.value ?? {}) as Partial<ScratchSettings>;
  return { ...DEFAULT_SCRATCH, ...v, prizes: Array.isArray(v.prizes) && v.prizes.length ? v.prizes : DEFAULT_SCRATCH.prizes };
}

const roll = () => (crypto.getRandomValues(new Uint32Array(1))[0] / 2 ** 32);
const toPrize = (c: any): ScratchPrize => ({ code: c.code, percent: Number(c.value), endsOn: c.ends_on });
const thanksOf = (s: ScratchSettings): ScratchResult => ({ thanks: true, en: s.thanks_en || DEFAULT_SCRATCH.thanks_en, km: s.thanks_km || DEFAULT_SCRATCH.thanks_km });

/** What this booking already revealed (a prize, a thank-you, or nothing yet). */
export async function existingResult(scratchCodeId: string | null | undefined, scratchedAt?: string | null): Promise<ScratchResult | null> {
  if (scratchCodeId) {
    const { data } = await createServiceRoleClient().from("discount_codes").select("code, value, ends_on").eq("id", scratchCodeId).maybeSingle();
    return data ? toPrize(data) : null;
  }
  if (scratchedAt) return thanksOf(await getScratchSettings());
  return null;
}
/** @deprecated kept for older callers */
export const existingPrize = (id: string | null | undefined) => existingResult(id, null);

/**
 * Reveals (and on the first call decides) the card for a paid booking.
 * Needs the booking's secret key. The admin's rules decide who may win; the
 * others get a thank-you. The code is made automatically, nothing to set up.
 */
export async function claimScratch(bookingCode: string, key: string): Promise<ScratchResult | null> {
  const db = createServiceRoleClient();
  const { data: b } = await db.from("bookings").select("id, status, total_usd, visitor_id, scratch_code_id, scratched_at, booking_items(quantity)").eq("booking_code", bookingCode).eq("qr_token", key).maybeSingle();
  if (!b || b.status !== "confirmed") return null;
  if (b.scratch_code_id || b.scratched_at) return existingResult(b.scratch_code_id, b.scratched_at);

  const s = await getScratchSettings();
  const people = ((b.booking_items ?? []) as any[]).reduce((n, i) => n + (i.quantity ?? 0), 0);
  let eligible = s.enabled && Number(b.total_usd) >= s.min_total && people >= s.min_visitors && (!s.members_only || !!b.visitor_id);
  if (eligible && s.max_wins_per_day > 0) {
    const { count } = await db.from("discount_codes").select("id", { count: "exact", head: true }).eq("source", "scratch").gte("created_at", `${zooToday()}T00:00:00+07:00`);
    if ((count ?? 0) >= s.max_wins_per_day) eligible = false;
  }
  if (eligible && s.once_per_member_days > 0 && b.visitor_id) {
    const since = new Date(Date.now() - s.once_per_member_days * 864e5).toISOString();
    const { count } = await db.from("bookings").select("id", { count: "exact", head: true }).eq("visitor_id", b.visitor_id).not("scratch_code_id", "is", null).gte("scratched_at", since);
    if ((count ?? 0) > 0) eligible = false;
  }

  // pick: a prize by weight, or thank-you
  let percent = 0;
  if (eligible) {
    const total = s.prizes.reduce((n, p) => n + Math.max(0, p.weight), 0) + Math.max(0, s.thanks_weight);
    let r = roll() * total;
    for (const p of s.prizes) {
      r -= Math.max(0, p.weight);
      if (r < 0) {
        percent = p.percent;
        break;
      }
    }
  }

  if (!percent) {
    const { data: done } = await db.from("bookings").update({ scratched_at: new Date().toISOString() }).eq("id", b.id).is("scratched_at", null).select("id");
    if (!done?.length) {
      const { data: again } = await db.from("bookings").select("scratch_code_id, scratched_at").eq("id", b.id).single();
      return existingResult(again?.scratch_code_id, again?.scratched_at);
    }
    return thanksOf(s);
  }

  const endsOn = zooToday(s.valid_days);
  const { data: code, error } = await db
    .from("discount_codes")
    .insert({ name: `Scratch card ${percent}% off`, name_km: `រង្វាន់កាតកោស បញ្ចុះ ${percent}%`, code: generateCode("WIN"), kind: "percent", value: percent, max_uses: 1, ends_on: endsOn, source: "scratch" })
    .select("id, code, value, ends_on")
    .single();
  if (error || !code) return null;
  // Only attach if nobody else did in the meantime (two tabs scratching at once).
  const { data: updated } = await db
    .from("bookings")
    .update({ scratch_code_id: code.id, scratched_at: new Date().toISOString() })
    .eq("id", b.id)
    .is("scratch_code_id", null)
    .is("scratched_at", null)
    .select("id");
  if (!updated?.length) {
    await db.from("discount_codes").delete().eq("id", code.id);
    const { data: again } = await db.from("bookings").select("scratch_code_id, scratched_at").eq("id", b.id).single();
    return existingResult(again?.scratch_code_id, again?.scratched_at);
  }
  return toPrize(code);
}
