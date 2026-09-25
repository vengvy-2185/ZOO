import Link from "next/link";
import { CheckCircle2, Circle, MapPin, Timer } from "lucide-react";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { getI18n } from "@/lib/i18n/server";
import { zooToday } from "@/lib/data/gate";
import { todaysEvents } from "@/lib/data/events";
import { StaffShell } from "@/components/staff/StaffShell";
import { cn } from "@/lib/utils/cn";
import { toggleTask } from "../actions";

export const dynamic = "force-dynamic";

/** Guides: today's shows and talks in order, what's on now, and a tick when each one is done. */
export default async function SchedulePage() {
  const { locale } = getI18n();
  const km = locale === "km";
  const events = todaysEvents();
  const { data: ticks } = await createServiceRoleClient().from("staff_task_checks").select("ref").eq("kind", "event").eq("check_date", zooToday());
  const done = new Set((ticks ?? []).map((t: any) => t.ref));
  const L = km
    ? { title: "កម្មវិធីថ្ងៃនេះ", sub: "កម្មវិធីសម្តែង និងការផ្តល់ចំណី តាមលំដាប់ម៉ោង។ ចុចធីកពេលធ្វើរួច។", now: "កំពុងដំណើរការ", next: "បន្ទាប់", in: (m: number) => `ក្នុង ${m} នាទី`, min: "នាទី", done: "រួចរាល់", mark: "ចុចពេលរួច", progress: "បានធ្វើរួច", animal: "មើលសត្វ" }
    : { title: "Today's programme", sub: "Shows and feedings in time order. Tick each one when it's done.", now: "On now", next: "Next", in: (m: number) => `in ${m} min`, min: "min", done: "Done", mark: "Tick when done", progress: "Done today", animal: "See animal" };
  const finished = events.filter((e) => done.has(e.id)).length;

  return (
    <StaffShell
      title={L.title}
      subtitle={L.sub}
      hero={
        <div className="mt-4 max-w-sm">
          <p className="text-sm font-bold text-white/85">{L.progress}: {finished} / {events.length}</p>
          <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-white/20"><div className="h-full rounded-full bg-white" style={{ width: `${events.length ? (finished / events.length) * 100 : 0}%` }} /></div>
        </div>
      }
    >
      <ol className="space-y-3">
        {events.map((e) => {
          const ticked = done.has(e.id);
          return (
            <li key={e.id} className={cn("card flex items-stretch gap-3 overflow-hidden p-0", e.status === "now" && "ring-2 ring-[#2563EB]", ticked && "opacity-70")}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={e.image} alt="" className="w-20 flex-shrink-0 object-cover sm:w-28" />
              <div className="min-w-0 flex-1 py-3">
                <p className="flex flex-wrap items-center gap-2">
                  <span className="font-display text-lg font-extrabold text-[#1E3A8A]">{e.start}</span>
                  {e.status === "now" && <span className="rounded-full bg-[#1D4ED8] px-2 py-0.5 text-[11px] font-bold text-white">{L.now}</span>}
                  {e.status === "next" && <span className="rounded-full bg-[#EEF2FF] px-2 py-0.5 text-[11px] font-bold text-[#1E3A8A]">{L.next} · {L.in(e.startsInMin)}</span>}
                </p>
                <p className="truncate font-bold text-forest">{km ? e.title_km : e.title}</p>
                <p className="mt-0.5 flex flex-wrap items-center gap-x-3 text-xs text-ink/55">
                  <span className="inline-flex items-center gap-1"><MapPin size={12} /> {km ? e.place_km : e.place}</span>
                  <span className="inline-flex items-center gap-1"><Timer size={12} /> {e.minutes} {L.min}</span>
                  {e.animalCode && <Link href={`/animals/${e.animalCode}`} className="font-bold text-[#1D4ED8] hover:underline">{L.animal}</Link>}
                </p>
              </div>
              <form action={toggleTask.bind(null, "event", e.id)} className="flex items-center pr-3">
                <button className={cn("flex h-12 w-12 items-center justify-center rounded-2xl transition", ticked ? "bg-[#1D4ED8] text-white" : "bg-[#EEF2FF] text-[#93C5FD] hover:text-[#1D4ED8]")} title={ticked ? L.done : L.mark}>
                  {ticked ? <CheckCircle2 size={24} /> : <Circle size={24} />}
                </button>
              </form>
            </li>
          );
        })}
      </ol>
    </StaffShell>
  );
}
