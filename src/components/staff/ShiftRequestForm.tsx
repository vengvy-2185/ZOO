"use client";

import { useEffect, useRef, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { LifeBuoy, ArrowLeftRight, Send, Loader2, CheckCircle2 } from "lucide-react";
import { requestShiftChange, type ShiftReqState } from "@/app/staff/(protected)/actions";
import { cn } from "@/lib/utils/cn";

export type ShiftOption = { id: string; label: string };

function Submit({ text }: { text: string }) {
  const { pending } = useFormStatus();
  return (
    <button disabled={pending} className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#1D4ED8] px-5 py-3 text-sm font-bold text-white shadow-soft transition active:scale-[.98] disabled:opacity-60">
      {pending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />} {text}
    </button>
  );
}

/** Ask for a replacement (cover) or trade a shift with a colleague (swap). */
export function ShiftRequestForm({ km, mine, others }: { km: boolean; mine: ShiftOption[]; others: ShiftOption[] }) {
  const [state, action] = useFormState<ShiftReqState, FormData>(requestShiftChange, {});
  const [kind, setKind] = useState<"cover" | "swap">("cover");
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok) ref.current?.reset();
  }, [state]);
  const L = km
    ? { cover: "រកអ្នកជំនួស", coverT: "ខ្ញុំមកមិនបាន សុំអ្នកណាម្នាក់ធ្វើជំនួស", swap: "ប្តូរវេន", swapT: "ដូរវេនជាមួយមិត្តរួមការងារ", my: "វេនរបស់ខ្ញុំ", their: "វេនរបស់មិត្តដែលចង់ដូរ", reason: "មូលហេតុ", reasonPh: "ឧ. ឈឺ / មានធុរៈគ្រួសារ", send: "ផ្ញើសំណើ", done: "បានផ្ញើ! មិត្តរួមការងារអាចទទួលយក ហើយអ្នកគ្រប់គ្រងនឹងអនុម័ត។", none: "អ្នកមិនមានវេនខាងមុខទេ។", exists: "វេននេះមានសំណើរួចហើយ។", invalid: "សូមពិនិត្យព័ត៌មានម្តងទៀត។" }
    : { cover: "Find cover", coverT: "I can't come, someone please take my shift", swap: "Swap shifts", swapT: "Trade a shift with a colleague", my: "My shift", their: "Colleague's shift to trade for", reason: "Reason", reasonPh: "e.g. sick / family matter", send: "Send request", done: "Sent! A colleague can take it, then a manager approves.", none: "You have no upcoming shifts.", exists: "This shift already has a request.", invalid: "Please check the details." };
  if (!mine.length) return <p className="rounded-2xl bg-slate-50 p-4 text-center text-sm text-ink/55">{L.none}</p>;
  const field = "w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-[15px] text-ink outline-none focus:border-[#2563EB]";
  return (
    <form ref={ref} action={action} className="space-y-4">
      <input type="hidden" name="kind" value={kind} />
      <div className="grid grid-cols-2 gap-2">
        {(
          [
            ["cover", LifeBuoy, L.cover, L.coverT, "#DC2626"],
            ["swap", ArrowLeftRight, L.swap, L.swapT, "#1D4ED8"],
          ] as const
        ).map(([k, Icon, t, sub, color]) => (
          <button key={k} type="button" onClick={() => setKind(k)} className={cn("rounded-2xl p-3 text-left ring-1 transition", kind === k ? "text-white shadow-soft ring-transparent" : "bg-white text-forest ring-black/10")} style={kind === k ? { background: color } : undefined}>
            <Icon size={20} />
            <p className="mt-1 font-display text-base font-extrabold">{t}</p>
            <p className={cn("text-xs leading-snug", kind === k ? "text-white/85" : "text-ink/50")}>{sub}</p>
          </button>
        ))}
      </div>
      <label className="block">
        <span className="mb-1.5 block text-sm font-bold text-ink/60">{L.my}</span>
        <select name="roster_id" required className={field}>
          {mine.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
        </select>
      </label>
      {kind === "swap" && (
        <label className="block animate-[gwzPop_.3s_ease-out_both]">
          <span className="mb-1.5 block text-sm font-bold text-ink/60">{L.their}</span>
          <select name="swap_roster_id" required className={field}>
            {others.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
          </select>
        </label>
      )}
      <label className="block">
        <span className="mb-1.5 block text-sm font-bold text-ink/60">{L.reason}</span>
        <input name="reason" required maxLength={300} placeholder={L.reasonPh} className={field} />
      </label>
      {state.ok && <p className="flex items-center gap-2 rounded-2xl bg-emerald-50 px-4 py-2.5 text-sm font-bold text-emerald-700 ring-1 ring-emerald-200"><CheckCircle2 size={16} /> {L.done}</p>}
      {state.error && <p className="rounded-2xl bg-red-50 px-4 py-2.5 text-sm font-bold text-red-700 ring-1 ring-red-200">{state.error === "exists" ? L.exists : state.error === "invalid" ? L.invalid : state.error}</p>}
      <Submit text={L.send} />
    </form>
  );
}
