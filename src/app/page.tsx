import Link from "next/link";
import { getCategories, getActiveAnimals, getSpeciesCount, getZonesAndFacilities, getTicketTypes, getReviews, getNews } from "@/lib/data/zoo";
import { formatFullDate } from "@/lib/utils/age";
import { Stars } from "@/components/visitor/Reviews";
import { ReviewCard } from "@/components/visitor/ReviewCard";
import { getBranding } from "@/lib/branding";
import { Navbar } from "@/components/visitor/Navbar";
import { BottomNav } from "@/components/visitor/BottomNav";
import { SiteFooter } from "@/components/visitor/SiteFooter";
import { AnimalCard } from "@/components/visitor/AnimalCard";
import { HeroMedia } from "@/components/visitor/AuthSplitLayout";
import { HeroWildlife, Butterflies } from "@/components/visitor/JungleAmbience";
import { TodayAtZoo } from "@/components/visitor/EventsSchedule";
import { TodayConditions } from "@/components/visitor/TodayConditions";
import { AnimalOfTheDay } from "@/components/visitor/AnimalOfTheDay";
import { OpenStatus } from "@/components/visitor/OpenStatus";
import { CountUp } from "@/components/visitor/CountUp";
import { FactsCarousel, type Fact } from "@/components/visitor/FactsCarousel";
import { ZooMapArtwork } from "@/components/visitor/ZooMapArtwork";
import { getCategoryIcon } from "@/lib/icons/categoryIcons";
import { categoryTheme } from "@/lib/utils/category";
import {
  ArrowRight,
  BookOpen,
  Volume2,
  Map as MapIcon,
  QrCode,
  Trophy,
  PawPrint,
  Ticket,
  CalendarDays,
  Clock,
  MapPin,
  ParkingCircle,
  Binoculars,
  Heart,
  Utensils,
  Mic,
  Camera,
  Sparkles, Gamepad2,
  Brain,
  Ruler,
  Route,
  Newspaper,
} from "lucide-react";
import type { Animal, AnimalCategory } from "@/types/domain";
import Image from "next/image";
import { getI18n } from "@/lib/i18n/server";
import { pickName } from "@/lib/i18n/shared";
import { num } from "@/lib/utils/age";
import { dayNumber } from "@/lib/data/invites";
import { zooToday } from "@/lib/data/gate";
import type { Dictionary } from "@/lib/i18n/dictionaries";

export const revalidate = 60; // ISR: refresh homepage data every minute

async function getHomeData() {
  // All reads come from the shared cache (src/lib/data/zoo.ts), so a visit
  // normally makes no Supabase round trip at all.
  const [categories, active, speciesCount, { zones }, ticketTypes] = await Promise.all([
    getCategories(),
    getActiveAnimals(),
    getSpeciesCount(),
    getZonesAndFacilities(),
    getTicketTypes(),
  ]);

  const countByCategory = new Map<string, number>();
  active.forEach((a: any) => countByCategory.set(a.category_id, (countByCategory.get(a.category_id) ?? 0) + 1));
  const prices = ticketTypes.map((t: any) => Number(t.price_usd)).filter((p: number) => p > 0);
  const spotlight = [...active].sort((a: any, b: any) => String(b.created_at).localeCompare(String(a.created_at)))[0] ?? null;

  return {
    categories: categories as AnimalCategory[],
    animals: active.slice(0, 8) as unknown as Animal[],
    allAnimals: active,
    animalCount: active.length,
    speciesCount,
    zoneCount: zones.length,
    ticketsFrom: prices.length ? Math.min(...prices) : null,
    countByCategory,
    spotlight: spotlight as unknown as Animal | null,
  };
}

