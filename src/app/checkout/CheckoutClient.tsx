"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ShoppingBag, User, Mail, CalendarDays, Lock, ArrowRight, Ticket, TicketPercent, Loader2, X, CheckCircle2 } from "lucide-react";
import { useI18n } from "@/lib/i18n/client";
import { formatFullDate, num } from "@/lib/utils/age";

interface CartItem { ticket_type_id: string; name: string; price: number; quantity: number }
interface Cart { visitDate: string; items: CartItem[]; subtotal: number }

export function CheckoutClient() {
  const router = useRouter();
  const { locale, t } = useI18n();
  const [cart, setCart] = useState<Cart | null>(null);
  const [ready, setReady] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Discount code: typed text, the applied result, and its own status message.
  const [codeInput, setCodeInput] = useState("");
  const [applied, setApplied] = useState<{ code: string; amount: number; name: string } | null>(null);
  const [codeMsg, setCodeMsg] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  const reasonText = (r: any) => {
    const e = t.checkout.discountErrors;
    if (r?.reason === "min_total") return e.min_total(Number(r.min ?? 0));
    return (e as any)[r?.reason] ?? e.invalid;
  };

  async function applyCode() {
    if (!cart || !codeInput.trim()) return;
    setChecking(true);
    setCodeMsg(null);
    try {
      const res = await fetch("/api/discounts/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: codeInput.trim(), items: cart.items.map((i) => ({ ticket_type_id: i.ticket_type_id, quantity: i.quantity })) }),
      });
      const r = await res.json();
      if (r.ok) setApplied({ code: codeInput.trim().toUpperCase(), amount: r.amount, name: (locale === "km" && r.nameKm) || r.name });
      else {
        setApplied(null);
        setCodeMsg(reasonText(r));
      }
    } catch {
      setCodeMsg(t.checkout.failed);
    } finally {
      setChecking(false);
    }
  }

  useEffect(() => {
    const raw = sessionStorage.getItem("gwz_cart");
    if (raw) setCart(JSON.parse(raw));
    setReady(true);
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!cart) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          visitDate: cart.visitDate,
          visitorName: name,
          visitorEmail: email,
          items: cart.items.map((i) => ({ ticket_type_id: i.ticket_type_id, quantity: i.quantity })),
          discountCode: applied?.code,
        }),
      });
      const data = await res.json();
      if (res.status === 409 && data.error === "discount") {
        setApplied(null);
        setCodeMsg(reasonText(data));
        throw new Error(reasonText(data));
      }
      if (!res.ok) throw new Error(data.error ?? t.checkout.failed);
      sessionStorage.removeItem("gwz_cart");
      // `k` lets a guest (not signed in) open their own ticket — see /ticket/[bookingCode].
      const k = encodeURIComponent(data.accessKey);
      // Paid tickets go to the KHQR page; free ones straight to the ticket.
      router.push(data.payWith === "khqr" ? `/pay/${data.bookingCode}?k=${k}` : `/ticket/${data.bookingCode}?success=1&k=${k}`);
    } catch (err: any) {
      setError(err.message ?? t.checkout.failed);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 md:px-6 md:py-12">
        <h1 className="flex items-center gap-3 font-display text-3xl font-extrabold text-forest md:text-4xl">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-white">
            <ShoppingBag size={24} />
          </span>
          {t.checkout.title}
        </h1>

        {ready && !cart ? (
          <div className="card mt-8 p-10 text-center">
            <Ticket size={36} className="mx-auto text-primary" />
            <p className="mt-3 text-ink/60">{t.checkout.emptyCart}</p>
            <Link href="/tickets" className="btn-primary mt-5">
              {t.checkout.chooseTickets} <ArrowRight size={16} />
            </Link>
          </div>
        ) : cart ? (
          <div className="mt-8 grid gap-6 md:grid-cols-[1.2fr_1fr]">
            <form onSubmit={submit} className="card space-y-4 p-6">
              <h2 className="font-display text-xl font-bold text-forest">{t.checkout.yourDetails}</h2>
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-ink/45">{t.checkout.visitorName}</span>
                <div className="relative">
                  <User size={17} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-primary" />
                  <input required value={name} onChange={(e) => setName(e.target.value)} className="input pl-11" />
                </div>
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-ink/45">{t.checkout.email}</span>
                <div className="relative">
                  <Mail size={17} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-primary" />
                  <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input pl-11" />
                </div>
              </label>
              <div>
                <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-ink/45">{t.checkout.discountLabel}</span>
                {applied ? (
                  <div className="flex items-center gap-3 rounded-2xl bg-light-green px-4 py-3 text-sm font-bold text-primary animate-[gwzPop_.3s_ease]">
                    <CheckCircle2 size={18} />
                    <span className="flex-1">
                      {t.checkout.discountApplied(applied.name)} <span className="font-mono">({applied.code})</span>
                    </span>
                    <button type="button" onClick={() => setApplied(null)} className="inline-flex items-center gap-1 text-xs text-ink/50 hover:text-red-600">
                      <X size={14} /> {t.checkout.remove}
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <TicketPercent size={17} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-primary" />
                      <input
                        value={codeInput}
                        onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            applyCode();
                          }
                        }}
                        placeholder={t.checkout.discountPlaceholder}
                        className="input pl-11 font-mono uppercase tracking-wider"
                      />
                    </div>
                    <button type="button" onClick={applyCode} disabled={checking || !codeInput.trim()} className="btn-outline px-5 disabled:opacity-50">
                      {checking ? <Loader2 size={16} className="animate-spin" /> : t.checkout.apply}
                    </button>
                  </div>
                )}
                {codeMsg && <p className="mt-2 text-xs font-semibold text-red-600">{codeMsg}</p>}
              </div>
              {error && <p className="rounded-2xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
              <button disabled={loading || !name || !email} className="btn-primary w-full py-3.5 text-base hover:translate-y-0">
                <Lock size={16} /> {loading ? t.checkout.processing : t.checkout.pay}
              </button>
              <p className="text-center text-xs text-ink/45">{t.checkout.demoNote}</p>
            </form>

            <aside className="card h-fit p-6">
              <h2 className="font-display text-xl font-bold text-forest">{t.checkout.summary}</h2>
              <div className="mt-3 flex items-center gap-2 rounded-2xl bg-light-green px-3 py-2 text-sm font-semibold text-primary">
                <CalendarDays size={16} /> {formatFullDate(cart.visitDate, locale)}
              </div>
              <ul className="mt-4 space-y-2 text-sm">
                {cart.items.map((i) => (
                  <li key={i.ticket_type_id} className="flex justify-between text-ink/70">
                    <span>
                      {i.name} × {num(i.quantity, locale)}
                    </span>
                    <span className="font-semibold text-forest">${(i.price * i.quantity).toFixed(2)}</span>
                  </li>
                ))}
              </ul>
              {applied && (
                <div className="mt-4 space-y-1 border-t border-dashed border-black/10 pt-4 text-sm">
                  <div className="flex justify-between text-ink/60">
                    <span>{t.checkout.subtotal}</span>
                    <span>${cart.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-primary">
                    <span>{t.checkout.discount}</span>
                    <span>-${applied.amount.toFixed(2)}</span>
                  </div>
                </div>
              )}
              <div className="mt-4 flex items-end justify-between border-t border-dashed border-black/10 pt-4">
                <span className="text-sm text-ink/55">{t.common.total}</span>
                <span className="font-display text-3xl font-extrabold text-primary">${Math.max(0, cart.subtotal - (applied?.amount ?? 0)).toFixed(2)}</span>
              </div>
            </aside>
          </div>
        ) : null}
    </main>
  );
}
