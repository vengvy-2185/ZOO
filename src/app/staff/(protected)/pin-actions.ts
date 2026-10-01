"use server";

import { revalidatePath } from "next/cache";
import { getVerifiedUserId } from "@/lib/auth/session";
import { getCachedRole } from "@/lib/auth/role";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { checkPin, grantApp, grantPay, hashPin, hidePayCookie, lockAll, pinRow, PIN_RE, type Check } from "@/lib/server/pin";

// The staff member's own secret code: set it (required), open the app with
// it, show pay amounts with it, turn the "ask when the app opens" on/off.

function me() {
  const id = getVerifiedUserId();
  if (!id) throw new Error("Please sign in.");
  return id;
}
const db = () => createServiceRoleClient();
export type PinResult = { ok?: boolean; error?: "format" | "mismatch" | "exists" | "wrong" | "locked" | "none"; left?: number; until?: string };
const fail = (c: Check): PinResult => (c.ok ? { ok: true } : { error: c.error, left: c.left, until: c.until });

/** First time: choose the code (typed twice). */
export async function setupPin(pin: string, again: string): Promise<PinResult> {
  const id = me();
  if (!PIN_RE.test(pin)) return { error: "format" };
  if (pin !== again) return { error: "mismatch" };
  if (await pinRow(id)) return { error: "exists" };
  await db().from("staff_pins").insert({ user_id: id, pin_hash: hashPin(pin) });
  grantApp(id);
  revalidatePath("/staff", "layout");
  return { ok: true };
}

export async function changePin(oldPin: string, pin: string, again: string): Promise<PinResult> {
  const id = me();
  if (!PIN_RE.test(pin)) return { error: "format" };
  if (pin !== again) return { error: "mismatch" };
  const c = await checkPin(id, oldPin);
  if (!c.ok) return fail(c);
  await db().from("staff_pins").update({ pin_hash: hashPin(pin), updated_at: new Date().toISOString() }).eq("user_id", id);
  return { ok: true };
}

/** Opening the app. */
export async function unlockApp(pin: string): Promise<PinResult> {
  const id = me();
  const c = await checkPin(id, pin);
  if (!c.ok) return fail(c);
  grantApp(id);
  revalidatePath("/staff", "layout");
  return { ok: true };
}

/** Showing pay amounts for a few minutes. */
export async function revealPay(pin: string): Promise<PinResult> {
  const id = me();
  const c = await checkPin(id, pin);
  if (!c.ok) return fail(c);
  grantPay(id);
  grantApp(id);
  revalidatePath("/staff", "layout");
  return { ok: true };
}

/** Hide the pay amounts again. */
export async function hidePay() {
  me();
  hidePayCookie();
  revalidatePath("/staff", "layout");
}

/** Hide the amounts again / lock the app now. */
export async function lockNow() {
  me();
  lockAll();
  revalidatePath("/staff", "layout");
}

/** Ask for the code when the app opens: on, or off (turning it off needs the code). */
export async function setLockOnOpen(on: boolean, pin: string): Promise<PinResult> {
  const id = me();
  const c = await checkPin(id, pin);
  if (!c.ok) return fail(c);
  await db().from("staff_pins").update({ lock_on_open: on, updated_at: new Date().toISOString() }).eq("user_id", id);
  revalidatePath("/staff", "layout");
  return { ok: true };
}

/** Admin: the person forgot the code; they choose a new one next time they open the app. */
export async function resetStaffPin(userId: string) {
  const id = me();
  if ((await getCachedRole(id)).role !== "admin") throw new Error("Admins only.");
  await db().from("staff_pins").delete().eq("user_id", userId);
  revalidatePath("/admin/staff");
}
