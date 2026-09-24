"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Heart } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useI18n } from "@/lib/i18n/client";

// Favourite animals, saved on this device (localStorage) — no account needed.
const KEY = "gwz_favourites";
const EVENT = "gwz-favourites-changed";

function read(): string[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]");
  } catch {
    return [];
  }
}

export function useFavourites() {
  const [favs, setFavs] = useState<string[]>([]);
  useEffect(() => {
    const sync = () => setFavs(read());
    sync();
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  const toggle = (code: string) => {
    const next = read().includes(code) ? read().filter((c) => c !== code) : [...read(), code];
    localStorage.setItem(KEY, JSON.stringify(next));
    window.dispatchEvent(new Event(EVENT));
  };
  return { favs, toggle };
}

/** Heart button — safe to place inside a card link (it stops the navigation). */
export function FavoriteButton({ code, className }: { code: string; className?: string }) {
  const { favs, toggle } = useFavourites();
  const { t } = useI18n();
  const on = favs.includes(code);
  const [pop, setPop] = useState(false);

  return (
    <button
      type="button"
      aria-pressed={on}
      aria-label={on ? t.fun.removeFav : t.fun.addFav}
      title={on ? t.fun.removeFav : t.fun.addFav}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggle(code);
        setPop(true);
        setTimeout(() => setPop(false), 300);
      }}
      className={cn(
        "flex h-9 w-9 items-center justify-center rounded-full shadow-soft backdrop-blur transition-all duration-300 hover:scale-110",
        on ? "bg-rose-500 text-white" : "bg-white/90 text-ink/50 hover:text-rose-500",
        pop && "scale-125",
        className
      )}
    >
      <Heart size={17} strokeWidth={2.4} fill={on ? "currentColor" : "none"} />
    </button>
  );
}

export interface FavouriteAnimal {
  code: string;
  name: string;
  image: string | null;
}

/** "My Favourites" strip — only appears once the visitor has hearted something. */
export function FavoritesStrip({ animals }: { animals: FavouriteAnimal[] }) {
  const { favs } = useFavourites();
  const { t } = useI18n();
  const list = animals.filter((a) => favs.includes(a.code));
  if (list.length === 0) return null;

  return (
    <section className="mt-6 rounded-3xl bg-gradient-to-r from-rose-50 to-cream p-4 ring-1 ring-rose-100 md:p-5">
      <div className="mb-3 flex items-center gap-2 font-display text-lg font-bold text-forest">
        <Heart size={18} className="text-rose-500" fill="currentColor" /> {t.fun.favorites}
        <span className="rounded-full bg-rose-500 px-2 py-0.5 text-xs text-white">{list.length}</span>
      </div>
      <div className="no-scrollbar -mx-1 flex gap-3 overflow-x-auto px-1 pb-1">
        {list.map((a) => (
          <Link key={a.code} href={`/animals/${a.code}`} className="group flex w-24 flex-shrink-0 flex-col items-center gap-1.5 text-center">
            <span className="relative h-20 w-20 overflow-hidden rounded-2xl bg-light-green ring-2 ring-white shadow-soft transition group-hover:-translate-y-1">
              {a.image && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={a.image} alt="" className="h-full w-full object-cover" />
              )}
            </span>
            <span className="w-full truncate text-xs font-bold text-forest">{a.name}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
