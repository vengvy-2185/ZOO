"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { TrendingUp, Trash2, Loader2, Plus, Hourglass, KeyRound } from "lucide-react";
import { setSalaryStep, setProbation, deleteSalaryStep } from "@/app/staff/(protected)/hr/salary-actions";
import { resetStaffPin } from "@/app/staff/(protected)/pin-actions";
import { cn } from "@/lib/utils/cn";

type Step = { id: string; effective_from: string; amount: number; note: string | null };
const field = "w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm outline-none focus:border-primary";
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

  return (
    <div className="space-y-3 rounded-2xl bg-white p-4 ring-1 ring-black/5">
      <div className="flex flex-wrap items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-light-green text-primary"><TrendingUp size={18} /></span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold text-ink/50">{L("Salary now", "ប្រាក់ខែបច្ចុប្បន្ន")} · {unit}</p>
          <p className="font-display text-xl font-extrabold text-forest">{usd(current?.amount ?? positionRate)} {!current && <span className="text-xs font-bold text-ink/45">({L("position rate", "តាមតួនាទី")})</span>}</p>
          {next && <p className="text-xs font-bold text-emerald-700">↗ {usd(next.amount)} {L("from", "ចាប់ពី")} {dmy(next.effective_from)}{next.note ? ` · ${next.note}` : ""}</p>}
        </div>
        <div className="flex flex-wrap gap-1.5">
          <button type="button" onClick={() => setMode(mode === "step" ? null : "step")} className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-xs font-bold text-white"><Plus size={13} /> {L("Set / raise", "កំណត់ / ដំឡើង")}</button>
          <button type="button" onClick={() => setMode(mode === "probation" ? null : "probation")} className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1.5 text-xs font-bold text-amber-800"><Hourglass size={13} /> {L("Probation", "សាកល្បង")}</button>
          {canResetPin && (
            <button type="button" disabled={pending} onClick={() => confirm(L("Reset this person's secret code? They choose a new one next time they open the app.", "កំណត់លេខកូដសម្ងាត់របស់បុគ្គលិកនេះឡើងវិញ? គាត់នឹងកំណត់លេខកូដថ្មីពេលបើកកម្មវិធីលើកក្រោយ។")) && run(() => resetStaffPin(userId), L("Code reset ✓", "បានកំណត់លេខកូដឡើងវិញ ✓"))} className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700"><KeyRound size={13} /> {L("Reset code", "កំណត់លេខកូដឡើងវិញ")}</button>
          )}
        </div>
      </div>

      {mode === "step" && (
        <form action={(fd) => run(() => setSalaryStep(userId, fd), L("Saved ✓ · they were told", "បានរក្សាទុក ✓ · បានជូនដំណឹងបុគ្គលិក"))} className="grid gap-2 rounded-xl bg-cream/60 p-3 sm:grid-cols-4">
          <label className="block"><span className="mb-0.5 block text-[11px] font-bold text-ink/50">{L("Amount", "ទឹកប្រាក់")} ($)</span><input name="amount" type="number" step="0.01" min="0" required placeholder="250" className={field} /></label>
          <label className="block"><span className="mb-0.5 block text-[11px] font-bold text-ink/50">{L("From", "ចាប់ពីថ្ងៃ")}</span><input name="from" type="date" required defaultValue={today} className={field} /></label>
          <label className="block sm:col-span-2"><span className="mb-0.5 block text-[11px] font-bold text-ink/50">{L("Note", "កំណត់សម្គាល់")}</span><input name="note" maxLength={120} list={`notes-${userId}`} placeholder={L("e.g. raise, starting pay", "ឧ. ដំឡើង, ប្រាក់ខែចាប់ផ្តើម")} className={field} /></label>
          <datalist id={`notes-${userId}`}>
            <option value={L("Starting pay", "ប្រាក់ខែចាប់ផ្តើម")} />
            <option value={L("Raise", "ដំឡើងប្រាក់ខែ")} />
            <option value={L("After probation", "ក្រោយសាកល្បង")} />
            <option value={L("New position", "តួនាទីថ្មី")} />
          </datalist>
          <div className="flex justify-end sm:col-span-4"><button disabled={pending} className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-bold text-white disabled:opacity-60">{pending && <Loader2 size={14} className="animate-spin" />} {L("Save", "រក្សាទុក")}</button></div>
        </form>
      )}
      {mode === "probation" && (
        <form action={(fd) => run(() => setProbation(userId, fd), L("Probation set ✓", "បានកំណត់ការសាកល្បង ✓"))} className="grid gap-2 rounded-xl bg-amber-50 p-3 sm:grid-cols-4">
          <label className="block"><span className="mb-0.5 block text-[11px] font-bold text-ink/50">{L("Starting pay", "ប្រាក់ខែពេលចូល")} ($)</span><input name="start" type="number" step="0.01" min="0" required placeholder="150" className={field} /></label>
          <label className="block"><span className="mb-0.5 block text-[11px] font-bold text-ink/50">{L("From", "ចាប់ពីថ្ងៃ")}</span><input name="from" type="date" required defaultValue={today} className={field} /></label>
          <label className="block"><span className="mb-0.5 block text-[11px] font-bold text-ink/50">{L("For (months)", "រយៈពេល (ខែ)")}</span><input name="months" type="number" min="1" max="24" required defaultValue={3} className={field} /></label>
          <label className="block"><span className="mb-0.5 block text-[11px] font-bold text-ink/50">{L("Then", "បន្ទាប់មក")} ($)</span><input name="after" type="number" step="0.01" min="0" required placeholder="250" className={field} /></label>
          <p className="text-xs text-amber-800 sm:col-span-3">{L("They get the starting pay, and the raise starts by itself after these months.", "គាត់ទទួលប្រាក់ខែពេលចូល ហើយការដំឡើងចាប់ផ្តើមដោយស្វ័យប្រវត្តិ ក្រោយរយៈពេលនេះ។")}</p>
          <div className="flex justify-end"><button disabled={pending} className="inline-flex items-center gap-1.5 rounded-full bg-amber-500 px-4 py-2 text-sm font-bold text-white disabled:opacity-60">{pending && <Loader2 size={14} className="animate-spin" />} {L("Save", "រក្សាទុក")}</button></div>
        </form>
      )}

      {steps.length > 0 && (
        <ol className="relative space-y-1.5 border-l-2 border-primary/15 pl-4 text-sm">
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
      {msg && <p role="status" className="text-xs font-bold text-primary">{msg}</p>}
    </div>
  );
}
