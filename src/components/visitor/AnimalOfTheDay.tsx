import Link from "next/link";
import Image from "next/image";
import { Sparkles, ArrowRight, Volume2, Lightbulb } from "lucide-react";
import { getActiveAnimals } from "@/lib/data/zoo";
import { dayNumber } from "@/lib/data/invites";
import { zooToday } from "@/lib/data/gate";
import { getI18n } from "@/lib/i18n/server";

/** A different resident in the spotlight every day (rotates through all active animals). */
export async function AnimalOfTheDay() {
  const animals = (await getActiveAnimals()) as any[];
  const withPhoto = animals.filter((a) => a.main_image_url);
  if (!withPhoto.length) return null;
  const { locale, t } = getI18n();
  const km = locale === "km";
  const c = t.conditions;
  const a = withPhoto[dayNumber(zooToday()) % withPhoto.length];
  const name = (km && a.khmer_name) || a.name;
  const species = (km && a.species?.khmer_name) || a.species?.common_name;
  const factText: string | null = (km && a.interesting_facts_km) || a.interesting_facts || (km && a.personality_km) || a.personality || null;
  const fact = factText?.split(/(?<=[.!?។])\s+/)[0] ?? null;

  return (
    <section data-reveal="zoom" className="relative overflow-hidden rounded-[2rem] bg-white shadow-lift ring-1 ring-black/5">
      <div className="grid md:grid-cols-[1.1fr_1fr]">
        <div className="relative aspect-[4/3] md:aspect-auto md:min-h-[320px]">
          <Image src={a.main_image_url} alt={name} fill sizes="(min-width: 768px) 50vw, 100vw" className="object-cover" />
          <span className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-accent px-3 py-1.5 text-xs font-extrabold text-forest shadow-soft">
            <Sparkles size={14} /> {c.animalOfDay}
          </span>
        </div>
        <div className="flex flex-col justify-center gap-3 p-6 md:p-8">
          <div>
            <h2 className="font-display text-4xl font-extrabold text-forest">{name}</h2>
            {species && <p className="text-sm font-semibold text-ink/50">{species}</p>}
          </div>
          {fact && (
            <p className="flex gap-2.5 rounded-2xl bg-cream p-4 text-sm leading-relaxed text-ink/75">
              <Lightbulb size={18} className="mt-0.5 flex-shrink-0 text-[#B8791A]" />
              {fact}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <Link href={`/animals/${a.animal_code}`} className="btn-primary">
              {c.meet} {name} <ArrowRight size={16} />
            </Link>
            <Link href={`/animals/${a.animal_code}/audio`} className="btn-outline bg-white">
              <Volume2 size={16} /> {c.listen}
            </Link>
          </div>
          <p className="text-xs text-ink/45">{c.nextAnimal}</p>
        </div>
      </div>
    </section>
  );
}
