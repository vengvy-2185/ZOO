import { formatFullDate, num } from "@/lib/utils/age";
import { getI18n } from "@/lib/i18n/server";

interface TimelineEvent {
  year: string;
  label: string;
}

export function AnimalTimeline({
  dateOfBirth,
  placeOfBirth,
  arrivalDate,
}: {
  dateOfBirth: string | null;
  placeOfBirth: string | null;
  arrivalDate: string | null;
}) {
  const { locale, t } = getI18n();
  const events: TimelineEvent[] = [];
  if (dateOfBirth) {
    events.push({
      year: num(new Date(dateOfBirth).getFullYear(), locale),
      label: t.detail.born(placeOfBirth, formatFullDate(dateOfBirth, locale) ?? ""),
    });
  }
  if (arrivalDate) {
    events.push({
      year: num(new Date(arrivalDate).getFullYear(), locale),
      label: t.detail.arrived(formatFullDate(arrivalDate, locale) ?? ""),
    });
  }
  events.push({ year: num(new Date().getFullYear(), locale), label: t.detail.currentLife });

  if (events.length === 1) {
    return <p className="text-sm text-ink/50">{t.detail.noTimeline}</p>;
  }

  return (
    <ol className="relative ml-3 space-y-6 border-l-2 border-light-green pl-6">
      {events.map((e, i) => (
        <li key={i} className="relative">
          <span className="absolute -left-[31px] flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-white">
            •
          </span>
          <div className="text-sm font-semibold text-primary">{e.year}</div>
          <div className="text-sm text-ink/70">{e.label}</div>
        </li>
      ))}
    </ol>
  );
}