const quickLinks = (t: Dictionary) => [
  { icon: PawPrint, label: t.nav.animals, desc: t.home.quickAnimals, href: "/animals" },
  { icon: Ticket, label: t.nav.tickets, desc: t.home.quickTickets, href: "/tickets" },
  { icon: MapIcon, label: t.nav.map, desc: t.home.quickMap, href: "/map" },
  { icon: Trophy, label: t.nav.quest, desc: t.home.quickQuest, href: "/quest" },
];

const experiences = (t: Dictionary) => [
  { icon: QrCode, label: t.home.expQr, desc: t.home.expQrText, href: "/quest" },
  { icon: Volume2, label: t.home.expAudio, desc: t.home.expAudioText, href: "/animals" },
  { icon: BookOpen, label: t.home.expStory, desc: t.home.expStoryText, href: "/animals" },
  { icon: MapIcon, label: t.home.expMap, desc: t.home.expMapText, href: "/map" },
  { icon: Trophy, label: t.home.expQuest, desc: t.home.expQuestText, href: "/quest" },
  { icon: Brain, label: t.extra.quiz, desc: t.extra.quizEyebrow, href: "/quiz" },
  { icon: Route, label: t.nav.planner, desc: t.planner.eyebrow, href: "/planner" },
  { icon: Gamepad2, label: t.nav.games, desc: t.nav.gamesHint, href: "/games" },
  { icon: Ruler, label: t.nav.compare, desc: t.compare.eyebrow, href: "/compare" },
  { icon: Camera, label: t.nav.booth, desc: t.booth.eyebrow, href: "/photo-booth" },
];

