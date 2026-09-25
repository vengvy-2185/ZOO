import "server-only";
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { BakongKHQR, khqrData, IndividualInfo } = require("bakong-khqr");
import { getPrivateSetting, type PaymentSettings } from "./private-settings";

// Bakong KHQR — the national QR standard every Cambodian banking app can
// scan (ABA, ACLEDA, Wing, Bakong…). We generate a dynamic KHQR with the
// exact amount, then poll the Bakong Open API with the QR's md5 to learn
// when it has been paid.
//
// Setup (Admin → Settings → Bakong KHQR):
//   1. Bakong account ID — the receiving account, e.g. "yourname@aba".
//   2. API token — register at https://api-bakong.nbc.gov.kh/register
//      (the token is renewed every 90 days).

export const QR_MINUTES = 5;

/** The logo drawn in the middle of the QR: "khqr" (standard red mark) or an image URL. */
export function khqrLogo(s: PaymentSettings): string {
  if (s.qr_logo_mode === "khqr") return "khqr";
  if (s.qr_logo_mode === "custom" && s.qr_logo_url) return s.qr_logo_url;
  return "/icon.svg";
}

export async function getPaymentConfig() {
  const s = await getPrivateSetting<PaymentSettings>("payment");
  // Only offer KHQR when payments can be confirmed automatically (API token
  // set) — a ticket is never marked paid by hand or without a real transfer.
  const ready = Boolean(s.enabled && s.bakong_account_id && s.merchant_name && s.api_token);
  return { settings: s, ready, canVerify: ready };
}

/** Builds a dynamic KHQR for an amount given in USD (converted to riel if the zoo charges in KHR). */
export function createKhqr(s: PaymentSettings, amountUsd: number, billNumber: string) {
  const currency = s.currency === "KHR" ? "KHR" : "USD";
  const amount = currency === "KHR" ? Math.round(amountUsd * (s.usd_to_khr || 4100)) : Math.round(amountUsd * 100) / 100;
  return createKhqrIn(s, currency, amount, billNumber);
}

/** Same, with the amount already in the given currency (used by the admin "test 100៛" payment). */
export function createKhqrIn(s: PaymentSettings, currency: "USD" | "KHR", amount: number, billNumber: string) {
  const expiresAt = Date.now() + QR_MINUTES * 60 * 1000;
  const info = new IndividualInfo(s.bakong_account_id, (s.merchant_name || "Green Wild Zoo").slice(0, 25), (s.merchant_city || "Phnom Penh").slice(0, 15), {
    // The bank account the Bakong ID is linked to (optional; shown to the payer's bank app).
    ...(s.bank_account ? { accountInformation: s.bank_account.slice(0, 32) } : {}),
    ...(s.bank_name ? { acquiringBank: s.bank_name.slice(0, 32) } : {}),
    currency: currency === "KHR" ? khqrData.currency.khr : khqrData.currency.usd,
    amount,
    billNumber: billNumber.slice(0, 25),
    expirationTimestamp: expiresAt,
  });
  const res = new BakongKHQR().generateIndividual(info);
  if (!res?.data?.qr) throw new Error(res?.status?.message || "Could not generate KHQR — check the Bakong account ID in Admin → Settings.");
  return { qr: res.data.qr as string, md5: res.data.md5 as string, amount, currency, expiresAt: new Date(expiresAt) };
}

export type BakongCheck =
  | { paid: true; hash?: string; fromAccountId?: string; amount?: number; currency?: string }
  | { paid: false; error?: "token" | "limit" | "timeout" | "network" | string };

