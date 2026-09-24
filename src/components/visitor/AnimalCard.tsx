import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import type { Animal } from "@/types/domain";
import { calculateAge, isBirthdayToday } from "@/lib/utils/age";
import { categoryTheme } from "@/lib/utils/category";
import { getI18n } from "@/lib/i18n/server";
import { pickName } from "@/lib/i18n/shared";
import { SpeciesIcon } from "./SpeciesIcon";
import { FavoriteButton } from "./Favorites";

export function AnimalCard({ animal, zoneCode }: { animal: Animal; zoneCode?: string }) {
  const { locale, t } = getI18n();
  const theme = categoryTheme(animal.category?.slug);
  const genderSymbol = animal.gender === "male" ? "♂" : animal.gender === "female" ? "♀" : null;
  const genderLabel = animal.gender === "male" ? t.common.male : animal.gender === "female" ? t.common.female : null;
  const age = calculateAge(animal.date_of_birth, locale);
  const speciesName =
    (locale === "km" && (animal.species as any)?.khmer_name) || animal.species?.common_name || "—";

  return (
    <Link
      href={`/animals/${animal.animal_code}`}
      className="group flex flex-col overflow-hidden rounded-3xl bg-white p-2 shadow-soft ring-1 ring-black/[0.04] transition-all duration-300 hover:-translate-y-1.5 hover:shadow-lift"
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-[1.1rem]" style={{ background: theme.gradient }}>
        {animal.main_image_url ? (
          <Image
            src={animal.main_image_url}
            alt={animal.name}
            fill
            sizes="(max-width: 768px) 50vw, 25vw"
            className="object-cover transition-transform duration-700 group-hover:scale-110"
          />
        ) : (
          <div className="flex h-full items-center justify-center opacity-70 transition-transform duration-500 group-hover:scale-110">
            <SpeciesIcon categorySlug={animal.category?.slug} size={56} color={theme.solid} />
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/25 to-transparent" />
        <FavoriteButton code={animal.animal_code} className="absolute bottom-2 right-2 z-10" />
        {zoneCode && (
          <span className="absolute left-2 top-2 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-bold text-primary shadow-sm backdrop-blur-sm">
            {t.common.zone} {zoneCode}
          </span>
        )}
        {animal.category?.name && (
          <span
            className="absolute right-2 top-2 rounded-full px-2.5 py-1 text-[11px] font-bold text-white shadow-sm"
            style={{ backgroundColor: theme.solid }}
          >
            {pickName(locale, animal.category as any)}
          </span>
        )}
      </div>

      <div className="flex flex-1 items-end justify-between gap-2 px-2 pb-1.5 pt-3">
        <div className="min-w-0">
          <h3 className="truncate font-display text-lg font-bold leading-tight text-forest">
            {locale === "km" && animal.khmer_name ? animal.khmer_name : animal.name}
          </h3>
          <p className="truncate text-xs text-ink/55">{speciesName}</p>
          <div className="mt-1.5 flex items-center gap-2 text-[11px] text-ink/50">
            {genderSymbol && (
              <span className="inline-flex items-center gap-0.5">
                <span className="font-bold text-primary">{genderSymbol}</span> {genderLabel}
              </span>
            )}
            <span>
              {age ?? t.animals.ageUnknown}
              {isBirthdayToday(animal.date_of_birth) && " 🎉"}
            </span>
          </div>
        </div>
        <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-primary text-white shadow-soft transition-all duration-300 group-hover:bg-leaf group-hover:text-forest">
          <ArrowRight size={17} strokeWidth={2.6} className="transition-transform duration-300 group-hover:translate-x-0.5" />
        </span>
      </div>
    </Link>
  );
}
