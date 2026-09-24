"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { DoorOpen, Map as MapIcon, Clock, Sparkles, Check, Lightbulb } from "lucide-react";
import { useI18n } from "@/lib/i18n/client";
import { useFavourites } from "./Favorites";
import { cn } from "@/lib/utils/cn";

export type PlannerAnimal = { code: string; name: string; image: string | null; zone: string; zoneName: string; zoneColor: string };
export type PlannerEvent = { animalCode: string | null; start: string; title: string };

const STAY = 20; // minutes at each animal
const WALK_SAME_ZONE = 5;
const WALK_NEW_ZONE = 12;
const ZONE_ORDER = ["A", "B", "C", "D"]; // the loop from the main entrance

const toMin = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};
const toHHMM = (min: number) => `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;

/** Picks animals and builds a walking order (zone by zone) with times and show reminders. */
export function DayPlanner({ animals, events }: { animals: PlannerAnimal[]; events: PlannerEvent[] }) {
  const { locale, t } = useI18n();
  const p = t.planner;
  const km = locale === "km";
  const { favs } = useFavourites();
  const [picked, setPicked] = useState<string[] | null>(null);
  const [arrive, setArrive] = useState("09:00");

  // Start from the visitor's favourites the first time (or everything if they have none).
  useEffect(() => {
    if (picked !== null) return;
    const fromFavs = favs.filter((c) => animals.some((a) => a.code === c));
    if (fromFavs.length) setPicked(fromFavs);
  }, [favs, animals, picked]);
  const selected = picked ?? [];
  const toggle = (code: string) => setPicked((cur) => ((cur ?? []).includes(code) ? (cur ?? []).filter((c) => c !== code) : [...(cur ?? []), code]));

  const plan = useMemo(() => {
    const chosen = animals
      .filter((a) => selected.includes(a.code))
      .sort((a, b) => ZONE_ORDER.indexOf(a.zone) - ZONE_ORDER.indexOf(b.zone) || a.name.localeCompare(b.name));
    let clock = toMin(arrive) + 10; // from the gate to the first zone
    let lastZone = "";
    const stops = chosen.map((a) => {
      clock += lastZone ? (a.zone === lastZone ? WALK_SAME_ZONE : WALK_NEW_ZONE) : 0;
      const at = clock;
      lastZone = a.zone;
      clock += STAY;
      // A show for this animal that starts later today (we'll remind them).
      const show = events.find((e) => e.animalCode === a.code && toMin(e.start) >= at - 10);
      return { ...a, at, show };
    });
    const minutes = clock + 10 - toMin(arrive);
    return { stops, end: clock + 10, minutes };
  }, [animals, selected, arrive, events]);

  const hours = (() => {
    const h = Math.floor(plan.minutes / 60);
    const m = plan.minutes % 60;
    return km ? `${h > 0 ? `${h} ម៉ោង ` : ""}${m} នាទី` : `${h > 0 ? `${h} h ` : ""}${m} min`;
  })();

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
      {/* Choose animals */}
      <div className="min-w-0">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-xl font-bold text-forest">{p.pick}</h2>
          <div className="flex gap-2">
            <button onClick={() => setPicked(animals.map((a) => a.code))} className="rounded-full bg-light-green px-3 py-1.5 text-xs font-bold text-primary hover:bg-primary hover:text-white">
              {p.selectAll}
            </button>
            <button onClick={() => setPicked([])} className="rounded-full px-3 py-1.5 text-xs font-bold text-ink/50 hover:bg-black/5">
              {p.clear}
            </button>
          </div>
        </div>
        {favs.length > 0 && picked !== null && <p className="mb-3 text-xs text-ink/50">{p.fromFavourites}</p>}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {animals.map((a) => {
            const on = selected.includes(a.code);
            return (
              <button
                key={a.code}
                onClick={() => toggle(a.code)}
                aria-pressed={on}
                className={cn("group relative overflow-hidden rounded-3xl bg-white text-left shadow-soft ring-2 transition", on ? "ring-primary" : "ring-transparent hover:ring-primary/30")}
              >
                <div className="relative aspect-[4/3] bg-light-green">
                  {a.image && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={a.image} alt="" className={cn("h-full w-full object-cover transition", !on && "opacity-80 grayscale-[35%]")} />
                  )}
                  <span className={cn("absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white shadow", on ? "bg-primary text-white" : "bg-white/70 text-transparent")}>
                    <Check size={15} strokeWidth={3} />
                  </span>
                </div>
                <div className="p-3">
                  <div className="truncate font-display font-bold text-forest">{a.name}</div>
                  <div className="flex items-center gap-1.5 text-[11px] text-ink/50">
                    <span className="h-2 w-2 rounded-full" style={{ background: a.zoneColor }} /> {a.zoneName}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* The plan */}
      <aside className="h-fit min-w-0 lg:sticky lg:top-24">
        <div className="card p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-display text-xl font-bold text-forest">{p.yourRoute}</h2>
            <label className="flex items-center gap-2 text-xs font-bold text-ink/55">
              <Clock size={14} /> {p.arrive}
              <select value={arrive} onChange={(e) => setArrive(e.target.value)} className="rounded-xl border border-black/10 bg-white px-2 py-1.5 text-sm font-bold text-forest">
                {["08:00", "08:30", "09:00", "09:30", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00"].map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {plan.stops.length === 0 ? (
            <p className="mt-4 rounded-2xl bg-cream p-4 text-sm text-ink/60">{p.empty}</p>
          ) : (
            <>
              <p className="mt-1 text-sm font-semibold text-primary">{p.total(plan.stops.length, hours)}</p>
              <ol className="relative mt-4 space-y-3 border-l-2 border-dashed border-primary/25 pl-5">
                <li className="relative">
                  <span className="absolute -left-[31px] flex h-5 w-5 items-center justify-center rounded-full bg-forest text-white">
                    <DoorOpen size={11} />
                  </span>
                  <span className="text-xs font-bold text-ink/50">{arrive}</span>
                  <span className="ml-2 text-sm font-semibold text-forest">{p.entrance}</span>
                </li>
                {plan.stops.map((s, i) => (
                  <li key={s.code} className="relative">
                    <span className="absolute -left-[31px] flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold text-white" style={{ background: s.zoneColor }}>
                      {i + 1}
                    </span>
                    <div className="flex items-center gap-3 rounded-2xl bg-cream/70 p-2.5">
                      {s.image && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={s.image} alt="" className="h-11 w-11 flex-shrink-0 rounded-xl object-cover" />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold text-ink/50">{toHHMM(s.at)}</div>
                        <div className="truncate font-bold text-forest">{s.name}</div>
                        <div className="truncate text-[11px] text-ink/45">{s.zoneName}</div>
                      </div>
                      <Link href={`/animals/${s.code}/map`} className="inline-flex flex-shrink-0 items-center gap-1 rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-primary ring-1 ring-primary/15 hover:bg-primary hover:text-white">
                        <MapIcon size={12} /> {p.showOnMap}
                      </Link>
                    </div>
                    {s.show && (
                      <p className="mt-1.5 flex items-center gap-1.5 rounded-xl bg-accent/25 px-3 py-1.5 text-[11px] font-bold text-forest">
                        <Sparkles size={12} className="text-[#B8791A]" /> {p.dontMiss(s.show.title, s.show.start)}
                      </p>
                    )}
                  </li>
                ))}
                <li className="relative">
                  <span className="absolute -left-[31px] flex h-5 w-5 items-center justify-center rounded-full bg-forest text-white">
                    <DoorOpen size={11} />
                  </span>
                  <span className="text-xs font-bold text-ink/50">{toHHMM(plan.end)}</span>
                  <span className="ml-2 text-sm font-semibold text-forest">{p.exit}</span>
                </li>
              </ol>
            </>
          )}
          <p className="mt-4 flex items-start gap-2 text-xs text-ink/50">
            <Lightbulb size={14} className="mt-0.5 flex-shrink-0 text-[#B8791A]" /> {p.tip}
          </p>
        </div>
      </aside>
    </div>
  );
}
