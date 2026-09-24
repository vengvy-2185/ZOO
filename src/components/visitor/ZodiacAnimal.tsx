"use client";

import { useState } from "react";
import Link from "next/link";
import { Rat, Cat, Rabbit, Flame, Worm, PawPrint, Mountain, Banana, Bird, Dog, PiggyBank, ArrowRight, Sparkles, type LucideIcon } from "lucide-react";
import { useI18n } from "@/lib/i18n/client";
import type { QuizAnimal } from "./AnimalQuiz";

// The 12 animals of the Khmer zodiac, in order. 2020 (from Khmer New Year) was the Year of the Rat.
const ZODIAC: { km: string; en: string; Icon: LucideIcon; color: string; traitEn: string; traitKm: string; luckyEn: string; luckyKm: string; zoo?: RegExp }[] = [
  { km: "ជូត", en: "Rat", Icon: Rat, color: "#64748B", traitEn: "Clever, quick and always ready with a plan.", traitKm: "ឆ្លាត រហ័ស និងតែងតែមានផែនការជានិច្ច។", luckyEn: "Blue", luckyKm: "ខៀវ" },
  { km: "ឆ្លូវ", en: "Ox", Icon: PawPrint, color: "#8B5A2B", traitEn: "Strong, patient and someone everyone can rely on.", traitKm: "រឹងមាំ អត់ធ្មត់ និងជាទីពឹងរបស់មនុស្សគ្រប់គ្នា។", luckyEn: "Yellow", luckyKm: "លឿង", zoo: /elephant/i },
  { km: "ខាល", en: "Tiger", Icon: Cat, color: "#EA580C", traitEn: "Brave, bold and full of energy.", traitKm: "ក្លាហាន ម៉ឺងម៉ាត់ និងពោរពេញដោយថាមពល។", luckyEn: "Orange", luckyKm: "ទឹកក្រូច", zoo: /tiger/i },
  { km: "ថោះ", en: "Rabbit", Icon: Rabbit, color: "#EC4899", traitEn: "Gentle, kind and loved for a calm heart.", traitKm: "ទន់ភ្លន់ ចិត្តល្អ និងជាទីស្រលាញ់ដោយសារចិត្តស្ងប់។", luckyEn: "Pink", luckyKm: "ផ្កាឈូក" },
  { km: "រោង", en: "Dragon", Icon: Flame, color: "#DC2626", traitEn: "Confident, lucky and a natural leader.", traitKm: "ជឿជាក់លើខ្លួនឯង សំណាងល្អ និងជាអ្នកដឹកនាំពីកំណើត។", luckyEn: "Gold", luckyKm: "មាស", zoo: /crocodile/i },
  { km: "ម្សាញ់", en: "Snake", Icon: Worm, color: "#16A34A", traitEn: "Wise, calm and a deep thinker.", traitKm: "ឈ្លាសវៃ ស្ងប់ស្ងាត់ និងគិតវែងឆ្ងាយ។", luckyEn: "Green", luckyKm: "បៃតង" },
  { km: "មមី", en: "Horse", Icon: PawPrint, color: "#B45309", traitEn: "Free, cheerful and always on the move.", traitKm: "សេរី រីករាយ និងតែងតែធ្វើដំណើរ។", luckyEn: "Brown", luckyKm: "ត្នោត", zoo: /giraffe/i },
  { km: "មមែ", en: "Goat", Icon: Mountain, color: "#0EA5E9", traitEn: "Creative, caring and good at making others happy.", traitKm: "មានគំនិតច្នៃប្រឌិត យកចិត្តទុកដាក់ និងពូកែធ្វើឲ្យអ្នកដទៃសប្បាយ។", luckyEn: "Sky blue", luckyKm: "ខៀវមេឃ" },
  { km: "វក", en: "Monkey", Icon: Banana, color: "#F59E0B", traitEn: "Playful, smart and full of fun ideas.", traitKm: "ចូលចិត្តលេង ឆ្លាត និងមានគំនិតសប្បាយៗច្រើន។", luckyEn: "Yellow", luckyKm: "លឿង", zoo: /red panda/i },
  { km: "រកា", en: "Rooster", Icon: Bird, color: "#E11D48", traitEn: "Hard-working, honest and proud.", traitKm: "ឧស្សាហ៍ព្យាយាម ស្មោះត្រង់ និងមានមោទនភាព។", luckyEn: "Red", luckyKm: "ក្រហម", zoo: /peacock/i },
  { km: "ច", en: "Dog", Icon: Dog, color: "#7C3AED", traitEn: "Loyal, fair and a true friend.", traitKm: "ស្មោះត្រង់ យុត្តិធម៌ និងជាមិត្តពិត។", luckyEn: "Purple", luckyKm: "ស្វាយ", zoo: /lion/i },
  { km: "កុរ", en: "Pig", Icon: PiggyBank, color: "#F472B6", traitEn: "Generous, easy-going and lucky with good food.", traitKm: "ចិត្តទូលាយ ងាយស្រួល និងសំណាងមានម្ហូបឆ្ងាញ់។", luckyEn: "Pink", luckyKm: "ផ្កាឈូក" },
];

