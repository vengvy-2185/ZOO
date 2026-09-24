"use client";

import Link from "next/link";
import { ArrowRight, Heart } from "lucide-react";
import { useI18n } from "@/lib/i18n/client";
import { FavoriteButton, useFavourites } from "./Favorites";

export interface FavCardAnimal {
  code: string;
  name: string;
  name_km: string | null;
  species: string | null;
  species_km: string | null;
  image: string | null;
}

// Grid of the visitor's hearted animals (read from this device). Un-hearting
// removes the card straight away.
export function FavoritesGrid({ animals }: { animals: FavCardAnimal[] }) {
  const { locale, t } = useI18n();
  const { favs } = useFavourites();
  const list = favs.map((c) => animals.find((a) => a.code === c)).filter(Boolean) as FavCardAnimal[];

  if (list.length === 0) {
    return (
      <div className="flex flex-col items-center rounded-3xl border-2 border-dashed border-rose-200 bg-white/60 px-6 py-14 text-center">
        <span className="flex h-16 w-16 animate-bounce items-center justify-center rounded-full bg-rose-50 text-rose-500">
          <Heart size={30} />
        </span>
        <p className="mt-3 font-display text-xl font-bold text-forest">{t.extra.favEmptyTitle}</p>
        <p className="text-sm text-ink/55">{t.extra.favEmptyText}</p>
        <Link href="/animals" className="btn-primary mt-5">
          {t.extra.browseAnimals} <ArrowRight size={16} />
        </Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-5 lg:grid-cols-4">
      {list.map((a) => (
        <Link
          key={a.code}
          href={`/animals/${a.code}`}
          className="group flex flex-col overflow-hidden rounded-3xl bg-white p-2 shadow-soft ring-1 ring-black/[0.04] transition-all duration-300 hover:-translate-y-1.5 hover:shadow-lift"
        >
          <div className="relative aspect-[4/3] overflow-hidden rounded-[1.1rem] bg-light-green">
            {a.image && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={a.image} alt="" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110" />
            )}
            <FavoriteButton code={a.code} className="absolute bottom-2 right-2" />
          </div>
          <div className="px-2 pb-1.5 pt-3">
            <h3 className="truncate font-display text-lg font-bold text-forest">{(locale === "km" && a.name_km) || a.name}</h3>
            <p className="truncate text-xs text-ink/55">{(locale === "km" && a.species_km) || a.species}</p>
          </div>
        </Link>
      ))}
    </div>
  );
}

/** Heart + count for the header — links to the favourites page. */
export function FavoritesNavButton({ label }: { label: string }) {
  const { favs } = useFavourites();
  return (
    <Link href="/favorites" aria-label={label} title={label} className="relative flex h-8 w-8 min-[360px]:h-9 min-[360px]:w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full text-forest transition hover:bg-rose-50 hover:text-rose-500">
      <Heart size={19} strokeWidth={2.4} fill={favs.length ? "currentColor" : "none"} className={favs.length ? "text-rose-500" : ""} />
      {favs.length > 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white ring-2 ring-white">
          {favs.length}
        </span>
      )}
    </Link>
  );
}
