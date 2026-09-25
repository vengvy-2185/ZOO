import "server-only";
import { revalidateTag } from "next/cache";
import { serviceClient } from "./private-settings";
import { awardForPaidBooking } from "./points";
import { checkMany, createKhqr, getPaymentConfig, khqrLogo, QR_MINUTES } from "./bakong";
import type { PaymentSettings } from "./private-settings";

// One payment flow for both ticket bookings and animal adoptions:
//   start → a fresh dynamic KHQR (10 min) is stored with its md5
//   poll  → the browser asks every few seconds; we ask Bakong by md5 and,
//           once paid (and the amount matches), mark it paid server-side.
// Everything here runs with the service role, but every entry point first
// checks the secret access key that only the payer received.

export type PayKind = "booking" | "adoption";

export interface PaymentView {
  /** unavailable = online payment not set up yet (nothing is ever marked paid without a real transfer) */
  status: "pending" | "paid" | "expired" | "unavailable";
  qr?: string;
  amount?: number;
  currency?: string;
  expiresAt?: string;
  merchantName?: string;
  canVerify?: boolean;
  logo?: string;
  /** the visitor chose "pay at the counter when I arrive" */
  payLater?: boolean;
  /** Bakong can't be asked right now (daily check limit / token) */
  checkBlocked?: "limit" | "token";
}

// ── Asking Bakong, within its daily limit ─────────────────────────────
// The free Bakong token allows about 100 checks a day. So: one request
// checks every QR still waiting (all visitors at once), each QR is checked
// often in its first minute and then less often, "I've paid" asks right
// away, and the first check of a new day also catches up yesterday's QRs.
const DAILY_CAP = 95;
const dueEvery = (ageMs: number) => (ageMs < 90e3 ? 15e3 : ageMs < 7 * 60e3 ? 40e3 : 5 * 60e3);

type Due = { md5: string; createdAt: string; lastChecked: string | null };

async function sweep(settings: PaymentSettings, due: Due, force: boolean): Promise<{ blocked?: "limit" | "token" }> {
  const db = serviceClient();
  const now = Date.now();
  const since = due.lastChecked ? now - Date.parse(due.lastChecked) : Infinity;
  if (since < (force ? 10e3 : dueEvery(now - Date.parse(due.createdAt)))) return {};

  const { data: callNo } = await db.rpc("bakong_take_call", { p_cap: DAILY_CAP });
  if (!Number(callNo)) return { blocked: "limit" };
  // Everything still waiting from the last 30 minutes (2 days on the day's first call).
  const from = new Date(now - (Number(callNo) === 1 ? 48 * 3600e3 : 30 * 60e3)).toISOString();
  const [{ data: pays }, { data: ads }] = await Promise.all([
    db.from("payments").select("id, booking_id, md5, amount_usd, currency").eq("provider", "bakong").eq("status", "pending").not("md5", "is", null).gte("created_at", from).order("created_at", { ascending: false }).limit(40),
    db.from("adoptions").select("id, md5, amount_usd").eq("status", "pending").not("md5", "is", null).gte("expires_at", from).limit(9),
  ]);
  const md5s = [...new Set([due.md5, ...(pays ?? []).map((p: any) => p.md5), ...(ads ?? []).map((a: any) => a.md5)])].slice(0, 50);
  // the day's first check also catches up QRs from the last two days (one call each if the list endpoint isn't allowed)
  const res = await checkMany(settings, md5s, {
    singles: Number(callNo) === 1 ? 10 : 1,
    takeCall: async () => Number((await db.rpc("bakong_take_call", { p_cap: DAILY_CAP })).data) > 0,
  });
  const stamp = new Date().toISOString();
  await Promise.all([db.from("payments").update({ last_checked_at: stamp }).in("md5", md5s), db.from("adoptions").update({ last_checked_at: stamp }).in("md5", md5s)]);
  if (res.error === "limit") {
    await db.rpc("bakong_mark_limited");
    return { blocked: "limit" };
  }
  if (res.error === "token") return { blocked: "token" };

  const rate = settings.usd_to_khr || 4100;
  const amountOk = (usd: number, cur: string | null, got?: number) => got == null || Math.abs(got - (cur === "KHR" ? Math.round(usd * rate) : usd)) < 0.01 * Math.max(1, cur === "KHR" ? usd * rate : usd);
  for (const [md5, hit] of res.paid) {
    const pay: any = (pays ?? []).find((p: any) => p.md5 === md5);
    if (pay && amountOk(Number(pay.amount_usd), pay.currency, hit.amount)) await markPaid("booking", pay.booking_id, pay.id, hit.hash, hit.fromAccountId);
    const ad: any = (ads ?? []).find((a: any) => a.md5 === md5);
    if (ad && amountOk(Number(ad.amount_usd), settings.currency ?? "USD", hit.amount)) await markPaid("adoption", ad.id, undefined, hit.hash, hit.fromAccountId);
    if (!pay && !ad && md5 === due.md5) {
      // the QR asked about wasn't in the recent list (e.g. older): look it up
      const { data: p2 } = await db.from("payments").select("id, booking_id, amount_usd, currency").eq("md5", md5).maybeSingle();
      if (p2 && amountOk(Number(p2.amount_usd), p2.currency, hit.amount)) await markPaid("booking", p2.booking_id, p2.id, hit.hash, hit.fromAccountId);
    }
  }
  return {};
}

