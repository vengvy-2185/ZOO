import { Phone, Volume2, SlidersHorizontal, Package, Bell, RefreshCw } from "lucide-react";
import { SubmitButton } from "@/components/admin/ui-client";
import { SoundTest } from "@/components/staff/SoundTest";
import { saveStaffSettings, applyLeaveQuotaToAll } from "@/app/admin/(dashboard)/staff/actions";
import { SUPPLY_SECTIONS, type Section } from "@/lib/staff-extras";
import type { StaffSettings } from "@/lib/server/staff-settings";

const input = "w-full rounded-xl border border-black/10 bg-white px-3 py-2.5 text-sm text-ink outline-none focus:border-primary";
const lbl = "mb-1 block text-[11px] font-bold uppercase tracking-wider text-ink/45";

/** Admin → Staff → Settings: every number and list the staff area uses. */
export function StaffSettingsPanel({ s, km, usingDefault }: { s: StaffSettings; km: boolean; usingDefault: number }) {
  const L = km
    ? {
        phones: "លេខទូរស័ព្ទបន្ទាន់ (ទំព័រ SOS)", label: "ឈ្មោះ (EN)", labelKm: "ឈ្មោះ (ខ្មែរ)", number: "លេខ", office: "លេខការិយាល័យសួនសត្វ",
        sound: "សំឡេង", soundOn: "បើកសំឡេងជូនដំណឹង", volume: "កម្រិតសំឡេង (%)", every: "SOS រោទ៍ម្តងទៀតរៀងរាល់ (វិនាទី)", chTasks: "រោទ៍ពេលមានការងារថ្មី", chNotices: "រោទ៍ពេលមានសេចក្តីជូនដំណឹងថ្មី", chMgr: "រោទ៍ឲ្យអ្នកគ្រប់គ្រង ពេលមានសំណើសម្ភារៈ/បញ្ហាថ្មី",
        numbers: "លេខកំណត់ផ្សេងៗ", kudos: "ពាក្យអរគុណ អតិបរមា/ថ្ងៃ/នាក់", leave: "ច្បាប់ដើម សម្រាប់បុគ្គលិកថ្មី (ដង/ឆ្នាំ)", handover: "កំណត់ចំណាំប្រគល់វេន «ថ្មី» ក្នុងរយៈ (ម៉ោង)", tasks: "បង្ហាញការងាររួចរាល់ក្នុងរយៈ (ថ្ងៃ)", lost: "របស់បាត់ចាស់ បើលើស (ថ្ងៃ)",
        apply: (n: number, q: number) => `ដាក់ ${q} ដងឲ្យបុគ្គលិក ${n} នាក់ដែលនៅប្រើចំនួនដើម`,
        supplies: "បញ្ជីជ្រើសរហ័ស (សុំសម្ភារៈ)", supHint: "មួយបន្ទាត់មួយរបស់៖ English | ខ្មែរ", save: "រក្សាទុកការកំណត់", saving: "កំពុងរក្សាទុក…",
      }
    : {
        phones: "Emergency numbers (SOS page)", label: "Name (EN)", labelKm: "Name (Khmer)", number: "Number", office: "Zoo office phone",
        sound: "Sound", soundOn: "Alert sounds on", volume: "Volume (%)", every: "Repeat the SOS siren every (seconds)", chTasks: "Chime for new tasks", chNotices: "Chime for new notices", chMgr: "Chime managers for new supply requests / problems",
        numbers: "Other numbers", kudos: "Thanks per person per day", leave: "Default leave for new staff (times/year)", handover: "Handover notes count as “new” for (hours)", tasks: "Keep done tasks visible for (days)", lost: "Flag lost items older than (days)",
        apply: (n: number, q: number) => `Give ${q} to the ${n} staff still on the old default`,
        supplies: "Supply quick picks", supHint: "One item per line: English | ខ្មែរ", save: "Save settings", saving: "Saving…",
      };
  const phones = [...s.phones, ...Array.from({ length: Math.max(0, 6 - s.phones.length) }, () => ({ label: "", label_km: "", number: "" }))].slice(0, 6);
  const Card = ({ Icon, title, children }: { Icon: typeof Phone; title: string; children: React.ReactNode }) => (
    <section className="card p-5">
      <h3 className="mb-4 flex items-center gap-2 font-display text-lg font-extrabold text-forest">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-light-green text-primary"><Icon size={18} /></span> {title}
      </h3>
      {children}
    </section>
  );
  const check = (name: keyof StaffSettings, text: string) => (
    <label className="flex cursor-pointer items-center gap-2.5 rounded-xl bg-cream/60 px-3 py-2.5 text-sm font-semibold text-ink/75">
      <input type="checkbox" name={name} defaultChecked={Boolean(s[name])} className="h-4 w-4 accent-[#176B3A]" /> {text}
    </label>
  );
  const n = (name: keyof StaffSettings, text: string, min: number, max: number) => (
    <label className="block">
      <span className={lbl}>{text}</span>
      <input name={name} type="number" min={min} max={max} defaultValue={String(s[name])} className={input} />
    </label>
  );

  return (
    <div className="space-y-4">
      <form action={saveStaffSettings} className="grid items-start gap-4 lg:grid-cols-2">
        <Card Icon={Phone} title={L.phones}>
          <div className="space-y-2">
            <div className="hidden grid-cols-[1fr_1fr_8rem] gap-2 sm:grid">
              <span className={lbl}>{L.label}</span><span className={lbl}>{L.labelKm}</span><span className={lbl}>{L.number}</span>
            </div>
            {phones.map((p, i) => (
              <div key={i} className="grid grid-cols-2 gap-2 sm:grid-cols-[1fr_1fr_8rem]">
                <input name={`ph_label_${i}`} defaultValue={p.label} placeholder={L.label} className={input} />
                <input name={`ph_km_${i}`} defaultValue={p.label_km} placeholder={L.labelKm} className={input} />
                <input name={`ph_num_${i}`} defaultValue={p.number} placeholder="117" inputMode="tel" className={`${input} col-span-2 font-mono font-bold sm:col-span-1`} />
              </div>
            ))}
            <label className="mt-3 block">
              <span className={lbl}>{L.office}</span>
              <input name="office_phone" defaultValue={s.office_phone} placeholder="012 345 678" inputMode="tel" className={`${input} font-mono font-bold`} />
            </label>
          </div>
        </Card>

        <Card Icon={Volume2} title={L.sound}>
          <div className="space-y-2">
            {check("sound_enabled", L.soundOn)}
            {check("chime_tasks", L.chTasks)}
            {check("chime_notices", L.chNotices)}
            {check("chime_manager", L.chMgr)}
            <div className="grid grid-cols-2 gap-3 pt-2">
              {n("sound_volume", L.volume, 0, 100)}
              {n("siren_every", L.every, 1, 30)}
            </div>
            <div className="pt-2"><SoundTest km={km} volume={s.sound_volume} /></div>
          </div>
        </Card>

        <Card Icon={SlidersHorizontal} title={L.numbers}>
          <div className="grid gap-3 sm:grid-cols-2">
            {n("default_leave_quota", L.leave, 0, 365)}
            {n("handover_new_hours", L.handover, 1, 168)}
            {n("task_keep_days", L.tasks, 1, 60)}
            {n("lost_old_days", L.lost, 1, 365)}
          </div>
        </Card>

        <Card Icon={Package} title={L.supplies}>
          <p className="-mt-2 mb-3 text-xs text-ink/50">{L.supHint}</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {(Object.keys(SUPPLY_SECTIONS) as Section[]).map((k) => (
              <label key={k} className="block">
                <span className={lbl}>{km ? SUPPLY_SECTIONS[k].km : SUPPLY_SECTIONS[k].en}</span>
                <textarea name={`sup_${k}`} rows={5} defaultValue={s.supplies[k]} className={`${input} resize-y font-mono text-xs leading-relaxed`} />
              </label>
            ))}
          </div>
        </Card>

        <div className="sticky bottom-4 z-10 flex justify-end lg:col-span-2">
          <SubmitButton label={L.save} pendingLabel={L.saving} className="shadow-lift" />
        </div>
      </form>

      {usingDefault > 0 && (
        <form action={applyLeaveQuotaToAll.bind(null, 12, s.default_leave_quota)} className="card flex flex-wrap items-center gap-3 p-4">
          <Bell size={18} className="text-amber-500" />
          <span className="flex-1 text-sm text-ink/65">{L.apply(usingDefault, s.default_leave_quota)}</span>
          <button className="inline-flex items-center gap-1.5 rounded-full bg-forest px-4 py-2 text-sm font-bold text-white"><RefreshCw size={14} /> OK</button>
        </form>
      )}
    </div>
  );
}
