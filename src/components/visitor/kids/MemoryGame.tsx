"use client";

import { useEffect, useState } from "react";
import { PawPrint, RotateCcw, Trophy, Timer } from "lucide-react";
import { useI18n } from "@/lib/i18n/client";
import { cn } from "@/lib/utils/cn";
import type { QuizAnimal } from "../AnimalQuiz";

const LEVELS = { easy: 4, medium: 6, hard: 8 } as const;
type Level = keyof typeof LEVELS;

const TEXT = {
  en: { levels: { easy: "Easy", medium: "Medium", hard: "Hard" }, moves: "Moves", pairs: "Pairs", again: "Play again", won: (m: number) => `You found every pair in ${m} moves!`, best: (m: number) => `Best: ${m} moves` },
  km: { levels: { easy: "ងាយ", medium: "មធ្យម", hard: "ពិបាក" }, moves: "ចំនួនបើក", pairs: "គូ", again: "លេងម្តងទៀត", won: (m: number) => `អ្នករកឃើញគូទាំងអស់ក្នុង ${m} ដង!`, best: (m: number) => `ល្អបំផុត៖ ${m} ដង` },
};

function shuffle<T>(a: T[]) {
  const b = [...a];
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [b[i], b[j]] = [b[j], b[i]];
  }
  return b;
}

/** Flip two cards; find the matching animal photos. */
export function MemoryGame({ animals }: { animals: QuizAnimal[] }) {
  const { locale } = useI18n();
  const L = TEXT[locale === "km" ? "km" : "en"];
  const [level, setLevel] = useState<Level>("easy");
  const [seed, setSeed] = useState(0);
  const [deck, setDeck] = useState<{ id: number; a: QuizAnimal }[]>([]);
  useEffect(() => {
    const picks = shuffle(animals).slice(0, Math.min(LEVELS[level], animals.length));
    setDeck(shuffle([...picks, ...picks].map((a, i) => ({ id: i, a }))));
  }, [animals, level, seed]);
  const [open, setOpen] = useState<number[]>([]);
  const [found, setFound] = useState<Set<string>>(new Set());
  const [moves, setMoves] = useState(0);
  const [best, setBest] = useState<number | null>(null);
  const pairs = deck.length / 2;
  const won = found.size === pairs && pairs > 0;

  useEffect(() => {
    setOpen([]);
    setFound(new Set());
    setMoves(0);
    try {
      const b = localStorage.getItem(`gwz_memory_${level}`);
      setBest(b ? Number(b) : null);
    } catch {
      /* ignore */
    }
  }, [deck, level]);

  useEffect(() => {
    if (!won) return;
    if (best === null || moves < best) {
      setBest(moves);
      try {
        localStorage.setItem(`gwz_memory_${level}`, String(moves));
      } catch {
        /* ignore */
      }
    }
  }, [won]); // eslint-disable-line react-hooks/exhaustive-deps

  function flip(i: number) {
    if (open.length === 2 || open.includes(i) || found.has(deck[i].a.code)) return;
    const next = [...open, i];
    setOpen(next);
    if (next.length === 2) {
      setMoves((m) => m + 1);
      const [x, y] = next;
      if (deck[x].a.code === deck[y].a.code) {
        setTimeout(() => {
          setFound((f) => new Set(f).add(deck[x].a.code));
          setOpen([]);
        }, 350);
      } else setTimeout(() => setOpen([]), 900);
    }
  }

  const cols = deck.length <= 8 ? "grid-cols-4" : deck.length <= 12 ? "grid-cols-4" : "grid-cols-4 sm:grid-cols-4";
  const name = (a: QuizAnimal) => (locale === "km" ? a.name_km || a.name : a.name);

  return (
    <div className="mx-auto max-w-xl">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-1 rounded-full bg-white p-1 shadow-soft">
          {(Object.keys(LEVELS) as Level[]).map((l) => (
            <button key={l} onClick={() => setLevel(l)} className={cn("rounded-full px-3.5 py-1.5 text-sm font-bold", level === l ? "bg-primary text-white" : "text-forest")}>
              {L.levels[l]}
            </button>
          ))}
        </div>
        <div className="flex gap-2 text-sm font-bold text-forest">
          <span className="rounded-full bg-white px-3 py-1.5 shadow-soft">
            <Timer size={14} className="mr-1 inline" /> {L.moves} {moves}
          </span>
          <span className="rounded-full bg-light-green px-3 py-1.5 text-primary">
            {L.pairs} {found.size}/{pairs}
          </span>
        </div>
      </div>
      <div className={cn("grid gap-2 sm:gap-3", cols)} style={{ perspective: "900px" }}>
        {deck.map((c, i) => {
          const up = open.includes(i) || found.has(c.a.code);
          return (
            <button key={c.id} onClick={() => flip(i)} className="relative aspect-[3/4] w-full" aria-label={up ? name(c.a) : "?"}>
              <span className="absolute inset-0 transition-transform duration-500" style={{ transformStyle: "preserve-3d", transform: up ? "rotateY(180deg)" : "none" }}>
                <span className="absolute inset-0 flex items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-forest text-white shadow-soft ring-2 ring-white" style={{ backfaceVisibility: "hidden" }}>
                  <PawPrint size={30} className="opacity-80" />
                </span>
                <span className={cn("absolute inset-0 overflow-hidden rounded-2xl bg-white shadow-soft ring-2", found.has(c.a.code) ? "ring-leaf" : "ring-white")} style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={c.a.image} alt="" className="h-full w-full object-cover" />
                  <span className="absolute inset-x-0 bottom-0 truncate bg-black/45 px-1 py-0.5 text-center text-[11px] font-bold text-white">{name(c.a)}</span>
                </span>
              </span>
            </button>
          );
        })}
      </div>
      {won && (
        <div className="mt-5 rounded-3xl bg-gradient-to-r from-accent to-leaf p-5 text-center text-forest shadow-lift animate-[gwzDrop_.4s_ease]">
          <Trophy size={36} className="mx-auto" />
          <p className="mt-2 font-display text-xl font-extrabold">{L.won(moves)}</p>
          {best !== null && <p className="text-sm font-semibold">{L.best(best)}</p>}
          <button onClick={() => setSeed((s) => s + 1)} className="btn mt-3 bg-white text-primary hover:translate-y-0">
            <RotateCcw size={16} /> {L.again}
          </button>
        </div>
      )}
      {!won && (
        <div className="mt-4 text-center">
          <button onClick={() => setSeed((s) => s + 1)} className="inline-flex items-center gap-1.5 text-sm font-bold text-primary">
            <RotateCcw size={14} /> {L.again}
          </button>
        </div>
      )}
    </div>
  );
}
