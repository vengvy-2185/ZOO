import "server-only";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { generateCode } from "./discounts";
import { zooToday } from "@/lib/data/gate";

export type ScratchPrize = { code: string; percent: number; endsOn: string };
/** What a scratch card shows: a discount code, or a thank-you. */
export type ScratchResult = ScratchPrize | { thanks: true; en: string; km: string };

/**
 * The admin sets a campaign: a discount range (e.g. 5–25 %), how many
 * winners (e.g. 100) and the dates (e.g. 1–22 August). Every paid ticket,
 * whatever it cost, scratches once; the winners are spread at random over
 * the campaign so that about that many people win by the last day.
 */
export type ScratchSettings = {
  enabled: boolean;
  min_pct: number;
  max_pct: number;
  winners: number;
  start_date: string; // YYYY-MM-DD (zoo time)
  end_date: string;
  valid_days: number; // how long a won code can be used
  thanks_en: string;
  thanks_km: string;
};

export const DEFAULT_SCRATCH: ScratchSettings = {
  enabled: true,
  min_pct: 5,
  max_pct: 25,
  winners: 100,
  start_date: "",
  end_date: "",
  valid_days: 60,
  thanks_en: "Thank you for visiting Green Wild Zoo! Better luck next time.",
  thanks_km: "អរគុណដែលបានមកលេងសួនសត្វ Green Wild Zoo! សំណាងល្អលើកក្រោយ។",
};

export async function getScratchSettings(): Promise<ScratchSettings> {
  const { data } = await createServiceRoleClient().from("app_settings").select("value").eq("key", "scratch_card").maybeSingle();
  const v = (data?.value ?? {}) as Partial<ScratchSettings>;
  const today = zooToday();
  const s = { ...DEFAULT_SCRATCH, ...v };
  // no dates saved yet: this month
  if (!s.start_date) s.start_date = `${today.slice(0, 7)}-01`;
  if (!s.end_date) s.end_date = zooToday(30);
  return s;
}

const DAY = 864e5;
const daysBetween = (a: string, b: string) => Math.round((Date.parse(`${b}T12:00:00Z`) - Date.parse(`${a}T12:00:00Z`)) / DAY);

export type ScratchStats = { won: number; left: number; daysLeft: number; perDay: number; chance: number; active: boolean };
/** How the campaign is going, and today's chance of winning for the next ticket. */
export async function scratchStats(s?: ScratchSettings): Promise<ScratchStats> {
  s ??= await getScratchSettings();
  const db = createServiceRoleClient();
  const today = zooToday();
  const active = s.enabled && s.winners > 0 && today >= s.start_date && today <= s.end_date;
  const [{ count: won }, { count: recent }] = await Promise.all([
    db.from("discount_codes").select("id", { count: "exact", head: true }).eq("source", "scratch").gte("created_at", `${s.start_date}T00:00:00+07:00`).lte("created_at", `${s.end_date}T23:59:59+07:00`),
    // how many paid tickets a day, lately (to spread the winners out)
    db.from("bookings").select("id", { count: "exact", head: true }).eq("status", "confirmed").gte("created_at", new Date(Date.now() - 14 * DAY).toISOString()),
  ]);
  const perDay = Math.max(1, (recent ?? 0) / 14);
  const left = Math.max(0, s.winners - (won ?? 0));
  const daysLeft = Math.max(1, daysBetween(today, s.end_date) + 1);
  // remaining winners ÷ tickets expected until the end (never more than certain)
  const chance = active && left > 0 ? Math.min(1, left / (perDay * daysLeft)) : 0;
  return { won: won ?? 0, left, daysLeft, perDay, chance, active };
}

const roll = () => crypto.getRandomValues(new Uint32Array(1))[0] / 2 ** 32;
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

/** Reveals (and on the first call decides) the card for a paid booking. Needs the booking's secret key. */
export async function claimScratch(bookingCode: string, key: string): Promise<ScratchResult | null> {
  const db = createServiceRoleClient();
  const { data: b } = await db.from("bookings").select("id, status, scratch_code_id, scratched_at").eq("booking_code", bookingCode).eq("qr_token", key).maybeSingle();
  if (!b || b.status !== "confirmed") return null;
  if (b.scratch_code_id || b.scratched_at) return existingResult(b.scratch_code_id, b.scratched_at);

  const s = await getScratchSettings();
  const st = await scratchStats(s);
  const lo = Math.max(1, Math.min(s.min_pct, s.max_pct));
  const hi = Math.min(100, Math.max(s.min_pct, s.max_pct));
  const percent = st.chance > 0 && roll() < st.chance ? lo + Math.floor(roll() * (hi - lo + 1)) : 0;

  if (!percent) {
    const { data: done } = await db.from("bookings").update({ scratched_at: new Date().toISOString() }).eq("id", b.id).is("scratched_at", null).select("id");
    if (!done?.length) {
      const { data: again } = await db.from("bookings").select("scratch_code_id, scratched_at").eq("id", b.id).single();
      return existingResult(again?.scratch_code_id, again?.scratched_at);
    }
    return thanksOf(s);
  }

  const { data: code, error } = await db
    .from("discount_codes")
    .insert({ name: `Scratch card ${percent}% off`, name_km: `រង្វាន់កាតកោស បញ្ចុះ ${percent}%`, code: generateCode("WIN"), kind: "percent", value: percent, max_uses: 1, ends_on: zooToday(s.valid_days), source: "scratch" })
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
