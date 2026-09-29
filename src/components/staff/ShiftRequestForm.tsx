"use client";

import { useEffect, useRef, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { LifeBuoy, ArrowLeftRight, CalendarOff, Send, Loader2, CheckCircle2 } from "lucide-react";
import { requestShiftChange, type ShiftReqState } from "@/app/staff/(protected)/actions";
import { cn } from "@/lib/utils/cn";

export type ShiftOption = { id: string; label: string };
type Kind = "cover" | "swap" | "dayoff";

function Submit({ text }: { text: string }) {
  const { pending } = useFormStatus();
  return (
    <button disabled={pending} className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#1D4ED8] px-5 py-3 text-sm font-bold text-white shadow-soft transition active:scale-[.98] disabled:opacity-60">
      {pending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />} {text}
    </button>
  );
}

/**
 * Ask for a replacement (cover), trade a shift with a colleague (swap), or
 * trade a day off with a colleague (day off: you work their day off, they work yours).
 */
export function ShiftRequestForm({ km, mine, others, myOff = [], othersOff = [] }: { km: boolean; mine: ShiftOption[]; others: ShiftOption[]; myOff?: ShiftOption[]; othersOff?: ShiftOption[] }) {
  const [state, action] = useFormState<ShiftReqState, FormData>(requestShiftChange, {});
  const [kind, setKind] = useState<Kind>("cover");
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok) ref.current?.reset();
  }, [state]);
  const L = km
    ? {
        cover: "រកអ្នកជំនួស", coverT: "តែមួយវេន មួយថ្ងៃ · ថ្ងៃបន្ទាប់ត្រឡប់ទៅកាលវិភាគធម្មតា",
        swap: "ប្តូរវេន", swapT: "ដូរវេនជាមួយមិត្តរួមការងារ · នៅដដែល មិនត្រឡប់វិញ",
        dayoff: "ដូរថ្ងៃឈប់", dayoffT: "ខ្ញុំធ្វើការថ្ងៃឈប់របស់មិត្ត ហើយមិត្តធ្វើការថ្ងៃឈប់របស់ខ្ញុំ",
        my: "វេនរបស់ខ្ញុំ", their: "វេនរបស់មិត្តដែលចង់ដូរ", myOff: "ថ្ងៃឈប់របស់ខ្ញុំ (ខ្ញុំនឹងមកធ្វើការ)", theirOff: "ថ្ងៃឈប់របស់មិត្ត (ខ្ញុំចង់ឈប់ថ្ងៃនេះជំនួស)",
        reason: "មូលហេតុ", reasonPh: "ឧ. ឈឺ / មានធុរៈគ្រួសារ", send: "ផ្ញើសំណើ", done: "បានផ្ញើ! មិត្តរួមការងារអាចទទួលយក ហើយអ្នកគ្រប់គ្រងនឹងអនុម័ត។",
        none: "អ្នកមិនមានវេនខាងមុខទេ។", noOff: "អ្នកមិនមានថ្ងៃឈប់ខាងមុខ ឬមិត្តក្នុងក្រុមមិនមានថ្ងៃឈប់ដែលអាចដូរបានទេ។", exists: "វេននេះមានសំណើរួចហើយ។", invalid: "សូមពិនិត្យព័ត៌មានម្តងទៀត។",
        dayoffBad: "មិនអាចដូរបានទេ៖ ថ្ងៃនោះមិត្តត្រូវធ្វើការ ហើយខ្ញុំត្រូវធ្វើការនៅថ្ងៃឈប់របស់មិត្ត។",
      }
    : {
        cover: "Find cover", coverT: "One shift, one day · the normal schedule comes back the next day",
        swap: "Swap shifts", swapT: "Trade a shift with a colleague · it stays",
        dayoff: "Swap days off", dayoffT: "I work my colleague's day off, they work mine",
        my: "My shift", their: "Colleague's shift to trade for", myOff: "My day off (I'll work it)", theirOff: "Colleague's day off (I'll be off instead)",
        reason: "Reason", reasonPh: "e.g. sick / family matter", send: "Send request", done: "Sent! A colleague can take it, then a manager approves.",
        none: "You have no upcoming shifts.", noOff: "You have no upcoming day off, or no colleague on your team has one to trade.", exists: "This shift already has a request.", invalid: "Please check the details.",
        dayoffBad: "Can't swap: each of you must work on the other's day off.",
      };
  const field = "w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-[15px] text-ink outline-none focus:border-[#2563EB]";
  const kinds = [
    ["cover", LifeBuoy, L.cover, L.coverT, "#DC2626"],
    ["swap", ArrowLeftRight, L.swap, L.swapT, "#1D4ED8"],
    ["dayoff", CalendarOff, L.dayoff, L.dayoffT, "#7C3AED"],
  ] as const;
  const empty = kind === "dayoff" ? !myOff.length || !othersOff.length : !mine.length;
  return (
    <form ref={ref} action={action} className="space-y-4">
      <input type="hidden" name="kind" value={kind} />
      <div className="grid grid-cols-3 gap-2">
        {kinds.map(([k, Icon, t, sub, color]) => (
          <button key={k} type="button" onClick={() => setKind(k)} className={cn("rounded-2xl p-3 text-left ring-1 transition", kind === k ? "text-white shadow-soft ring-transparent" : "bg-white text-forest ring-black/10")} style={kind === k ? { background: color } : undefined}>
            <Icon size={20} />
            <p className="mt-1 font-display text-sm font-extrabold sm:text-base">{t}</p>
            <p className={cn("hidden text-xs leading-snug sm:block", kind === k ? "text-white/85" : "text-ink/50")}>{sub}</p>
          </button>
        ))}
      </div>
      <p className="-mt-1 text-xs font-semibold text-ink/55 sm:hidden">{kinds.find((x) => x[0] === kind)![3]}</p>
      {empty ? (
        <p className="rounded-2xl bg-slate-50 p-4 text-center text-sm text-ink/55">{kind === "dayoff" ? L.noOff : L.none}</p>
      ) : (
        <>
          <label className="block">
            <span className="mb-1.5 block text-sm font-bold text-ink/60">{kind === "dayoff" ? L.myOff : L.my}</span>
            <select key={kind} name="roster_id" required className={field}>
              {(kind === "dayoff" ? myOff : mine).map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
            </select>
          </label>
          {kind !== "cover" && (
            <label className="block animate-[gwzPop_.3s_ease-out_both]">
              <span className="mb-1.5 block text-sm font-bold text-ink/60">{kind === "dayoff" ? L.theirOff : L.their}</span>
              <select key={kind} name="swap_roster_id" required className={field}>
                {(kind === "dayoff" ? othersOff : others).map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
              </select>
            </label>
          )}
          <label className="block">
            <span className="mb-1.5 block text-sm font-bold text-ink/60">{L.reason}</span>
            <input name="reason" required maxLength={300} placeholder={L.reasonPh} className={field} />
          </label>
          {state.ok && <p className="flex items-center gap-2 rounded-2xl bg-emerald-50 px-4 py-2.5 text-sm font-bold text-emerald-700 ring-1 ring-emerald-200"><CheckCircle2 size={16} /> {L.done}</p>}
          {state.error && <p className="rounded-2xl bg-red-50 px-4 py-2.5 text-sm font-bold text-red-700 ring-1 ring-red-200">{state.error === "exists" ? L.exists : state.error === "invalid" ? L.invalid : state.error === "dayoff" ? L.dayoffBad : state.error}</p>}
          <Submit text={L.send} />
        </>
      )}
    </form>
  );
}
