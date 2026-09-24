"use client";

import { useEffect, useMemo, useState } from "react";
import { RotateCcw, Trophy, Eye } from "lucide-react";
import { useI18n } from "@/lib/i18n/client";
import { cn } from "@/lib/utils/cn";
import type { QuizAnimal } from "../AnimalQuiz";

const TEXT = {
  en: { pick: "Pick a photo", size: "Pieces", tip: "Tap two pieces to swap them. Put the picture back together!", moves: "Moves", peek: "Peek", again: "Mix again", won: (n: string, m: number) => `Well done! You rebuilt ${n} in ${m} moves.` },
  km: { pick: "ជ្រើសរូប", size: "ចំនួនបំណែក", tip: "ចុចបំណែកពីរ ដើម្បីប្តូរកន្លែងគ្នា។ ផ្គុំរូបឲ្យបានត្រឹមត្រូវ!", moves: "ចំនួនប្តូរ", peek: "មើលរូបពេញ", again: "លាយម្តងទៀត", won: (n: string, m: number) => `ពូកែណាស់! អ្នកផ្គុំរូប${n}បានក្នុង ${m} ដង។` },
};

function mixed(n: number) {
  const order = Array.from({ length: n * n }, (_, i) => i);
  do {
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
  } while (order.every((v, i) => v === i));
  return order;
}

/** A photo jigsaw: tap two tiles to swap them until the animal is whole again. */
export function AnimalPuzzle({ animals }: { animals: QuizAnimal[] }) {
  const { locale } = useI18n();
  const L = TEXT[locale === "km" ? "km" : "en"];
  const [pick, setPick] = useState(animals[0]?.code);
  const [n, setN] = useState(3);
  const [seed, setSeed] = useState(0);
  const [tiles, setTiles] = useState<number[]>([]);
  const [sel, setSel] = useState<number | null>(null);
  const [moves, setMoves] = useState(0);
  const [peek, setPeek] = useState(false);
  const animal = animals.find((a) => a.code === pick) ?? animals[0];
  const solved = useMemo(() => tiles.length > 0 && tiles.every((v, i) => v === i), [tiles]);

  useEffect(() => {
    setTiles(mixed(n));
    setSel(null);
    setMoves(0);
  }, [n, pick, seed]);

  function tap(i: number) {
    if (solved) return;
    if (sel === null) return setSel(i);
    if (sel === i) return setSel(null);
    const t = [...tiles];
    [t[sel], t[i]] = [t[i], t[sel]];
    setTiles(t);
    setSel(null);
    setMoves((m) => m + 1);
  }

  if (!animal) return null;
  const name = locale === "km" ? animal.name_km || animal.name : animal.name;

  return (
    <div className="mx-auto max-w-xl">
      <p className="mb-2 text-sm font-bold text-forest">{L.pick}</p>
      <div className="no-scrollbar -mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
        {animals.map((a) => (
          <button key={a.code} onClick={() => setPick(a.code)} className={cn("h-14 w-14 flex-shrink-0 overflow-hidden rounded-2xl ring-2 transition", pick === a.code ? "ring-primary" : "ring-transparent opacity-70")}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={a.image} alt="" className="h-full w-full object-cover" />
          </button>
        ))}
      </div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1 rounded-full bg-white p-1 shadow-soft">
          <span className="px-2 text-xs font-bold text-ink/50">{L.size}</span>
          {[3, 4].map((k) => (
            <button key={k} onClick={() => setN(k)} className={cn("rounded-full px-3 py-1.5 text-sm font-bold", n === k ? "bg-primary text-white" : "text-forest")}>
              {k * k}
            </button>
          ))}
        </div>
        <span className="rounded-full bg-light-green px-3 py-1.5 text-sm font-bold text-primary">
          {L.moves} {moves}
        </span>
      </div>
      <p className="mb-3 text-sm text-ink/60">{L.tip}</p>
      <div className="relative mx-auto aspect-square w-full overflow-hidden rounded-[1.5rem] bg-white p-1.5 shadow-lift">
        <div className="grid h-full w-full gap-1" style={{ gridTemplateColumns: `repeat(${n}, 1fr)` }}>
          {tiles.map((v, i) => (
            <button
              key={i}
              onClick={() => tap(i)}
              className={cn("relative overflow-hidden rounded-lg transition", sel === i ? "z-10 scale-95 ring-4 ring-accent" : "", solved && "rounded-none")}
              style={{
                backgroundImage: `url(${animal.image})`,
                backgroundSize: `${n * 100}% ${n * 100}%`,
                backgroundPosition: `${((v % n) / (n - 1)) * 100}% ${(Math.floor(v / n) / (n - 1)) * 100}%`,
              }}
              aria-label={`piece ${i + 1}`}
            />
          ))}
        </div>
        {peek && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={animal.image} alt="" className="absolute inset-1.5 h-[calc(100%-0.75rem)] w-[calc(100%-0.75rem)] rounded-[1.2rem] object-cover" />
        )}
      </div>
      <div className="mt-3 flex justify-center gap-2">
        <button onPointerDown={() => setPeek(true)} onPointerUp={() => setPeek(false)} onPointerLeave={() => setPeek(false)} className="btn-outline bg-white">
          <Eye size={16} /> {L.peek}
        </button>
        <button onClick={() => setSeed((s) => s + 1)} className="btn-outline bg-white">
          <RotateCcw size={16} /> {L.again}
        </button>
      </div>
      {solved && (
        <div className="mt-4 rounded-3xl bg-gradient-to-r from-accent to-leaf p-5 text-center text-forest shadow-lift animate-[gwzDrop_.4s_ease]">
          <Trophy size={34} className="mx-auto" />
          <p className="mt-2 font-display text-lg font-extrabold">{L.won(name, moves)}</p>
        </div>
      )}
    </div>
  );
}
