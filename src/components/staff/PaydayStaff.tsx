"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useFormState, useFormStatus } from "react-dom";
import jsQR from "jsqr";
import { Loader2, Send, CheckCircle2, AlertCircle, ScanLine, CameraOff, HandCoins, Clock3, UserRoundCheck, Landmark, Trash2, FileText } from "lucide-react";
import { requestPayday, cancelPayRequest, claimPay, type ClaimResult, type PayReqState } from "@/app/staff/(protected)/pay/actions";
import { playSound } from "@/lib/client-sound";
import { PinPad } from "@/components/staff/PinPad";
import { cn } from "@/lib/utils/cn";

const field = "w-full rounded-2xl border border-black/10 bg-cream/40 px-4 py-3 text-base outline-none transition focus:border-primary focus:bg-white";

function SendBtn({ km }: { km: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button disabled={pending} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3 font-extrabold text-white disabled:opacity-60">
      {pending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />} {km ? "ផ្ញើសំណើទៅ Admin" : "Send to the admin"}
    </button>
  );
}

const REQ_ERR: Record<string, [string, string]> = {
  late: ["Too late: requests must be sent at least 4 days before payday.", "យឺតពេលហើយ៖ ត្រូវផ្ញើយ៉ាងតិច ៤ ថ្ងៃមុនថ្ងៃបើកប្រាក់ខែ។"],
  closed: ["This payday is closed.", "ការបើកប្រាក់ខែនេះបានបិទហើយ។"],
  reason: ["Please write the reason.", "សូមសរសេរមូលហេតុ។"],
  pickup: ["Choose a day after payday to collect.", "សូមជ្រើសថ្ងៃមកយក ក្រោយថ្ងៃបើកប្រាក់ខែ។"],
  proxy: ["Write the name of who will collect.", "សូមសរសេរឈ្មោះអ្នកមកយកជំនួស។"],
  decided: ["Your request was already answered.", "សំណើរបស់អ្នកត្រូវបានឆ្លើយតបរួចហើយ។"],
  invalid: ["Please check the form.", "សូមពិនិត្យព័ត៌មានម្តងទៀត។"],
};

/** "I can't come on payday" / "I'm on leave that day": sent ≥ 4 days before. */
export function PayRequestForm({ km, paydayId, payDate }: { km: boolean; paydayId: string; payDate: string }) {
  const router = useRouter();
  const [state, action] = useFormState<PayReqState, FormData>(requestPayday, {});
  const [kind, setKind] = useState("absent");
  const [method, setMethod] = useState("later");
  const L = (en: string, k: string) => (km ? k : en);
  useEffect(() => {
    if (state.ok) router.refresh();
  }, [state.ok, router]);
  const next = new Date(Date.parse(`${payDate}T00:00:00Z`) + 864e5).toISOString().slice(0, 10);
  const pill = (on: boolean) => cn("flex items-center justify-center gap-1.5 rounded-2xl border px-3 py-3 text-sm font-bold transition", on ? "border-primary bg-primary text-white shadow" : "border-black/10 bg-cream/40 text-forest hover:border-primary/40");
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="payday" value={paydayId} />
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="method" value={method} />
      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={() => setKind("absent")} className={pill(kind === "absent")}>{L("I can't come", "មកមិនបាន")}</button>
        <button type="button" onClick={() => setKind("leave")} className={pill(kind === "leave")}>{L("I'm on leave", "ឈប់សម្រាក/ច្បាប់")}</button>
      </div>
      <p className="text-xs font-bold text-ink/55">{L("How will you get your pay?", "តើអ្នកនឹងទទួលប្រាក់ដោយរបៀបណា?")}</p>
      <div className="grid grid-cols-3 gap-2">
        <button type="button" onClick={() => setMethod("later")} className={pill(method === "later")}><Clock3 size={15} /> {L("Later", "មកយកក្រោយ")}</button>
        <button type="button" onClick={() => setMethod("proxy")} className={pill(method === "proxy")}><UserRoundCheck size={15} /> {L("Someone", "អ្នកជំនួស")}</button>
        <button type="button" onClick={() => setMethod("transfer")} className={pill(method === "transfer")}><Landmark size={15} /> {L("Bank", "ធនាគារ")}</button>
      </div>
      {method === "later" && (
        <label className="block">
          <span className="mb-1 block text-xs font-bold text-ink/55">{L("The day you will come", "ថ្ងៃដែលអ្នកនឹងមកយក")}</span>
          <input type="date" name="pickup_date" min={next} required className={field} />
        </label>
      )}
      {method === "proxy" && <input name="proxy_name" required maxLength={100} placeholder={L("Name of who will collect (and phone)", "ឈ្មោះអ្នកមកយកជំនួស (និងលេខទូរស័ព្ទ)")} className={field} />}
      <textarea name="reason" required minLength={3} maxLength={500} rows={2} placeholder={L("Reason", "មូលហេតុ")} className={field} />
      {state.error && <p role="alert" className="flex items-center gap-2 rounded-2xl bg-red-50 px-3 py-2 text-sm font-bold text-red-700"><AlertCircle size={16} /> {REQ_ERR[state.error]?.[km ? 1 : 0] ?? state.error}</p>}
      <SendBtn km={km} />
    </form>
  );
}

