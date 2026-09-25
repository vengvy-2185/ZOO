import Link from "next/link";
import { Utensils, Stethoscope, Sparkles, Brush, StickyNote } from "lucide-react";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { getI18n } from "@/lib/i18n/server";
import { SubmitButton } from "@/components/admin/ui-client";
import { addCareLog, markFed } from "../actions";
import { zooToday } from "@/lib/data/gate";
import { cn } from "@/lib/utils/cn";
import { Search, CheckCircle2, ClipboardList, LayoutGrid } from "lucide-react";
import { StaffShell } from "@/components/staff/StaffShell";

import { staffTitle } from "@/lib/server/staff";
export const dynamic = "force-dynamic";

const KIND = {
  feeding: { icon: Utensils, en: "Feeding", km: "ឲ្យចំណី", color: "#1D4ED8" },
  health: { icon: Stethoscope, en: "Health", km: "សុខភាព", color: "#1E3A8A" },
  cleaning: { icon: Brush, en: "Cleaning", km: "សម្អាត", color: "#2563EB" },
  enrichment: { icon: Sparkles, en: "Enrichment", km: "លេងកម្សាន្ត", color: "#3B82F6" },
  note: { icon: StickyNote, en: "Note", km: "កំណត់ចំណាំ", color: "#475569" },
} as const;

/** Keepers and vets write what they did for an animal; the latest notes show for everyone on the team. */
export const generateMetadata = () => staffTitle("Animal care", "ថែសត្វ");

