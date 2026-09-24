"use client";

import { useMemo, useState } from "react";
import { Search, Shuffle, Check, X } from "lucide-react";
import { useI18n } from "@/lib/i18n/client";
import { cn } from "@/lib/utils/cn";
import type { QuizAnimal } from "./AnimalQuiz";

/**
 * Compact animal chooser for long lists: a search box and one swipeable row
 * of photos (instead of a huge grid), plus a "surprise me" button.
 */
export function AnimalPicker({ animals, value, onChange, title }: { animals: QuizAnimal[]; value: string | undefined; onChange: (code: string) => void; title: string }) {
  const { locale } = useI18n();
  const km = locale === "km";
  const [q, setQ] = useState("");
  const name = (a: QuizAnimal) => (km ? a.name_km || a.name : a.name);
  const list = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return animals;
    return animals.filter((a) => [a.name, a.name_km, a.species, a.species_km].some((v) => (v ?? "").toLowerCase().includes(t)));
  }, [animals, q]);

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-sm font-bold text-forest">{title}</p>
        <button
          type="button"
          onClick={() => onChange(animals[Math.floor(Math.random() * animals.length)].code)}
          className="inline-flex items-center gap-1 rounded-full bg-light-green px-3 py-1.5 text-xs font-bold text-primary hover:bg-primary hover:text-white"
        >
          <Shuffle size={13} /> {km ? "ជ្រើសចៃដន្យ" : "Surprise me"}
        </button>
      </div>
      <div className="relative mb-2">
        <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink/35" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={km ? "ស្វែងរកសត្វ" : "Search animals"} className="input h-10 py-2 pl-10 pr-9 text-sm" />
        {q && (
          <button type="button" onClick={() => setQ("")} aria-label="clear" className="absolute right-3 top-1/2 -translate-y-1/2 text-ink/40">
            <X size={16} />
          </button>
        )}
      </div>
      <div className="no-scrollbar -mx-4 flex snap-x gap-2 overflow-x-auto px-4 pb-1 lg:mx-0 lg:px-0">
        {list.map((a) => {
          const on = a.code === value;
          return (
            <button
              key={a.code}
              type="button"
              onClick={() => onChange(a.code)}
              className={cn("flex w-[4.5rem] flex-shrink-0 snap-start flex-col items-center gap-1 rounded-2xl p-1 transition", on ? "bg-light-green" : "hover:bg-cream")}
            >
              <span className={cn("relative h-16 w-16 overflow-hidden rounded-2xl ring-2", on ? "ring-primary" : "ring-transparent")}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={a.image} alt="" loading="lazy" className="h-full w-full object-cover" />
                {on && (
                  <span className="absolute inset-0 flex items-center justify-center bg-primary/40 text-white">
                    <Check size={20} strokeWidth={3} />
                  </span>
                )}
              </span>
              <span className={cn("w-full truncate text-center text-[11px] font-bold", on ? "text-primary" : "text-forest")}>{name(a)}</span>
            </button>
          );
        })}
        {list.length === 0 && <p className="py-4 text-sm text-ink/50">{km ? "រកមិនឃើញ" : "No animals found"}</p>}
      </div>
    </div>
  );
}
