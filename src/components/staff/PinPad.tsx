"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Delete, Eye, EyeOff, Loader2, Lock, ShieldCheck, X } from "lucide-react";
import { setupPin, unlockApp, revealPay, hidePay, type PinResult } from "@/app/staff/(protected)/pin-actions";
import { cn } from "@/lib/utils/cn";

const MSG: Record<string, [string, string]> = {
  format: ["The code is 4 to 6 digits.", "លេខកូដត្រូវមាន ៤ ដល់ ៦ ខ្ទង់"],
  mismatch: ["The two codes are not the same. Try again.", "លេខកូដទាំងពីរមិនដូចគ្នា។ សូមសាកម្តងទៀត"],
  wrong: ["Wrong code.", "លេខកូដមិនត្រឹមត្រូវ"],
  locked: ["Too many wrong tries. Please wait 5 minutes.", "ខុសច្រើនដងពេក។ សូមរង់ចាំ ៥ នាទី"],
  none: ["No code set yet.", "មិនទាន់កំណត់លេខកូដ"],
  exists: ["A code is already set.", "បានកំណត់លេខកូដរួចហើយ"],
};
export const pinMessage = (r: PinResult, km: boolean) => (r.error ? `${MSG[r.error]?.[km ? 1 : 0] ?? r.error}${r.error === "wrong" && r.left ? (km ? ` · នៅសល់ ${r.left} ដង` : ` · ${r.left} tries left`) : ""}` : "");

/** Dots + a number pad (a phone keyboard or a computer keyboard both work). */
export function PinPad({ km, title, sub, submitLabel, onSubmit, dark = false, autoFocus = true }: { km: boolean; title: string; sub?: string; submitLabel?: string; onSubmit: (pin: string) => Promise<string | null>; dark?: boolean; autoFocus?: boolean }) {
  const [pin, setPin] = useState("");
  const [err, setErr] = useState("");
  const [shake, setShake] = useState(false);
  const [pending, start] = useTransition();
  const box = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (autoFocus) box.current?.focus({ preventScroll: true });
  }, [autoFocus]);
  const go = (p = pin) => {
    if (p.length < 4 || pending) return;
    start(async () => {
      const e = await onSubmit(p);
      if (e) {
        setErr(e);
        setPin("");
        setShake(true);
        navigator.vibrate?.([40, 40, 40]);
        setTimeout(() => setShake(false), 450);
      }
    });
  };
  const press = (d: string) => {
    setErr("");
    setPin((p) => (p.length < 6 ? p + d : p));
  };
  const key = cn("flex h-16 items-center justify-center rounded-2xl font-display text-2xl font-extrabold transition active:scale-95", dark ? "bg-white/10 text-white hover:bg-white/20" : "bg-cream text-forest hover:bg-light-green");
  return (
    <div className="mx-auto w-full max-w-xs text-center">
      <p className={cn("font-display text-xl font-extrabold", dark ? "text-white" : "text-forest")}>{title}</p>
      {sub && <p className={cn("mt-1 text-sm", dark ? "text-white/70" : "text-ink/55")}>{sub}</p>}
      <input
        ref={box}
        value={pin}
        onChange={(e) => { setErr(""); setPin(e.target.value.replace(/\D/g, "").slice(0, 6)); }}
        onKeyDown={(e) => e.key === "Enter" && go()}
        inputMode="numeric"
        autoComplete="one-time-code"
        aria-label={km ? "លេខកូដ" : "Code"}
        className="absolute h-px w-px opacity-0"
      />
      <button type="button" onClick={() => box.current?.focus()} className={cn("mx-auto mt-5 flex h-8 items-center justify-center gap-3", shake && "motion-safe:animate-[pinshake_.4s]")} aria-hidden>
        {Array.from({ length: 6 }, (_, i) => (
          <span key={i} className={cn("h-3.5 w-3.5 rounded-full transition", i < pin.length ? (dark ? "scale-110 bg-white" : "scale-110 bg-primary") : i < 4 ? (dark ? "bg-white/25" : "bg-black/15") : dark ? "bg-white/10" : "bg-black/5")} />
        ))}
      </button>
      <p role="alert" className={cn("mt-2 min-h-[1.25rem] text-sm font-bold", dark ? "text-red-300" : "text-red-600")}>{err}</p>
      <div className="mt-3 grid grid-cols-3 gap-2.5">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
          <button key={d} type="button" onClick={() => press(d)} className={key}>{d}</button>
        ))}
        <button type="button" onClick={() => { setErr(""); setPin((p) => p.slice(0, -1)); }} aria-label={km ? "លុប" : "Delete"} className={cn(key, "text-base")}><Delete size={22} /></button>
        <button type="button" onClick={() => press("0")} className={key}>0</button>
        <button type="button" disabled={pin.length < 4 || pending} onClick={() => go()} className={cn("flex h-16 items-center justify-center rounded-2xl text-sm font-extrabold transition active:scale-95 disabled:opacity-40", dark ? "bg-white text-forest" : "bg-primary text-white")}>
          {pending ? <Loader2 size={20} className="animate-spin" /> : submitLabel ?? "OK"}
        </button>
      </div>
      <style>{`@keyframes pinshake{0%,100%{transform:translateX(0)}25%{transform:translateX(-8px)}75%{transform:translateX(8px)}}`}</style>
    </div>
  );
}