/** How today's Bakong check budget is going (admin page). */
export async function bakongUsage() {
  const { data } = await serviceClient().from("bakong_usage").select("calls, limited").eq("day", new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Phnom_Penh" }).format(new Date())).maybeSingle();
  return { calls: data?.calls ?? 0, limited: Boolean(data?.limited), cap: DAILY_CAP };
}

async function loadTarget(kind: PayKind, code: string, key: string) {
  const db = serviceClient();
  if (kind === "booking") {
    const { data } = await db.from("bookings").select("id, booking_code, total_usd, status, pay_later").eq("booking_code", code).eq("qr_token", key).maybeSingle();
    return data ? { id: data.id, amountUsd: Number(data.total_usd), paid: data.status === "confirmed", bill: data.booking_code, payLater: Boolean(data.pay_later) } : null;
  }
  const { data } = await db.from("adoptions").select("id, code, amount_usd, status").eq("code", code).eq("access_key", key).maybeSingle();
  return data ? { id: data.id, amountUsd: Number(data.amount_usd), paid: data.status === "paid", bill: data.code, payLater: false } : null;
}

/** Creates (or re-creates after expiry) the KHQR for this booking/adoption. */
export async function startKhqr(kind: PayKind, targetId: string, amountUsd: number, bill: string) {
  const { settings, ready, canVerify } = await getPaymentConfig();
  if (!ready) return null;
  const k = createKhqr(settings, amountUsd, bill);
  const db = serviceClient();
  if (kind === "booking") {
    await db.from("payments").insert({
      booking_id: targetId,
      provider: "bakong",
      amount_usd: amountUsd,
      status: "pending",
      khqr: k.qr,
      md5: k.md5,
      currency: k.currency,
      expires_at: k.expiresAt.toISOString(),
    });
  } else {
    await db.from("adoptions").update({ khqr: k.qr, md5: k.md5, expires_at: k.expiresAt.toISOString() }).eq("id", targetId);
  }
  return { ...k, canVerify, merchantName: settings.merchant_name };
}

/** Current state for the payment page; also finalises the payment when Bakong reports it paid. */
export async function pollKhqr(kind: PayKind, code: string, key: string, opts: { regenerate?: boolean; skipCheck?: boolean; force?: boolean } = {}): Promise<PaymentView | null> {
  const target = await loadTarget(kind, code, key);
  if (!target) return null;
  if (target.paid) return { status: "paid" };

  const { settings, ready, canVerify } = await getPaymentConfig();
  if (!ready) return { status: "unavailable" };
  const db = serviceClient();

  // Latest QR for this target
  let qr: { khqr: string | null; md5: string | null; currency: string | null; expires_at: string | null; id?: string; created_at?: string | null; last_checked_at?: string | null };
  if (kind === "booking") {
    const { data } = await db.from("payments").select("id, khqr, md5, currency, expires_at, created_at, last_checked_at").eq("booking_id", target.id).eq("provider", "bakong").order("created_at", { ascending: false }).limit(1).maybeSingle();
    qr = data ?? { khqr: null, md5: null, currency: null, expires_at: null };
  } else {
    const { data } = await db.from("adoptions").select("khqr, md5, expires_at, last_checked_at").eq("id", target.id).maybeSingle();
    qr = { ...(data ?? { khqr: null, md5: null, expires_at: null }), currency: settings.currency ?? "USD" };
    if (qr.expires_at) qr.created_at = new Date(Date.parse(qr.expires_at) - QR_MINUTES * 60e3).toISOString();
  }

  // Paid? (checked even just after expiry — the payer may have scanned in time).
  // The first page render skips it so the page opens instantly; the browser polls right after.
  let checkBlocked: PaymentView["checkBlocked"];
  if (qr.md5 && canVerify && !opts.skipCheck) {
    const r = await sweep(settings, { md5: qr.md5, createdAt: qr.created_at ?? new Date().toISOString(), lastChecked: qr.last_checked_at ?? null }, Boolean(opts.force));
    checkBlocked = r.blocked;
    const again = await loadTarget(kind, code, key);
    if (again?.paid) return { status: "paid" };
  }

  const expired = !qr.khqr || !qr.expires_at || new Date(qr.expires_at).getTime() < Date.now();
  if (expired) {
    if (!opts.regenerate) return { status: "expired", payLater: target.payLater, logo: khqrLogo(settings), checkBlocked };
    const fresh = await startKhqr(kind, target.id, target.amountUsd, target.bill);
    if (!fresh) return { status: "unavailable" };
    return { status: "pending", qr: fresh.qr, amount: fresh.amount, currency: fresh.currency, expiresAt: fresh.expiresAt.toISOString(), merchantName: fresh.merchantName, canVerify, logo: khqrLogo(settings), payLater: target.payLater };
  }

  const amount = settings.currency === "KHR" ? Math.round(target.amountUsd * (settings.usd_to_khr || 4100)) : target.amountUsd;
  return { status: "pending", qr: qr.khqr!, amount, currency: qr.currency ?? "USD", expiresAt: qr.expires_at!, merchantName: settings.merchant_name, canVerify, logo: khqrLogo(settings), payLater: target.payLater, checkBlocked };
}

/** The visitor will pay at the counter on arrival (booking stays pending until Bakong confirms there). */
export async function choosePayLater(code: string, key: string, later: boolean) {
  const db = serviceClient();
  const { data } = await db.from("bookings").update({ pay_later: later }).eq("booking_code", code).eq("qr_token", key).eq("status", "pending").select("id").maybeSingle();
  return Boolean(data);
}

async function markPaid(kind: PayKind, targetId: string, paymentId: string | undefined, hash?: string, from?: string) {
  const db = serviceClient();
  const now = new Date().toISOString();
  if (kind === "booking") {
    if (paymentId) await db.from("payments").update({ status: "paid", paid_at: now, provider_reference: hash ?? null, payer_account: from ?? null }).eq("id", paymentId);
    await db.from("bookings").update({ status: "confirmed" }).eq("id", targetId);
    // Points for the buyer, and for the friend who invited them (never blocks the payment).
    await awardForPaidBooking(targetId).catch(() => {});
  } else {
    await db.from("adoptions").update({ status: "paid", paid_at: now }).eq("id", targetId);
    revalidateTag("adoptions");
  }
}

/**
 * Once a day (on the first staff/admin page view with no Bakong check yet
 * today): check QRs from the last two days that were paid while checks were
 * blocked, so those tickets turn "paid" without anyone reopening them.
 */
export async function catchUpPayments() {
  const usage = await bakongUsage();
  if (usage.calls > 0 || usage.limited) return;
  const { settings, ready } = await getPaymentConfig();
  if (!ready) return;
  const { data: last } = await serviceClient()
    .from("payments")
    .select("md5, created_at")
    .eq("provider", "bakong")
    .eq("status", "pending")
    .not("md5", "is", null)
    .gte("created_at", new Date(Date.now() - 48 * 3600e3).toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (last?.md5) await sweep(settings, { md5: last.md5, createdAt: last.created_at, lastChecked: null }, true);
}
