"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Plus, Minus, Trash2, Banknote, QrCode, Loader2, CheckCircle2, X, Receipt, RefreshCw, ShoppingBag, PackageX } from "lucide-react";
import { KhqrCard, drawKhqr } from "@/components/KhqrCard";
import { createSale, checkSale, renewSaleQr, cancelSale, type SaleResult } from "@/app/staff/(protected)/shop/actions";
import { playSound, unlockSound } from "@/lib/client-sound";
import { cn } from "@/lib/utils/cn";

export type PosProduct = { id: string; name: string; name_km: string | null; category: string; price_usd: number; stock: number; low_stock: number; image_url: string | null };

const usd = (n: number) => `$${n.toFixed(2)}`;
const riel = (n: number) => `${Math.round(n).toLocaleString("en-US")}៛`;

/** The till: tap products, then take cash or show the shop's KHQR. */
export function ShopPos({ products, categories, khqrReady, rate, km }: { products: PosProduct[]; categories: Record<string, [string, string]>; khqrReady: boolean; rate: number; km: boolean }) {
  const router = useRouter();
  const [cart, setCart] = useState<Record<string, number>>({});
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");
  const [step, setStep] = useState<"" | "cash" | "khqr" | "done">("");
  const [given, setGiven] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [sale, setSale] = useState<SaleResult | null>(null);
  const [qrImg, setQrImg] = useState("");
  const [now, setNow] = useState(Date.now());
  const [showCart, setShowCart] = useState(false);
  const byId = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);
  const name = (p: PosProduct) => (km && p.name_km) || p.name;

  const lines = Object.entries(cart).filter(([id, n]) => n > 0 && byId.has(id)).map(([id, n]) => ({ p: byId.get(id)!, n }));
  const total = Math.round(lines.reduce((s, l) => s + l.p.price_usd * l.n, 0) * 100) / 100;
  const count = lines.reduce((s, l) => s + l.n, 0);
  const add = (id: string, d: number) => {
    const p = byId.get(id);
    if (!p) return;
    setCart((c) => ({ ...c, [id]: Math.max(0, Math.min(p.stock, (c[id] ?? 0) + d)) }));
    navigator.vibrate?.(8);
  };
  const shown = products.filter((p) => (!cat || p.category === cat) && (!q || `${p.name} ${p.name_km ?? ""}`.toLowerCase().includes(q.toLowerCase())));
  const cats = [...new Set(products.map((p) => p.category))];

  const fail = (e?: string) => {
    if (!e) return;
    if (e.startsWith("stock:")) {
      const [, n, left] = e.split(":");
      return setErr(km ? `${n} សល់តែ ${left} ប៉ុណ្ណោះ` : `Only ${left} ${n} left`);
    }
    setErr(
      ({ "khqr-off": km ? "KHQR របស់ហាងមិនទាន់បើក (Admin → Integrations)" : "Shop KHQR isn't set up yet (Admin → Integrations)", "cash-short": km ? "ប្រាក់ទទួលតិចជាងតម្លៃ" : "Cash given is less than the total", gone: km ? "ទំនិញខ្លះលែងលក់ហើយ" : "Some items are no longer sold", empty: km ? "មិនទាន់មានទំនិញ" : "The cart is empty" } as Record<string, string>)[e] ?? e
    );
  };

  const payCash = async () => {
    const g = given ? Number(given) : total;
    if (!(g >= total)) return fail("cash-short");
    setBusy(true);
    setErr("");
    const r = await createSale(lines.map((l) => ({ id: l.p.id, qty: l.n })), "cash", g).catch(() => ({ error: km ? "មិនអាចរក្សាទុកបាន" : "Couldn't save" }) as SaleResult);
    setBusy(false);
    if (r.error) return fail(r.error);
    unlockSound();
    playSound("ok");
    setSale(r);
    setStep("done");
    router.refresh();
  };
  const payQr = async () => {
    setBusy(true);
    setErr("");
    const r = await createSale(lines.map((l) => ({ id: l.p.id, qty: l.n })), "khqr").catch(() => ({ error: km ? "មិនអាចបង្កើត KHQR បាន" : "Couldn't make a KHQR" }) as SaleResult);
    setBusy(false);
    if (r.error) return fail(r.error);
    setSale(r);
    setShowCart(false);
    setStep("khqr");
    unlockSound();
  };
  // draw the QR with the logo
  useEffect(() => {
    if (step === "khqr" && sale?.qr) drawKhqr(sale.qr, sale.logo, sale.currency).then(setQrImg).catch(() => setQrImg(""));
  }, [step, sale?.qr, sale?.logo, sale?.currency]);
  // wait for Bakong to say it's paid
  const polling = useRef(false);
  useEffect(() => {
    if (step !== "khqr" || !sale?.id) return;
    const tick = async (force = false) => {
      if (polling.current) return;
      polling.current = true;
      const r = await checkSale(sale.id!, force).catch(() => null);
      polling.current = false;
      if (r?.status === "paid") {
        playSound("ok");
        navigator.vibrate?.([80, 60, 80]);
        setStep("done");
        router.refresh();
      } else if (r?.status === "cancelled") setStep("");
    };
    const id = setInterval(() => tick(), 4000);
    const clock = setInterval(() => setNow(Date.now()), 1000);
    (window as any).__gwzCheckNow = () => tick(true);
    return () => {
      clearInterval(id);
      clearInterval(clock);
    };
  }, [step, sale?.id, router]);

  const reset = () => {
    setCart({});
    setGiven("");
    setSale(null);
    setQrImg("");
    setErr("");
    setStep("");
    setShowCart(false);
  };
  const left = sale?.expiresAt ? Math.max(0, Math.floor((Date.parse(sale.expiresAt) - now) / 1000)) : 0;
  const g = Number(given || 0);

  const cartPanel = (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-black/5 px-4 py-3">
        <ShoppingBag size={18} className="text-primary" />
        <p className="flex-1 font-display font-extrabold text-forest">{km ? "កន្ត្រក" : "Cart"} <span className="text-ink/40">({count})</span></p>
        {count > 0 && <button type="button" onClick={() => setCart({})} className="text-xs font-bold text-red-500 hover:underline">{km ? "សម្អាត" : "Clear"}</button>}
        <button type="button" onClick={() => setShowCart(false)} className="md:hidden" aria-label="close"><X size={20} /></button>
      </div>
      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
        {lines.length === 0 && <p className="py-10 text-center text-sm text-ink/45">{km ? "ចុចលើទំនិញ ដើម្បីបន្ថែម" : "Tap products to add them"}</p>}
        {lines.map(({ p, n }) => (
          <div key={p.id} className="flex items-center gap-2 rounded-2xl bg-cream/60 p-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {p.image_url ? <img src={p.image_url} alt="" className="h-11 w-11 rounded-xl bg-white object-contain" /> : <span className="h-11 w-11 rounded-xl bg-white" />}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-forest">{name(p)}</p>
              <p className="text-xs text-ink/50">{usd(p.price_usd)} × {n} = <b className="text-forest">{usd(p.price_usd * n)}</b></p>
            </div>
            <button type="button" onClick={() => add(p.id, -1)} aria-label="minus" className="flex h-8 w-8 items-center justify-center rounded-full bg-white ring-1 ring-black/10"><Minus size={14} /></button>
            <span className="w-6 text-center font-extrabold">{n}</span>
            <button type="button" onClick={() => add(p.id, 1)} disabled={n >= p.stock} aria-label="plus" className="flex h-8 w-8 items-center justify-center rounded-full bg-white ring-1 ring-black/10 disabled:opacity-40"><Plus size={14} /></button>
            <button type="button" onClick={() => setCart((c) => ({ ...c, [p.id]: 0 }))} aria-label="remove" className="text-ink/30 hover:text-red-500"><Trash2 size={15} /></button>
          </div>
        ))}
      </div>
      <div className="space-y-2 border-t border-black/5 p-4">
        <div className="flex items-end justify-between">
          <span className="text-sm font-bold text-ink/55">{km ? "សរុប" : "Total"}</span>
          <span className="text-right">
            <span className="block font-display text-3xl font-extrabold text-forest">{usd(total)}</span>
            <span className="text-xs font-bold text-ink/45">≈ {riel(total * rate)}</span>
          </span>
        </div>
        {err && <p className="rounded-xl bg-red-50 px-3 py-2 text-xs font-bold text-red-700">{err}</p>}
        <div className="grid grid-cols-2 gap-2">
          <button type="button" disabled={!count || busy} onClick={() => { setErr(""); setStep("cash"); }} className="flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 py-3.5 font-extrabold text-white disabled:opacity-40">
            <Banknote size={19} /> {km ? "សាច់ប្រាក់" : "Cash"}
          </button>
          <button type="button" disabled={!count || busy || !khqrReady} onClick={payQr} title={khqrReady ? "" : km ? "KHQR ហាងមិនទាន់បើក" : "Shop KHQR is off"} className="flex items-center justify-center gap-2 rounded-2xl bg-[#E1232E] py-3.5 font-extrabold text-white disabled:opacity-40">
            {busy ? <Loader2 size={19} className="animate-spin" /> : <QrCode size={19} />} KHQR
          </button>
        </div>
        {!khqrReady && <p className="text-center text-[11px] text-ink/45">{km ? "KHQR ហាងមិនទាន់បើក៖ Admin → Integrations → Souvenir shop KHQR" : "Shop KHQR is off: Admin → Integrations → Souvenir shop KHQR"}</p>}
      </div>
    </div>
  );

  return (
    <div className="grid gap-4 md:grid-cols-[1fr_22rem]">
      {/* products */}
      <div className="card p-4">
        <div className="relative">
          <Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink/35" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={km ? "ស្វែងរកទំនិញ…" : "Search products…"} className="w-full rounded-2xl border border-black/10 bg-cream/40 py-3 pl-10 pr-4 text-base outline-none focus:border-primary" />
        </div>
        <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto pb-1">
          <Chip on={!cat} onClick={() => setCat("")}>{km ? "ទាំងអស់" : "All"}</Chip>
          {cats.map((c) => <Chip key={c} on={cat === c} onClick={() => setCat(c)}>{categories[c]?.[km ? 1 : 0] ?? c}</Chip>)}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {shown.map((p) => {
            const inCart = cart[p.id] ?? 0;
            const out = p.stock <= 0;
            return (
              <button key={p.id} type="button" disabled={out || inCart >= p.stock} onClick={() => add(p.id, 1)} className={cn("relative flex flex-col overflow-hidden rounded-2xl bg-white text-left ring-1 transition active:scale-[.97]", inCart ? "ring-2 ring-primary" : "ring-black/5 hover:ring-primary/30", out && "opacity-50")}>
                <span className="relative block aspect-square bg-gradient-to-br from-cream to-white">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {p.image_url && <img src={p.image_url} alt="" loading="lazy" className="h-full w-full object-contain p-2" />}
                  {inCart > 0 && <span className="absolute right-2 top-2 flex h-7 min-w-7 items-center justify-center rounded-full bg-primary px-2 text-sm font-extrabold text-white shadow">{inCart}</span>}
                  {out ? (
                    <span className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-1 bg-red-600 py-1 text-[11px] font-bold text-white"><PackageX size={12} /> {km ? "អស់ស្តុក" : "Sold out"}</span>
                  ) : p.stock <= p.low_stock ? (
                    <span className="absolute inset-x-0 bottom-0 bg-amber-500 py-1 text-center text-[11px] font-bold text-white">{km ? `សល់ ${p.stock}` : `${p.stock} left`}</span>
                  ) : null}
                </span>
                <span className="p-2.5">
                  <span className="line-clamp-2 block text-sm font-bold leading-tight text-forest">{name(p)}</span>
                  <span className="mt-1 block font-display text-lg font-extrabold text-primary">{usd(p.price_usd)}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* cart: side panel on a computer, a bar + sheet on a phone */}
      <aside className="card sticky top-28 hidden h-[calc(100vh-9rem)] overflow-hidden p-0 md:block">{cartPanel}</aside>
      {count > 0 && !showCart && (
        <button type="button" onClick={() => setShowCart(true)} className="fixed inset-x-3 bottom-[5.2rem] z-30 flex items-center justify-between rounded-2xl bg-primary px-5 py-4 font-extrabold text-white shadow-lift md:hidden">
          <span className="flex items-center gap-2"><ShoppingBag size={20} /> {count} {km ? "មុខ" : "items"}</span>
          <span>{usd(total)} →</span>
        </button>
      )}
      {showCart && (
        <div className="fixed inset-0 z-[60] flex items-end bg-black/40 md:hidden" onClick={() => setShowCart(false)}>
          <div onClick={(e) => e.stopPropagation()} className="h-[85vh] w-full overflow-hidden rounded-t-3xl bg-white">{cartPanel}</div>
        </div>
      )}

      {/* cash */}
      {step === "cash" && (
        <Modal onClose={() => setStep("")}>
          <h3 className="font-display text-xl font-extrabold text-forest">{km ? "ទទួលសាច់ប្រាក់" : "Take cash"}</h3>
          <p className="mt-1 text-sm text-ink/55">{km ? "សរុប" : "Total"} <b className="text-forest">{usd(total)}</b> · ≈ {riel(total * rate)}</p>
          <label className="mt-4 block text-sm font-bold text-forest">{km ? "ភ្ញៀវឲ្យ (USD)" : "Customer gives (USD)"}</label>
          <input autoFocus inputMode="decimal" value={given} onChange={(e) => setGiven(e.target.value.replace(/[^\d.]/g, ""))} placeholder={total.toFixed(2)} className="mt-1 w-full rounded-2xl border border-black/10 px-4 py-3 text-2xl font-extrabold outline-none focus:border-primary" />
          <div className="mt-2 flex flex-wrap gap-2">
            {[total, 5, 10, 20, 50, 100].filter((v, i) => i === 0 || v > total).map((v, i) => (
              <button key={i} type="button" onClick={() => setGiven(v.toFixed(2))} className="rounded-full bg-cream px-3 py-1.5 text-sm font-bold text-forest">{i === 0 ? (km ? "គ្រប់ចំនួន" : "Exact") : `$${v}`}</button>
            ))}
          </div>
          {g > total && (
            <p className="mt-4 rounded-2xl bg-emerald-50 p-3 text-emerald-800">
              {km ? "អាប់ឲ្យភ្ញៀវ" : "Change"}: <b className="text-2xl">{usd(g - total)}</b> <span className="text-sm">≈ {riel((g - total) * rate)}</span>
            </p>
          )}
          {err && <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm font-bold text-red-700">{err}</p>}
          <button type="button" onClick={payCash} disabled={busy} className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 py-4 text-lg font-extrabold text-white disabled:opacity-60">
            {busy ? <Loader2 size={20} className="animate-spin" /> : <CheckCircle2 size={20} />} {km ? "បានទទួលប្រាក់ · រក្សាទុក" : "Paid · save sale"}
          </button>
        </Modal>
      )}

      {/* KHQR for the customer to scan */}
      {step === "khqr" && sale && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/85 p-4">
          <div className="w-full max-w-sm">
            <KhqrCard merchant={sale.merchant ?? "GWZ Souvenir Shop"} amount={sale.amount} currency={sale.currency}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {qrImg ? <img src={qrImg} alt="KHQR" className="w-full" /> : <div className="flex aspect-square items-center justify-center"><Loader2 className="animate-spin" /></div>}
            </KhqrCard>
            {left > 0 ? (
              <p className="mt-3 flex items-center justify-center gap-2 text-center text-sm font-bold text-white">
                <Loader2 size={16} className="animate-spin text-[#93C5FD]" /> {km ? "ឲ្យភ្ញៀវស្កេនបង់ · រង់ចាំ Bakong បញ្ជាក់…" : "Customer scans and pays · waiting for Bakong…"} <span className="font-mono">{Math.floor(left / 60)}:{String(left % 60).padStart(2, "0")}</span>
              </p>
            ) : (
              <button type="button" onClick={async () => { const r = await renewSaleQr(sale.id!); if (!r.error) { setSale({ ...sale, ...r }); setQrImg(""); } }} className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-white py-3 font-extrabold text-black">
                <RefreshCw size={18} /> {km ? "QR ផុតកំណត់ · បង្កើតថ្មី" : "QR expired · make a new one"}
              </button>
            )}
            <p className="mt-1 text-center font-mono text-xs text-white/60">{sale.code}</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button type="button" onClick={() => (window as any).__gwzCheckNow?.()} className="rounded-2xl bg-white/15 py-3 text-sm font-bold text-white">{km ? "ពិនិត្យឥឡូវ" : "Check now"}</button>
              <button type="button" onClick={async () => { if (confirm(km ? "បោះបង់ការលក់នេះ?" : "Cancel this sale?")) { await cancelSale(sale.id!); setStep(""); setSale(null); } }} className="rounded-2xl bg-red-600/80 py-3 text-sm font-bold text-white">{km ? "បោះបង់" : "Cancel"}</button>
            </div>
          </div>
        </div>
      )}

      {/* done */}
      {step === "done" && sale && (
        <Modal onClose={reset}>
          <div className="text-center">
            <CheckCircle2 size={64} className="mx-auto text-emerald-500" />
            <h3 className="mt-2 font-display text-2xl font-extrabold text-forest">{km ? "លក់បានជោគជ័យ!" : "Sale complete!"}</h3>
            <p className="font-mono text-sm text-ink/50">{sale.code}</p>
            <p className="mt-3 font-display text-4xl font-extrabold text-forest">{usd(sale.total ?? 0)}</p>
            {sale.change != null && sale.change > 0 && <p className="mt-1 font-bold text-emerald-700">{km ? "អាប់" : "Change"} {usd(sale.change)} · ≈ {riel(sale.change * rate)}</p>}
            {sale.qr && <p className="mt-1 text-sm font-bold text-[#E1232E]">{km ? "បង់តាម KHQR · Bakong បានបញ្ជាក់ ✓" : "Paid by KHQR · confirmed by Bakong ✓"}</p>}
          </div>
          <div className="mt-5 grid grid-cols-2 gap-2">
            <a href={`/staff/shop/receipt/${sale.code}`} target="_blank" rel="noopener" className="flex items-center justify-center gap-2 rounded-2xl bg-cream py-3.5 font-extrabold text-forest"><Receipt size={18} /> {km ? "វិក្កយបត្រ" : "Receipt"}</a>
            <button type="button" onClick={reset} className="rounded-2xl bg-primary py-3.5 font-extrabold text-white">{km ? "លក់បន្ទាប់" : "Next sale"}</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} className={cn("flex-shrink-0 rounded-full px-4 py-2 text-sm font-bold transition", on ? "bg-primary text-white" : "bg-cream text-forest hover:bg-light-green")}>
      {children}
    </button>
  );
}

function Modal({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/50 md:items-center" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md animate-[gwzPop_.2s_ease-out_both] rounded-t-3xl bg-white p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] md:rounded-3xl">
        {children}
      </div>
    </div>
  );
}