export default async function HomePage() {
  const [
    { categories, animals, allAnimals, animalCount, speciesCount, zoneCount, ticketsFrom, countByCategory, spotlight },
    { heroImageUrl, heroVideoUrl },
    reviewData,
    news,
  ] = await Promise.all([getHomeData(), getBranding(), getReviews(), getNews().catch(() => [])]);
  const spotlightTheme = categoryTheme(spotlight?.category?.slug);
  const { locale, t } = getI18n();
  const QUICK_LINKS = quickLinks(t);
  const EXPERIENCES = experiences(t);
  const n = (v: string | number) => num(v, locale);
  // First sentence of each animal's "interesting facts", in the visitor's language.
  const allFacts: Fact[] = (allAnimals as any[])
    .map((a) => {
      const text = (locale === "km" && a.interesting_facts_km) || a.interesting_facts;
      if (!text) return null;
      const first = text.split(/(?<=[.!?។])\s+/)[0];
      return {
        code: a.animal_code,
        name: (locale === "km" && a.khmer_name) || a.name,
        species: (locale === "km" && a.species?.khmer_name) || a.species?.common_name || null,
        image: a.main_image_url,
        fact: first,
      };
    })
    .filter(Boolean) as Fact[];
  // 20 facts a day, a different set each day, so the carousel stays short.
  const factStart = allFacts.length ? (dayNumber(zooToday()) * 20) % allFacts.length : 0;
  const facts = allFacts.map((_, k) => allFacts[(factStart + k) % allFacts.length]);

  return (
    <div className="pb-20 md:pb-0">
      <Navbar />

      {/* ───────────── HERO ───────────── */}
      <section className="relative overflow-hidden rounded-b-[2.5rem] bg-forest md:rounded-b-[3.5rem]">
        <div className="absolute inset-0">
          <HeroMedia imageUrl={heroImageUrl} videoUrl={heroVideoUrl} />
        </div>
        <div className="absolute inset-0 bg-gradient-to-r from-forest/95 via-forest/60 to-forest/10 max-md:via-forest/75 max-md:to-forest/45" />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-forest/70 to-transparent" />
        <HeroWildlife />

        <div className="relative mx-auto flex min-h-[540px] max-w-7xl flex-col justify-center px-5 pb-28 pt-10 md:min-h-[640px] md:px-6 md:pb-36">
          <OpenStatus className="mb-3 w-fit" />
          <p className="mb-4 inline-flex w-fit items-center gap-2 rounded-full bg-white/15 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.18em] text-leaf ring-1 ring-white/20 backdrop-blur">
            <Sparkles size={14} /> {t.home.welcome}
          </p>
          <h1 className="max-w-2xl font-display text-[2.6rem] font-extrabold leading-[1.02] text-white drop-shadow-lg md:text-7xl">
            {t.home.heroTitle1} <span className="text-leaf">{t.home.heroTitle2}</span>{" "}
            <PawPrint className="inline-block h-9 w-9 -rotate-12 text-accent md:h-14 md:w-14" strokeWidth={2.6} />
          </h1>
          <p className="mt-5 max-w-lg text-base text-white/85 md:text-lg">
            {t.home.heroText(animalCount > 0 ? `${n(animalCount)}+` : t.home.ourResidents)}
          </p>

          <div className="mt-6 flex flex-wrap gap-x-6 gap-y-3">
            {[
              [PawPrint, animalCount > 0 ? `${n(animalCount)}+` : "100+", t.home.animalsLabel],
              [Binoculars, t.home.interactive, t.home.exhibits],
              [Heart, t.home.family, t.home.friendly],
            ].map(([Icon, top, bottom]: any) => (
              <div key={bottom} className="flex items-center gap-2.5 text-white">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-primary shadow-soft">
                  <Icon size={19} strokeWidth={2.4} />
                </span>
                <span className="text-sm font-bold leading-tight">
                  {top}
                  <span className="block font-medium text-white/75">{bottom}</span>
                </span>
              </div>
            ))}
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/animals" className="btn bg-leaf px-7 py-3.5 text-base text-forest shadow-lift hover:-translate-y-0.5 hover:bg-white">
              {t.home.exploreNow} <ArrowRight size={18} strokeWidth={2.6} />
            </Link>
            <Link href="/tickets" className="btn-ghost-light px-7 py-3.5 text-base">
              <Ticket size={18} /> {t.home.getTickets}
            </Link>
          </div>
        </div>
      </section>

      {/* ───────────── QUICK ACCESS ───────────── */}
      <section className="relative z-10 mx-auto -mt-20 max-w-6xl px-4 md:-mt-24 md:px-6">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
          {QUICK_LINKS.map(({ icon: Icon, label, desc, href }) => (
            <Link
              key={href}
              href={href}
              className="group flex items-center gap-3 rounded-3xl bg-white p-3.5 shadow-lift ring-1 ring-black/[0.04] transition hover:-translate-y-1 md:p-5"
            >
              <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-light-green text-primary transition group-hover:bg-primary group-hover:text-white md:h-14 md:w-14">
                <Icon size={24} strokeWidth={2.2} />
              </span>
              <span className="min-w-0">
                <span className="block truncate font-display text-base font-bold text-forest md:text-lg">{label}</span>
                <span className="block truncate text-xs text-ink/55">{desc}</span>
              </span>
            </Link>
          ))}
        </div>
      </section>

      <main className="mx-auto max-w-7xl space-y-20 px-4 pt-16 md:px-6">
        {/* ───────────── STATS ───────────── */}
        <section className="grid grid-cols-2 gap-3 md:grid-cols-4" data-reveal-stagger>
          {[
            [PawPrint, <CountUp key="a" value={animalCount} />, t.home.statAnimals],
            [Sparkles, <CountUp key="s" value={speciesCount} />, t.home.statSpecies],
            [MapIcon, <CountUp key="z" value={zoneCount} />, t.home.statZones],
            [Heart, <CountUp key="v" value={100} suffix="K+" />, t.home.statVisitors],
          ].map(([Icon, value, label]: any) => (
            <div key={label} className="flex items-center gap-3 rounded-3xl bg-cream p-4 ring-1 ring-primary/10 md:p-5">
              <Icon size={30} className="flex-shrink-0 text-primary" strokeWidth={2} />
              <div>
                <div className="font-display text-2xl font-extrabold leading-none text-forest md:text-3xl">{value}</div>
                <div className="text-xs font-medium text-ink/55">{label}</div>
              </div>
            </div>
          ))}
        </section>

        {/* ───────────── TODAY AT THE ZOO (live) ───────────── */}
        <TodayAtZoo />
        <TodayConditions />
        <AnimalOfTheDay />

        {/* ───────────── POPULAR ANIMALS ───────────── */}
        <section>
          <SectionHeading icon={PawPrint} title={t.home.popularAnimals} href="/animals" viewAll={t.common.viewAll} />
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-5 lg:grid-cols-4" data-reveal-stagger>
            {animals.map((a) => (
              <AnimalCard key={a.id} animal={a} />
            ))}
          </div>
          {animals.length === 0 && (
            <EmptyState icon={PawPrint} text={t.home.noAnimals} />
          )}
        </section>

        {/* ───────────── CATEGORIES ───────────── */}
        <section>
          <SectionHeading icon={Sparkles} title={t.home.categories} href="/animals" viewAll={t.common.viewAll} />
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-4 lg:grid-cols-6" data-reveal-stagger="zoom">
            {categories.map((c) => {
              const count = countByCategory.get(c.id) ?? 0;
              const theme = categoryTheme(c.slug);
              const Icon = getCategoryIcon(c.slug);
              const image = (c as any).image_url as string | null;
              return (
                <Link
                  key={c.id}
                  href={`/animals?category=${c.slug}`}
                  className="group relative block aspect-[4/5] overflow-hidden rounded-3xl shadow-soft ring-1 ring-black/[0.04] transition hover:-translate-y-1 hover:shadow-lift"
                  style={{ background: theme.gradient }}
                >
                  {image ? (
                    <Image src={image} alt="" fill sizes="(max-width: 768px) 50vw, 16vw" className="object-cover transition-transform duration-700 group-hover:scale-110" />
                  ) : (
                    <span className="absolute inset-0 flex items-center justify-center" style={{ color: theme.solid }}>
                      <Icon size={56} strokeWidth={1.6} />
                    </span>
                  )}
                  <span className="absolute inset-0 bg-gradient-to-t from-forest/90 via-forest/20 to-transparent" />
                  <span
                    className="absolute left-3 top-3 flex h-9 w-9 items-center justify-center rounded-xl bg-white/90 shadow-soft backdrop-blur"
                    style={{ color: theme.solid }}
                  >
                    <Icon size={19} strokeWidth={2.2} />
                  </span>
                  <span className="absolute inset-x-0 bottom-0 p-3.5 text-white">
                    <span className="block font-display text-lg font-bold leading-tight">{pickName(locale, c)}</span>
                    <span className="text-xs text-white/75">
                      {n(count)} {count === 1 ? t.common.animal : t.common.animals}
                    </span>
                  </span>
                </Link>
              );
            })}
          </div>
          {categories.length === 0 && (
            <EmptyState icon={Sparkles} text={t.home.noCategories} />
          )}
        </section>

        {/* ───────────── DID YOU KNOW? ───────────── */}
        <FactsCarousel facts={facts} />

        {/* ───────────── LATEST NEWS ───────────── */}
        {news.length > 0 && (
          <section data-reveal>
            <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
              <h2 className="section-title">
                <Newspaper className="text-primary" /> {t.news.latest}
              </h2>
              <Link href="/news" className="btn-outline bg-white">
                {t.news.back} <ArrowRight size={16} />
              </Link>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {news.slice(0, 2).map((post) => (
                <Link key={post.id} href={`/news/${post.id}`} className="card group flex gap-4 overflow-hidden p-3 transition hover:-translate-y-0.5 hover:shadow-lift">
                  <div className="relative h-28 w-32 flex-shrink-0 overflow-hidden rounded-2xl bg-light-green sm:w-40">
                    {post.image_url && <Image src={post.image_url} alt="" fill sizes="160px" className="object-cover transition duration-500 group-hover:scale-105" />}
                  </div>
                  <div className="min-w-0 py-1">
                    <p className="text-xs text-ink/45">{formatFullDate(post.published_at, locale)}</p>
                    <h3 className="mt-0.5 line-clamp-2 font-display text-lg font-bold leading-snug text-forest">{(locale === "km" && post.title_km) || post.title}</h3>
                    <p className="mt-1 line-clamp-2 text-sm text-ink/60">{(locale === "km" && post.summary_km) || post.summary}</p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* ───────────── VISITOR REVIEWS ───────────── */}
        {reviewData.total > 0 && (
          <section data-reveal>
            <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">{t.reviews.eyebrow}</p>
                <h2 className="section-title mt-1">{t.reviews.title}</h2>
                <div className="mt-2 flex items-center gap-2 text-sm text-ink/60">
                  <span className="font-display text-2xl font-extrabold text-forest">{reviewData.average.toFixed(1)}</span>
                  <Stars value={reviewData.average} size={18} />
                  <span>{t.reviews.basedOn(reviewData.total)}</span>
                </div>
              </div>
              <Link href="/reviews" className="btn-outline bg-white">
                {t.reviews.seeAll} <ArrowRight size={16} />
              </Link>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {reviewData.reviews.slice(0, 3).map((rv) => (
                <ReviewCard key={rv.id} review={rv} locale={locale} />
              ))}
            </div>
          </section>
        )}

        {/* ───────────── PHOTO BOOTH ───────────── */}
        <Link
          href="/photo-booth"
          data-reveal="zoom"
          className="group relative flex items-center gap-5 overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#9D174D] via-[#E11D48] to-[#FB923C] p-6 text-white shadow-lift md:p-8"
        >
          <div className="pointer-events-none absolute -right-6 -top-6 select-none text-[7rem] opacity-20 transition-transform duration-700 group-hover:rotate-12 md:text-[9rem]" aria-hidden>
            📸
          </div>
          <div className="relative flex h-24 w-20 flex-shrink-0 rotate-[-6deg] flex-col rounded-xl bg-white p-1.5 shadow-lift transition-transform duration-500 group-hover:rotate-0 md:h-32 md:w-28">
            <span className="flex flex-1 items-center justify-center rounded-lg bg-gradient-to-br from-forest to-primary text-3xl md:text-4xl">🦁</span>
            <span className="mt-1 text-center text-[8px] font-extrabold text-forest">Green Wild Zoo</span>
          </div>
          <div className="relative">
            <span className="rounded-full bg-white/20 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider">{t.booth.eyebrow}</span>
            <h2 className="mt-2 font-display text-2xl font-extrabold md:text-3xl">{t.booth.title}</h2>
            <p className="mt-1 max-w-md text-sm text-white/85">{t.booth.subtitle}</p>
            <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-sm font-extrabold text-[#E11D48] transition group-hover:gap-3">
              {t.booth.startCamera} <ArrowRight size={16} />
            </span>
          </div>
        </Link>

        {/* ───────────── ADVENTURE BANNER ───────────── */}
        <section data-reveal="zoom" className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-primary via-secondary to-primary p-6 text-white shadow-lift md:p-10">
          <svg viewBox="0 0 200 200" aria-hidden="true" className="absolute -left-10 -top-10 h-48 w-48 text-leaf/25">
            <path fill="currentColor" d="M100 10c50 10 85 45 90 95-45 5-85-20-100-60-8-22-6-26 10-35z" />
          </svg>
          <svg viewBox="0 0 200 200" aria-hidden="true" className="absolute -bottom-12 -right-6 h-56 w-56 text-forest/40">
            <path fill="currentColor" d="M20 120c30-10 60 0 75 30-25 15-60 10-75-30zM110 60c40-20 75-5 85 35-35 12-70-2-85-35z" />
          </svg>
          <div className="relative grid items-center gap-8 md:grid-cols-[1.1fr_1.5fr]">
            <div>
              <div className="inline-block -rotate-2 rounded-2xl bg-[#8C5A2B] px-5 py-4 shadow-lift ring-4 ring-[#6E4A2A]">
                <h2 className="font-display text-3xl font-extrabold leading-tight text-[#FFF3D6] md:text-4xl">
                  {t.home.adventureTitle}
                </h2>
                <p className="mt-1 text-sm text-[#FFE7B3]">{t.home.adventureText}</p>
              </div>
              <Link href="/tickets" className="btn mt-6 bg-white px-6 py-3 text-primary shadow-lift hover:bg-leaf hover:text-forest">
                {t.home.getTickets} <ArrowRight size={17} />
              </Link>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[
                [Utensils, t.home.feedingShow, t.home.daily],
                [Mic, t.home.animalTalks, t.home.everyDay],
                [Camera, t.home.photoSpots, t.home.aroundPark],
              ].map(([Icon, title, sub]: any) => (
                <div key={title} className="rounded-3xl bg-white/10 p-3 text-center ring-1 sm:p-4 ring-white/20 backdrop-blur-sm transition hover:bg-white/20">
                  <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-primary shadow-soft">
                    <Icon size={22} strokeWidth={2.3} />
                  </span>
                  <div className="mt-3 font-display text-sm font-bold md:text-base">{title}</div>
                  <div className="text-[11px] text-white/70 md:text-xs">{sub}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ───────────── SPOTLIGHT + MAP PREVIEW ───────────── */}
        <section className="grid gap-5 md:grid-cols-2" data-reveal-stagger>
          {spotlight ? (
            <Link
              href={`/animals/${spotlight.animal_code}`}
              className="group relative flex min-h-[280px] flex-col justify-end overflow-hidden rounded-[2rem] p-7 text-white shadow-lift"
              style={{ background: `linear-gradient(160deg, ${spotlightTheme.solid}, #0E3F24)` }}
            >
              {spotlight.main_image_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={spotlight.main_image_url}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-forest/90 via-forest/30 to-transparent" />
              <div className="relative">
                <span className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-accent px-3 py-1 text-xs font-bold text-forest">
                  <Sparkles size={13} /> {t.home.spotlight}
                </span>
                <h3 className="font-display text-4xl font-extrabold">{locale === "km" && spotlight.khmer_name ? spotlight.khmer_name : spotlight.name}</h3>
                <p className="text-white/80">{(locale === "km" && (spotlight.species as any)?.khmer_name) || spotlight.species?.common_name}</p>
                <span className="btn mt-4 bg-white text-forest group-hover:bg-leaf">
                  {t.common.learnMore} <ArrowRight size={16} />
                </span>
              </div>
            </Link>
          ) : (
            <div className="flex min-h-[280px] flex-col justify-end rounded-[2rem] bg-gradient-to-br from-primary to-forest p-7 text-white shadow-lift">
              <span className="mb-2 w-fit rounded-full bg-accent px-3 py-1 text-xs font-bold text-forest">{t.home.spotlight}</span>
              <h3 className="font-display text-3xl font-extrabold">{t.common.comingSoon}</h3>
              <p className="text-white/75">{t.home.spotlightSoon}</p>
            </div>
          )}

          <Link href="/map" className="group relative min-h-[280px] overflow-hidden rounded-[2rem] shadow-lift ring-4 ring-white">
            <svg viewBox="0 0 100 75" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full transition-transform duration-700 group-hover:scale-105">
              <ZooMapArtwork />
            </svg>
            <div className="absolute inset-0 bg-gradient-to-t from-forest/85 via-forest/10 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-7 text-white">
              <span className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-xs font-bold backdrop-blur">
                <MapIcon size={13} /> {t.home.interactiveMap}
              </span>
              <h3 className="font-display text-3xl font-extrabold">{t.home.exploreZoo}</h3>
              <p className="text-white/80">{t.home.exploreZooText}</p>
              <span className="btn mt-4 bg-leaf text-forest group-hover:bg-white">
                {t.home.viewMap} <ArrowRight size={16} />
              </span>
            </div>
          </Link>
        </section>

        {/* ───────────── VISITOR EXPERIENCE ───────────── */}
        <section className="relative">
          <Butterflies />
          <SectionHeading icon={Binoculars} title={t.home.visitorExperience} />
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-4 lg:grid-cols-6" data-reveal-stagger>
            {EXPERIENCES.map(({ icon: Icon, label, desc, href }, i) => (
              <Link
                key={label}
                href={href}
                className={`group card flex flex-col items-center p-5 text-center transition hover:-translate-y-1 hover:shadow-lift ${
                  ""
                }`}
              >
                <span className="relative flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-primary to-forest text-white shadow-lift transition-transform duration-300 group-hover:scale-110">
                  <Icon size={28} strokeWidth={2} />
                  <span className="absolute -right-1 -top-1 h-5 w-5 rounded-full bg-leaf ring-4 ring-white" />
                </span>
                <span className="mt-4 font-display text-base font-bold text-forest">{label}</span>
                <span className="text-xs text-ink/50">{desc}</span>
              </Link>
            ))}
          </div>
        </section>

        {/* ───────────── PLAN YOUR VISIT ───────────── */}
        <section>
          <SectionHeading icon={CalendarDays} title={t.home.planVisit} href="/visit" viewAll={t.common.viewAll} />
          <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4" data-reveal-stagger>
            {[
              [Ticket, t.nav.tickets, ticketsFrom != null ? t.home.ticketsFrom(n(ticketsFrom)) : t.home.bookOnline, "/tickets"],
              [Clock, t.home.openingHours, t.home.hours, "/visit"],
              [MapPin, t.home.location, t.footer.address, "/visit"],
              [ParkingCircle, t.home.parking, t.home.parkingText, "/visit"],
            ].map(([Icon, title, value, href]: any) => (
              <Link key={title} href={href} className="group card flex flex-col items-start gap-2.5 p-4 transition hover:-translate-y-0.5 sm:flex-row sm:items-center sm:gap-3 md:flex-col md:items-start md:p-5 lg:flex-row lg:items-center">
                <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-light-green text-primary transition group-hover:bg-primary group-hover:text-white">
                  <Icon size={22} />
                </span>
                <span className="w-full min-w-0">
                  <span className="block font-display font-bold leading-snug text-forest">{title}</span>
                  <span className="block truncate text-xs text-ink/55">{value}</span>
                </span>
              </Link>
            ))}
          </div>
        </section>
      </main>

      <SiteFooter />
      <BottomNav />
    </div>
  );
}

function SectionHeading({ icon: Icon, title, href, viewAll }: { icon: any; title: string; href?: string; viewAll?: string }) {
  return (
    <div className="flex items-end justify-between gap-3" data-reveal="left">
      <h2 className="section-title">
        <Icon size={26} className="text-primary" strokeWidth={2.4} /> {title}
      </h2>
      {href && (
        <Link href={href} className="group inline-flex flex-shrink-0 items-center gap-1 text-sm font-bold text-primary">
          {viewAll} <ArrowRight size={15} className="transition-transform group-hover:translate-x-1" />
        </Link>
      )}
    </div>
  );
}

function EmptyState({ icon: Icon, text }: { icon: any; text: string }) {
  return (
    <div className="mt-6 flex flex-col items-center rounded-3xl border-2 border-dashed border-primary/15 bg-white/60 px-6 py-10 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-light-green text-primary">
        <Icon size={26} />
      </span>
      <p className="mt-3 max-w-sm text-sm text-ink/55">{text}</p>
    </div>
  );
}
