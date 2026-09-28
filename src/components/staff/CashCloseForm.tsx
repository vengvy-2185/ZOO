"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Loader2, CheckCircle2, AlertTriangle } from "lucide-react";
import { submitCashClose, type CashState } from "@/app/staff/(protected)/cash/actions";
import { cn } from "@/lib/utils/cn";

const input = "w-full rounded-2xl border border-black/10 bg-white px-4 py-3 font-mono text-2xl font-extrabold text-ink outline-none focus:border-[#1D4ED8] tabular-nums";
const lbl = "mb-1 block text-[11px] font-bold uppercase tracking-wider text-ink/45";

function Send({ km, again }: { km: boolean; again: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button disabled={pending} className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#1D4ED8] py-3.5 text-base font-extrabold text-white shadow-soft transition active:scale-[.98] disabled:opacity-70">
      {pending && <Loader2 size={18} className="animate-spin" />}
      {again ? (km ? "បញ្ជូនម្តងទៀត" : "Send again") : km ? "បិទបញ្ជី និងបញ្ជូន" : "Close and send"}
    </button>
  );
}

/** The gate person types the cash they counted; the difference shows as they type. */
export function CashCloseForm({ km, expected, rate, tolerance, again }: { km: boolean; expected: number; rate: number; tolerance: number; again: boolean }) {
  const [state, action] = useFormState<CashState, FormData>(submitCashClose, {});
  const [u, setU] = useState("");
  const [r, setR] = useState("");
  const total = (Number(u.replace(/,/g, "")) || 0) + (Number(r.replace(/,/g, "")) || 0) / rate;
  const diff = Math.round((total - expected) * 100) / 100;
  const typed = u !== "" || r !== "";
  const okDiff = Math.abs(diff) <= tolerance;
  const ERR: Record<string, string> = km
    ? { note: "ចំនួនខុសគ្នា៖ សូមសរសេរមូលហេតុខាងក្រោម។", approved: "អ្នកគ្រប់គ្រងបានអនុម័តរួចហើយ មិនអាចកែបានទេ។", perm: "តួនាទីរបស់អ្នកមិនអាចបិទបញ្ជីប្រាក់បានទេ។", invalid: "ចំនួនមិនត្រឹមត្រូវ។" }
    : { note: "The amounts differ: write the reason below.", approved: "A manager already approved this; it can't be changed.", perm: "Your position can't close cash.", invalid: "That amount isn't valid." };

  return (
    <form action={action} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className={lbl}>{km ? "ដុល្លារដែលរាប់បាន ($)" : "Dollars counted ($)"}</span>
          <input name="counted_usd" inputMode="decimal" value={u} onChange={(e) => setU(e.target.value.replace(/[^\d.,]/g, ""))} placeholder="0.00" className={input} />
        </label>
        <label className="block">
          <span className={lbl}>{km ? `រៀលដែលរាប់បាន (៛) · 1$ = ${rate}៛` : `Riel counted (៛) · 1$ = ${rate}៛`}</span>
          <input name="counted_khr" inputMode="numeric" value={r} onChange={(e) => setR(e.target.value.replace(/[^\d,]/g, ""))} placeholder="0" className={input} />
        </label>
      </div>

      {typed && (
        <div className={cn("flex items-center gap-3 rounded-2xl px-4 py-3 ring-1 transition", okDiff ? "bg-emerald-50 text-emerald-800 ring-emerald-200" : "bg-amber-50 text-amber-900 ring-amber-200")}>
          {okDiff ? <CheckCircle2 size={22} /> : <AlertTriangle size={22} />}
          <div className="text-sm font-bold">
            <p>{km ? "សរុបរាប់បាន" : "Counted in all"}: <span className="font-mono">${total.toFixed(2)}</span></p>
            <p>{okDiff ? (km ? "ត្រូវគ្នា ✓" : "Matches ✓") : diff < 0 ? (km ? `ខ្វះ $${(-diff).toFixed(2)}` : `Short by $${(-diff).toFixed(2)}`) : km ? `លើស $${diff.toFixed(2)}` : `Over by $${diff.toFixed(2)}`}</p>
          </div>
        </div>
      )}

      <label className="block">
        <span className={lbl}>{km ? "កំណត់ចំណាំ (ចាំបាច់ បើចំនួនខុសគ្នា)" : "Note (needed when the amounts differ)"}</span>
        <textarea name="note" rows={2} maxLength={400} className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-base text-ink outline-none focus:border-[#1D4ED8]" placeholder={km ? "ឧ. ភ្ញៀវ ២ នាក់ចូលដោយឥតគិតថ្លៃ" : "e.g. 2 visitors let in free"} />
      </label>
      {state.error && <p className="rounded-2xl bg-red-50 px-4 py-2.5 text-sm font-bold text-red-700">{ERR[state.error] ?? state.error}</p>}
      {state.ok && <p className="rounded-2xl bg-emerald-50 px-4 py-2.5 text-sm font-bold text-emerald-700">{km ? "បានបញ្ជូនទៅអ្នកគ្រប់គ្រងហើយ ✓" : "Sent to the managers ✓"}</p>}
      <Send km={km} again={again} />
    </form>
  );
}
