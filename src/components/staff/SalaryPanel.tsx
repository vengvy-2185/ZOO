"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { TrendingUp, Trash2, Loader2, Plus, Hourglass, KeyRound } from "lucide-react";
import { setSalaryStep, setProbation, deleteSalaryStep } from "@/app/staff/(protected)/hr/salary-actions";
import { resetStaffPin } from "@/app/staff/(protected)/pin-actions";
import { cn } from "@/lib/utils/cn";

type Step = { id: string; effective_from: string; amount: number; note: string | null };
const field = "w-full min-w-0 rounded-xl border border-black/10 bg-white px-3 py-2.5 text-sm outline-none focus:border-primary";
const usd = (n: number) => `$${n.toFixed(2)}`;
const dmy = (d: string) => d.split("-").reverse().join("/");

/** A person's salary over time: starting pay, raises from a date, probation. For admins and HR. */
export function SalaryPanel({ km, userId, positionRate, unit, steps, today, canResetPin = false }: { km: boolean; userId: string; positionRate: number; unit: string; steps: Step[]; today: string; canResetPin?: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [mode, setMode] = useState<null | "step" | "probation">(null);
  const [msg, setMsg] = useState("");
  const L = (en: string, k: string) => (km ? k : en);
  const current = [...steps].reverse().find((s) => s.effective_from <= today);
  const next = steps.find((s) => s.effective_from > today);
  const ERR: Record<string, string> = { amount: L("Check the amount.", "សូមពិនិត្យចំនួនទឹកប្រាក់"), date: L("Choose the date.", "សូមជ្រើសថ្ងៃ"), months: L("Months: 1 to 24.", "ចំនួនខែ៖ ១ ដល់ ២៤"), staff: L("Not found.", "រកមិនឃើញ") };
  const run = (fn: () => Promise<{ error?: string; ok?: boolean } | void>, done: string) =>
    start(async () => {
      const r = await fn();
      if (r && r.error) return setMsg(ERR[r.error] ?? r.error);
      setMsg(done);
      setMode(null);
      router.refresh();
    });

  const label = "mb-1 block text-[11px] font-bold uppercase tracking-wide text-ink/45";
  return (
    <div className="space-y-3 overflow-hidden rounded-2xl bg-white ring-1 ring-black/5">
      {/* now, and the next raise */}
      <div className="flex items-center gap-3 bg-gradient-to-r from-light-green to-white p-4">
        <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-white text-primary shadow-soft"><TrendingUp size={20} /></span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-bold text-ink/50">{L("Salary now", "ប្រាក់ខែបច្ចុប្បន្ន")} · {unit}</p>
          <p className="font-display text-2xl font-extrabold leading-tight text-forest">{usd(current?.amount ?? positionRate)}</p>
          <p className="truncate text-[11px] font-semibold text-ink/45">{current ? current.note || L("own salary", "ប្រាក់ខែផ្ទាល់ខ្លួន") : L("the position's rate", "តាមអត្រាតួនាទី")}</p>
        </div>
      </div>
      {next && (
        <p className="mx-4 flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800">
          <TrendingUp size={14} className="flex-shrink-0" /> {L("Rises to", "នឹងដំឡើងទៅ")} {usd(next.amount)} {L("from", "ចាប់ពី")} {dmy(next.effective_from)}{next.note ? ` · ${next.note}` : ""}
        </p>
      )}

      <div className="grid grid-cols-2 gap-2 px-4">
        <button type="button" onClick={() => setMode(mode === "step" ? null : "step")} className={cn("flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-bold transition", mode === "step" ? "bg-forest text-white" : "bg-primary text-white hover:bg-forest")}><Plus size={15} /> {L("Set / raise", "កំណត់ / ដំឡើង")}</button>
        <button type="button" onClick={() => setMode(mode === "probation" ? null : "probation")} className={cn("flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-bold transition", mode === "probation" ? "bg-amber-500 text-white" : "bg-amber-100 text-amber-800 hover:bg-amber-200")}><Hourglass size={15} /> {L("Probation", "សាកល្បង")}</button>
        {canResetPin && (
          <button type="button" disabled={pending} onClick={() => confirm(L("Reset this person's secret code? They choose a new one next time they open the app.", "កំណត់លេខកូដសម្ងាត់របស់បុគ្គលិកនេះឡើងវិញ? គាត់នឹងកំណត់លេខកូដថ្មីពេលបើកកម្មវិធីលើកក្រោយ។")) && run(() => resetStaffPin(userId), L("Code reset ✓", "បានកំណត់លេខកូដឡើងវិញ ✓"))} className="col-span-2 flex items-center justify-center gap-1.5 rounded-xl bg-slate-100 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200"><KeyRound size={14} /> {L("Reset secret code", "កំណត់លេខកូដសម្ងាត់ឡើងវិញ")}</button>
        )}
      </div>

      {mode === "step" && (
        <form action={(fd) => run(() => setSalaryStep(userId, fd), L("Saved ✓ · they were told", "បានរក្សាទុក ✓ · បានជូនដំណឹងបុគ្គលិក"))} className="mx-4 space-y-2.5 rounded-2xl bg-cream/70 p-3">
          <div className="grid grid-cols-2 gap-2">
            <label className="block"><span className={label}>{L("Amount", "ទឹកប្រាក់")}</span>
              <div className="relative"><span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-ink/40">$</span><input name="amount" type="number" step="0.01" min="0" required placeholder="250" className={cn(field, "pl-7")} /></div>
            </label>
            <label className="block"><span className={label}>{L("From", "ចាប់ពីថ្ងៃ")}</span><input name="from" type="date" required defaultValue={today} className={field} /></label>
          </div>
          <label className="block"><span className={label}>{L("Note", "កំណត់សម្គាល់")}</span><input name="note" maxLength={120} list={`notes-${userId}`} placeholder={L("e.g. raise, starting pay", "ឧ. ដំឡើង ប្រាក់ខែចាប់ផ្តើម")} className={field} /></label>
          <datalist id={`notes-${userId}`}>
            <option value={L("Starting pay", "ប្រាក់ខែចាប់ផ្តើម")} />
            <option value={L("Raise", "ដំឡើងប្រាក់ខែ")} />
            <option value={L("After probation", "ក្រោយសាកល្បង")} />
            <option value={L("New position", "តួនាទីថ្មី")} />
          </datalist>
          <button disabled={pending} className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-primary py-2.5 text-sm font-bold text-white disabled:opacity-60">{pending && <Loader2 size={14} className="animate-spin" />} {L("Save", "រក្សាទុក")}</button>
        </form>
      )}
      {mode === "probation" && (
        <form action={(fd) => run(() => setProbation(userId, fd), L("Probation set ✓", "បានកំណត់ការសាកល្បង ✓"))} className="mx-4 space-y-2.5 rounded-2xl bg-amber-50 p-3">
          <div className="grid grid-cols-2 gap-2">
            <label className="block"><span className={label}>{L("Starting pay", "ប្រាក់ខែពេលចូល")}</span>
              <div className="relative"><span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-ink/40">$</span><input name="start" type="number" step="0.01" min="0" required placeholder="150" className={cn(field, "pl-7")} /></div>
            </label>
            <label className="block"><span className={label}>{L("Then", "បន្ទាប់មក")}</span>
              <div className="relative"><span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-ink/40">$</span><input name="after" type="number" step="0.01" min="0" required placeholder="250" className={cn(field, "pl-7")} /></div>
            </label>
            <label className="block"><span className={label}>{L("From", "ចាប់ពីថ្ងៃ")}</span><input name="from" type="date" required defaultValue={today} className={field} /></label>
            <label className="block"><span className={label}>{L("For (months)", "រយៈពេល (ខែ)")}</span><input name="months" type="number" min="1" max="24" required defaultValue={3} className={field} /></label>
          </div>
          <p className="text-[11px] text-amber-800">{L("The raise starts by itself after these months; you can raise again later.", "ការដំឡើងចាប់ផ្តើមដោយខ្លួនឯងក្រោយរយៈពេលនេះ ហើយអាចដំឡើងទៀតពេលក្រោយ។")}</p>
          <button disabled={pending} className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-amber-500 py-2.5 text-sm font-bold text-white disabled:opacity-60">{pending && <Loader2 size={14} className="animate-spin" />} {L("Save", "រក្សាទុក")}</button>
        </form>
      )}

      {steps.length > 0 && (
        <ol className="relative mx-4 space-y-1.5 border-l-2 border-primary/15 pl-4 text-sm">
          {steps.map((s) => (
            <li key={s.id} className="relative flex items-center gap-2">
              <span className={cn("absolute -left-[1.4rem] h-3 w-3 rounded-full ring-2 ring-white", s.effective_from > today ? "bg-emerald-400" : s === current ? "bg-primary" : "bg-black/20")} />
              <span className="w-24 flex-shrink-0 text-xs font-bold text-ink/50">{dmy(s.effective_from)}</span>
              <span className="font-display font-extrabold text-forest">{usd(s.amount)}</span>
              <span className="min-w-0 flex-1 truncate text-xs text-ink/55">{s.note}{s.effective_from > today ? ` · ${L("planned", "គ្រោងទុក")}` : s === current ? ` · ${L("now", "បច្ចុប្បន្ន")}` : ""}</span>
              <button type="button" disabled={pending} onClick={() => confirm(L("Remove this step?", "លុបការកំណត់នេះ?")) && run(() => deleteSalaryStep(s.id), L("Removed", "បានលុប"))} aria-label={L("Remove", "លុប")} className="rounded-full p-1 text-ink/30 hover:bg-cream hover:text-red-600"><Trash2 size={14} /></button>
            </li>
          ))}
        </ol>
      )}
      {msg && <p role="status" className="px-4 text-xs font-bold text-primary">{msg}</p>}
      <div className="h-1" />
    </div>
  );
}