export function CancelRequest({ km, paydayId }: { km: boolean; paydayId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button disabled={pending} onClick={() => confirm(km ? "លុបសំណើនេះ?" : "Cancel this request?") && start(async () => { await cancelPayRequest(paydayId); router.refresh(); })} className="inline-flex items-center gap-1 text-xs font-bold text-red-600">
      {pending ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />} {km ? "លុបសំណើ" : "Cancel request"}
    </button>
  );
}

const CLAIM_ERR: Record<string, [string, string]> = {
  invalid: ["This isn't a valid payday QR code.", "QR នេះមិនមែនជា QR បើកប្រាក់ខែត្រឹមត្រូវទេ។"],
  not_open: ["Payday hasn't been opened yet.", "ការបើកប្រាក់ខែមិនទាន់ចាប់ផ្តើមទេ។"],
  not_today: ["It's not payday yet.", "មិនទាន់ដល់ថ្ងៃបើកប្រាក់ខែទេ។"],
  closed: ["This payday is closed. Please see the admin.", "ការបើកប្រាក់ខែនេះបានបិទហើយ។ សូមទាក់ទង Admin។"],
  dept: ["This QR code is for another department. Please scan your own department's code.", "QR នេះសម្រាប់ផ្នែកផ្សេង។ សូមស្កេន QR នៃផ្នែករបស់អ្នក។"],
  no_slip: ["You have no payslip for this month. Please see the admin.", "អ្នកមិនមានវិក្កយបត្រប្រាក់ខែខែនេះទេ។ សូមទាក់ទង Admin។"],
  already: ["You already collected this pay.", "អ្នកបានទទួលប្រាក់ខែនេះរួចហើយ។"],
  pin_wrong: ["Wrong code.", "លេខកូដមិនត្រឹមត្រូវ"],
  pin_locked: ["Too many wrong tries. Please wait 5 minutes.", "ខុសច្រើនដងពេក។ សូមរង់ចាំ ៥ នាទី"],
};

