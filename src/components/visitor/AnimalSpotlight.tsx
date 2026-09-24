"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Sparkles, ArrowRight, Volume2, Lightbulb, Shuffle } from "lucide-react";

export type SpotlightAnimal = { code: string; name: string; species: string | null; image: string; fact: string | null };

/** Animal of the day card, with a button to flip through more animals. */
export function AnimalSpotlight({ animals, labels }: { animals: SpotlightAnimal[]; labels: { title: string; meet: string; listen: string; next: string; another: string; today: string } }) {
  const [i, setI] = useState(0);
  const a = animals[i];
  return (
    <section data-reveal="zoom" className="relative overflow-hidden rounded-[2rem] bg-white shadow-lift ring-1 ring-black/5">
      <div key={a.code} className="grid animate-[gwzFade_.4s_ease] md:grid-cols-[1.1fr_1fr]">
        <div className="relative aspect-[4/3] md:aspect-auto md:min-h-[320px]">
          <Image src={a.image} alt={a.name} fill sizes="(min-width: 768px) 50vw, 100vw" className="object-cover" />
          <span className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-accent px-3 py-1.5 text-xs font-extrabold text-forest shadow-soft">
            <Sparkles size={14} /> {i === 0 ? labels.title : labels.another}
          </span>
        </div>
        <div className="flex flex-col justify-center gap-3 p-6 md:p-8">
          <div>
            <h2 className="font-display text-4xl font-extrabold text-forest">{a.name}</h2>
            {a.species && <p className="text-sm font-semibold text-ink/50">{a.species}</p>}
          </div>
          {a.fact && (
            <p className="flex gap-2.5 rounded-2xl bg-cream p-4 text-sm leading-relaxed text-ink/75">
              <Lightbulb size={18} className="mt-0.5 flex-shrink-0 text-[#B8791A]" />
              {a.fact}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <Link href={`/animals/${a.code}`} className="btn-primary">
              {labels.meet} {a.name} <ArrowRight size={16} />
            </Link>
            <Link href={`/animals/${a.code}/audio`} className="btn-outline bg-white">
              <Volume2 size={16} /> {labels.listen}
            </Link>
            {animals.length > 1 && (
              <button onClick={() => setI((i + 1) % animals.length)} className="btn-outline bg-white">
                <Shuffle size={16} /> {labels.another}
              </button>
            )}
          </div>
          <p className="text-xs text-ink/45">{labels.next}</p>
        </div>
      </div>
    </section>
  );
}
