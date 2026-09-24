import "server-only";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { generateCode } from "./discounts";
import { zooToday } from "@/lib/data/gate";

export type ScratchPrize = { code: string; percent: number; endsOn: string };

// Every paid ticket earns one scratch card: a single-use discount for the
// next visit. Bigger prizes are rarer.
const PRIZES = [
  { percent: 10, weight: 65 },
  { percent: 15, weight: 25 },
  { percent: 20, weight: 8 },
  { percent: 30, weight: 2 },
];
const VALID_DAYS = 60;

function pickPercent() {
  const roll = (crypto.getRandomValues(new Uint32Array(1))[0] / 2 ** 32) * 100;
  let acc = 0;
  for (const p of PRIZES) {
    acc += p.weight;
    if (roll < acc) return p.percent;
  }
  return 10;
}

const toPrize = (c: any): ScratchPrize => ({ code: c.code, percent: Number(c.value), endsOn: c.ends_on });

/** The prize already revealed for this booking (if any). */
export async function existingPrize(scratchCodeId: string | null | undefined): Promise<ScratchPrize | null> {
  if (!scratchCodeId) return null;
  const { data } = await createServiceRoleClient().from("discount_codes").select("code, value, ends_on").eq("id", scratchCodeId).maybeSingle();
  return data ? toPrize(data) : null;
}

/** Reveals (and on first call creates) the prize for a paid booking. Needs the booking's secret key. */
export async function claimScratch(bookingCode: string, key: string): Promise<ScratchPrize | null> {
  const db = createServiceRoleClient();
  const { data: b } = await db.from("bookings").select("id, status, scratch_code_id").eq("booking_code", bookingCode).eq("qr_token", key).maybeSingle();
  if (!b || b.status !== "confirmed") return null;
  if (b.scratch_code_id) return existingPrize(b.scratch_code_id);

  const percent = pickPercent();
  const endsOn = zooToday(VALID_DAYS);
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
    .select("id");
  if (!updated?.length) {
    await db.from("discount_codes").delete().eq("id", code.id);
    const { data: again } = await db.from("bookings").select("scratch_code_id").eq("id", b.id).single();
    return existingPrize(again?.scratch_code_id);
  }
  return toPrize(code);
}