/** Khmer New Year falls on 13 or 14 April; birthdays before it belong to the previous zodiac year. */
function zodiacIndex(date: string) {
  const [y, m, d] = date.split("-").map(Number);
  const year = m < 4 || (m === 4 && d < 14) ? y - 1 : y;
  return (((year - 2020) % 12) + 12) % 12;
}

const TEXT = {
  en: { label: "Your date of birth", show: "Find my animal", you: "You were born in the Year of the", lucky: "Lucky colour", friend: "Your animal friend at the zoo", visit: "Visit", all: "Come and meet all our animals", note: "Khmer New Year starts in mid April, so birthdays before 14 April count in the year before." },
  km: { label: "ថ្ងៃខែឆ្នាំកំណើតរបស់អ្នក", show: "រកសត្វឆ្នាំរបស់ខ្ញុំ", you: "អ្នកកើតនៅឆ្នាំ", lucky: "ពណ៌សំណាង", friend: "មិត្តសត្វរបស់អ្នកនៅសួនសត្វ", visit: "ទៅជួប", all: "មកជួបសត្វទាំងអស់របស់យើង", note: "ចូលឆ្នាំខ្មែរនៅពាក់កណ្តាលខែមេសា ដូច្នេះអ្នកកើតមុនថ្ងៃទី 14 មេសា រាប់ក្នុងឆ្នាំមុន។" },
};

/** Birth date to Khmer zodiac animal, with a zoo animal to go and meet. */
export function ZodiacAnimal({ animals }: { animals: QuizAnimal[] }) {
  const { locale } = useI18n();
  const km = locale === "km";
  const L = TEXT[km ? "km" : "en"];
  const [date, setDate] = useState("");
  const [idx, setIdx] = useState<number | null>(null);
  const z = idx === null ? null : ZODIAC[idx];
  const friend = z?.zoo ? animals.find((a) => z.zoo!.test(a.species ?? "")) : undefined;

  return (
    <div className="mx-auto max-w-lg">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (date) setIdx(zodiacIndex(date));
        }}
        className="card p-5"
      >
        <label className="block text-sm font-bold text-forest">
          {L.label}
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} max={new Date().toISOString().slice(0, 10)} min="1920-01-01" required className="input mt-2" />
        </label>
        <button className="btn-primary mt-3 w-full justify-center hover:translate-y-0">
          <Sparkles size={16} /> {L.show}
        </button>
        <p className="mt-2 text-xs text-ink/45">{L.note}</p>
      </form>

      {z && (
        <div key={idx} className="mt-5 overflow-hidden rounded-[2rem] text-white shadow-lift animate-[gwzDrop_.4s_ease]" style={{ background: `linear-gradient(135deg, ${z.color}, #0E3F24)` }}>
          <div className="p-6 text-center">
            <span className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-white/20 ring-4 ring-white/40">
              <z.Icon size={48} strokeWidth={2} />
            </span>
            <p className="mt-3 text-sm text-white/80">{L.you}</p>
            <p className="font-display text-5xl font-extrabold leading-tight">{km ? z.km : z.en}</p>
            {km ? <p className="text-white/75">{z.en}</p> : <p className="font-khmer text-white/75">{z.km}</p>}
            <p className="mx-auto mt-3 max-w-sm text-lg">{km ? z.traitKm : z.traitEn}</p>
            <p className="mt-3 inline-block rounded-full bg-white/15 px-4 py-1.5 text-sm font-bold">
              {L.lucky}: {km ? z.luckyKm : z.luckyEn}
            </p>
          </div>
          {friend ? (
            <Link href={`/animals/${friend.code}`} className="flex items-center gap-3 bg-white/10 p-4 transition hover:bg-white/20">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={friend.image} alt="" className="h-14 w-14 rounded-2xl object-cover ring-2 ring-white/60" />
              <span className="min-w-0 flex-1">
                <span className="block text-xs text-white/75">{L.friend}</span>
                <span className="block truncate font-display text-lg font-extrabold">{km ? friend.name_km || friend.name : friend.name}</span>
              </span>
              <span className="inline-flex flex-shrink-0 items-center gap-1 text-sm font-bold">
                {L.visit} <ArrowRight size={16} />
              </span>
            </Link>
          ) : (
            <Link href="/animals" className="flex items-center justify-between bg-white/10 p-4 font-bold transition hover:bg-white/20">
              {L.all} <ArrowRight size={16} />
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
