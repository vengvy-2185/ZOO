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
    <button disabled={disabled || pending} className="btn-primary w-full justify-center py-2.5 text-sm hover:translate-y-0 disabled:cursor-not-allowed disabled:opacity-45">
      {pending ? <Loader2 size={15} className="animate-spin" /> : disabled ? <Lock size={15} /> : <Gift size={15} />} {label}
    </button>
  );
}

/** One reward card: swap points for a single-use discount code. */
export function RedeemCard({
  reward,
  title,
  cost,
  balance,
  t,
}: {
  reward: string;
  title: string;
  cost: number;
  balance: number;
  t: { redeem: string; needMore: string; got: string; copy: string; copied: string; errors: Record<string, string>; points: string };
}) {
  const [state, action] = useFormState<RedeemState, FormData>(redeemAction, null);
  const enough = balance >= cost;
  return (
    <div className={`flex flex-col rounded-3xl p-4 ring-1 transition ${enough ? "bg-white shadow-soft ring-primary/20" : "bg-white/60 ring-black/5"}`}>
      <p className="font-display text-lg font-extrabold leading-tight text-forest">{title}</p>
      <p className="mt-1 text-sm font-bold text-primary">
        {cost} {t.points}
      </p>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-light-green">
        <div className="h-full rounded-full bg-gradient-to-r from-primary to-leaf" style={{ width: `${Math.min(100, (balance / cost) * 100)}%` }} />
      </div>
      <div className="mt-auto pt-3">
        {state?.ok && state.code ? (
          <div className="rounded-2xl bg-light-green p-3 text-center">
            <p className="text-xs font-bold text-primary">{t.got}</p>
            <p className="my-1 font-mono text-lg font-extrabold tracking-wider text-forest">{state.code}</p>
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
  );
}
