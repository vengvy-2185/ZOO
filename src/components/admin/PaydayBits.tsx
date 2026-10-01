"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarCheck2, Loader2, Save, PlayCircle, Lock, RefreshCw, Check, X, Undo2, HandCoins, Printer, Landmark, UserRoundCheck } from "lucide-react";
import { savePayday, openPayday, closePayday, reissuePayslips, markReceived, undoReceived, decidePayRequest } from "@/app/admin/(dashboard)/payday/actions";
import { cn } from "@/lib/utils/cn";

const field = "w-full rounded-2xl border border-black/10 bg-cream/40 px-4 py-2.5 text-base outline-none transition focus:border-primary focus:bg-white";

/** Set (or move) the day pay is handed out. */
export function PaydayForm({ km, month, p }: { km: boolean; month: string; p: { pay_date: string; start_time: string | null; end_time: string | null; place: string | null; note: string | null; status: string } | null }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState("");
  const L = (en: string, k: string) => (km ? k : en);
  const locked = p?.status === "closed";
  return (
    <form
      className="card space-y-3 p-5"
      action={(fd) =>
        start(async () => {
          const r = await savePayday(fd);
          setMsg(r.error ? (r.error === "closed" ? L("This payday is closed.", "ថ្ងៃបើកប្រាក់ខែនេះបានបិទហើយ។") : L("Please choose a date.", "សូមជ្រើសថ្ងៃ។")) : L("Saved ✓ · staff were told", "បានរក្សាទុក ✓ · បានជូនដំណឹងបុគ្គលិក"));
          router.refresh();
        })
      }
    >
      <input type="hidden" name="month" value={month} />
      <p className="flex items-center gap-2 font-display text-lg font-extrabold text-forest"><CalendarCheck2 size={19} className="text-primary" /> {L("Payday", "ថ្ងៃបើកប្រាក់ខែ")}</p>
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="block sm:col-span-1">
          <span className="mb-1 block text-xs font-bold text-ink/55">{L("Date", "ថ្ងៃ")} *</span>
          <input type="date" name="pay_date" required defaultValue={p?.pay_date ?? ""} disabled={locked} className={field} />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-bold text-ink/55">{L("From", "ចាប់ពីម៉ោង")}</span>
          <input type="time" name="start_time" defaultValue={p?.start_time?.slice(0, 5) ?? "08:00"} disabled={locked} className={field} />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-bold text-ink/55">{L("Until", "ដល់ម៉ោង")}</span>
          <input type="time" name="end_time" defaultValue={p?.end_time?.slice(0, 5) ?? "11:00"} disabled={locked} className={field} />
        </label>
      </div>
      <input name="place" defaultValue={p?.place ?? ""} disabled={locked} placeholder={L("Where (e.g. HR office)", "ទីកន្លែង (ឧ. ការិយាល័យ HR)")} className={field} />
      <input name="note" defaultValue={p?.note ?? ""} disabled={locked} placeholder={L("Note for staff (optional)", "សារទៅបុគ្គលិក (ជម្រើស)")} className={field} />
      <div className="flex flex-wrap items-center justify-end gap-3">
        {msg && <span role="status" className="text-sm font-bold text-primary">{msg}</span>}
        <button disabled={pending || locked} className="btn-primary disabled:opacity-50">{pending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} {p ? L("Save", "រក្សាទុក") : L("Set payday", "កំណត់ថ្ងៃ")}</button>
      </div>
    </form>
  );
}

