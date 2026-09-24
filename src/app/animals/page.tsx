import { getCategories, getActiveAnimals } from "@/lib/data/zoo";
import { Navbar } from "@/components/visitor/Navbar";
import { BottomNav } from "@/components/visitor/BottomNav";
import { AnimalCard } from "@/components/visitor/AnimalCard";
import { PageHeader } from "@/components/visitor/PageHeader";
import { FavoritesStrip } from "@/components/visitor/Favorites";
import { SiteFooter } from "@/components/visitor/SiteFooter";
import { getCategoryIcon } from "@/lib/icons/categoryIcons";
import { PawPrint, Search, SearchX } from "lucide-react";
import type { Animal, AnimalCategory } from "@/types/domain";
import Link from "next/link";
import { cn } from "@/lib/utils/cn";
import { getI18n } from "@/lib/i18n/server";
import { pickName } from "@/lib/i18n/shared";

export const revalidate = 30;

async function getData(category?: string, q?: string) {
  const [categories, all] = await Promise.all([getCategories(), getActiveAnimals()]);

  let animals = all as any[];
  if (category && category !== "all") {
    const cat = categories.find((c: any) => c.slug === category);
    if (cat) animals = animals.filter((a) => a.category_id === cat.id);
  }
  if (q) {
    // Match English or Khmer names (filtered in memory from the cached list).
    const term = q.trim().toLowerCase();
    animals = animals.filter((a) => a.name.toLowerCase().includes(term) || (a.khmer_name ?? "").includes(q.trim()));
  }

  return {
    categories: categories as AnimalCategory[],
    animals: animals as unknown as Animal[],
    allAnimals: all,
    error: null as { message: string } | null,
  };
}

export default async function AnimalsPage({
  searchParams,
}: {
  searchParams: { category?: string; q?: string };
}) {
  const { categories, animals, allAnimals, error } = await getData(searchParams.category, searchParams.q);
  const { locale, t } = getI18n();

  const chip = (active: boolean) =>
    cn(
      "flex flex-shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition",
      active ? "bg-primary text-white shadow-soft" : "bg-white text-forest ring-1 ring-black/10 hover:bg-light-green"
    );

  return (
    <div className="pb-20 md:pb-0">
      <Navbar />
      <PageHeader
        icon={PawPrint}
        eyebrow={t.animals.eyebrow}
        title={t.animals.title}
        subtitle={t.animals.subtitle}
      >
        <form className="mt-6 flex max-w-2xl gap-2" action="/animals">
          <div className="relative flex-1">
            <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink/35" />
            <input
              type="text"
              name="q"
              defaultValue={searchParams.q}
              placeholder={t.animals.searchPlaceholder}
              className="input h-12 border-0 pl-11 text-base shadow-lift"
            />
          </div>
          {searchParams.category && <input type="hidden" name="category" value={searchParams.category} />}
          <button className="btn h-12 bg-leaf px-6 text-forest shadow-lift hover:bg-white">{t.common.search}</button>
        </form>
      </PageHeader>

      <main className="mx-auto max-w-7xl px-4 md:px-6">
        {/* Category chips — scroll sideways on phones instead of wrapping into many rows */}
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-2 [scrollbar-width:none] md:mx-0 md:flex-wrap md:px-0">
          <Link href="/animals" className={chip(!searchParams.category)}>
            <PawPrint size={15} /> {t.animals.all}
          </Link>
          {categories.map((c) => {
            const Icon = getCategoryIcon(c.slug);
            return (
              <Link key={c.id} href={`/animals?category=${c.slug}`} className={chip(searchParams.category === c.slug)}>
                <Icon size={15} /> {pickName(locale, c)}
              </Link>
            );
          })}
        </div>

        {searchParams.q && (
          <p className="mt-4 text-sm text-ink/60">
            <span className="font-semibold text-forest">{t.animals.results(animals.length, searchParams.q)}</span> ·{" "}
            <Link href={searchParams.category ? `/animals?category=${searchParams.category}` : "/animals"} className="font-semibold text-primary">
              {t.common.clear}
            </Link>
          </p>
        )}

        <FavoritesStrip
          animals={allAnimals.map((a: any) => ({ code: a.animal_code, name: (locale === "km" && a.khmer_name) || a.name, image: a.main_image_url }))}
        />

        {error && (
          <p className="mt-8 rounded-2xl bg-red-50 p-4 text-sm text-red-700">
            {t.animals.loadError}
          </p>
        )}

        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-5 lg:grid-cols-4" data-reveal-stagger>
          {animals.map((a) => (
            <AnimalCard key={a.id} animal={a} />
          ))}
        </div>

        {!error && animals.length === 0 && (
          <div className="mt-10 flex flex-col items-center rounded-3xl border-2 border-dashed border-primary/15 bg-white/60 px-6 py-14 text-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-light-green text-primary">
              <SearchX size={30} />
            </span>
            <p className="mt-3 font-display text-xl font-bold text-forest">{t.animals.noneTitle}</p>
            <p className="text-sm text-ink/55">{t.animals.noneText}</p>
          </div>
        )}
      </main>
      <SiteFooter />
      <BottomNav />
    </div>
  );
}
