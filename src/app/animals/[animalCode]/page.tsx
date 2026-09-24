import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getAnimalProfile } from "@/lib/data/zoo";
import { Navbar } from "@/components/visitor/Navbar";
import { BottomNav } from "@/components/visitor/BottomNav";
import { SiteFooter } from "@/components/visitor/SiteFooter";
import { FamilyTree } from "@/components/visitor/FamilyTree";
import { AnimalTimeline } from "@/components/visitor/AnimalTimeline";
import { ZooMapArtwork } from "@/components/visitor/ZooMapArtwork";
import { calculateAge, daysUntilNextBirthday, formatBirthday, formatFullDate, isBirthdayToday } from "@/lib/utils/age";
import { categoryTheme } from "@/lib/utils/category";
import { SpeciesIcon } from "@/components/visitor/SpeciesIcon";
import { QuestDiscoveryTrigger } from "@/components/visitor/QuestDiscoveryTrigger";
import { PhotoGallery } from "@/components/visitor/PhotoGallery";
import { ShareButton } from "@/components/visitor/ShareButton";
import { FavoriteButton } from "@/components/visitor/Favorites";
import {
  QrCode,
  BookOpen,
  Volume2,
  MapPin,
  Leaf,
  Utensils,
  ShieldCheck,
  Cake,
  CalendarDays,
  Plane,
  Fingerprint,
  Smile,
  Activity,
  HeartPulse,
  Lightbulb,
  Images,
  Users,
  History,
  Globe2,
  ChevronRight,
  Navigation,
  HeartHandshake,
  type LucideIcon,
} from "lucide-react";
import type { Animal, AnimalPhoto, AnimalRelationship, AnimalCurrentLocation } from "@/types/domain";
import { getI18n } from "@/lib/i18n/server";
import { pickField, pickName } from "@/lib/i18n/shared";
import { num } from "@/lib/utils/age";

export const revalidate = 30;

async function getAnimal(animalCode: string) {
  const data = await getAnimalProfile(animalCode);
  if (!data) return null;
  const pos = data.place;
  return {
    animal: data.animal as unknown as Animal & { species?: { description?: string | null } },
    photos: data.photos as AnimalPhoto[],
    family: data.family as AnimalRelationship[],
    location: data.location as AnimalCurrentLocation | null,
    mapPos: pos ? { x: Number(pos.map_x), y: Number(pos.map_y) } : null,
    place: pos,
    hasStory: data.hasStory,
  };
}

