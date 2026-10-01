"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Trash2, Download, CalendarCheck2, Loader2, Save, PlayCircle, Lock, RefreshCw, Check, X, Undo2, HandCoins, Printer, Landmark, UserRoundCheck } from "lucide-react";
import { savePayday, openPayday, closePayday, reissuePayslips, markReceived, undoReceived, decidePayRequest, deletePayday } from "@/app/admin/(dashboard)/payday/actions";
import { cn } from "@/lib/utils/cn";

const field = "w-full rounded-2xl border border-black/10 bg-cream/40 px-4 py-2.5 text-base outline-none transition focus:border-primary focus:bg-white";

/** Set (or move) the day pay is handed out. */
export function PaydayForm({ km, month, monthName, p }: { km: boolean; month: string; monthName: string; p: { pay_date: string; start_time: string | null; end_time: string | null; place: string | null; note: string | null; status: string } | null }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState("");
  const L = (en: string, k: string) => (km ? k : en);
  const locked = p?.status === "closed";
  // a new payday: the 5th of the following month (the month's work is done by then)
  const [y, m] = month.split("-").map(Number);
  const nextFirst = new Date(Date.UTC(y, m, 5)).toISOString().slice(0, 10);
  const monthEnd = new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
  const [date, setDate] = useState(p?.pay_date ?? nextFirst);
  return (
    <form
      className="card space-y-3 p-5"
      action={(fd) =>
        start(async () => {
          const r = await savePayday(fd);
          setMsg(r.error ? (r.error === "closed" ? L("This payday is closed.", "ថ្ងៃបើកប្រាក់ខែនេះបានបិទហើយ។") : r.error === "time" ? L("The end time must be after the start time.", "ម៉ោងបញ្ចប់ត្រូវនៅក្រោយម៉ោងចាប់ផ្តើម។") : r.error === "before" ? L(`The pay of ${monthName} can't be handed out before the month starts.`, `ប្រាក់ខែ${monthName} មិនអាចបើកមុនខែនោះចាប់ផ្តើមបានទេ។`) : L("Please choose a date.", "សូមជ្រើសថ្ងៃ។")) : L("Saved ✓ · staff were told", "បានរក្សាទុក ✓ · បានជូនដំណឹងបុគ្គលិក"));
          router.refresh();
        })
      }
    >
      <input type="hidden" name="month" value={month} />
      <div>
        <p className="flex items-center gap-2 font-display text-lg font-extrabold text-forest"><CalendarCheck2 size={19} className="text-primary" /> {L("Payday", "ថ្ងៃបើកប្រាក់ខែ")}</p>
        <p className="mt-2 inline-flex items-center gap-2 rounded-2xl bg-light-green px-3 py-2 text-sm font-extrabold text-primary">{L("Pay for the month of", "ប្រាក់ខែសម្រាប់")} {monthName}</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="block sm:col-span-1">
          <span className="mb-1 block text-xs font-bold text-ink/55">{L("Hand-out date", "ថ្ងៃបើកប្រាក់")} *</span>
          <input type="date" name="pay_date" required value={date} onChange={(e) => setDate(e.target.value)} disabled={locked} className={field} />
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
      {date && date < monthEnd && (
        <p className="flex items-start gap-2 rounded-2xl bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900">
          <AlertTriangle size={15} className="mt-0.5 flex-shrink-0 text-amber-600" />
          <span>{L(`This pays ${monthName} before the month is over: monthly staff get the full month, but staff paid per day or hour only get the days worked so far (it can be $0). Usually the pay of a month is handed out early the next month.`, `នេះបើកប្រាក់ខែ${monthName} មុនខែនោះចប់៖ បុគ្គលិកប្រាក់ខែប្រចាំខែបានពេញខែ ប៉ុន្តែបុគ្គលិកគិតតាមថ្ងៃ ឬម៉ោង បានតែថ្ងៃដែលបានធ្វើរហូតដល់ពេលនោះ (អាច $0)។ ជាធម្មតា ប្រាក់ខែនៃខែមួយបើកនៅដើមខែបន្ទាប់។`)}</span>
        </p>
      )}
      <input name="place" defaultValue={p?.place ?? ""} disabled={locked} placeholder={L("Where (e.g. HR office)", "ទីកន្លែង (ឧ. ការិយាល័យ HR)")} className={field} />
      <input name="note" defaultValue={p?.note ?? ""} disabled={locked} placeholder={L("Note for staff (optional)", "សារទៅបុគ្គលិក (ជម្រើស)")} className={field} />
      <p className="rounded-2xl bg-sky-50 px-3 py-2 text-xs text-sky-900">{L("Set it once: the following months are set up by themselves (same day of the month, same hours and place), and payday opens by itself on the day. Pay and attendance start counting again each new month.", "កំណត់តែម្តងគត់៖ ខែបន្ទាប់ៗនឹងកំណត់ដោយស្វ័យប្រវត្តិ (ថ្ងៃទីដូចគ្នា ម៉ោង និងទីកន្លែងដដែល) ហើយបើកដោយខ្លួនឯងនៅថ្ងៃនោះ។ ប្រាក់ខែ និងវត្តមានចាប់ផ្តើមរាប់ថ្មីរៀងរាល់ខែ។")}</p>
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
        <button disabled={pending} onClick={() => go(() => openPayday(id), L("Open payday now (instead of waiting for the day)? Everyone's payslip is frozen.", "បើកឥឡូវ (មិនរង់ចាំដល់ថ្ងៃ)? វិក្កយបត្ររបស់បុគ្គលិកនឹងត្រូវគិតរួច។"))} className="btn-primary">
          {pending ? <Loader2 size={16} className="animate-spin" /> : <PlayCircle size={16} />} {L("Open now", "បើកឥឡូវ")}
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
      {status !== "closed" && (
        <button disabled={pending} onClick={() => go(async () => { const r = await deletePayday(id); if (r.error === "collected") alert(L("Someone already collected: it can't be deleted. Close it instead.", "មានអ្នកបានទទួលប្រាក់រួចហើយ មិនអាចលុបបានទេ។ សូមចុចបិទជំនួសវិញ។")); }, L("Delete this payday? (only when nobody has collected yet)", "លុបថ្ងៃបើកប្រាក់ខែនេះ? (បានតែពេលមិនទាន់មានអ្នកទទួល)"))} className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-4 py-2 text-sm font-bold text-red-700 ring-1 ring-red-100 print:hidden">
          <Trash2 size={15} /> {L("Delete", "លុប")}
        </button>
      )}
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


/** One department's QR as a print-ready picture (A5-like card, 1240×1754 px). */
async function qrCardPng(q: { img: string; name: string; color: string }, month: string, km: boolean) {
  const W = 1240, H = 1754;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const x = c.getContext("2d")!;
  const font = getComputedStyle(document.body).fontFamily;
  await document.fonts?.ready;
  const load = (src: string) => new Promise<HTMLImageElement>((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = src; });
  // page and coloured band
  x.fillStyle = "#ffffff";
  x.fillRect(0, 0, W, H);
  x.fillStyle = q.color;
  x.fillRect(0, 0, W, 360);
  x.textAlign = "center";
  x.fillStyle = "rgba(255,255,255,.85)";
  x.font = `700 44px ${font}`;
  x.fillText(`${km ? "ថ្ងៃបើកប្រាក់ខែ" : "Payday"} · ${month}`, W / 2, 130);
  x.fillStyle = "#ffffff";
  x.font = `800 96px ${font}`;
  x.fillText(q.name, W / 2, 270, W - 120);
  // the code
  const qr = await load(q.img);
  const size = 900;
  x.drawImage(qr, (W - size) / 2, 440, size, size);
  // logo in a white circle in the middle of the code
  try {
    const logo = await load("/logo-sm.png");
    x.fillStyle = "#ffffff";
    x.beginPath();
    x.arc(W / 2, 440 + size / 2, 95, 0, Math.PI * 2);
    x.fill();
    x.drawImage(logo, W / 2 - 80, 440 + size / 2 - 80, 160, 160);
  } catch {}
  x.fillStyle = "#0E3F24";
  x.font = `800 56px ${font}`;
  x.fillText(km ? "ស្កេនក្នុងកម្មវិធីបុគ្គលិក ដើម្បីទទួលប្រាក់" : "Scan in the staff app to collect", W / 2, 1460, W - 100);
  x.fillStyle = "rgba(14,63,36,.6)";
  x.font = `600 40px ${font}`;
  x.fillText(km ? "កម្មវិធី → ប្រាក់ខែ → ស្កេន QR · បញ្ចូលលេខកូដសម្ងាត់" : "App → Pay → Scan QR · enter your secret code", W / 2, 1540, W - 100);
  x.fillText("Green Wild Zoo", W / 2, 1660);
  return c.toDataURL("image/png");
}

/** Download the department QR codes as pictures for printing. */
export function QrDownload({ km, month, qrs, one }: { km: boolean; month: string; qrs: { d: string; img: string; name: string; color: string }[]; one?: boolean }) {
  const [busy, setBusy] = useState(false);
  const L = (en: string, k: string) => (km ? k : en);
  const save = async () => {
    setBusy(true);
    try {
      for (const q of qrs) {
        const a = document.createElement("a");
        a.href = await qrCardPng(q, month, km);
        a.download = `payday-QR-${month.replace(/\s+/g, "-")}-${q.name.replace(/[^\p{L}\p{M}\p{N}]+/gu, "-")}.png`;
        a.click();
        await new Promise((r) => setTimeout(r, 350)); // browsers allow one download at a time
      }
    } finally {
      setBusy(false);
    }
  };
  return (
    <button type="button" disabled={busy} onClick={save} className={cn("inline-flex items-center justify-center gap-1.5 font-bold print:hidden", one ? "w-full rounded-xl bg-cream py-2 text-xs text-forest hover:bg-light-green" : "rounded-full bg-primary px-4 py-2 text-sm text-white shadow-soft")}>
      {busy ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />} {one ? L("Download PNG", "ទាញយក PNG") : L(`Download all (${qrs.length})`, `ទាញយកទាំងអស់ (${qrs.length})`)}
    </button>
  );
}
