import { Siren, CheckCircle2, MapPin, Phone } from "lucide-react";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { staffTitle } from "@/lib/server/staff";
import { getI18n } from "@/lib/i18n/server";
import { StaffShell } from "@/components/staff/StaffShell";
import { SosForm } from "@/components/staff/StaffExtraForms";
import { SOS_KINDS, type SosKind } from "@/lib/staff-extras";
import { getStaffSettings } from "@/lib/server/staff-settings";
import { SoundTest } from "@/components/staff/SoundTest";

export const dynamic = "force-dynamic";
export const generateMetadata = () => staffTitle("SOS", "SOS បន្ទាន់");

/** An emergency button: managers see the alert at once on every staff page. */
export default async function SosPage() {
  const { locale } = getI18n();
  const km = locale === "km";
  const db = createServiceRoleClient();
  const [settings, { data: recent }, { data: staff }] = await Promise.all([
    getStaffSettings(),
    db.from("staff_alerts").select("*").eq("status", "resolved").order("created_at", { ascending: false }).limit(8),
    db.from("staff_members").select("user_id, full_name"),
  ]);
  const nameOf = new Map((staff ?? []).map((s: any) => [s.user_id, s.full_name]));
  const when = (iso: string) => new Intl.DateTimeFormat(km ? "km-KH" : "en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Phnom_Penh", numberingSystem: "latn" }).format(new Date(iso));
  const L = km
    ? { title: "SOS បន្ទាន់", sub: "ប្រើតែពេលមានគ្រោះថ្នាក់ពិតប្រាកដ។ អ្នកគ្រប់គ្រងទាំងអស់នឹងឃើញភ្លាមៗលើគ្រប់ទំព័រ។", call: "លេខទូរស័ព្ទបន្ទាន់", police: "ប៉ូលីស", ambulance: "សង្គ្រោះបន្ទាន់", fire: "ពន្លត់អគ្គិភ័យ", past: "SOS ដែលបានដោះស្រាយរួច", none: "មិនទាន់មានទេ។" }
    : { title: "SOS emergency", sub: "Only for a real emergency. Every manager sees it at once on every staff page.", call: "Emergency numbers", police: "Police", ambulance: "Ambulance", fire: "Fire", past: "Resolved alerts", none: "None yet." };
  const phones = settings.phones.map((p) => ({ n: p.number, k: km ? p.label_km || p.label : p.label }));
  if (settings.office_phone) phones.unshift({ n: settings.office_phone, k: km ? "ការិយាល័យសួនសត្វ" : "Zoo office" });

  return (
    <StaffShell title={L.title} subtitle={L.sub}>
      <div className="grid items-start gap-5 lg:grid-cols-[1.3fr_1fr]">
        <section className="card overflow-hidden p-0">
          <div className="flex items-center gap-3 bg-gradient-to-r from-red-500 to-red-700 p-5 text-white">
            <span className="relative flex h-14 w-14 items-center justify-center">
              <span className="absolute inset-0 animate-ping rounded-full bg-white/30" />
              <span className="relative flex h-14 w-14 items-center justify-center rounded-full bg-white/20"><Siren size={28} /></span>
            </span>
            <p className="font-display text-2xl font-extrabold">SOS</p>
          </div>
          <div className="p-5 md:p-6">
            <SosForm km={km} />
          </div>
        </section>
        <div className="space-y-5">
          <section className="card p-5">
            <h2 className="mb-3 flex items-center gap-2 font-display text-lg font-extrabold text-forest"><Phone size={18} className="text-red-600" /> {L.call}</h2>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {phones.map((p) => (
                <a key={p.n} href={`tel:${p.n}`} className="flex flex-col items-center rounded-2xl bg-red-50 p-3 text-red-700 ring-1 ring-red-100 transition hover:-translate-y-0.5 hover:bg-red-100">
                  <span className="font-display text-2xl font-extrabold">{p.n}</span>
                  <span className="text-[11px] font-bold">{p.k}</span>
                </a>
              ))}
            </div>
          </section>
          <section className="card p-5">
            <SoundTest km={km} volume={settings.sound_volume} />
          </section>
          <section>
            <h2 className="mb-3 font-display text-lg font-extrabold text-forest">{L.past}</h2>
            <div className="space-y-2">
              {(recent ?? []).length === 0 && <p className="card p-5 text-center text-sm text-ink/55">{L.none}</p>}
              {(recent ?? []).map((a: any) => {
                const S = SOS_KINDS[a.kind as SosKind] ?? SOS_KINDS.other;
                return (
                  <div key={a.id} className="card flex items-center gap-3 p-3">
                    <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl text-white" style={{ background: S.color }}><S.Icon size={18} /></span>
                    <div className="min-w-0 flex-1 text-sm">
                      <p className="font-bold text-forest">{km ? S.km : S.en}</p>
                      <p className="truncate text-xs text-ink/50">{a.place && <><MapPin size={11} className="-mt-0.5 inline" /> {a.place} · </>}{nameOf.get(a.user_id) ?? "Admin"} · {when(a.created_at)}</p>
                    </div>
                    <CheckCircle2 size={18} className="flex-shrink-0 text-emerald-500" />
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      </div>
    </StaffShell>
  );
}
