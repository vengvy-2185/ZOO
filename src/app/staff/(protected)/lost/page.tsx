import { Search, PackageCheck, Archive, MapPin, Clock } from "lucide-react";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { staffTitle } from "@/lib/server/staff";
import { getI18n } from "@/lib/i18n/server";
import { StaffShell } from "@/components/staff/StaffShell";
import { LostForm } from "@/components/staff/StaffExtraForms";
import { LOST_CATS, type LostCat } from "@/lib/staff-extras";
import { getStaffSettings } from "@/lib/server/staff-settings";
import { returnLostItem } from "../actions";
import { cn } from "@/lib/utils/cn";

export const dynamic = "force-dynamic";
export const generateMetadata = () => staffTitle("Lost & found", "របស់បាត់");

/** Every staff member can log something a visitor lost, and hand it back with the owner's name. */
export default async function LostPage({ searchParams }: { searchParams: { q?: string; s?: string } }) {
  const { locale } = getI18n();
  const km = locale === "km";
  const tab = searchParams.s === "returned" ? "returned" : "held";
  const q = (searchParams.q ?? "").trim().slice(0, 60);
  const db = createServiceRoleClient();
  let query = db.from("lost_found").select("*").eq("status", tab).order("created_at", { ascending: false }).limit(100);
  if (q) query = query.or(`item.ilike.%${q.replace(/[%,()]/g, "")}%,place.ilike.%${q.replace(/[%,()]/g, "")}%,description.ilike.%${q.replace(/[%,()]/g, "")}%`);
  const [settings, { data }, { count: held }, { count: returned }, { data: staff }] = await Promise.all([
    getStaffSettings(),
    query,
    db.from("lost_found").select("id", { count: "exact", head: true }).eq("status", "held"),
    db.from("lost_found").select("id", { count: "exact", head: true }).eq("status", "returned"),
    db.from("staff_members").select("user_id, full_name"),
  ]);
  const nameOf = new Map((staff ?? []).map((s: any) => [s.user_id, s.full_name]));
  const when = (iso: string) => new Intl.DateTimeFormat(km ? "km-KH" : "en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Phnom_Penh", numberingSystem: "latn" }).format(new Date(iso));
  const days = (iso: string) => Math.floor((Date.now() - Date.parse(iso)) / 864e5);
  const L = km
    ? { title: "របស់បាត់ និងរកឃើញ", sub: "កត់ត្រារបស់ដែលភ្ញៀវភ្លេចទុក ហើយប្រគល់ជូនម្ចាស់វិញ។", add: "រកឃើញរបស់", held: "កំពុងរក្សាទុក", returned: "បានប្រគល់", search: "ស្វែងរក (ឧ. ទូរស័ព្ទ សោ)…", none: "គ្មានរបស់ទេ។", found: "រកឃើញដោយ", give: "ប្រគល់ជូនម្ចាស់", owner: "ឈ្មោះម្ចាស់", contact: "លេខទូរស័ព្ទ", confirm: "បញ្ជាក់ការប្រគល់", to: "ប្រគល់ឲ្យ", daysAgo: (n: number) => (n ? `${n} ថ្ងៃមុន` : "ថ្ងៃនេះ") }
    : { title: "Lost & found", sub: "Log what visitors leave behind, and hand it back to the owner.", add: "Found something", held: "Being kept", returned: "Returned", search: "Search (e.g. phone, keys)…", none: "Nothing here.", found: "Found by", give: "Give back to owner", owner: "Owner's name", contact: "Phone", confirm: "Confirm hand-back", to: "Given to", daysAgo: (n: number) => (n ? `${n} days ago` : "today") };

  return (
    <StaffShell title={L.title} subtitle={L.sub} hero={<p className="mt-3 inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-1.5 text-sm font-bold ring-1 ring-white/20"><Archive size={15} /> {held ?? 0} {L.held}</p>}>
      <div className="grid items-start gap-5 lg:grid-cols-[1fr_1.2fr]">
        <section className="card p-5 md:p-6">
          <h2 className="mb-4 font-display text-xl font-extrabold text-forest">{L.add}</h2>
          <LostForm km={km} />
        </section>
        <section className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            {(["held", "returned"] as const).map((s) => (
              <a key={s} href={`/staff/lost?s=${s}`} className={cn("rounded-full px-4 py-2 text-sm font-bold shadow-soft", tab === s ? "bg-[#1D4ED8] text-white" : "bg-white text-[#1E3A8A]")}>
                {s === "held" ? L.held : L.returned} <span className="opacity-70">{s === "held" ? held ?? 0 : returned ?? 0}</span>
              </a>
            ))}
            <form action="/staff/lost" className="relative min-w-[12rem] flex-1">
              <input type="hidden" name="s" value={tab} />
              <Search size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink/35" />
              <input name="q" defaultValue={q} placeholder={L.search} className="w-full rounded-full border border-black/10 bg-white py-2 pl-10 pr-3 text-sm outline-none focus:border-[#2563EB]" />
            </form>
          </div>
          {(data ?? []).length === 0 && <div className="card flex flex-col items-center gap-2 p-8 text-center text-sm text-ink/55"><PackageCheck size={36} className="text-[#93C5FD]" /> {L.none}</div>}
          {(data ?? []).map((r: any, i: number) => {
            const C = LOST_CATS[r.category as LostCat] ?? LOST_CATS.other;
            return (
              <div key={r.id} className={cn("card animate-[gwzPop_.4s_ease-out_both] p-4", r.category === "child" && r.status === "held" && "ring-2 ring-red-300")} style={{ animationDelay: `${Math.min(i, 8) * 50}ms` }}>
                <div className="flex items-start gap-3">
                  <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl text-white shadow-sm" style={{ background: C.color }}><C.Icon size={22} /></span>
                  <div className="min-w-0 flex-1">
                    <p className="font-display text-lg font-extrabold text-forest">{r.item}</p>
                    {r.description && <p className="text-sm text-ink/60">{r.description}</p>}
                    <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink/50">
                      <span className="inline-flex items-center gap-1"><MapPin size={12} /> {r.place}</span>
                      <span className="inline-flex items-center gap-1"><Clock size={12} /> {when(r.created_at)} · {L.daysAgo(days(r.created_at))}</span>
                      <span>{L.found} {nameOf.get(r.found_by) ?? "Admin"}</span>
                      {r.status === "held" && days(r.created_at) >= settings.lost_old_days && <span className="rounded-full bg-amber-100 px-2 py-0.5 font-bold text-amber-800">{km ? "យូរហើយ" : "Waiting long"}</span>}
                      {settings.office_phone && r.status === "held" && <a href={`tel:${settings.office_phone}`} className="font-bold text-[#1D4ED8]">📞 {settings.office_phone}</a>}
                    </p>
                    {r.status === "returned" && (
                      <p className="mt-2 inline-flex items-center gap-1.5 rounded-xl bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700"><PackageCheck size={13} /> {L.to} {r.owner_name}{r.owner_contact && ` · ${r.owner_contact}`} · {when(r.returned_at)}</p>
                    )}
                  </div>
                </div>
                {r.status === "held" && (
                  <details className="group mt-3">
                    <summary className="inline-flex cursor-pointer list-none items-center gap-1.5 rounded-full bg-emerald-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-emerald-700"><PackageCheck size={14} /> {L.give}</summary>
                    <form action={returnLostItem.bind(null, r.id)} className="mt-3 grid animate-[gwzPop_.3s_ease-out_both] gap-2 sm:grid-cols-[1fr_1fr_auto]">
                      <input name="owner_name" required maxLength={80} placeholder={L.owner} className="rounded-xl border border-black/10 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500" />
                      <input name="owner_contact" maxLength={80} placeholder={L.contact} inputMode="tel" className="rounded-xl border border-black/10 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500" />
                      <button className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white">{L.confirm}</button>
                    </form>
                  </details>
                )}
              </div>
            );
          })}
        </section>
      </div>
    </StaffShell>
  );
}
