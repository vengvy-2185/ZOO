"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bath, Bird, Beef, Mic, Fish, Leaf, Footprints, Droplets, Clock, MapPin, ArrowRight, Radio, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useI18n } from "@/lib/i18n/client";
import { todaysEvents, type ZooEvent } from "@/lib/data/events";

const ICONS: Record<ZooEvent["icon"], LucideIcon> = { bath: Bath, bird: Bird, meat: Beef, mic: Mic, fish: Fish, leaf: Leaf, walk: Footprints, water: Droplets };

/** Re-computes live status every 30 s (client-only so it uses the visitor's current time). */
function useTodaysEvents() {
  const [events, setEvents] = useState<ReturnType<typeof todaysEvents> | null>(null);
  useEffect(() => {
    const tick = () => setEvents(todaysEvents());
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, []);
  return events;
}

function fmtIn(min: number) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

/** Full timeline for the Events page. */
export function EventsSchedule() {
  const { locale, t } = useI18n();
  const events = useTodaysEvents();
  const x = t.extra;

  if (!events) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-28 animate-pulse rounded-3xl bg-white/70" />
        ))}
      </div>
    );
  }

  return (
    <ol className="relative space-y-4 before:absolute before:bottom-6 before:left-[1.35rem] before:top-6 before:w-0.5 before:bg-primary/15 md:before:left-[5.6rem]">
      {events.map((e) => {
        const Icon = ICONS[e.icon];
        const badge =
          e.status === "now" ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500 px-2.5 py-1 text-[11px] font-bold text-white">
              <Radio size={12} className="animate-pulse" /> {x.now}
            </span>
          ) : e.status === "next" ? (
            <span className="rounded-full bg-accent px-2.5 py-1 text-[11px] font-bold text-forest">
              {x.next} {x.startsIn(fmtIn(e.startsInMin))}
            </span>
          ) : e.status === "done" ? (
            <span className="rounded-full bg-black/5 px-2.5 py-1 text-[11px] font-bold text-ink/45">{x.done}</span>
          ) : null;
        return (
          <li key={e.id} data-reveal className={cn("relative flex gap-4", e.status === "done" && "opacity-55")}>
            <div className="hidden w-16 flex-shrink-0 pt-5 text-right md:block">
              <div className="font-display text-xl font-extrabold text-forest">{e.start}</div>
              <div className="text-[11px] text-ink/45">{e.minutes} min</div>
            </div>
            <span
              className={cn(
                "relative z-10 mt-4 flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl text-white shadow-soft",
                e.status === "now" ? "bg-red-500 ring-4 ring-red-200" : e.status === "next" ? "bg-primary ring-4 ring-leaf/40" : "bg-primary/80"
              )}
            >
              <Icon size={20} />
            </span>
            <div
              className={cn(
                "flex flex-1 flex-col overflow-hidden rounded-3xl bg-white shadow-soft ring-1 transition sm:flex-row",
                e.status === "now" ? "ring-2 ring-red-300" : e.status === "next" ? "ring-2 ring-leaf" : "ring-black/[0.04]"
              )}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={e.image} alt="" className="h-36 w-full object-cover sm:h-auto sm:w-44" />
              <div className="flex flex-1 flex-col justify-center gap-1.5 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-display text-lg font-bold text-forest md:hidden">{e.start}</span>
                  {badge}
                  {e.days === "weekends" && <span className="rounded-full bg-light-green px-2.5 py-1 text-[11px] font-bold text-primary">{x.weekends}</span>}
                </div>
                <h3 className="font-display text-xl font-bold text-forest">{locale === "km" ? e.title_km : e.title}</h3>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink/55">
                  <span className="inline-flex items-center gap-1">
                    <Clock size={13} /> {e.start} ({e.minutes} min)
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <MapPin size={13} /> {locale === "km" ? e.place_km : e.place}
                  </span>
                </div>
                {e.animalCode && (
                  <Link href={`/animals/${e.animalCode}/map`} className="mt-1 inline-flex w-fit items-center gap-1 text-xs font-bold text-primary hover:underline">
                    <MapPin size={13} /> {t.home.viewMap} <ArrowRight size={13} />
                  </Link>
                )}
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/** Compact "Today at the zoo" card for the homepage: what's on now / next. */
export function TodayAtZoo() {
  const { locale, t } = useI18n();
  const events = useTodaysEvents();
  if (!events) return null;
  const highlight = events.filter((e) => e.status === "now" || e.status === "next").slice(0, 2);
  if (highlight.length === 0) return null;

  return (
    <section data-reveal className="rounded-[2rem] bg-cream p-5 ring-1 ring-primary/10 md:p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="section-title text-xl md:text-2xl">
          <Radio size={22} className="animate-pulse text-red-500" /> {t.extra.todayAtZoo}
        </h2>
        <Link href="/events" className="inline-flex flex-shrink-0 items-center gap-1 text-sm font-bold text-primary">
          {t.extra.seeSchedule} <ArrowRight size={15} />
        </Link>
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {highlight.map((e) => {
          const Icon = ICONS[e.icon];
          return (
            <Link key={e.id} href="/events" className="group flex items-center gap-4 rounded-3xl bg-white p-3 shadow-soft transition hover:-translate-y-0.5 hover:shadow-lift">
              <span className="relative h-20 w-24 flex-shrink-0 overflow-hidden rounded-2xl">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={e.image} alt="" className="h-full w-full object-cover transition duration-500 group-hover:scale-110" />
                <span className="absolute bottom-1 left-1 flex h-7 w-7 items-center justify-center rounded-lg bg-white/90 text-primary">
                  <Icon size={15} />
                </span>
              </span>
              <span className="min-w-0 flex-1">
                <span
                  className={cn(
                    "mb-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold",
                    e.status === "now" ? "bg-red-500 text-white" : "bg-accent text-forest"
                  )}
                >
                  {e.status === "now" ? t.extra.now : `${t.extra.next} ${e.start}`}
                </span>
                <span className="block truncate font-display text-lg font-bold text-forest">{locale === "km" ? e.title_km : e.title}</span>
                <span className="block truncate text-xs text-ink/55">{locale === "km" ? e.place_km : e.place}</span>
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
