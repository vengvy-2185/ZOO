"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Lightbulb, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useI18n } from "@/lib/i18n/client";

export interface Fact {
  code: string;
  name: string;
  species: string | null;
  image: string | null;
  fact: string;
}

// "Did you know?" — rotates through real facts about the zoo's animals
// every 7 s (pauses while hovered), with a cross-fading photo.
export function FactsCarousel({ facts }: { facts: Fact[] }) {
  const { t } = useI18n();
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const n = facts.length;

  useEffect(() => {
    if (paused || n < 2) return;
    const id = setInterval(() => setI((x) => (x + 1) % n), 7000);
    return () => clearInterval(id);
  }, [paused, n]);

  if (n === 0) return null;
  const f = facts[i];

  return (
    <section
      data-reveal
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      className="relative overflow-hidden rounded-[2rem] bg-forest text-white shadow-lift"
    >
      <div className="grid md:grid-cols-[1fr_1.1fr]">
        <div className="relative aspect-[4/3] md:aspect-auto md:min-h-[340px]">
          {facts.map((x, k) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={x.code}
              src={x.image ?? ""}
              alt=""
              className={cn("absolute inset-0 h-full w-full object-cover transition-all duration-1000", k === i ? "scale-100 opacity-100" : "scale-105 opacity-0")}
            />
          ))}
          <div className="absolute inset-0 bg-gradient-to-t from-forest via-transparent to-transparent md:bg-gradient-to-r md:from-transparent md:via-transparent md:to-forest" />
        </div>

        <div className="relative flex flex-col justify-center p-6 md:p-10">
          <span className="mb-3 inline-flex w-fit items-center gap-2 rounded-full bg-accent px-3 py-1 text-xs font-bold text-forest">
            <Lightbulb size={14} /> {t.fun.didYouKnow}
          </span>
          <div key={i} className="animate-[factIn_.6s_ease]">
            <p className="font-display text-xl font-bold leading-snug md:text-2xl">{f.fact}</p>
            <p className="mt-3 text-sm text-white/70">
              {f.name}
              {f.species && `, ${f.species}`}
            </p>
            <Link href={`/animals/${f.code}`} className="btn mt-5 w-fit bg-leaf text-forest hover:bg-white">
              {t.fun.meet(f.name)} <ArrowRight size={16} />
            </Link>
          </div>

          {n > 1 && (
            <div className="mt-6 flex items-center gap-3">
              <button onClick={() => setI((i - 1 + n) % n)} aria-label="Previous" className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 hover:bg-white/20">
                <ChevronLeft size={20} />
              </button>
              <div className="flex gap-1.5">
                {facts.map((x, k) => (
                  <button
                    key={x.code}
                    onClick={() => setI(k)}
                    aria-label={x.name}
                    className={cn("h-2 rounded-full transition-all duration-500", k === i ? "w-7 bg-leaf" : "w-2 bg-white/30 hover:bg-white/60")}
                  />
                ))}
              </div>
              <button onClick={() => setI((i + 1) % n)} aria-label="Next" className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 hover:bg-white/20">
                <ChevronRight size={20} />
              </button>
            </div>
          )}
        </div>
      </div>
      <style>{`@keyframes factIn{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}`}</style>
    </section>
  );
}
