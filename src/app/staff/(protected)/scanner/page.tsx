"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import jsQR from "jsqr";
import { CheckCircle2, XCircle, AlertTriangle, Users, CalendarDays, UserRoundPlus, Loader2, ScanLine } from "lucide-react";
import { useI18n } from "@/lib/i18n/client";
import { cn } from "@/lib/utils/cn";
import { KhqrCard, drawKhqr } from "@/components/KhqrCard";

type Verdict = "ok" | "already" | "unpaid" | "cancelled" | "wrong_date" | "invalid";
type ScanResult = {
  verdict: Verdict;
  token: string;
  checkedInAt?: string;
  ticket?: { code: string; name: string | null; visitDate: string; visitors: number; total: number; items: { name: string; name_km: string | null; quantity: number }[] };
};

const TEXT = {
  en: {
    title: "Ticket scanner",
    point: "Point the camera at the visitor's ticket QR",
    ok: "Welcome, you may go in!",
    already: "Already used",
    unpaid: "Not paid yet",
    cancelled: "Booking cancelled",
    wrong_date: "Ticket is for another day",
    invalid: "Not a valid ticket",
    usedAt: "Checked in at",
    visitors: "visitors",
    next: "Scan next",
    allow: "Allow in anyway",
    manual: "Type booking code or token",
    check: "Check",
    noCamera: "Camera not available. Type the code below.",
    gate: "Gate counter",
    today: "Checked in this session",
  },
  km: {
    title: "ស្កេនសំបុត្រ",
    point: "តម្រង់កាមេរ៉ាទៅ QR លើសំបុត្ររបស់ភ្ញៀវ",
    ok: "សូមស្វាគមន៍ អាចចូលបាន!",
    already: "សំបុត្របានប្រើរួចហើយ",
    unpaid: "មិនទាន់បង់ប្រាក់",
    cancelled: "ការកក់ត្រូវបានលុបចោល",
    wrong_date: "សំបុត្រសម្រាប់ថ្ងៃផ្សេង",
    invalid: "មិនមែនជាសំបុត្រត្រឹមត្រូវ",
    usedAt: "បានចូលនៅម៉ោង",
    visitors: "នាក់",
    next: "ស្កេនបន្ទាប់",
    allow: "អនុញ្ញាតឲ្យចូល",
    manual: "វាយលេខកូដ ឬ token",
    check: "ពិនិត្យ",
    noCamera: "មិនអាចប្រើកាមេរ៉ាបានទេ។ សូមវាយលេខកូដខាងក្រោម។",
    gate: "រាប់ភ្ញៀវ",
    today: "បានឆែកចូលក្នុងវេននេះ",
  },
};

const STYLE: Record<Verdict, { bg: string; Icon: typeof CheckCircle2 }> = {
  ok: { bg: "bg-emerald-600", Icon: CheckCircle2 },
  already: { bg: "bg-amber-500", Icon: AlertTriangle },
  wrong_date: { bg: "bg-amber-500", Icon: AlertTriangle },
  unpaid: { bg: "bg-red-600", Icon: XCircle },
  cancelled: { bg: "bg-red-600", Icon: XCircle },
  invalid: { bg: "bg-red-600", Icon: XCircle },
};

/** Short beep: happy two-tone for OK, low buzz otherwise. */
function beep(good: boolean) {
  try {
    const ctx = new AudioContext();
    const tones = good ? [880, 1320] : [220];
    tones.forEach((f, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = good ? "sine" : "square";
      o.frequency.value = f;
      g.gain.value = 0.15;
      o.connect(g).connect(ctx.destination);
      o.start(ctx.currentTime + i * 0.13);
      o.stop(ctx.currentTime + i * 0.13 + (good ? 0.12 : 0.35));
    });
    navigator.vibrate?.(good ? 80 : [120, 60, 120]);
  } catch {
    /* sound is optional */
  }
}


