"use client";

import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { CheckCircle2, AlertTriangle, Loader2, QrCode, RotateCcw } from "lucide-react";

type Test = { qr: string; md5: string; amount: number; currency: string; expiresAt: string; account: string; hasToken: boolean };
type State =
  | { step: "idle" }
  | { step: "making" }
  | { step: "waiting"; test: Test; img: string; problem?: string }
  | { step: "paid"; test: Test; from?: string; amount?: number; currency?: string }
  | { step: "expired" }
  | { step: "error"; message: string };

const PROBLEM: Record<string, string> = {
  token: "Bakong rejected the API token (expired or wrong). Paste a fresh token and save.",
  timeout: "This server couldn't reach the Bakong API in time. It may only accept connections from Cambodia.",
  network: "This server couldn't reach the Bakong API. It may only accept connections from Cambodia.",
  "no-token": "No API token saved, so the payment can't be confirmed automatically.",
};

/** Admin: pay a real 100៛ KHQR to the zoo's own account and watch it get confirmed. */
export function PaymentTest() {
  const [s, setS] = useState<State>({ step: "idle" });
  const timer = useRef<ReturnType<typeof setInterval>>();
  useEffect(() => () => clearInterval(timer.current), []);

  async function start() {
    clearInterval(timer.current);
    setS({ step: "making" });
    const r = await fetch("/api/admin/payment-test", { method: "POST" });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) return setS({ step: "error", message: data.error ?? `HTTP ${r.status}` });
    const test = data as Test;
    const img = await QRCode.toDataURL(test.qr, { width: 520, margin: 1, errorCorrectionLevel: "M" });
    setS({ step: "waiting", test, img, problem: test.hasToken ? undefined : PROBLEM["no-token"] });
    if (!test.hasToken) return;
    timer.current = setInterval(async () => {
      if (Date.now() > new Date(test.expiresAt).getTime() + 60_000) {
        clearInterval(timer.current);
        return setS({ step: "expired" });
      }
      const c = await fetch(`/api/admin/payment-test?md5=${test.md5}`).then((x) => x.json()).catch(() => null);
      if (c?.paid) {
        clearInterval(timer.current);
        setS({ step: "paid", test, from: c.fromAccountId, amount: c.amount, currency: c.currency });
      } else {
        setS((cur) => (cur.step === "waiting" ? { ...cur, problem: c?.error ? PROBLEM[c.error] ?? c.error : undefined } : cur));
      }
    }, 4000);
  }

  return (
    <div className="rounded-2xl bg-cream p-4 ring-1 ring-primary/10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-sm font-extrabold text-forest">
            <QrCode size={16} className="text-primary" /> Test with a real 100៛ payment
          </p>
          <p className="text-xs text-ink/55">Scan with any bank app and pay 100៛ to the zoo&apos;s own account. This page shows when Bakong confirms it. Nothing else is changed.</p>
        </div>
        {(s.step === "idle" || s.step === "error" || s.step === "expired" || s.step === "paid") && (
          <button type="button" onClick={start} className="btn-primary px-4 py-2 text-sm">
            {s.step === "idle" ? <QrCode size={16} /> : <RotateCcw size={16} />} {s.step === "idle" ? "Create 100៛ test QR" : "Make a new test QR"}
          </button>
        )}
      </div>

      {s.step === "making" && (
        <p className="mt-3 flex items-center gap-2 text-sm text-ink/60">
          <Loader2 size={16} className="animate-spin" /> Creating KHQR…
        </p>
      )}
      {s.step === "error" && <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm font-bold text-red-700">{s.message}</p>}
      {s.step === "expired" && <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-sm font-bold text-amber-800">The test QR expired (10 minutes) without a payment.</p>}

      {s.step === "waiting" && (
        <div className="mt-4 flex flex-col items-center gap-4 sm:flex-row sm:items-start">
          <div className="w-56 flex-shrink-0 overflow-hidden rounded-2xl bg-white shadow-soft">
            <div className="bg-[#E1232E] py-2 text-center text-sm font-extrabold tracking-widest text-white">KHQR</div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={s.img} alt="Test KHQR" className="w-full p-3" />
            <p className="pb-3 text-center font-display text-xl font-extrabold text-forest">100 ៛</p>
          </div>
          <div className="space-y-2 text-sm">
            <p>
              Pays to <b className="font-mono">{s.test.account}</b>
            </p>
            <p className="flex items-center gap-2 font-bold text-primary">
              <Loader2 size={16} className="animate-spin" /> Waiting for Bakong to confirm…
            </p>
            <p className="text-xs text-ink/50">Checked every 4 seconds by the live server. The QR is valid for 10 minutes.</p>
            {s.problem && (
              <p className="flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2 text-xs font-bold text-amber-800">
                <AlertTriangle size={15} className="mt-px flex-shrink-0" /> {s.problem}
              </p>
            )}
          </div>
        </div>
      )}

      {s.step === "paid" && (
        <div className="mt-4 flex items-start gap-3 rounded-2xl bg-primary p-4 text-white">
          <CheckCircle2 size={26} className="flex-shrink-0 text-leaf" />
          <div>
            <p className="font-display text-lg font-extrabold">Payment received and confirmed ✓</p>
            <p className="text-sm text-white/80">
              {s.amount != null ? `${s.amount} ${s.currency ?? ""}` : "100 KHR"} {s.from ? `from ${s.from}` : ""} → {s.test.account}. Ticket payments will be confirmed the same way.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
