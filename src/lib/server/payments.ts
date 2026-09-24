import "server-only";
import { revalidateTag } from "next/cache";
import { serviceClient } from "./private-settings";
import { awardForPaidBooking } from "./points";
import { checkTransaction, createKhqr, getPaymentConfig, khqrLogo } from "./bakong";

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
}

async function loadTarget(kind: PayKind, code: string, key: string) {
  const db = serviceClient();
  if (kind === "booking") {
    const { data } = await db.from("bookings").select("id, booking_code, total_usd, status").eq("booking_code", code).eq("qr_token", key).maybeSingle();
    return data ? { id: data.id, amountUsd: Number(data.total_usd), paid: data.status === "confirmed", bill: data.booking_code } : null;
  }
  const { data } = await db.from("adoptions").select("id, code, amount_usd, status").eq("code", code).eq("access_key", key).maybeSingle();
  return data ? { id: data.id, amountUsd: Number(data.amount_usd), paid: data.status === "paid", bill: data.code } : null;
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
export async function pollKhqr(kind: PayKind, code: string, key: string, opts: { regenerate?: boolean } = {}): Promise<PaymentView | null> {
  const target = await loadTarget(kind, code, key);
  if (!target) return null;
  if (target.paid) return { status: "paid" };

  const { settings, ready, canVerify } = await getPaymentConfig();
  if (!ready) return { status: "unavailable" };
  const db = serviceClient();

  // Latest QR for this target
  let qr: { khqr: string | null; md5: string | null; currency: string | null; expires_at: string | null; id?: string };
  if (kind === "booking") {
    const { data } = await db.from("payments").select("id, khqr, md5, currency, expires_at").eq("booking_id", target.id).eq("provider", "bakong").order("created_at", { ascending: false }).limit(1).maybeSingle();
    qr = data ?? { khqr: null, md5: null, currency: null, expires_at: null };
  } else {
    const { data } = await db.from("adoptions").select("khqr, md5, expires_at").eq("id", target.id).maybeSingle();
    qr = { ...(data ?? { khqr: null, md5: null, expires_at: null }), currency: settings.currency ?? "USD" };
  }

  // Paid? (checked even just after expiry — the payer may have scanned in time)
  if (qr.md5 && canVerify) {
    const check = await checkTransaction(settings, qr.md5);
    if (check.paid) {
      const expected = (settings.currency === "KHR" ? Math.round(target.amountUsd * (settings.usd_to_khr || 4100)) : target.amountUsd);
      const amountOk = check.amount == null || Math.abs(check.amount - expected) < 0.01 * Math.max(1, expected);
      if (amountOk) {
        await markPaid(kind, target.id, qr.id, check.hash, check.fromAccountId);
        return { status: "paid" };
      }
    }
  }

  const expired = !qr.khqr || !qr.expires_at || new Date(qr.expires_at).getTime() < Date.now();
  if (expired) {
    if (!opts.regenerate) return { status: "expired" };
    const fresh = await startKhqr(kind, target.id, target.amountUsd, target.bill);
    if (!fresh) return { status: "unavailable" };
    return { status: "pending", qr: fresh.qr, amount: fresh.amount, currency: fresh.currency, expiresAt: fresh.expiresAt.toISOString(), merchantName: fresh.merchantName, canVerify, logo: khqrLogo(settings) };
  }

  const amount = settings.currency === "KHR" ? Math.round(target.amountUsd * (settings.usd_to_khr || 4100)) : target.amountUsd;
  return { status: "pending", qr: qr.khqr!, amount, currency: qr.currency ?? "USD", expiresAt: qr.expires_at!, merchantName: settings.merchant_name, canVerify, logo: khqrLogo(settings) };
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