/** Asks the Bakong Open API whether the QR with this md5 has been paid. */
export async function checkTransaction(s: PaymentSettings, md5: string): Promise<BakongCheck> {
  if (!s.api_token) return { paid: false, error: "no-token" };
  const base = (s.api_url || "https://api-bakong.nbc.gov.kh").replace(/\/$/, "");
  try {
    const res = await fetch(`${base}/v1/check_transaction_by_md5`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${s.api_token}` },
      body: JSON.stringify({ md5 }),
      cache: "no-store",
      signal: AbortSignal.timeout(6_000),
    });
    const json = await res.json().catch(() => null);
    // responseCode 0 = found (paid); 1 = not found yet.
    if (json?.responseCode === 0 && json.data) {
      return { paid: true, hash: json.data.hash, fromAccountId: json.data.fromAccountId, amount: Number(json.data.amount), currency: json.data.currency };
    }
    return { paid: false, error: res.status === 401 ? "token" : /limit/i.test(String(json?.responseMessage ?? "")) ? "limit" : undefined };
  } catch (e: any) {
    return { paid: false, error: e?.name === "TimeoutError" ? "timeout" : "network" };
  }
}

/** Confirms a Bakong account ID exists (used by the admin "Test" button). */
export async function checkAccount(s: PaymentSettings): Promise<{ ok: boolean; message: string }> {
  if (!s.bakong_account_id) return { ok: false, message: "Enter a Bakong account ID first." };
  try {
    const qr = createKhqr({ ...s, currency: "USD" }, 0.01, "TEST");
    if (!BakongKHQR.verify(qr.qr).isValid) return { ok: false, message: "Generated KHQR failed validation." };
  } catch (e: any) {
    return { ok: false, message: e.message };
  }
  if (!s.api_token) return { ok: true, message: "KHQR generation works. Add an API token so payments are confirmed automatically." };
  const base = (s.api_url || "https://api-bakong.nbc.gov.kh").replace(/\/$/, "");
  try {
    const res = await fetch(`${base}/v1/check_bakong_account`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${s.api_token}` },
      body: JSON.stringify({ accountId: s.bakong_account_id }),
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    const json = await res.json().catch(() => null);
    if (res.status === 401) return { ok: false, message: "Bakong rejected the API token (expired or wrong)." };
    if (json?.responseCode === 0) return { ok: true, message: `Account ${s.bakong_account_id} found on Bakong ✓` };
    return { ok: false, message: json?.responseMessage || `Bakong answered HTTP ${res.status}.` };
  } catch {
    return { ok: false, message: "Could not reach the Bakong API from this server (it may only accept connections from Cambodia)." };
  }
}

export type ManyResult = {
  paid: Map<string, { hash?: string; fromAccountId?: string; amount?: number; currency?: string }>;
  error?: "limit" | "token" | "network";
};
const isLimit = (j: any) => /limit/i.test(String(j?.responseMessage ?? j?.message ?? ""));
// Some tokens aren't allowed the list endpoint (403). Remember that for this server instance.
let listBlockedUntil = 0;

/**
 * Checks up to 50 QRs in ONE Bakong request (check_transaction_by_md5_list),
 * so everyone waiting to pay shares a single call from the daily budget.
 * Falls back to the single-QR endpoint if the list endpoint isn't available.
 */
export async function checkMany(s: PaymentSettings, md5s: string[], opts: { singles?: number; takeCall?: () => Promise<boolean> } = {}): Promise<ManyResult> {
  const paid: ManyResult["paid"] = new Map();
  if (!s.api_token || md5s.length === 0) return { paid };
  const base = (s.api_url || "https://api-bakong.nbc.gov.kh").replace(/\/$/, "");
  const headers = { "Content-Type": "application/json", Authorization: `Bearer ${s.api_token}` };
  if (Date.now() > listBlockedUntil) try {
    const res = await fetch(`${base}/v1/check_transaction_by_md5_list`, { method: "POST", headers, body: JSON.stringify(md5s.slice(0, 50)), cache: "no-store", signal: AbortSignal.timeout(8_000) });
    if (res.status === 401) return { paid, error: "token" };
    if (res.status === 403 || res.status === 404) listBlockedUntil = Date.now() + 6 * 3600e3;
    const json = await res.json().catch(() => null);
    if (isLimit(json)) return { paid, error: "limit" };
    if (res.ok && Array.isArray(json?.data)) {
      for (const item of json.data) {
        const d = item?.data ?? null;
        const ok = String(item?.status ?? "").toUpperCase() === "SUCCESS" || Boolean(d?.hash);
        if (ok && item?.md5) paid.set(item.md5, { hash: d?.hash, fromAccountId: d?.fromAccountId, amount: d?.amount != null ? Number(d.amount) : undefined, currency: d?.currency });
      }
      return { paid };
    }
  } catch {
    /* fall through to the single endpoint */
  }
  // Fallback: one QR per call. The first one is already paid for from the budget;
  // any extra ones (catching up missed QRs) each take another call from it.
  const n = Math.min(md5s.length, Math.max(1, opts.singles ?? 1));
  for (let i = 0; i < n; i++) {
    if (i > 0 && opts.takeCall && !(await opts.takeCall())) break;
    const one = await checkTransaction(s, md5s[i]);
    if (one.paid) paid.set(md5s[i], one);
    else if (one.error === "token") return { paid, error: "token" };
    else if (one.error === "limit") return { paid, error: "limit" };
  }
  return { paid };
}
