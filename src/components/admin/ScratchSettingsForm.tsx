import { Gift, Heart, CalendarRange, Percent, Users } from "lucide-react";
import { SubmitButton } from "@/components/admin/ui-client";
import { saveScratchSettings } from "@/app/admin/(dashboard)/settings/actions";
import type { ScratchSettings, ScratchStats } from "@/lib/server/scratch";

const input = "w-full rounded-xl border border-black/10 bg-white px-3 py-2.5 text-sm text-ink outline-none focus:border-primary";
const lbl = "mb-1 block text-[11px] font-bold uppercase tracking-wider text-ink/45";

/**
 * Admin → Discounts: the scratch card campaign. Every paid ticket scratches;
 * winners are picked at random until the number of winners is reached by
 * the end date. Codes are made automatically.
 */
export function ScratchSettingsForm({ s, st, km, used }: { s: ScratchSettings; st: ScratchStats; km: boolean; used: number }) {
  const pct = s.winners ? Math.min(100, Math.round((st.won / s.winners) * 100)) : 0;
  return (
    <form action={saveScratchSettings} className="card mt-6 space-y-5 p-5 md:p-6">
      <div className="flex flex-wrap items-center gap-3">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/30 text-[#B8791A]"><Gift size={22} /></span>
        <div className="min-w-0 flex-1">
          <p className="font-display text-lg font-bold text-forest">{km ? "កាតកោសរង្វាន់" : "Scratch card"}</p>
          <p className="text-sm text-ink/60">
            {km ? "សំបុត្រគ្រប់សន្លឹក (ទោះ $1 ក៏ដោយ) បានកោសម្តង។ អ្នកឈ្នះត្រូវជ្រើសដោយចៃដន្យ ហើយកូដបង្កើតដោយស្វ័យប្រវត្តិ។" : "Every paid ticket (even $1) scratches once. Winners are picked at random; codes are made automatically."}
          </p>
        </div>
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-light-green px-4 py-2 text-sm font-bold text-primary">
          <input type="checkbox" name="enabled" defaultChecked={s.enabled} className="h-4 w-4 accent-[#176B3A]" /> {km ? "បើកកាតកោស" : "Turned on"}
        </label>
      </div>

      {/* how it's going */}
      <div className="rounded-2xl bg-gradient-to-r from-amber-50 to-light-green p-4">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <p className="font-display text-2xl font-extrabold text-forest">
            {st.won} / {s.winners} <span className="text-sm font-bold text-ink/50">{km ? "នាក់បានឈ្នះ" : "winners so far"}</span>
          </p>
          <p className={`rounded-full px-3 py-1 text-xs font-extrabold ${st.active ? "bg-emerald-500 text-white" : "bg-slate-200 text-ink/60"}`}>
            {st.active ? (km ? "កំពុងដំណើរការ" : "Running") : km ? "មិនដំណើរការ (ក្រៅថ្ងៃ ឬបិទ)" : "Not running (outside the dates or off)"}
          </p>
        </div>
        <div className="mt-2 h-3 overflow-hidden rounded-full bg-white">
          <div className="gwz-grow h-full rounded-full bg-gradient-to-r from-amber-400 to-primary" style={{ width: `${pct}%` }} />
        </div>
        <p className="mt-2 text-xs font-semibold text-ink/60">
          {km
            ? `នៅសល់ ${st.left} នាក់ · ${st.daysLeft} ថ្ងៃ · ជាមធ្យម ${Math.round(st.perDay)} សំបុត្រ/ថ្ងៃ · ឱកាសឈ្នះឥឡូវ ${Math.round(st.chance * 100)}% · បានប្រើកូដ ${used}`
            : `${st.left} left · ${st.daysLeft} days · about ${Math.round(st.perDay)} tickets a day · chance now ${Math.round(st.chance * 100)}% · ${used} codes used`}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl bg-cream/50 p-4">
          <p className="mb-3 flex items-center gap-2 font-bold text-forest"><Percent size={16} className="text-primary" /> {km ? "បញ្ចុះតម្លៃ" : "Discount"}</p>
          <div className="grid grid-cols-2 gap-2">
            <label className="block"><span className={lbl}>{km ? "ចាប់ពី (%)" : "From (%)"}</span><input name="min_pct" type="number" min={1} max={100} defaultValue={s.min_pct} className={input} /></label>
            <label className="block"><span className={lbl}>{km ? "ដល់ (%)" : "To (%)"}</span><input name="max_pct" type="number" min={1} max={100} defaultValue={s.max_pct} className={input} /></label>
          </div>
          {/* how often each part of the range comes out */}
          {(() => {
            const lo = Math.min(s.min_pct, s.max_pct);
            const hi = Math.max(s.min_pct, s.max_pct);
            const n = hi - lo + 1;
            const share = (a: number, b: number) => Math.round((Math.cbrt(Math.min(1, (b - lo + 1) / n)) - Math.cbrt(Math.max(0, (a - lo) / n))) * 100);
            const cut1 = lo + Math.max(0, Math.round(n / 3) - 1);
            const cut2 = lo + Math.max(0, Math.round((2 * n) / 3) - 1);
            const parts = [
              [lo, cut1, "bg-emerald-400"],
              [cut1 + 1, cut2, "bg-amber-400"],
              [cut2 + 1, hi, "bg-rose-400"],
            ].filter(([a, b]) => (a as number) <= (b as number)) as [number, number, string][];
            return (
              <div className="mt-3 space-y-1">
                {parts.map(([a, b, c]) => (
                  <div key={a} className="flex items-center gap-2 text-xs font-bold text-ink/60">
                    <span className="w-16 flex-shrink-0">{a === b ? `${a}%` : `${a}–${b}%`}</span>
                    <span className="h-2 flex-1 overflow-hidden rounded-full bg-white"><span className={`block h-full rounded-full ${c}`} style={{ width: `${share(a, b)}%` }} /></span>
                    <span className="w-9 text-right">{share(a, b)}%</span>
                  </div>
                ))}
              </div>
            );
          })()}
        </div>
        <div className="rounded-2xl bg-light-green/50 p-4">
          <p className="mb-3 flex items-center gap-2 font-bold text-forest"><Users size={16} className="text-primary" /> {km ? "ចំនួនអ្នកឈ្នះ" : "Winners"}</p>
          <label className="block"><span className={lbl}>{km ? "សរុប (នាក់)" : "In total (people)"}</span><input name="winners" type="number" min={0} defaultValue={s.winners} className={input} /></label>
        </div>
        <div className="rounded-2xl bg-sky-50 p-4">
          <p className="mb-3 flex items-center gap-2 font-bold text-forest"><CalendarRange size={16} className="text-primary" /> {km ? "រយៈពេល" : "Dates"}</p>
          <label className="block"><span className={lbl}>{km ? "ចាប់ពីថ្ងៃ" : "From"}</span><input name="start_date" type="date" defaultValue={s.start_date} className={input} /></label>
          <label className="mt-2 block"><span className={lbl}>{km ? "ដល់ថ្ងៃ" : "To"}</span><input name="end_date" type="date" defaultValue={s.end_date} className={input} /></label>
        </div>
      </div>

      <div className="rounded-2xl bg-rose-50/70 p-4">
        <p className="mb-2 flex items-center gap-2 font-bold text-rose-700"><Heart size={16} className="fill-rose-400 text-rose-400" /> {km ? "សារ «អរគុណ» សម្រាប់អ្នកមិនបានឈ្នះ" : "“Thank you” for everyone else"}</p>
        <div className="grid gap-2 sm:grid-cols-2">
          <input name="thanks_km" defaultValue={s.thanks_km} placeholder="ខ្មែរ" className={input} />
          <input name="thanks_en" defaultValue={s.thanks_en} placeholder="English" className={input} />
        </div>
      </div>

      <div className="flex justify-end">
        <SubmitButton label={km ? "រក្សាទុកកាតកោស" : "Save scratch card"} pendingLabel="…" />
      </div>
    </form>
  );
}
