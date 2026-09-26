import { Gift, Heart, Users, Percent } from "lucide-react";
import { SubmitButton } from "@/components/admin/ui-client";
import { saveScratchSettings } from "@/app/admin/(dashboard)/settings/actions";
import type { ScratchSettings } from "@/lib/server/scratch";

const input = "w-full rounded-xl border border-black/10 bg-white px-3 py-2.5 text-sm text-ink outline-none focus:border-primary";
const lbl = "mb-1 block text-[11px] font-bold uppercase tracking-wider text-ink/45";

/** Admin → Discounts: the scratch card's prizes, chances, thank-you and who can win. Codes are made automatically. */
export function ScratchSettingsForm({ s, km, given, used }: { s: ScratchSettings; km: boolean; given: number; used: number }) {
  const rows = [...s.prizes, ...Array.from({ length: Math.max(0, 6 - s.prizes.length) }, () => ({ percent: 0, weight: 0 }))].slice(0, 6);
  const total = s.prizes.reduce((n, p) => n + p.weight, 0) + s.thanks_weight || 1;
  const pct = (w: number) => `${Math.round((w / total) * 100)}%`;
  return (
    <form action={saveScratchSettings} className="card mt-6 space-y-5 p-5 md:p-6">
      <div className="flex flex-wrap items-center gap-3">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/30 text-[#B8791A]"><Gift size={22} /></span>
        <div className="min-w-0 flex-1">
          <p className="font-display text-lg font-bold text-forest">{km ? "កាតកោសរង្វាន់" : "Scratch card"}</p>
          <p className="text-sm text-ink/60">
            {km ? `ភ្ញៀវបង់ប្រាក់រួចបានកោសម្តង។ កូដបង្កើតដោយស្វ័យប្រវត្តិ មិនបាច់បង្កើតខ្លួនឯងទេ។ បានឈ្នះ ${given} · បានប្រើ ${used}។` : `Every paid ticket scratches once. Codes are made automatically, nothing to create. ${given} won · ${used} used.`}
          </p>
        </div>
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-light-green px-4 py-2 text-sm font-bold text-primary">
          <input type="checkbox" name="enabled" defaultChecked={s.enabled} className="h-4 w-4 accent-[#176B3A]" /> {km ? "បើកកាតកោស" : "Turned on"}
        </label>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* prizes and chances */}
        <div className="rounded-2xl bg-cream/50 p-4">
          <p className="mb-3 flex items-center gap-2 font-bold text-forest"><Percent size={16} className="text-primary" /> {km ? "រង្វាន់ និងឱកាសឈ្នះ" : "Prizes and chances"}</p>
          <div className="mb-1 grid grid-cols-[1fr_1fr_3.5rem] gap-2">
            <span className={lbl}>{km ? "បញ្ចុះ (%)" : "Discount (%)"}</span>
            <span className={lbl}>{km ? "ទម្ងន់ឱកាស" : "Chance weight"}</span>
            <span className={lbl}>{km ? "ឱកាស" : "Chance"}</span>
          </div>
          <div className="space-y-2">
            {rows.map((p, i) => (
              <div key={i} className="grid grid-cols-[1fr_1fr_3.5rem] items-center gap-2">
                <input name={`p_pct_${i}`} type="number" min={0} max={100} defaultValue={p.percent || ""} placeholder="—" className={input} />
                <input name={`p_w_${i}`} type="number" min={0} max={1000} defaultValue={p.weight || ""} placeholder="—" className={input} />
                <span className="text-center text-sm font-bold text-primary">{p.weight ? pct(p.weight) : ""}</span>
              </div>
            ))}
            <div className="grid grid-cols-[1fr_1fr_3.5rem] items-center gap-2 rounded-xl bg-rose-50 p-2">
              <span className="flex items-center gap-1.5 text-sm font-bold text-rose-600"><Heart size={15} className="fill-rose-400 text-rose-400" /> {km ? "អរគុណ (មិនឈ្នះ)" : "Thank you (no prize)"}</span>
              <input name="thanks_weight" type="number" min={0} max={1000} defaultValue={s.thanks_weight} className={input} />
              <span className="text-center text-sm font-bold text-rose-600">{pct(s.thanks_weight)}</span>
            </div>
          </div>
          <p className="mt-2 text-xs text-ink/50">{km ? "ទម្ងន់ធំ = ឱកាសច្រើន។ ឧ. 45 + 17 + 6 + 2 + អរគុណ 30 = 100។" : "Bigger weight = more likely. E.g. 45 + 17 + 6 + 2 + thank-you 30 = 100."}</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <label className="block"><span className={lbl}>{km ? "សារអរគុណ (ខ្មែរ)" : "Thank-you (Khmer)"}</span><input name="thanks_km" defaultValue={s.thanks_km} className={input} /></label>
            <label className="block"><span className={lbl}>{km ? "សារអរគុណ (EN)" : "Thank-you (English)"}</span><input name="thanks_en" defaultValue={s.thanks_en} className={input} /></label>
          </div>
        </div>

        {/* who can win */}
        <div className="rounded-2xl bg-light-green/50 p-4">
          <p className="mb-3 flex items-center gap-2 font-bold text-forest"><Users size={16} className="text-primary" /> {km ? "អ្នកណាអាចឈ្នះ" : "Who can win"}</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block"><span className={lbl}>{km ? "ទិញសំបុត្រយ៉ាងតិច ($)" : "Spent at least ($)"}</span><input name="min_total" type="number" step="0.5" min={0} defaultValue={s.min_total} className={input} /></label>
            <label className="block"><span className={lbl}>{km ? "ចំនួនភ្ញៀវយ៉ាងតិច (នាក់)" : "At least (people)"}</span><input name="min_visitors" type="number" min={1} defaultValue={s.min_visitors} className={input} /></label>
            <label className="block"><span className={lbl}>{km ? "អ្នកឈ្នះច្រើនបំផុត/ថ្ងៃ (0 = គ្មានកំណត់)" : "Max winners a day (0 = no limit)"}</span><input name="max_wins_per_day" type="number" min={0} defaultValue={s.max_wins_per_day} className={input} /></label>
            <label className="block"><span className={lbl}>{km ? "សមាជិកឈ្នះបានម្តងក្នុង (ថ្ងៃ)" : "A member wins once every (days)"}</span><input name="once_per_member_days" type="number" min={0} defaultValue={s.once_per_member_days} className={input} /></label>
            <label className="block"><span className={lbl}>{km ? "កូដប្រើបានរយៈ (ថ្ងៃ)" : "Code valid for (days)"}</span><input name="valid_days" type="number" min={1} defaultValue={s.valid_days} className={input} /></label>
            <label className="flex cursor-pointer items-center gap-2 self-end rounded-xl bg-white px-3 py-2.5 text-sm font-semibold text-ink/75">
              <input type="checkbox" name="members_only" defaultChecked={s.members_only} className="h-4 w-4 accent-[#176B3A]" /> {km ? "តែអ្នកមានគណនីប៉ុណ្ណោះ" : "Signed-in members only"}
            </label>
          </div>
          <p className="mt-3 text-xs text-ink/50">{km ? "អ្នកដែលមិនត្រូវតាមលក្ខខណ្ឌ នឹងឃើញសារ «អរគុណ» ជំនួស។" : "Anyone who doesn't meet these gets the thank-you instead."}</p>
        </div>
      </div>
      <div className="flex justify-end">
        <SubmitButton label={km ? "រក្សាទុកកាតកោស" : "Save scratch card"} pendingLabel="…" />
      </div>
    </form>
  );
}