type PayHere = { code: string; key: string; token: string; img?: string; amount?: number; currency?: string; merchant?: string; expiresAt?: string; state: "loading" | "waiting" | "paid" | "error" };

export default function ScannerPage() {
  const { locale } = useI18n();
  const L = TEXT[locale === "km" ? "km" : "en"];
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const busy = useRef(false);
  const lastToken = useRef<{ token: string; at: number } | null>(null);
  const [cameraOk, setCameraOk] = useState(true);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [count, setCount] = useState(0);
  const [pay, setPay] = useState<PayHere | null>(null);
  const km = locale === "km";

  // Unpaid ticket at the counter: show a KHQR for it on this device, poll Bakong, then check it in.
  async function startPayHere(token: string) {
    const r = await fetch("/api/tickets/pay-here", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token }) });
    if (!r.ok) return setPay({ code: "", key: "", token, state: "error" });
    const { code, key } = await r.json();
    setPay({ code, key, token, state: "loading" });
    const v = await fetch("/api/payments/status", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind: "booking", code, key, regenerate: true }) }).then((x) => x.json()).catch(() => null);
    if (!v?.qr) return setPay({ code, key, token, state: "error" });
    const img = await drawKhqr(v.qr, v.logo, v.currency);
    setPay({ code, key, token, img, amount: v.amount, currency: v.currency, merchant: v.merchantName, expiresAt: v.expiresAt, state: "waiting" });
  }
  useEffect(() => {
    if (pay?.state !== "waiting") return;
    const id = setInterval(async () => {
      const v = await fetch("/api/payments/status", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind: "booking", code: pay.code, key: pay.key }) }).then((x) => x.json()).catch(() => null);
      if (v?.status === "paid") {
        clearInterval(id);
        setPay(null);
        scan(pay.token); // now paid: check in → green
      }
    }, 2500);
    return () => clearInterval(id);
  }, [pay]); // eslint-disable-line react-hooks/exhaustive-deps

  const scan = useCallback(async (token: string, force = false) => {
    busy.current = true;
    setLoading(true);
    try {
      const res = await fetch("/api/tickets/scan", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, force }) });
      const data = await res.json();
      const r: ScanResult = { ...data, token, verdict: data.verdict ?? "invalid" };
      setResult(r);
      beep(r.verdict === "ok");
      if (r.verdict === "ok") setCount((c) => c + (r.ticket?.visitors ?? 1));
    } catch {
      setResult({ verdict: "invalid", token });
      beep(false);
    } finally {
      setLoading(false);
    }
  }, []);

  const next = () => {
    setResult(null);
    busy.current = false;
  };

  // Auto-continue after a good scan so staff can keep the line moving.
  useEffect(() => {
    if (result?.verdict !== "ok") return;
    const t = setTimeout(next, 3500);
    return () => clearTimeout(t);
  }, [result]);

  // Camera + decode loop (native BarcodeDetector when available, jsQR everywhere else, e.g. iPhone).
  useEffect(() => {
    let stream: MediaStream | null = null;
    let active = true;
    let timer: ReturnType<typeof setTimeout>;
    const Detector = (window as any).BarcodeDetector;
    const detector = Detector ? new Detector({ formats: ["qr_code"] }) : null;

    const tick = async () => {
      if (!active) return;
      const v = videoRef.current;
      if (v && v.readyState >= 2 && !busy.current) {
        let text: string | null = null;
        try {
          if (detector) {
            const codes = await detector.detect(v);
            text = codes[0]?.rawValue ?? null;
          } else {
            const c = canvasRef.current!;
            const w = 640;
            const h = Math.round((v.videoHeight / v.videoWidth) * w) || 480;
            c.width = w;
            c.height = h;
            const ctx = c.getContext("2d", { willReadFrequently: true })!;
            ctx.drawImage(v, 0, 0, w, h);
            text = jsQR(ctx.getImageData(0, 0, w, h).data, w, h, { inversionAttempts: "dontInvert" })?.data ?? null;
          }
        } catch {
          /* a frame can fail to decode — try the next one */
        }
        const now = Date.now();
        if (text && !(lastToken.current?.token === text && now - lastToken.current.at < 5000)) {
          lastToken.current = { token: text, at: now };
          scan(text);
        }
      }
      timer = setTimeout(tick, 180);
    };

    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
        if (!active) return stream.getTracks().forEach((t) => t.stop());
        videoRef.current!.srcObject = stream;
        await videoRef.current!.play();
        tick();
      } catch {
        setCameraOk(false);
      }
    })();

    return () => {
      active = false;
      clearTimeout(timer);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [scan]);

  const time = (iso?: string) =>
    iso ? new Intl.DateTimeFormat(locale === "km" ? "km-KH" : "en-GB", { hour: "2-digit", minute: "2-digit", day: "numeric", month: "short", timeZone: "Asia/Phnom_Penh", numberingSystem: "latn" }).format(new Date(iso)) : "";

  const S = result ? STYLE[result.verdict] : null;

  return (
    <div className="flex flex-col overflow-hidden rounded-[2rem] bg-gradient-to-b from-[#0F1E4A] to-[#0B1433] pb-2 text-white shadow-lift">
      <header className="flex items-center justify-between gap-2 px-4 py-3">
        <Link href="/staff" className="flex items-center gap-2 font-display text-lg font-extrabold">
          <ScanLine size={20} className="text-[#93C5FD]" /> {L.title}
        </Link>
        <div className="flex items-center gap-2">
          <span className="rounded-xl bg-white/10 px-3 py-1.5 text-xs font-bold">
            {L.today}: <span className="text-[#93C5FD]">{count}</span>
          </span>
          <Link href="/staff/gate" className="inline-flex items-center gap-1.5 rounded-xl bg-white/10 px-3 py-1.5 text-xs font-bold hover:bg-white/20">
            <UserRoundPlus size={14} /> {L.gate}
          </Link>
        </div>
      </header>

      <main className="relative mx-auto w-full max-w-md flex-1 px-4 pb-4">
        {/* Viewfinder */}
        <div className="relative aspect-[3/4] overflow-hidden rounded-[2rem] bg-black">
          <video ref={videoRef} muted playsInline className="h-full w-full object-cover" />
          <canvas ref={canvasRef} className="hidden" />
          {cameraOk ? (
            <>
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="relative h-[62%] w-[78%]">
                  {["left-0 top-0 border-l-4 border-t-4 rounded-tl-3xl", "right-0 top-0 border-r-4 border-t-4 rounded-tr-3xl", "bottom-0 left-0 border-b-4 border-l-4 rounded-bl-3xl", "bottom-0 right-0 border-b-4 border-r-4 rounded-br-3xl"].map((c) => (
                    <span key={c} className={cn("absolute h-12 w-12 border-[#93C5FD]", c)} />
                  ))}
                  <span className="absolute inset-x-3 top-1/2 h-0.5 animate-pulse bg-[#93C5FD] shadow-[0_0_12px_#60A5FA]" />
                </div>
              </div>
              <p className="absolute inset-x-0 bottom-4 text-center text-sm font-semibold text-white/85 drop-shadow">{L.point}</p>
            </>
          ) : (
            <p className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-white/80">{L.noCamera}</p>
          )}
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50">
              <Loader2 size={48} className="animate-spin text-[#93C5FD]" />
            </div>
          )}

          {/* Big answer */}
          {result && S && (
            <div className={cn("absolute inset-0 flex flex-col items-center justify-center p-6 text-center", S.bg)} onClick={result.verdict === "ok" ? next : undefined}>
              <S.Icon size={96} strokeWidth={2.2} className="animate-[gwzPop_.3s_ease]" />
              <h2 className="mt-3 font-display text-3xl font-extrabold leading-tight">{L[result.verdict]}</h2>
              {result.ticket && (
                <div className="mt-4 w-full rounded-2xl bg-black/20 p-4 text-left text-sm">
                  <div className="flex items-center justify-between font-mono text-base font-bold">
                    <span>{result.ticket.code}</span>
                    <span className="inline-flex items-center gap-1">
                      <Users size={16} /> {result.ticket.visitors} {L.visitors}
                    </span>
                  </div>
                  {result.ticket.name && <div className="mt-1 font-semibold">{result.ticket.name}</div>}
                  <div className="mt-1 flex items-center gap-1.5 text-white/85">
                    <CalendarDays size={14} /> {result.ticket.visitDate}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {result.ticket.items.map((i, n) => (
                      <span key={n} className="rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-bold">
                        {(locale === "km" && i.name_km) || i.name} × {i.quantity}
                      </span>
                    ))}
                  </div>
                  {result.verdict === "already" && result.checkedInAt && (
                    <div className="mt-2 font-bold">
                      {L.usedAt} {time(result.checkedInAt)}
                    </div>
                  )}
                </div>
              )}
              <div className="mt-5 flex w-full gap-2">
                {result.verdict === "unpaid" && (
                  <button onClick={() => startPayHere(result.token)} className="flex-1 rounded-2xl bg-white py-3 font-extrabold text-red-700">
                    {km ? "បង់នៅទីនេះ (KHQR)" : "Pay here (KHQR)"}
                  </button>
                )}
                {result.verdict === "wrong_date" && (
                  <button onClick={() => scan(result.token, true)} className="flex-1 rounded-2xl bg-white/25 py-3 font-bold">
                    {L.allow}
                  </button>
                )}
                <button onClick={next} className="flex-1 rounded-2xl bg-white py-3 font-extrabold text-ink">
                  {L.next}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Pay-at-the-counter KHQR */}
        {pay && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
            <div className="w-full max-w-sm">
              {pay.state === "waiting" && pay.img ? (
                <>
                  <KhqrCard merchant={pay.merchant ?? "Green Wild Zoo"} amount={pay.amount} currency={pay.currency}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={pay.img} alt="KHQR" className="w-full" />
                  </KhqrCard>
                  <p className="mt-3 flex items-center justify-center gap-2 text-center text-sm font-bold text-white">
                    <Loader2 size={16} className="animate-spin text-[#93C5FD]" /> {km ? "ឲ្យភ្ញៀវស្កេនបង់ · រង់ចាំ Bakong បញ្ជាក់…" : "Let the visitor scan and pay · waiting for Bakong…"}
                  </p>
                  <p className="mt-1 text-center font-mono text-xs text-white/60">{pay.code}</p>
                </>
              ) : pay.state === "error" ? (
                <p className="rounded-2xl bg-red-600 p-5 text-center font-bold text-white">{km ? "មិនអាចបង្កើត KHQR បានទេ (ពិនិត្យការកំណត់ Bakong)។" : "Couldn't make a KHQR (check the Bakong settings)."}</p>
              ) : (
                <div className="flex justify-center"><Loader2 size={44} className="animate-spin text-[#93C5FD]" /></div>
              )}
              <button onClick={() => setPay(null)} className="mt-4 w-full rounded-2xl bg-white/15 py-3 font-bold text-white">
                {km ? "បិទ" : "Close"}
              </button>
            </div>
          </div>
        )}

        {/* No typing a code by hand: a ticket gets in only by scanning its QR */}
        <p className="mt-4 flex items-center justify-center gap-2 rounded-2xl bg-white/10 px-4 py-3 text-center text-sm font-semibold text-white/75">
          <ScanLine size={16} /> {km ? "ភ្ញៀវអាចចូលបាន លុះត្រាតែស្កេន QR លើសំបុត្រ" : "Visitors get in only by scanning the QR on their ticket"}
        </p>
      </main>
    </div>
  );
}