export default async function AnimalCarePage({ searchParams }: { searchParams: { a?: string; tab?: string; q?: string } }) {
  const tab = searchParams.tab === "board" ? "board" : "log";
  const { locale } = getI18n();
  const km = locale === "km";
  const db = createServiceRoleClient();
  const [{ data: animals }, { data: logs }] = await Promise.all([
    db.from("animals").select("id, name, khmer_name, animal_code, main_image_url").eq("status", "active").order("name"),
    db.from("animal_care_logs").select("id, kind, note, created_at, user_id, animal:animals(name, khmer_name, animal_code, main_image_url)").order("created_at", { ascending: false }).limit(40),
  ]);
  // Board: when each animal was last fed today
  const { data: fedRows } = await db.from("animal_care_logs").select("animal_id, created_at").eq("kind", "feeding").gte("created_at", `${zooToday()}T00:00:00+07:00`).order("created_at", { ascending: false });
  const fedAt = new Map<string, string>();
  for (const r of fedRows ?? []) if (!fedAt.has(r.animal_id)) fedAt.set(r.animal_id, r.created_at);
  // health notes in the last 3 days: flagged on the board so vets and keepers keep an eye
  const { data: healthRows } = await db.from("animal_care_logs").select("animal_id, note, created_at").eq("kind", "health").gte("created_at", new Date(Date.now() - 3 * 864e5).toISOString()).order("created_at", { ascending: false });
  const health = new Map<string, string>();
  for (const r of healthRows ?? []) if (!health.has(r.animal_id)) health.set(r.animal_id, r.note);
  const q = (searchParams.q ?? "").trim().toLowerCase();
  const board = (animals ?? []).filter((a: any) => !q || a.name.toLowerCase().includes(q) || (a.khmer_name ?? "").includes(q) || a.animal_code.toLowerCase().includes(q)).sort((a: any, b: any) => Number(fedAt.has(a.id)) - Number(fedAt.has(b.id)));
  // who wrote each note (staff name; admins show as "Admin")
  const ids = [...new Set((logs ?? []).map((l: any) => l.user_id).filter(Boolean))];
  const { data: authors } = ids.length ? await db.from("staff_members").select("user_id, full_name").in("user_id", ids) : { data: [] as any[] };
  const authorOf = new Map((authors ?? []).map((a: any) => [a.user_id, a.full_name]));
  const L = km
    ? { title: "កំណត់ត្រាថែសត្វ", sub: "កត់ត្រាការឲ្យចំណី សុខភាព និងការសម្អាត។ ក្រុមការងារទាំងអស់មើលឃើញភ្លាមៗ។", animal: "សត្វ", kind: "ប្រភេទ", note: "អ្វីដែលបានធ្វើ ឬសង្កេតឃើញ", save: "រក្សាទុក", saving: "កំពុងរក្សាទុក…", latest: "កំណត់ត្រាចុងក្រោយ", none: "មិនទាន់មានកំណត់ត្រាទេ។", back: "ត្រឡប់ក្រោយ" }
    : { title: "Animal care log", sub: "Write down feeding, health checks and cleaning. The whole team sees it straight away.", animal: "Animal", kind: "Type", note: "What you did or noticed", save: "Save", saving: "Saving…", latest: "Latest notes", none: "No notes yet.", back: "Back" };
  const when = (iso: string) => new Intl.DateTimeFormat(km ? "km-KH" : "en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Phnom_Penh", numberingSystem: "latn" }).format(new Date(iso));
  const field = "w-full rounded-2xl border border-black/10 bg-white px-4 py-2.5 text-sm text-ink outline-none focus:border-primary";

  return (
    <StaffShell active="animals" title={L.title} subtitle={L.sub}>
      <div className="flex gap-2">
        {[
          ["log", ClipboardList, km ? "កំណត់ត្រា" : "Care log"],
          ["board", LayoutGrid, km ? `ផ្ទាំងចំណី (${fedAt.size}/${(animals ?? []).length})` : `Feeding board (${fedAt.size}/${(animals ?? []).length})`],
        ].map(([k, Icon, label]: any) => (
          <Link key={k} href={`/staff/animals?tab=${k}`} className={cn("inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-bold shadow-soft", tab === k ? "bg-[#1D4ED8] text-white" : "bg-white text-[#1E3A8A]")}>
            <Icon size={15} /> {label}
          </Link>
        ))}
      </div>

      {tab === "board" ? (
        <>
          <form className="relative" action="/staff/animals">
            <input type="hidden" name="tab" value="board" />
            <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink/35" />
            <input name="q" defaultValue={searchParams.q} placeholder={km ? "ស្វែងរកសត្វ…" : "Find an animal…"} className="w-full rounded-2xl border border-black/10 bg-white py-3 pl-11 pr-4 text-sm text-ink shadow-soft outline-none focus:border-[#2563EB]" />
          </form>
          <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {board.map((a: any) => {
              const at = fedAt.get(a.id);
              return (
                <div key={a.id} className={cn("card flex items-center gap-3 p-2.5", at && "bg-[#F8FAFF]")}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={a.main_image_url ?? "/icon.svg"} alt="" className="h-14 w-14 flex-shrink-0 rounded-2xl object-cover" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold text-forest">{(km && a.khmer_name) || a.name}</p>
                    {health.has(a.id) && <p className="truncate text-[11px] font-bold text-red-600" title={health.get(a.id)}>🩺 {km ? "តាមដានសុខភាព" : "Health watch"}: {health.get(a.id)}</p>}
                    <p className={cn("text-xs font-bold", at ? "text-[#1D4ED8]" : "text-red-500")}>
                      {at ? `${km ? "ឲ្យចំណីម៉ោង" : "Fed at"} ${when(at).split(", ").pop()}` : km ? "មិនទាន់ឲ្យចំណីថ្ងៃនេះ" : "Not fed today"}
                    </p>
                  </div>
                  <form action={markFed.bind(null, a.id)}>
                    <button className={cn("flex h-11 items-center gap-1 rounded-xl px-3 text-xs font-extrabold transition", at ? "bg-[#EEF2FF] text-[#1D4ED8]" : "bg-[#1D4ED8] text-white hover:bg-[#1E40AF]")}>
                      <CheckCircle2 size={15} /> {km ? "ឲ្យចំណី" : "Fed"}
                    </button>
                  </form>
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <>
        <form action={addCareLog} className="card space-y-3 p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-xs font-bold uppercase tracking-wider text-ink/50">{L.animal}</span>
              <select name="animal_id" required defaultValue={searchParams.a ?? ""} className={field}>
                <option value="" disabled>—</option>
                {(animals ?? []).map((a: any) => (
                  <option key={a.id} value={a.id}>{(km && a.khmer_name) || a.name} · {a.animal_code}</option>
                ))}
              </select>
            </label>
            <fieldset>
              <legend className="mb-1 block text-xs font-bold uppercase tracking-wider text-ink/50">{L.kind}</legend>
              <div className="flex flex-wrap gap-1.5">
                {(Object.keys(KIND) as (keyof typeof KIND)[]).map((k, i) => {
                  const K = KIND[k];
                  return (
                    <label key={k} className="cursor-pointer">
                      <input type="radio" name="kind" value={k} defaultChecked={i === 0} className="peer sr-only" />
                      <span className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-xs font-bold text-ink/60 ring-1 ring-black/10 peer-checked:text-white peer-checked:ring-0 peer-checked:[background:var(--c)]" style={{ ["--c" as any]: K.color }}>
                        <K.icon size={13} /> {km ? K.km : K.en}
                      </span>
                    </label>
                  );
                })}
              </div>
            </fieldset>
          </div>
          <textarea name="note" required maxLength={500} rows={3} placeholder={L.note} className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm text-ink outline-none focus:border-primary" />
          <div className="flex justify-end">
            <SubmitButton label={L.save} pendingLabel={L.saving} />
          </div>
        </form>

        <h2 className="mb-3 mt-2 font-display text-xl font-extrabold text-forest">{L.latest}</h2>
        {(logs ?? []).length === 0 ? (
          <p className="card p-5 text-sm text-ink/55">{L.none}</p>
        ) : (
          <ul className="space-y-2">
            {(logs ?? []).map((l: any) => {
              const K = KIND[l.kind as keyof typeof KIND] ?? KIND.note;
              return (
                <li key={l.id} className="card flex gap-3 p-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={l.animal?.main_image_url ?? "/icon.svg"} alt="" className="h-14 w-14 flex-shrink-0 rounded-2xl object-cover" />
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2 text-sm">
                      <span className="font-display font-extrabold text-forest">{(km && l.animal?.khmer_name) || l.animal?.name}</span>
                      <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold text-white" style={{ background: K.color }}><K.icon size={11} /> {km ? K.km : K.en}</span>
                    </p>
                    <p className="mt-0.5 text-sm text-ink/75">{l.note}</p>
                    <p className="mt-1 text-[11px] text-ink/45">{authorOf.get(l.user_id) ?? "Admin"} · {when(l.created_at)}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        </>
      )}
    </StaffShell>
  );
}
