"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Copy, Check, Share2, Lock, Gift, Loader2 } from "lucide-react";
import { redeemAction, type RedeemState } from "@/app/rewards/actions";

export function CopyButton({ text, label, done }: { text: string; label: string; done: string }) {
  const [ok, setOk] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
        } catch {
          /* old browsers: the text is still visible to copy by hand */
        }
        setOk(true);
        setTimeout(() => setOk(false), 1800);
      }}
      className="inline-flex flex-shrink-0 items-center gap-1.5 rounded-full bg-light-green px-3.5 py-2 text-xs font-bold text-primary hover:bg-primary hover:text-white"
    >
      {ok ? <Check size={14} /> : <Copy size={14} />} {ok ? done : label}
    </button>
  );
}

export function ShareInvite({ url, text, label, copyLabel, copied }: { url: string; text: string; label: string; copyLabel: string; copied: string }) {
  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={() => {
          if (navigator.share) navigator.share({ title: "Green Wild Zoo", text, url }).catch(() => {});
          else window.open(`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`, "_blank");
        }}
        className="btn-primary hover:translate-y-0"
      >
        <Share2 size={16} /> {label}
      </button>
      <a href={`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`} target="_blank" rel="noreferrer" className="btn-outline bg-white">
        Telegram
      </a>
      <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`} target="_blank" rel="noreferrer" className="btn-outline bg-white">
        Facebook
      </a>
      <CopyButton text={url} label={copyLabel} done={copied} />
    </div>
  );
}

function Submit({ label, disabled }: { label: string; disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button disabled={disabled || pending} className="btn-primary w-full justify-center whitespace-nowrap px-2 py-2.5 text-sm hover:translate-y-0 disabled:cursor-not-allowed disabled:bg-black/5 disabled:text-ink/45 disabled:shadow-none">
      {pending ? <Loader2 size={15} className="animate-spin" /> : disabled ? <Lock size={15} /> : <Gift size={15} />} {label}
    </button>
  );
}

/** One reward card, drawn as a coupon: swap points for a single-use discount code. */
export function RedeemCard({
  reward,
  value,
  caption,
  colors,
  cost,
  balance,
  t,
}: {
  reward: string;
  value: string;
  caption: string;
  colors: [string, string];
  cost: number;
  balance: number;
  t: { redeem: string; needMore: string; got: string; copy: string; copied: string; errors: Record<string, string>; points: string };
}) {
  const [state, action] = useFormState<RedeemState, FormData>(redeemAction, null);
  const enough = balance >= cost;
  return (
    <div className={`relative flex flex-col overflow-hidden rounded-3xl bg-white shadow-soft ring-1 ring-black/5 transition ${enough ? "hover:-translate-y-0.5 hover:shadow-lift" : ""}`}>
      {/* coupon face */}
      <div className={`relative px-4 pb-4 pt-3.5 text-white ${enough ? "" : "grayscale-[0.35]"}`} style={{ background: `linear-gradient(135deg, ${colors[0]}, ${colors[1]})` }}>
        <Gift size={46} className="pointer-events-none absolute -right-2 -top-1 text-white/20" />
        <p className="font-display text-4xl font-extrabold leading-none sm:text-5xl">{value}</p>
        <p className="mt-1.5 text-xs font-semibold leading-snug text-white/90 sm:text-sm">{caption}</p>
      </div>
      {/* perforation */}
      <div className="relative h-0">
        <span className="absolute -left-2.5 -top-2.5 h-5 w-5 rounded-full bg-background" />
        <span className="absolute -right-2.5 -top-2.5 h-5 w-5 rounded-full bg-background" />
        <span className="absolute inset-x-4 top-0 border-t-2 border-dashed border-white/70" />
      </div>
      <div className="flex flex-1 flex-col p-3.5 sm:p-4">
        <p className="flex items-baseline gap-1 whitespace-nowrap font-display text-lg font-extrabold text-forest">
          {cost} <span className="text-xs font-bold text-ink/50">{t.points}</span>
        </p>
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-light-green">
          <div className="h-full rounded-full" style={{ width: `${Math.min(100, (balance / cost) * 100)}%`, background: colors[1] }} />
        </div>
        <div className="mt-auto pt-3">
          {state?.ok && state.code ? (
            <div className="rounded-2xl bg-light-green p-2.5 text-center">
              <p className="text-[11px] font-bold text-primary">{t.got}</p>
              <p className="my-1 font-mono text-base font-extrabold tracking-wider text-forest">{state.code}</p>
              <CopyButton text={state.code} label={t.copy} done={t.copied} />
            </div>
          ) : (
            <form action={action}>
              <input type="hidden" name="reward" value={reward} />
              <Submit label={enough ? t.redeem : t.needMore} disabled={!enough} />
              {state && !state.ok && <p className="mt-2 text-center text-xs font-semibold text-red-600">{t.errors[state.reason ?? "error"] ?? t.errors.error}</p>}
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