function Screen({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-[90] flex flex-col items-center justify-center overflow-y-auto bg-gradient-to-br from-[#0E3F24] via-[#176B3A] to-[#1D9A5B] px-6 py-10">
      <Image src="/logo-sm.png" alt="" width={72} height={72} className="mb-6 rounded-3xl bg-white p-1.5 shadow-lift" />
      {children}
    </div>
  );
}

/** First time in the app: choosing the secret code is required. */
export function PinSetup({ km, name }: { km: boolean; name: string }) {
  const router = useRouter();
  const [first, setFirst] = useState<string | null>(null);
  return (
    <Screen>
      <p className="mb-6 max-w-xs text-center text-sm text-white/80"><ShieldCheck size={16} className="-mt-0.5 mr-1 inline" />{km ? `សួស្តី ${name}! សូមកំណត់លេខកូដសម្ងាត់ (៤–៦ ខ្ទង់)។ វាប្រើពេលបើកកម្មវិធី និងពេលមើលប្រាក់ខែរបស់អ្នក។` : `Hello ${name}! Choose your secret code (4–6 digits). It opens the app and shows your pay.`}</p>
      {first === null ? (
        <PinPad key="a" km={km} dark title={km ? "កំណត់លេខកូដថ្មី" : "Choose a code"} submitLabel={km ? "បន្ទាប់" : "Next"} onSubmit={async (p) => { setFirst(p); return null; }} />
      ) : (
        <PinPad
          key="b"
          km={km}
          dark
          title={km ? "បញ្ចូលម្តងទៀត" : "Type it again"}
          submitLabel={km ? "រួចរាល់" : "Done"}
          onSubmit={async (p) => {
            const r = await setupPin(first, p);
            if (r.ok) {
              router.refresh();
              return null;
            }
            if (r.error === "mismatch") setTimeout(() => setFirst(null), 900);
            return pinMessage(r, km);
          }}
        />
      )}
    </Screen>
  );
}

/** The app opens locked: the code opens it. */
export function PinLock({ km, name }: { km: boolean; name: string }) {
  const router = useRouter();
  return (
    <Screen>
      <PinPad
        km={km}
        dark
        title={km ? "បញ្ចូលលេខកូដ" : "Enter your code"}
        sub={name}
        onSubmit={async (p) => {
          const r = await unlockApp(p);
          if (r.ok) {
            router.refresh();
            return null;
          }
          return pinMessage(r, km);
        }}
      />
      <p className="mt-6 max-w-xs text-center text-xs text-white/60"><Lock size={12} className="-mt-0.5 mr-1 inline" />{km ? "ភ្លេចលេខកូដ? សូមឲ្យ Admin កំណត់ឡើងវិញ។" : "Forgot it? Ask the admin to reset it."}</p>
    </Screen>
  );
}

/** "Show my pay": the code shows the amounts for 5 minutes. */
export function RevealPay({ km, shown, compact = false }: { km: boolean; shown: boolean; compact?: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  if (shown)
    return (
      <button type="button" disabled={pending} onClick={() => start(async () => { await hidePay(); router.refresh(); })} className="inline-flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1.5 text-xs font-bold text-forest ring-1 ring-black/10 print:hidden">
        {pending ? <Loader2 size={14} className="animate-spin" /> : <EyeOff size={14} />} {km ? "លាក់" : "Hide"}
      </button>
    );
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={cn("inline-flex items-center gap-1.5 rounded-full font-bold print:hidden", compact ? "bg-white/90 px-3 py-1.5 text-xs text-forest ring-1 ring-black/10" : "bg-primary px-4 py-2 text-sm text-white shadow-soft")}>
        <Eye size={compact ? 14 : 16} /> {km ? "មើលប្រាក់ខែ" : "Show pay"}
      </button>
      {open && (
        <div className="fixed inset-0 z-[90] flex items-end justify-center bg-black/50 p-4 backdrop-blur-sm sm:items-center" onClick={() => setOpen(false)}>
          <div className="relative w-full max-w-sm rounded-[2rem] bg-white p-6 pb-8 shadow-lift" onClick={(e) => e.stopPropagation()}>
            <button type="button" onClick={() => setOpen(false)} aria-label={km ? "បិទ" : "Close"} className="absolute right-4 top-4 rounded-full p-1.5 text-ink/40 hover:bg-cream"><X size={18} /></button>
            <PinPad
              km={km}
              title={km ? "បញ្ចូលលេខកូដ ដើម្បីមើលប្រាក់ខែ" : "Enter your code to see your pay"}
              onSubmit={async (p) => {
                const r = await revealPay(p);
                if (r.ok) {
                  setOpen(false);
                  router.refresh();
                  return null;
                }
                return pinMessage(r, km);
              }}
            />
          </div>
        </div>
      )}
    </>
  );
}

/** A pay amount hidden behind the code: the server sends only dots until it's given. */
export function Masked({ className }: { className?: string }) {
  return <span className={cn("select-none tracking-widest blur-[1px]", className)} aria-label="hidden">$ ••••</span>;
}
