"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Flame, Trophy, RotateCcw, Check, X, ArrowRight } from "lucide-react";
import { useI18n } from "@/lib/i18n/client";
import { cn } from "@/lib/utils/cn";

export type OlderAnimal = { code: string; name: string; species: string; image: string; dob: string };
const BEST_KEY = "gwz_older_best";

function age(dob: string) {
  const [y, m, d] = dob.split("-").map(Number);
  const now = new Date();
  let years = now.getFullYear() - y;
  if (now.getMonth() + 1 < m || (now.getMonth() + 1 === m && now.getDate() < d)) years--;
  return years;
}

/** Two animals side by side; tap the one born first. A wrong answer ends the streak. */
export function OlderGame({ animals }: { animals: OlderAnimal[] }) {
  const { locale } = useI18n();
  const km = locale === "km";
  const [pair, setPair] = useState<[OlderAnimal, OlderAnimal] | null>(null);
  const [picked, setPicked] = useState<number | null>(null);
  const [streak, setStreak] = useState(0);
  const [best, setBest] = useState(0);
  const [over, setOver] = useState(false);

  const deal = useCallback(() => {
    // two different animals with different birthdays
    for (let tries = 0; tries < 50; tries++) {
      const a = animals[Math.floor(Math.random() * animals.length)];
      const b = animals[Math.floor(Math.random() * animals.length)];
      if (a && b && a.code !== b.code && a.dob !== b.dob) return setPair([a, b]);
    }
  }, [animals]);

  useEffect(() => {
    deal();
    try {
      setBest(Number(localStorage.getItem(BEST_KEY)) || 0);
    } catch {
      /* ignore */
    }
  }, [deal]);

  if (animals.length < 2) return <p className="card p-6 text-center text-ink/60">{km ? "មិនទាន់មានសត្វគ្រប់គ្រាន់ទេ។" : "Not enough animals yet."}</p>;
  if (!pair) return <div className="h-96 animate-pulse rounded-[2rem] bg-white/60" />;

  const older = pair[0].dob < pair[1].dob ? 0 : 1;
  const choose = (i: number) => {
    if (picked !== null) return;
    setPicked(i);
    if (i === older) {
      const s = streak + 1;
      setStreak(s);
      if (s > best) {
        setBest(s);
        try {
          localStorage.setItem(BEST_KEY, String(s));
        } catch {
          /* ignore */
        }
      }
    } else setOver(true);
  };
  const next = () => {
    if (over) {
      setStreak(0);
      setOver(false);
    }
    setPicked(null);
    deal();
  };
  const years = (n: number) => (km ? `${n} ឆ្នាំ` : `${n} yr${n === 1 ? "" : "s"}`);

  return (
    <div>
      <div className="mb-4 flex items-center justify-center gap-3">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 font-display text-lg font-extrabold text-rose-600 shadow-soft">
          <Flame size={19} /> {streak}
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-sm font-extrabold text-amber-700 shadow-soft">
          <Trophy size={16} /> {km ? "ល្អបំផុត" : "Best"} {best}
        </span>
      </div>

      <div className="relative grid grid-cols-2 gap-3 sm:gap-5">
        {pair.map((a, i) => {
          const reveal = picked !== null;
          const right = i === older;
          return (
            <button
              key={a.code + i}
              onClick={() => choose(i)}
              disabled={reveal}
              className={cn(
                "group relative overflow-hidden rounded-[1.75rem] bg-white text-left shadow-soft ring-4 transition",
                !reveal && "ring-transparent hover:-translate-y-1 hover:shadow-lift active:scale-[.98]",
                reveal && right && "ring-emerald-400",
                reveal && !right && picked === i && "ring-rose-400",
                reveal && !right && picked !== i && "ring-transparent opacity-80"
              )}
            >
              <div className="relative aspect-[4/5] sm:aspect-square">
                <Image src={a.image} alt="" fill sizes="(min-width:640px) 420px, 50vw" className="object-cover transition duration-500 group-hover:scale-105" />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent p-3 pt-12 text-white sm:p-4">
                  <p className="truncate font-display text-lg font-extrabold sm:text-2xl">{a.name}</p>
                  <p className="truncate text-xs text-white/80 sm:text-sm">{a.species}</p>
                </div>
                {reveal && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/35 text-white">
                    <span className={cn("flex h-14 w-14 items-center justify-center rounded-full shadow-lg", right ? "bg-emerald-500" : "bg-rose-500")}>
                      {right ? <Check size={30} strokeWidth={3} /> : <X size={30} strokeWidth={3} />}
                    </span>
                    <p className="mt-2 font-display text-3xl font-extrabold">{years(age(a.dob))}</p>
                    <p className="text-xs font-semibold text-white/85">{a.dob.slice(0, 4)}</p>
                  </div>
                )}
              </div>
            </button>
          );
        })}
        <span className="pointer-events-none absolute left-1/2 top-1/2 flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-forest font-display text-sm font-extrabold text-white shadow-lift ring-4 ring-white">VS</span>
      </div>

      <div className="mt-5 min-h-[5.5rem] text-center">
        {picked === null ? (
          <p className="font-display text-lg font-extrabold text-forest">{km ? "ចុចលើសត្វដែលចាស់ជាង" : "Tap the older animal"}</p>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <p className={cn("font-display text-xl font-extrabold", over ? "text-rose-600" : "text-emerald-600")}>
              {over ? (km ? `ខុសហើយ! អ្នកត្រូវបាន ${streak} ដងជាប់ៗគ្នា` : `Oops! You got ${streak} in a row`) : km ? "ត្រូវហើយ! ពូកែណាស់" : "Correct! Well done"}
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              <button onClick={next} className="btn-primary">
                {over ? <RotateCcw size={17} /> : <ArrowRight size={17} />} {over ? (km ? "លេងម្តងទៀត" : "Play again") : km ? "បន្ទាប់" : "Next"}
              </button>
              <Link href={`/animals/${pair[older].code}`} className="btn-outline">
                {km ? `ស្គាល់ ${pair[older].name}` : `Meet ${pair[older].name}`}
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
