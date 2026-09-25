import Link from "next/link";
import { Utensils, Stethoscope, Sparkles, Brush, StickyNote } from "lucide-react";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { getI18n } from "@/lib/i18n/server";
import { SubmitButton } from "@/components/admin/ui-client";
import { addCareLog } from "../actions";
import { StaffShell } from "@/components/staff/StaffShell";

export const dynamic = "force-dynamic";

const KIND = {
  feeding: { icon: Utensils, en: "Feeding", km: "ឲ្យចំណី", color: "#D97706" },
  health: { icon: Stethoscope, en: "Health", km: "សុខភាព", color: "#DC2626" },
  cleaning: { icon: Brush, en: "Cleaning", km: "សម្អាត", color: "#0284C7" },
  enrichment: { icon: Sparkles, en: "Enrichment", km: "លេងកម្សាន្ត", color: "#7C3AED" },
  note: { icon: StickyNote, en: "Note", km: "កំណត់ចំណាំ", color: "#475569" },
} as const;

/** Keepers and vets write what they did for an animal; the latest notes show for everyone on the team. */
export default async function AnimalCarePage({ searchParams }: { searchParams: { a?: string } }) {
  const { locale } = getI18n();
  const km = locale === "km";
  const db = createServiceRoleClient();
  const [{ data: animals }, { data: logs }] = await Promise.all([
    db.from("animals").select("id, name, khmer_name, animal_code, main_image_url").eq("status", "active").order("name"),
    db.from("animal_care_logs").select("id, kind, note, created_at, user_id, animal:animals(name, khmer_name, animal_code, main_image_url)").order("created_at", { ascending: false }).limit(40),
  ]);
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
    </StaffShell>
  );
}
