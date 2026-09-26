import { CheckCircle2, Circle, MapPin, Timer, Users, Save } from "lucide-react";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { getI18n } from "@/lib/i18n/server";
import { zooToday } from "@/lib/data/gate";
import { todaysEvents } from "@/lib/data/events";
import { StaffShell } from "@/components/staff/StaffShell";
import { cn } from "@/lib/utils/cn";
import { toggleTask, saveEventCount } from "../actions";

import { staffTitle } from "@/lib/server/staff";
export const dynamic = "force-dynamic";

/** Guides: today's shows and talks in order, what's on now, and a tick when each one is done. */
export const generateMetadata = () => staffTitle("Today's programme", "កម្មវិធីថ្ងៃនេះ");

export default async function SchedulePage() {
  const { locale } = getI18n();
  const km = locale === "km";
  const events = todaysEvents();
  const { data: ticks } = await createServiceRoleClient().from("staff_task_checks").select("ref").eq("kind", "event").eq("check_date", zooToday());
  const done = new Set((ticks ?? []).map((t: any) => t.ref));
  // guides write how many visitors came to each show
  const { data: countRows } = await createServiceRoleClient().from("staff_event_counts").select("ref, visitors").eq("day", zooToday());
  const counts = new Map((countRows ?? []).map((c: any) => [c.ref, c.visitors as number]));
  const audience = [...counts.values()].reduce((a, b) => a + b, 0);
  // facts a guide can tell visitors about each show's animal (shown in place, no leaving the page)
  const codes = events.map((e) => e.animalCode).filter(Boolean) as string[];
  const { data: animals } = codes.length ? await createServiceRoleClient().from("animals").select("animal_code, name, khmer_name, interesting_facts, interesting_facts_km, favorite_food, favorite_food_km, species:species(common_name, khmer_name, conservation_status, conservation_status_km)").in("animal_code", codes) : { data: [] as any[] };
  const byCode = new Map((animals ?? []).map((a: any) => [a.animal_code, a]));
  const L = km
    ? { title: "កម្មវិធីថ្ងៃនេះ", sub: "កម្មវិធីសម្តែង និងការផ្តល់ចំណី តាមលំដាប់ម៉ោង។ ចុចធីកពេលធ្វើរួច។", now: "កំពុងដំណើរការ", next: "បន្ទាប់", in: (m: number) => `ក្នុង ${m} នាទី`, min: "នាទី", done: "រួចរាល់", mark: "ចុចពេលរួច", progress: "បានធ្វើរួច", left: "នៅសល់", audience: "ភ្ញៀវចូលរួមថ្ងៃនេះ", heads: "ភ្ញៀវ", save: "រក្សាទុក", animal: "រឿងសម្រាប់ប្រាប់ភ្ញៀវ" }
    : { title: "Today's programme", sub: "Shows and feedings in time order. Tick each one when it's done.", now: "On now", next: "Next", in: (m: number) => `in ${m} min`, min: "min", done: "Done", mark: "Tick when done", progress: "Done today", left: "Still to do", audience: "Visitors at shows today", heads: "visitors", save: "Save", animal: "Facts to tell visitors" };
  const finished = events.filter((e) => done.has(e.id)).length;
  const nextEv = events.find((e) => e.status === "now") ?? events.find((e) => e.status === "next");

  return (
    <StaffShell
      title={L.title}
      subtitle={L.sub}
    >
      {/* summary: done / left / what's next */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { k: L.progress, v: `${finished}/${events.length}`, c: "from-[#1E3A8A] to-[#3B82F6] text-white", sub: "text-white/80" },
          { k: L.left, v: String(events.length - finished), c: "from-amber-50 to-orange-100 text-amber-700", sub: "text-ink/55" },
          { k: L.audience, v: String(audience), c: "from-violet-50 to-fuchsia-100 text-violet-700", sub: "text-ink/55" },
          { k: nextEv ? `${L.next} · ${nextEv.start}` : L.next, v: nextEv ? (nextEv.status === "now" ? L.now : L.in(nextEv.startsInMin)) : "—", c: "from-emerald-50 to-emerald-100 text-emerald-700", sub: "text-ink/55" },
        ].map((t) => (
          <div key={t.k} className={`rounded-3xl bg-gradient-to-br p-4 shadow-soft ring-1 ring-black/5 ${t.c}`}>
            <p className="truncate font-display text-xl font-extrabold leading-tight sm:text-2xl">{t.v}</p>
            <p className={`mt-1 truncate text-[11px] font-bold sm:text-xs ${t.sub}`}>{t.k}</p>
          </div>
        ))}
      </div>

      {/* timeline */}
      <ol className="relative space-y-3 pl-[4.25rem] sm:pl-24">
        <span className="absolute bottom-4 left-[1.9rem] top-4 w-0.5 rounded-full bg-gradient-to-b from-[#93C5FD] to-[#E0E7FF] sm:left-[2.9rem]" aria-hidden />
        {events.map((e) => {
          const ticked = done.has(e.id);
          const now = e.status === "now";
          return (
            <li key={e.id} className="relative">
              {/* time + dot on the line */}
              <div className="absolute -left-[4.25rem] top-4 flex w-[3.75rem] flex-col items-center sm:-left-24 sm:w-[5.75rem]">
                <span className={cn("rounded-full px-2 py-1 font-display text-xs font-extrabold sm:text-sm", ticked ? "bg-emerald-500 text-white" : now ? "bg-[#1D4ED8] text-white shadow-lift" : "bg-white text-[#1E3A8A] shadow-soft ring-1 ring-black/5")}>{e.start}</span>
              </div>
              <div className={cn("flex items-stretch gap-3 overflow-hidden rounded-3xl bg-white shadow-soft ring-1 transition", now ? "ring-2 ring-[#2563EB] shadow-lift" : ticked ? "ring-emerald-200" : "ring-black/5")}>
                <div className="relative w-20 flex-shrink-0 sm:w-28">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={e.image} alt="" className={cn("h-full w-full object-cover", ticked && "grayscale-[60%]")} />
                  {ticked && <span className="absolute inset-0 flex items-center justify-center bg-emerald-600/35"><CheckCircle2 size={30} className="text-white drop-shadow" /></span>}
                </div>
                <div className="min-w-0 flex-1 py-3">
                  <p className="flex flex-wrap items-center gap-1.5">
                    {now && <span className="inline-flex items-center gap-1 rounded-full bg-[#1D4ED8] px-2 py-0.5 text-[11px] font-bold text-white"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" /> {L.now}</span>}
                    {e.status === "next" && <span className="rounded-full bg-[#EEF2FF] px-2 py-0.5 text-[11px] font-bold text-[#1E3A8A]">{L.next} · {L.in(e.startsInMin)}</span>}
                    {ticked && <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700">{L.done}</span>}
                  </p>
                  <p className={cn("mt-0.5 truncate font-bold", ticked ? "text-ink/45 line-through decoration-emerald-400" : "text-forest")}>{km ? e.title_km : e.title}</p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-x-3 text-xs text-ink/55">
                    <span className="inline-flex items-center gap-1"><MapPin size={12} /> {km ? e.place_km : e.place}</span>
                    <span className="inline-flex items-center gap-1"><Timer size={12} /> {e.minutes} {L.min}</span>
                  </p>
                  {/* how many came (guides fill this in after the show) */}
                  {(ticked || e.status === "now" || counts.has(e.id)) && (
                    <form action={saveEventCount.bind(null, e.id)} className="mt-2 inline-flex items-center gap-1 rounded-full bg-violet-50 p-1 pl-3 ring-1 ring-violet-100">
                      <Users size={14} className="text-violet-600" />
                      <input name="visitors" type="number" min={0} max={5000} defaultValue={counts.get(e.id) ?? ""} placeholder="0" className="w-14 bg-transparent text-center text-sm font-extrabold text-violet-800 outline-none" aria-label={L.heads} />
                      <span className="text-[11px] font-bold text-violet-600">{L.heads}</span>
                      <button title={L.save} className="ml-1 flex h-7 w-7 items-center justify-center rounded-full bg-violet-600 text-white transition hover:bg-violet-700 active:scale-95"><Save size={13} /></button>
                    </form>
                  )}
                  {e.animalCode && byCode.get(e.animalCode) && (() => {
                    const a: any = byCode.get(e.animalCode!);
                    return (
                      <details className="group mt-1.5">
                        <summary className="inline-flex cursor-pointer list-none items-center gap-1 rounded-full bg-[#EEF2FF] px-2.5 py-1 text-[11px] font-bold text-[#1D4ED8]">{L.animal}</summary>
                        <div className="mt-2 space-y-1 rounded-xl bg-[#F8FAFF] p-2.5 text-xs text-ink/70 ring-1 ring-[#2563EB]/10">
                          <p className="font-bold text-[#1E3A8A]">{(km && a.khmer_name) || a.name} · {(km && a.species?.khmer_name) || a.species?.common_name}</p>
                          {(km ? a.interesting_facts_km : a.interesting_facts) && <p>💡 {km ? a.interesting_facts_km : a.interesting_facts}</p>}
                          {(km ? a.favorite_food_km : a.favorite_food) && <p>🍽️ {km ? a.favorite_food_km : a.favorite_food}</p>}
                          {a.species?.conservation_status && <p>🛡️ {(km && a.species.conservation_status_km) || a.species.conservation_status}</p>}
                        </div>
                      </details>
                    );
                  })()}
                </div>
                <form action={toggleTask.bind(null, "event", e.id)} className="flex items-center pr-3">
                  <button className={cn("flex h-12 w-12 items-center justify-center rounded-2xl transition", ticked ? "bg-emerald-500 text-white shadow-soft" : "bg-[#EEF2FF] text-[#93C5FD] hover:bg-[#DBEAFE] hover:text-[#1D4ED8]")} title={ticked ? L.done : L.mark}>
                    {ticked ? <CheckCircle2 size={24} /> : <Circle size={24} />}
                  </button>
                </form>
              </div>
            </li>
          );
        })}
      </ol>
    </StaffShell>
  );
}