/** Open / work out again / close. */
export function PaydayControls({ km, id, status }: { km: boolean; id: string; status: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const L = (en: string, k: string) => (km ? k : en);
  const go = (fn: () => Promise<unknown>, ask: string) => {
    if (!confirm(ask)) return;
    start(async () => {
      await fn();
      router.refresh();
    });
  };
  return (
    <div className="flex flex-wrap gap-2">
      {status === "scheduled" && (
        <button disabled={pending} onClick={() => go(() => openPayday(id), L("Open payday now? Everyone's payslip is frozen and the QR codes start working.", "បើកថ្ងៃបើកប្រាក់ខែឥឡូវ? វិក្កយបត្ររបស់បុគ្គលិកនឹងត្រូវគិតរួច ហើយ QR ចាប់ផ្តើមដំណើរការ។"))} className="btn-primary">
          {pending ? <Loader2 size={16} className="animate-spin" /> : <PlayCircle size={16} />} {L("Open payday", "បើកការបើកប្រាក់ខែ")}
        </button>
      )}
      {status === "open" && (
        <>
          <button disabled={pending} onClick={() => go(() => reissuePayslips(id), L("Work out again the payslips of those who haven't collected yet?", "គិតវិក្កយបត្រឡើងវិញ សម្រាប់អ្នកមិនទាន់ទទួល?"))} className="btn-outline bg-white">
            <RefreshCw size={15} /> {L("Re-work payslips", "គិតវិក្កយបត្រឡើងវិញ")}
          </button>
          <button disabled={pending} onClick={() => go(() => closePayday(id), L("Close payday? The QR codes stop working. You can still see the table.", "បិទការបើកប្រាក់ខែ? QR នឹងឈប់ដំណើរការ ប៉ុន្តែនៅតែមើលតារាងបាន។"))} className="inline-flex items-center gap-2 rounded-full bg-slate-800 px-4 py-2 text-sm font-bold text-white">
            <Lock size={15} /> {L("Close", "បិទ")}
          </button>
        </>
      )}
      <button onClick={() => window.print()} className="btn-outline bg-white print:hidden"><Printer size={15} /> {L("Print", "បោះពុម្ព")}</button>
    </div>
  );
}

/** Mark a late collection by hand (or undo). */
export function RowActions({ km, paydayId, userId, received, closed }: { km: boolean; paydayId: string; userId: string; received: boolean; closed: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const L = (en: string, k: string) => (km ? k : en);
  const run = (fn: () => Promise<unknown>) =>
    start(async () => {
      await fn();
      setOpen(false);
      router.refresh();
    });
  if (pending) return <Loader2 size={16} className="animate-spin text-primary" />;
  if (received)
    return closed ? null : (
      <button title={L("Undo", "ដកវិញ")} onClick={() => confirm(L("Undo this hand-over?", "ដកការសម្គាល់នេះវិញ?")) && run(() => undoReceived(paydayId, userId))} className="rounded-full p-1.5 text-ink/35 hover:bg-cream hover:text-red-600 print:hidden"><Undo2 size={15} /></button>
    );
  return (
    <div className="relative print:hidden">
      <button onClick={() => setOpen(!open)} className="inline-flex items-center gap-1 rounded-full bg-light-green px-3 py-1.5 text-xs font-bold text-primary hover:bg-primary hover:text-white"><HandCoins size={14} /> {L("Hand over", "ប្រគល់")}</button>
      {open && (
        <div className="absolute right-0 z-20 mt-1 w-48 overflow-hidden rounded-2xl bg-white text-sm shadow-lift ring-1 ring-black/10">
          <button onClick={() => run(() => markReceived(paydayId, userId, "manual"))} className="flex w-full items-center gap-2 px-4 py-2.5 text-left hover:bg-cream"><HandCoins size={15} className="text-primary" /> {L("Cash, in person", "ប្រគល់ផ្ទាល់ដៃ")}</button>
          <button onClick={() => run(() => markReceived(paydayId, userId, "proxy"))} className="flex w-full items-center gap-2 px-4 py-2.5 text-left hover:bg-cream"><UserRoundCheck size={15} className="text-violet-600" /> {L("Someone collected", "អ្នកផ្សេងទទួលជំនួស")}</button>
          <button onClick={() => run(() => markReceived(paydayId, userId, "transfer"))} className="flex w-full items-center gap-2 px-4 py-2.5 text-left hover:bg-cream"><Landmark size={15} className="text-sky-600" /> {L("Bank transfer", "ផ្ទេរតាមធនាគារ")}</button>
        </div>
      )}
    </div>
  );
}

/** Approve / refuse a "can't come" request. */
export function RequestActions({ km, id }: { km: boolean; id: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [note, setNote] = useState("");
  const L = (en: string, k: string) => (km ? k : en);
  const run = (ok: boolean) =>
    start(async () => {
      await decidePayRequest(id, ok, note);
      router.refresh();
    });
  return (
    <div className="mt-2 flex flex-wrap items-center gap-2 print:hidden">
      <input value={note} onChange={(e) => setNote(e.target.value)} placeholder={L("Reply (optional)", "ឆ្លើយតប (ជម្រើស)")} className="min-w-[10rem] flex-1 rounded-full border border-black/10 bg-white px-3 py-1.5 text-sm outline-none focus:border-primary" />
      <button disabled={pending} onClick={() => run(true)} className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50"><Check size={14} /> {L("Approve", "យល់ព្រម")}</button>
      <button disabled={pending} onClick={() => run(false)} className="inline-flex items-center gap-1 rounded-full bg-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 disabled:opacity-50"><X size={14} /> {L("Refuse", "បដិសេធ")}</button>
      {pending && <Loader2 size={15} className="animate-spin text-primary" />}
    </div>
  );
}

/** Keeps the table fresh while payday is open (people collect every minute). */
export function AutoRefresh({ seconds = 8 }: { seconds?: number }) {
  const router = useRouter();
  useEffect(() => {
    const id = setInterval(() => document.visibilityState === "visible" && router.refresh(), seconds * 1000);
    return () => clearInterval(id);
  }, [router, seconds]);
  return null;
}

