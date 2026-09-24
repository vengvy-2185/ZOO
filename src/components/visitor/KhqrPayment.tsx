"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { KhqrCard, drawKhqr } from "@/components/KhqrCard";
import { CheckCircle2, Download, Loader2, RefreshCw, Smartphone, TimerOff, Store } from "lucide-react";
import { useI18n } from "@/lib/i18n/client";

export interface KhqrView {
  status: "pending" | "paid" | "expired" | "unavailable";
  qr?: string;
  amount?: number;
  currency?: string;
  expiresAt?: string;
  merchantName?: string;
  canVerify?: boolean;
  logo?: string;
}

// KHQR payment card (styled after the official KHQR layout: red header,
// merchant, amount, QR). Polls the server every 3 s; the server asks Bakong
// whether the QR has been paid and redirects once it has.
export function KhqrPayment({
  kind,
  code,
  accessKey,
  initial,
  successHref,
}: {
  kind: "booking" | "adoption";
  code: string;
  accessKey: string;
  initial: KhqrView;
  successHref: string;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const [view, setView] = useState<KhqrView>(initial);
  const [img, setImg] = useState<string | null>(null);
  const [left, setLeft] = useState(0);
  const [busy, setBusy] = useState(false);
  const stopped = useRef(false);

  const poll = useCallback(
    async (regenerate = false) => {
      const res = await fetch("/api/payments/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, code, key: accessKey, regenerate }),
      });
      if (!res.ok) return;
      const next = (await res.json()) as KhqrView;
      setView((v) => (next.status === "pending" && !next.qr ? { ...v, ...next, qr: v.qr } : next));
    },
    [kind, code, accessKey]
  );

  // QR image
  useEffect(() => {
    if (view.qr) drawKhqr(view.qr, view.logo, view.currency).then(setImg);
  }, [view.qr, view.logo, view.currency]);

  // Countdown
  useEffect(() => {
    if (!view.expiresAt) return;
    const tick = () => setLeft(Math.max(0, Math.round((new Date(view.expiresAt!).getTime() - Date.now()) / 1000)));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [view.expiresAt]);

  // Poll while pending (also a little after expiry, in case it was paid at the last second)
  useEffect(() => {
    if (view.status !== "pending" || stopped.current) return;
    const id = setInterval(() => poll(), 3000);
    return () => clearInterval(id);
  }, [view.status, poll]);

  // Online payment not set up yet: quietly check again (a QR appears as soon as the admin connects Bakong).
  useEffect(() => {
    if (view.status !== "unavailable") return;
    const id = setInterval(() => poll(true), 15000);
    return () => clearInterval(id);
  }, [view.status, poll]);

  useEffect(() => {
    if (view.status === "paid") {
      stopped.current = true;
      const id = setTimeout(() => router.push(successHref), 1800);
      return () => clearTimeout(id);
    }
  }, [view.status, router, successHref]);

  if (view.status === "unavailable") {
    return (
      <div className="card mx-auto max-w-md p-8 text-center">
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-amber-50 text-amber-600">
          <Store size={30} />
        </span>
        <h2 className="mt-4 font-display text-xl font-extrabold text-forest">{t.pay.unavailable}</h2>
        <p className="mt-2 text-sm text-ink/60">{t.pay.unavailableText}</p>
        <div className="mt-4 rounded-2xl bg-cream px-4 py-3 text-sm">
          {t.pay.orderRef}: <span className="font-mono text-base font-bold text-forest">{code}</span>
        </div>
      </div>
    );
  }

  if (view.status === "paid") {
    return (
      <div className="card mx-auto max-w-sm p-8 text-center animate-[payOk_.5s_ease]">
        <span className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-primary text-white shadow-lift">
          <CheckCircle2 size={44} />
        </span>
        <h2 className="mt-4 font-display text-2xl font-extrabold text-forest">{t.pay.paid}</h2>
        <p className="mt-1 text-sm text-ink/60">{t.pay.paidText}</p>
        <style>{`@keyframes payOk{from{opacity:0;transform:scale(.9)}to{opacity:1;transform:none}}`}</style>
      </div>
    );
  }

  const expired = view.status === "expired" || (view.expiresAt && left === 0);
  const mm = String(Math.floor(left / 60)).padStart(2, "0");
  const ss = String(left % 60).padStart(2, "0");

  return (
    <div className="mx-auto grid max-w-3xl items-start gap-6 md:grid-cols-[340px_1fr]">
      {/* KHQR card */}
      <KhqrCard
        merchant={view.merchantName ?? "Green Wild Zoo"}
        amount={view.amount}
        currency={view.currency}
        footer={
        <div className="border-t border-black/5 bg-cream px-6 py-3 text-center text-sm font-bold">
          {expired ? (
            <button
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                await poll(true);
                setBusy(false);
              }}
              className="btn-primary w-full py-2.5 hover:translate-y-0"
            >
              <RefreshCw size={15} className={busy ? "animate-spin" : ""} /> {t.pay.newQr}
            </button>
          ) : (
            <span className={left < 60 ? "text-red-600" : "text-forest"}>{t.pay.expiresIn(`${mm}:${ss}`)}</span>
          )}
        </div>
        }
      >
        <div className="relative">
          {img && !expired ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={img} alt="KHQR" className="mx-auto w-full max-w-[260px]" />
          ) : (
            <div className="mx-auto flex aspect-square w-full max-w-[260px] flex-col items-center justify-center gap-3 rounded-2xl bg-black/[0.04] text-center text-ink/55">
              {expired ? <TimerOff size={40} /> : <Loader2 size={32} className="animate-spin" />}
              {expired && <span className="px-6 text-sm font-semibold">{t.pay.expired}</span>}
            </div>
          )}
        </div>

      </KhqrCard>

      {/* Instructions + live status */}
      <div className="space-y-4">
        <div className="card flex items-center gap-3 p-4">
          <span className="relative flex h-3 w-3">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-leaf opacity-70" />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-primary" />
          </span>
          <div>
            <div className="font-bold text-forest">{t.pay.waiting}</div>
            <div className="text-xs text-ink/55">{t.pay.checking}</div>
          </div>
        </div>
        <ol className="card space-y-3 p-5">
          {t.pay.steps.map((s, i) => (
            <li key={s} className="flex items-center gap-3 text-sm text-ink/75">
              <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-light-green font-display font-bold text-primary">{i + 1}</span>
              {s}
            </li>
          ))}
        </ol>
        <div className="flex flex-wrap items-center gap-2 text-xs text-ink/50">
          <Smartphone size={14} /> ABA, ACLEDA, Wing, Bakong, Canadia, Prince
        </div>
        {img && !expired && (
          <a href={img} download={`KHQR-${code}.png`} className="btn-outline w-full sm:w-auto">
            <Download size={16} /> {t.pay.save}
          </a>
        )}
        <div className="text-xs text-ink/45">
          {t.pay.orderRef}: <span className="font-mono font-bold text-ink/70">{code}</span>
        </div>
      </div>
    </div>
  );
}