export default async function AnimalProfilePage({
  params,
  searchParams,
}: {
  params: { animalCode: string };
  searchParams: { scanned?: string };
}) {
  const data = await getAnimal(params.animalCode);
  if (!data) notFound();

  const { animal, photos, family, location, mapPos, place, hasStory } = data;
  const { locale, t } = getI18n();
  const f = (field: string) => pickField(locale, animal as any, field);
  const sp = (field: string) => pickField(locale, animal.species as any, field);
  const displayName = locale === "km" && animal.khmer_name ? animal.khmer_name : animal.name;
  const speciesName = (locale === "km" && (animal.species as any)?.khmer_name) || animal.species?.common_name;
  const age = calculateAge(animal.date_of_birth, locale);
  const birthdayToday = isBirthdayToday(animal.date_of_birth);
  const theme = categoryTheme(animal.category?.slug);
  const heroPhoto = photos.find((p) => p.image_url === animal.main_image_url);
  const heroCaption = heroPhoto ? pickField(locale, heroPhoto as any, "caption") : null;
  const speciesDescription = sp("description");

  return (
    <div className="pb-20 md:pb-0">
      {searchParams.scanned === "1" && <QuestDiscoveryTrigger animalId={animal.id} animalName={animal.name} />}
      <Navbar />

      {/* ───────────── HERO ───────────── */}
      <section className="relative overflow-hidden bg-forest">
        <div className="relative h-[46vh] max-h-[460px] min-h-[320px] w-full md:h-[520px] md:max-h-none" style={{ background: theme.gradient }}>
          {animal.main_image_url ? (
            <Image src={animal.main_image_url} alt={animal.name} fill priority sizes="100vw" className="object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center opacity-70">
              <SpeciesIcon categorySlug={animal.category?.slug} size={120} color={theme.solid} />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-forest via-forest/30 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-forest/60 to-transparent" />

          <div className="absolute inset-x-0 bottom-0">
            <div className="mx-auto max-w-6xl px-4 pb-8 md:px-6 md:pb-12">
              <nav className="mb-3 flex items-center gap-1 text-xs text-white/70">
                <Link href="/" className="hover:text-white">{t.nav.home}</Link>
                <ChevronRight size={12} />
                <Link href="/animals" className="hover:text-white">{t.nav.animals}</Link>
                <ChevronRight size={12} />
                <span className="text-white">{displayName}</span>
              </nav>
              <div className="flex items-end justify-between gap-4">
                <div className="text-white">
                  <div className="mb-2 flex flex-wrap gap-2">
                    <span className="rounded-full px-3 py-1 text-xs font-bold text-white shadow" style={{ backgroundColor: theme.solid }}>
                      {pickName(locale, animal.category as any)}
                    </span>
                    {location?.zone_code && (
                      <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-bold backdrop-blur">{t.common.zone} {location.zone_code}</span>
                    )}
                    {animal.gender !== "unknown" && (
                      <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-bold capitalize backdrop-blur">
                        {animal.gender === "male" ? `♂ ${t.common.male}` : `♀ ${t.common.female}`}
                      </span>
                    )}
                  </div>
                  <h1 className="flex items-center gap-3 font-display text-5xl font-extrabold leading-none drop-shadow-lg md:text-7xl">
                    {displayName}
                    <FavoriteButton code={animal.animal_code} className="h-11 w-11" />
                  </h1>
                  <p className="mt-1 text-lg font-semibold text-white/90 md:text-2xl">
                    {speciesName}
                    {locale === "km" ? (
                      <span className="ml-2 text-base font-normal text-white/70">({animal.name})</span>
                    ) : (
                      animal.khmer_name && <span className="ml-2 font-khmer text-base font-normal text-white/70">({animal.khmer_name})</span>
                    )}
                  </p>
                  {animal.species?.scientific_name && <p className="text-sm italic text-white/60">{animal.species.scientific_name}</p>}
                </div>
                <Link
                  href={`/scan/${animal.animal_code}`}
                  className="hidden flex-shrink-0 flex-col items-center gap-1 rounded-2xl bg-white/15 px-4 py-3 text-xs font-bold text-white ring-1 ring-white/30 backdrop-blur transition hover:bg-white hover:text-primary sm:flex"
                >
                  <QrCode size={30} /> {t.detail.scanQr}
                </Link>
              </div>
            </div>
          </div>
        </div>
        {heroCaption && <p className="absolute right-3 top-3 max-w-[60%] truncate rounded-full bg-black/40 px-2.5 py-1 text-[10px] text-white/80 backdrop-blur">{heroCaption}</p>}
      </section>

      <main className="mx-auto max-w-6xl px-4 md:px-6">
        {/* ───────────── INFO BAR ───────────── */}
        <div className="relative z-10 -mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-3xl bg-black/5 shadow-lift ring-1 ring-black/5 md:grid-cols-4">
          <InfoTile icon={Fingerprint} label={t.detail.animalId} value={animal.animal_code} />
          <InfoTile
            icon={Cake}
            label={t.detail.dob}
            value={formatFullDate(animal.date_of_birth, locale) ?? t.common.unknown}
            sub={age ? t.detail.old(age) : undefined}
          />
          <InfoTile icon={Globe2} label={t.detail.placeOfBirth} value={f("place_of_birth") ?? t.common.unknown} />
          <InfoTile icon={Plane} label={t.detail.arrivalDate} value={formatFullDate(animal.arrival_date, locale) ?? t.common.unknown} />
        </div>

        {birthdayToday && (
          <div className="mt-4 flex items-center gap-3 rounded-3xl bg-gradient-to-r from-accent to-leaf p-4 font-bold text-forest">
            <Cake size={24} /> {t.detail.happyBirthday(displayName)}
          </div>
        )}

        {/* ───────────── ACTIONS ───────────── */}
        <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-5 sm:gap-3" data-reveal-stagger="zoom">
          <ActionButton href={hasStory ? `/animals/${animal.animal_code}/story` : undefined} icon={BookOpen} label={t.detail.readStory} soon={t.common.comingSoon} primary />
          <ActionButton href={`/animals/${animal.animal_code}/audio`} icon={Volume2} label={t.detail.listen} />
          <ActionButton href={`/animals/${animal.animal_code}/map`} icon={Navigation} label={t.detail.find(displayName)} />
          <ActionButton href={`/scan/${animal.animal_code}`} icon={QrCode} label={t.detail.scanQr} />
          <ShareButton title={`${displayName}, Green Wild Zoo`} className="col-span-2 sm:col-span-1" />
        </div>
        <Link
          href={`/adopt?animal=${animal.animal_code}`}
          data-reveal
          className="mt-3 flex items-center gap-3 rounded-3xl bg-gradient-to-r from-rose-50 to-cream p-4 ring-1 ring-rose-100 transition hover:shadow-soft"
        >
          <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-rose-500 text-white">
            <HeartHandshake size={22} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-display text-lg font-bold text-forest">{t.nav.adopt}: {displayName}</span>
            <span className="block truncate text-xs text-ink/55">{t.adopt.tiers.friend.desc}</span>
          </span>
          <ChevronRight className="text-rose-500" />
        </Link>

        <div className="mt-10 grid gap-8 lg:grid-cols-[1.6fr_1fr]">
          <div className="min-w-0 space-y-10">
            {/* ABOUT */}
            <Section icon={BookOpen} title={t.detail.about(displayName)}>
              {f("biography") ? (
                <p className="text-[15px] leading-relaxed text-ink/80">{f("biography")}</p>
              ) : (
                <p className="text-sm text-ink/50">{t.detail.noBio}</p>
              )}
              <div className="mt-5 grid gap-3 sm:grid-cols-2" data-reveal-stagger>
                <FactCard icon={Smile} label={t.detail.personality} value={f("personality")} fallback={t.common.notRecorded} />
                <FactCard icon={Utensils} label={t.detail.favoriteFood} value={f("favorite_food")} fallback={t.common.notRecorded} />
                <FactCard icon={Activity} label={t.detail.favoriteActivities} value={f("favorite_activities")} fallback={t.common.notRecorded} />
                <FactCard icon={HeartPulse} label={t.detail.care} value={f("care_information")} fallback={t.common.notRecorded} />
              </div>
              {f("interesting_facts") && (
                <div className="mt-4 flex gap-3 rounded-3xl bg-accent/20 p-5">
                  <Lightbulb size={22} className="mt-0.5 flex-shrink-0 text-[#B8791A]" />
                  <div>
                    <div className="font-display text-lg font-bold text-forest">{t.detail.didYouKnow}</div>
                    <p className="text-sm leading-relaxed text-ink/75">{f("interesting_facts")}</p>
                  </div>
                </div>
              )}
            </Section>

            {/* SPECIES */}
            {speciesDescription && (
              <Section icon={Leaf} title={t.detail.aboutSpecies(speciesName ?? "")}>
                <p className="text-[15px] leading-relaxed text-ink/80">{speciesDescription}</p>
              </Section>
            )}

            {/* GALLERY */}
            <Section icon={Images} title={t.detail.gallery}>
              {photos.length > 0 ? (
                <PhotoGallery
                  photos={photos.map((p) => ({ id: p.id, src: p.image_url, caption: pickField(locale, p as any, "caption") }))}
                  alt={displayName}
                  background={theme.gradient}
                />
              ) : (
                <div className="flex items-center gap-3 rounded-3xl bg-white/60 p-5 text-sm text-ink/50 ring-1 ring-black/5">
                  <SpeciesIcon categorySlug={animal.category?.slug} size={30} color={theme.solid} />
                  {t.detail.noGallery}
                </div>
              )}
            </Section>

            {/* TIMELINE */}
            <Section icon={History} title={t.detail.timeline}>
              <AnimalTimeline dateOfBirth={animal.date_of_birth} placeOfBirth={f("place_of_birth")} arrivalDate={animal.arrival_date} />
            </Section>

            {/* FAMILY */}
            <Section icon={Users} title={t.detail.family}>
              <FamilyTree animalName={displayName} relationships={family} />
            </Section>
          </div>

          {/* ───────────── SIDEBAR ───────────── */}
          <aside className="min-w-0 space-y-4 lg:sticky lg:top-24 lg:h-fit" data-reveal-stagger="right">
            <div className="card p-5">
              <h3 className="font-display text-lg font-bold text-forest">{t.detail.quickFacts}</h3>
              <ul className="mt-3 space-y-3">
                <QuickFact icon={Leaf} label={t.detail.habitat} value={sp("habitat_description") ?? "—"} />
                <QuickFact icon={ShieldCheck} label={t.detail.conservation} value={sp("conservation_status") ?? "—"} />
                <QuickFact icon={CalendarDays} label={t.detail.birthday} value={formatBirthday(animal.date_of_birth, locale) ?? "—"} />
                {animal.date_of_birth && (
                  <QuickFact icon={Cake} label={t.detail.nextBirthday} value={t.detail.inDays(num(daysUntilNextBirthday(animal.date_of_birth) ?? 0, locale))} />
                )}
              </ul>
            </div>

            <Link href={`/animals/${animal.animal_code}/map`} className="card group block overflow-hidden">
              <div className="relative aspect-[4/3]">
                <svg viewBox="0 0 100 75" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
                  <ZooMapArtwork />
                </svg>
                {mapPos && (
                  <span
                    className="absolute flex h-9 w-9 items-center justify-center rounded-full rounded-br-none border-[3px] border-white bg-primary text-white shadow-lg [transform:translate(-50%,-100%)_rotate(45deg)]"
                    style={{ left: `${mapPos.x}%`, top: `${mapPos.y}%` }}
                  >
                    <MapPin size={15} className="[transform:rotate(-45deg)]" />
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 p-4">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-light-green text-primary">
                  <MapPin size={20} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="font-display font-bold text-forest">{t.detail.whereIs(displayName)}</div>
                  <div className="truncate text-xs text-ink/55">
                    {place
                      ? [pickName(locale, place.zone), pickName(locale, place.habitat), place.enclosure?.code].filter(Boolean).join(", ")
                      : t.detail.locationUnavailable}
                  </div>
                </div>
                <ChevronRight className="text-primary transition group-hover:translate-x-1" />
              </div>
            </Link>
          </aside>
        </div>
      </main>
      <SiteFooter />
      <BottomNav />
    </div>
  );
}

function Section({ icon: Icon, title, children }: { icon: LucideIcon; title: string; children: React.ReactNode }) {
  return (
    <section data-reveal>
      <h2 className="section-title mb-4 text-xl md:text-2xl">
        <Icon size={22} className="text-primary" /> {title}
      </h2>
      {children}
    </section>
  );
}

function InfoTile({ icon: Icon, label, value, sub }: { icon: LucideIcon; label: string; value: string; sub?: string }) {
  return (
    <div className="flex items-start gap-3 bg-white p-4">
      <Icon size={20} className="mt-0.5 flex-shrink-0 text-primary" />
      <div className="min-w-0">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-ink/45">{label}</div>
        <div className="truncate font-display text-base font-bold text-forest">{value}</div>
        {sub && <div className="text-xs text-ink/50">{sub}</div>}
      </div>
    </div>
  );
}

function ActionButton({ href, icon: Icon, label, primary, soon }: { href?: string; icon: LucideIcon; label: string; primary?: boolean; soon?: string }) {
  const cls = primary ? "btn-primary py-3" : "btn border-2 border-primary/15 bg-white py-3 text-primary hover:border-primary";
  if (!href) {
    return (
      <span className={`${cls} cursor-not-allowed opacity-45`} title={soon}>
        <Icon size={17} /> {label}
      </span>
    );
  }
  return (
    <Link href={href} className={cls}>
      <Icon size={17} /> <span className="truncate">{label}</span>
    </Link>
  );
}

function FactCard({ icon: Icon, label, value, fallback }: { icon: LucideIcon; label: string; value: string | null; fallback: string }) {
  return (
    <div className="flex gap-3 rounded-2xl bg-white p-4 ring-1 ring-black/5">
      <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-light-green text-primary">
        <Icon size={17} />
      </span>
      <div>
        <div className="text-[11px] font-semibold uppercase tracking-wider text-ink/45">{label}</div>
        <div className="text-sm text-ink/80">{value ?? fallback}</div>
      </div>
    </div>
  );
}

function QuickFact({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <li className="flex gap-3">
      <Icon size={18} className="mt-0.5 flex-shrink-0 text-primary" />
      <div>
        <div className="text-[11px] font-semibold uppercase tracking-wider text-ink/45">{label}</div>
        <div className="text-sm font-semibold text-forest">{value}</div>
      </div>
    </li>
  );
}
