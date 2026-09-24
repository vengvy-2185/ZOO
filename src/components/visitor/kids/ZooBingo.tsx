"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Moon, Zap, Feather, Utensils, Waves, Baby, Ruler, Truck, UserRound, Flower2, Footprints, MapPin, Music, CircleDot, Camera, TreePine, Check, RotateCcw, PartyPopper, Ticket, type LucideIcon } from "lucide-react";
import { useI18n } from "@/lib/i18n/client";
import { cn } from "@/lib/utils/cn";

// Things to spot on a real visit to the zoo.
const SPOTS: { Icon: LucideIcon; en: string; km: string }[] = [
  { Icon: Moon, en: "An animal sleeping", km: "សត្វកំពុងដេក" },
  { Icon: Zap, en: "Something with stripes", km: "អ្វីមួយមានឆ្នូត" },
  { Icon: Feather, en: "A colourful bird", km: "បក្សីពណ៌ចម្រុះ" },
  { Icon: Utensils, en: "An animal eating", km: "សត្វកំពុងស៊ី" },
  { Icon: Waves, en: "An animal in water", km: "សត្វនៅក្នុងទឹក" },
  { Icon: Baby, en: "A baby animal", km: "កូនសត្វ" },
  { Icon: Ruler, en: "A very long neck", km: "កវែងខ្លាំង" },
  { Icon: Truck, en: "An animal bigger than a car", km: "សត្វធំជាងឡាន" },
  { Icon: UserRound, en: "A zoo keeper", km: "អ្នកថែរក្សាសត្វ" },
  { Icon: Flower2, en: "Something pink", km: "អ្វីមួយពណ៌ផ្កាឈូក" },
  { Icon: Footprints, en: "Animal footprints", km: "ស្នាមជើងសត្វ" },
  { Icon: MapPin, en: "A map sign", km: "ផ្លាកផែនទី" },
  { Icon: Music, en: "Hear a bird sing", km: "ឮសំឡេងបក្សីច្រៀង" },
  { Icon: CircleDot, en: "An animal with spots", km: "សត្វមានស្នាមអុជ" },
  { Icon: Camera, en: "Someone taking a photo", km: "នរណាម្នាក់កំពុងថតរូប" },
  { Icon: TreePine, en: "A tree taller than a house", km: "ដើមឈើខ្ពស់ជាងផ្ទះ" },
];

const LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
];

const TEXT = {
  en: {
    intro: "Bring this card to the zoo! Tap a square when you spot it. Get three in a row for BINGO!",
    bingo: "BINGO! Amazing spotting!",
    full: "You found everything! You are a true Zoo Explorer!",
    newCard: "New card",
    found: (n: number) => `${n} of 9 found`,
    come: "Plan your zoo day",
  },
  km: {
    intro: "យកកាតនេះមកសួនសត្វ! ចុចប្រអប់នីមួយៗពេលអ្នកឃើញវា។ បានបីក្នុងមួយជួរ ជា BINGO!",
    bingo: "BINGO! ពូកែមើលណាស់!",
    full: "អ្នករកឃើញទាំងអស់ហើយ! អ្នកជាអ្នករុករកសួនសត្វពិតប្រាកដ!",
    newCard: "កាតថ្មី",
    found: (n: number) => `រកឃើញ ${n} លើ 9`,
    come: "រៀបចំថ្ងៃទៅសួនសត្វ",
  },
};

const KEY = "gwz_bingo";

/** A 3x3 "spot it" bingo card to play on a real visit to the zoo. */
export function ZooBingo() {
  const { locale } = useI18n();
  const km = locale === "km";
  const L = TEXT[km ? "km" : "en"];
  const [card, setCard] = useState<number[]>([]);
  const [marked, setMarked] = useState<number[]>([]);

  const newCard = () => {
    const pool = SPOTS.map((_, i) => i).sort(() => Math.random() - 0.5).slice(0, 9);
    setCard(pool);
    setMarked([]);
  };

  useEffect(() => {
    try {
      const s = JSON.parse(localStorage.getItem(KEY) ?? "null");
      if (s?.card?.length === 9) {
        setCard(s.card);
        setMarked(s.marked ?? []);
        return;
      }
    } catch {
      /* ignore */
    }
    newCard();
  }, []);
  useEffect(() => {
    if (card.length !== 9) return;
    try {
      localStorage.setItem(KEY, JSON.stringify({ card, marked }));
    } catch {
      /* ignore */
    }
  }, [card, marked]);

  const winLines = useMemo(() => LINES.filter((l) => l.every((i) => marked.includes(i))), [marked]);
  const full = marked.length === 9;

  return (
    <div className="mx-auto max-w-md">
      <p className="mb-4 rounded-2xl bg-cream p-3 text-sm text-ink/70 ring-1 ring-primary/10">{L.intro}</p>
      <div className="rounded-[2rem] bg-gradient-to-br from-accent via-leaf to-primary p-2.5 shadow-lift">
        <div className="mb-2 flex justify-center gap-2 font-display text-3xl font-extrabold tracking-widest text-white drop-shadow">BINGO</div>
        <div className="grid grid-cols-3 gap-2">
          {card.map((s, i) => {
            const spot = SPOTS[s];
            const on = marked.includes(i);
            const inLine = winLines.some((l) => l.includes(i));
            return (
              <button
                key={i}
                onClick={() => setMarked((m) => (m.includes(i) ? m.filter((x) => x !== i) : [...m, i]))}
                className={cn(
                  "relative flex aspect-square flex-col items-center justify-center gap-1 rounded-2xl p-1.5 text-center transition active:scale-95",
                  on ? (inLine ? "bg-forest text-white" : "bg-primary text-white") : "bg-white text-forest"
                )}
              >
                <spot.Icon size={26} className={on ? "opacity-60" : "text-primary"} />
                <span className="text-[11px] font-bold leading-tight sm:text-xs">{km ? spot.km : spot.en}</span>
                {on && (
                  <span className="absolute inset-0 flex items-center justify-center">
                    <span className="flex h-12 w-12 items-center justify-center rounded-full border-4 border-white/80 bg-white/10">
                      <Check size={28} strokeWidth={3.5} />
                    </span>
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
      <p className="mt-3 text-center text-sm font-bold text-forest">{L.found(marked.length)}</p>
      {(winLines.length > 0 || full) && (
        <div className="mt-3 flex items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3 text-center font-display text-lg font-extrabold text-white shadow-lift animate-[gwzDrop_.4s_ease]">
          <PartyPopper size={22} /> {full ? L.full : L.bingo}
        </div>
      )}
      <div className="mt-4 flex flex-wrap justify-center gap-2">
        <button onClick={newCard} className="btn-outline bg-white">
          <RotateCcw size={16} /> {L.newCard}
        </button>
        <Link href="/tickets" className="btn-primary hover:translate-y-0">
          <Ticket size={16} /> {L.come}
        </Link>
      </div>
    </div>
  );
}