/** The confirm step after scanning (so a link preview can never collect for you). */
export function ClaimPay({ km, p, d, s, month, monthName }: { km: boolean; p: string; d: string; s: string; month: string; monthName: string }) {
  const [res, setRes] = useState<ClaimResult | null>(null);
  const L = (en: string, k: string) => (km ? k : en);
  const usd = (n?: number) => `$${(n ?? 0).toFixed(2)}`;
  // the code confirms it's really them; returns the message to show under the pad
  const go = async (pin: string) => {
    const r = await claimPay(p, d, s, pin);
    if (r.error === "pin_wrong" || r.error === "pin_locked") return `${CLAIM_ERR[r.error][km ? 1 : 0]}${r.left ? (km ? ` · នៅសល់ ${r.left} ដង` : ` · ${r.left} tries left`) : ""}`;
    setRes(r);
    if (r.ok) {
      playSound("ok", 0.7);
      navigator.vibrate?.([60, 40, 120]);
    }
    return null;
  };
  if (res?.ok || res?.error === "already")
    return (
      <div className="text-center">
        <span className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 text-emerald-600"><CheckCircle2 size={44} /></span>
        <p className="mt-4 font-display text-2xl font-extrabold text-forest">{res.ok ? L("Pay collected", "បានទទួលប្រាក់ខែ") : L("Already collected", "បានទទួលរួចហើយ")}</p>
        <p className="font-bold text-primary">{L("Pay for", "ប្រាក់ខែ")} {monthName}</p>
        <p className="mt-1 font-display text-5xl font-extrabold text-emerald-600">{usd(res.amount)}</p>
        <p className="mt-2 text-sm text-ink/55">{L("Show this screen at the pay desk.", "សូមបង្ហាញអេក្រង់នេះនៅកន្លែងបើកប្រាក់។")} {res.at ? new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit", timeZone: "Asia/Phnom_Penh" }).format(new Date(res.at)) : ""}</p>
        <Link href={`/staff/pay/slip/${month}`} className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-primary px-5 py-3 font-bold text-white"><FileText size={18} /> {L("See my payslip", "មើលវិក្កយបត្ររបស់ខ្ញុំ")}</Link>
      </div>
    );
  return (
    <div className="text-center">
      <span className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-light-green text-primary"><HandCoins size={40} /></span>
      <p className="mt-4 font-display text-2xl font-extrabold text-forest">{L("Collect your pay", "ទទួលប្រាក់ខែរបស់អ្នក")}</p>
      <p className="mt-1 inline-block rounded-full bg-light-green px-3 py-1 text-sm font-extrabold text-primary">{L("Pay for", "ប្រាក់ខែ")} {monthName}</p>
      {res?.error && <p role="alert" className="mx-auto mt-3 max-w-sm rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{CLAIM_ERR[res.error][km ? 1 : 0]}</p>}
      <div className="mt-5">
        <PinPad km={km} title={L("Enter your code to collect", "បញ្ចូលលេខកូដរបស់អ្នក ដើម្បីទទួលប្រាក់")} submitLabel={L("Collect", "ទទួល")} onSubmit={go} autoFocus={false} />
      </div>
    </div>
  );
}

/** Camera that reads the department QR and opens it (only our own payday links). */
export function PayScanner({ km }: { km: boolean }) {
  const router = useRouter();
  const video = useRef<HTMLVideoElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [cam, setCam] = useState(true);
  const [wrong, setWrong] = useState(false);
  const found = useRef(false);
  const L = (en: string, k: string) => (km ? k : en);
  const read = useCallback(
    (text: string) => {
      try {
        const u = new URL(text);
        if (u.pathname === "/staff/payday/claim" && u.searchParams.get("p")) {
          found.current = true;
          navigator.vibrate?.(60);
          router.push(`/staff/payday/claim${u.search}`);
          return;
        }
      } catch {}
      setWrong(true);
      setTimeout(() => setWrong(false), 2500);
    },
    [router]
  );
  useEffect(() => {
    let stream: MediaStream | null = null;
    let timer: ReturnType<typeof setTimeout>;
    let alive = true;
    const Detector = (window as any).BarcodeDetector;
    const detector = Detector ? new Detector({ formats: ["qr_code"] }) : null;
    const tick = async () => {
      if (!alive || found.current) return;
      const v = video.current;
      if (v && v.readyState >= 2) {
        let text: string | null = null;
        try {
          if (detector) text = (await detector.detect(v))[0]?.rawValue ?? null;
          else {
            const c = canvas.current!;
            const w = 640;
            const h = Math.round((v.videoHeight / v.videoWidth) * w) || 480;
            c.width = w;
            c.height = h;
            const ctx = c.getContext("2d", { willReadFrequently: true })!;
            ctx.drawImage(v, 0, 0, w, h);
            text = jsQR(ctx.getImageData(0, 0, w, h).data, w, h, { inversionAttempts: "dontInvert" })?.data ?? null;
          }
        } catch {}
        if (text) read(text);
      }
      timer = setTimeout(tick, 200);
    };
    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
        if (!alive) return stream.getTracks().forEach((t) => t.stop());
        video.current!.srcObject = stream;
        await video.current!.play();
        tick();
      } catch {
        setCam(false);
      }
    })();
    return () => {
      alive = false;
      clearTimeout(timer);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [read]);
  return (
    <div className="overflow-hidden rounded-[2rem] bg-[#0B1433] text-white shadow-lift">
      <div className="relative aspect-square w-full">
        {cam ? <video ref={video} playsInline muted className="h-full w-full object-cover" /> : (
          <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center"><CameraOff size={40} className="text-white/60" /><p className="font-bold">{L("Camera not available. Allow the camera, or scan the QR with your phone's camera app.", "មិនអាចប្រើកាមេរ៉ាបានទេ។ សូមអនុញ្ញាតកាមេរ៉ា ឬស្កេន QR ជាមួយកាមេរ៉ាទូរស័ព្ទ។")}</p></div>
        )}
        <canvas ref={canvas} className="hidden" />
        {cam && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="h-3/5 w-3/5 rounded-3xl border-4 border-white/80 shadow-[0_0_0_9999px_rgba(0,0,0,.35)]" />
          </div>
        )}
        {wrong && <p className="absolute inset-x-4 bottom-4 rounded-2xl bg-red-600/90 px-4 py-2 text-center text-sm font-bold">{L("That's not a payday QR code.", "នេះមិនមែនជា QR បើកប្រាក់ខែទេ។")}</p>}
      </div>
      <p className="flex items-center justify-center gap-2 px-4 py-4 text-center font-bold"><ScanLine size={18} className="text-[#93C5FD]" /> {L("Point at your department's payday QR code", "តម្រង់ទៅ QR បើកប្រាក់ខែនៃផ្នែករបស់អ្នក")}</p>
    </div>
  );
}
