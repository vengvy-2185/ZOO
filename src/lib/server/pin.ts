import "server-only";
import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { createServiceRoleClient } from "@/lib/supabase/server";

// The staff member's secret code (PIN, 4–6 digits).
// - Stored as a salted scrypt hash; 5 wrong tries lock it for 5 minutes.
// - Right code → a signed, http-only cookie: "app" opens the app (12 hours,
//   until the browser closes), "pay" shows pay amounts (5 minutes).
// The amounts are only put in the page by the server when "pay" is valid,
// so they are never in the browser before the code is given.

const MAX_TRIES = 5;
const LOCK_MINUTES = 5;
export const PIN_RE = /^\d{4,6}$/;
const APP_COOKIE = "gwz_unlock";
const PAY_COOKIE = "gwz_pay";

const key = () => createHmac("sha256", process.env.SUPABASE_SERVICE_ROLE_KEY ?? "gwz").update("gwz-pin-cookie-v1").digest();
const sign = (v: string) => createHmac("sha256", key()).update(v).digest("base64url");

export function hashPin(pin: string) {
  const salt = randomBytes(16).toString("hex");
  return `s1$${salt}$${scryptSync(pin, salt, 32).toString("hex")}`;
}
function matches(pin: string, stored: string) {
  const [, salt, hash] = stored.split("$");
  if (!salt || !hash) return false;
  const a = scryptSync(pin, salt, 32);
  const b = Buffer.from(hash, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

export type PinRow = { user_id: string; pin_hash: string; lock_on_open: boolean; failed: number; locked_until: string | null };
export async function pinRow(userId: string) {
  const { data } = await createServiceRoleClient().from("staff_pins").select("*").eq("user_id", userId).maybeSingle();
  return (data as PinRow | null) ?? null;
}

export type Check = { ok: true } | { ok: false; error: "wrong" | "locked" | "none"; left?: number; until?: string };
/** Checks the code and counts wrong tries. */
export async function checkPin(userId: string, pin: string): Promise<Check> {
  const row = await pinRow(userId);
  if (!row) return { ok: false, error: "none" };
  if (row.locked_until && Date.parse(row.locked_until) > Date.now()) return { ok: false, error: "locked", until: row.locked_until };
  const db = createServiceRoleClient();
  if (PIN_RE.test(pin) && matches(pin, row.pin_hash)) {
    if (row.failed || row.locked_until) await db.from("staff_pins").update({ failed: 0, locked_until: null }).eq("user_id", userId);
    return { ok: true };
  }
  const failed = row.failed + 1;
  const lock = failed >= MAX_TRIES;
  const until = lock ? new Date(Date.now() + LOCK_MINUTES * 60e3).toISOString() : null;
  await db.from("staff_pins").update({ failed: lock ? 0 : failed, locked_until: until }).eq("user_id", userId);
  return lock ? { ok: false, error: "locked", until: until! } : { ok: false, error: "wrong", left: MAX_TRIES - failed };
}

function issue(name: string, userId: string, seconds: number, session: boolean) {
  const exp = Date.now() + seconds * 1000;
  const v = `${userId}.${exp}`;
  cookies().set(name, `${v}.${sign(v)}`, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", ...(session ? {} : { maxAge: seconds }) });
}
function valid(name: string, userId: string) {
  const raw = cookies().get(name)?.value ?? "";
  const [uid, exp, sig] = raw.split(".");
  if (!uid || !exp || !sig || uid !== userId || Number(exp) < Date.now()) return false;
  const want = Buffer.from(sign(`${uid}.${exp}`));
  const got = Buffer.from(sig);
  return want.length === got.length && timingSafeEqual(want, got);
}

/** The app was opened with the code (until the browser closes, at most 12 hours). */
export const grantApp = (userId: string) => issue(APP_COOKIE, userId, 12 * 3600, true);
/** Pay amounts may be shown (5 minutes). */
export const grantPay = (userId: string) => issue(PAY_COOKIE, userId, 5 * 60, false);
export const appUnlocked = (userId: string) => valid(APP_COOKIE, userId);
export const payRevealed = (userId: string) => valid(PAY_COOKIE, userId);
export function lockAll() {
  cookies().delete(APP_COOKIE);
  cookies().delete(PAY_COOKIE);
}
export const hidePayCookie = () => cookies().delete(PAY_COOKIE);
