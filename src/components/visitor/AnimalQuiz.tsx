"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Check, X, Trophy, RotateCcw, Sparkles, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useI18n } from "@/lib/i18n/client";

export interface QuizAnimal {
  code: string;
  name: string;
  name_km: string | null;
  species: string | null;
  species_km: string | null;
  image: string;
}

const ROUNDS = 5;

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function makeRounds(animals: QuizAnimal[]) {
  return shuffle(animals)
    .slice(0, Math.min(ROUNDS, animals.length))
    .map((answer) => ({ answer, options: shuffle([answer, ...shuffle(animals.filter((a) => a.code !== answer.code)).slice(0, 3)]) }));
}

// "Who is this?" photo quiz built from the zoo's own animals. Answers are
// shown by species (e.g. "African Lion"), in the visitor's language.
export function AnimalQuiz({ animals }: { animals: QuizAnimal[] }) {
  const { locale, t } = useI18n();
  const x = t.extra;
  const [seed, setSeed] = useState(0);
  const rounds = useMemo(() => makeRounds(animals), [animals, seed]);
  const [started, setStarted] = useState(false);
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);

  const label = (a: QuizAnimal) => (locale === "km" ? a.species_km || a.species || a.name_km || a.name : a.species || a.name);

  function restart() {
    setSeed((s) => s + 1);
    setI(0);
    setPicked(null);
    setScore(0);
    setFinished(false);
    setStarted(true);
  }

  if (animals.length < 4) return null;

  if (!started) {
    return (
      <div className="card mx-auto max-w-xl overflow-hidden text-center">
        <div className="grid grid-cols-4 gap-1">
          {animals.slice(0, 8).map((a) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={a.code} src={a.image} alt="" className="aspect-square w-full object-cover" />
          ))}
        </div>
        <div className="p-7">
          <Sparkles className="mx-auto text-accent" size={32} />
          <p className="mt-2 text-ink/65">{x.quizSubtitle}</p>
          <button onClick={restart} className="btn-primary mt-5 px-8 py-3.5 text-base hover:translate-y-0">
            {x.start} <ArrowRight size={18} />
          </button>
        </div>
      </div>
    );
  }

  if (finished) {
    const ratio = score / rounds.length;
    return (
      <div className="card mx-auto max-w-xl p-8 text-center animate-[quizPop_.5s_ease]">
        <span className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-accent to-leaf text-forest shadow-lift">
          <Trophy size={40} />
        </span>
        <h2 className="mt-4 font-display text-3xl font-extrabold text-forest">{x.score(score, rounds.length)}</h2>
        <p className="mt-2 text-ink/65">{ratio === 1 ? x.perfect : ratio >= 0.6 ? x.good : x.tryAgain}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button onClick={restart} className="btn-primary hover:translate-y-0">
            <RotateCcw size={16} /> {x.playAgain}
          </button>
          <Link href="/animals" className="btn-outline">
            {x.browseAnimals}
          </Link>
        </div>
        <style>{`@keyframes quizPop{from{opacity:0;transform:scale(.9)}to{opacity:1;transform:none}}`}</style>
      </div>
    );
  }

  const round = rounds[i];
  const correct = picked === round.answer.code;

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-3 flex items-center justify-between text-sm font-semibold text-ink/55">
        <span>{x.question(i + 1, rounds.length)}</span>
        <span className="rounded-full bg-light-green px-3 py-1 font-bold text-primary">★ {score}</span>
      </div>
      <div className="mb-4 h-2 overflow-hidden rounded-full bg-light-green">
        <div className="h-full rounded-full bg-gradient-to-r from-primary to-leaf transition-all duration-500" style={{ width: `${((i + (picked ? 1 : 0)) / rounds.length) * 100}%` }} />
      </div>

      <div key={i} className="card overflow-hidden animate-[quizIn_.4s_ease]">
        <div className="relative aspect-[16/10] bg-light-green">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={round.answer.image} alt="" className="h-full w-full object-cover" />
          <span className="absolute left-4 top-4 rounded-full bg-white/90 px-4 py-1.5 font-display text-lg font-bold text-forest shadow-soft">{x.whoIsThis}</span>
          {picked && (
            <span
              className={cn(
                "absolute inset-x-4 bottom-4 rounded-2xl px-4 py-3 text-center font-display text-lg font-bold text-white shadow-lift animate-[quizIn_.3s_ease]",
                correct ? "bg-primary" : "bg-red-500"
              )}
            >
              {correct ? x.correct : x.wrong(label(round.answer))}
            </span>
          )}
        </div>
        <div className="grid gap-2 p-4 sm:grid-cols-2">
          {round.options.map((o) => {
            const isAnswer = o.code === round.answer.code;
            const isPicked = o.code === picked;
            return (
              <button
                key={o.code}
                disabled={!!picked}
                onClick={() => {
                  setPicked(o.code);
                  if (isAnswer) setScore((s) => s + 1);
                }}
                className={cn(
                  "flex items-center justify-between gap-2 rounded-2xl border-2 px-4 py-3 text-left font-semibold transition",
                  !picked && "border-black/10 bg-white hover:border-primary hover:bg-light-green",
                  picked && isAnswer && "border-primary bg-light-green text-primary",
                  picked && isPicked && !isAnswer && "border-red-400 bg-red-50 text-red-700 animate-[shake_.4s]",
                  picked && !isAnswer && !isPicked && "border-black/5 opacity-50"
                )}
              >
                {label(o)}
                {picked && isAnswer && <Check size={18} />}
                {picked && isPicked && !isAnswer && <X size={18} />}
              </button>
            );
          })}
        </div>
        {picked && (
          <div className="flex justify-end border-t border-black/5 p-4">
            <button
              onClick={() => {
                if (i + 1 >= rounds.length) setFinished(true);
                else {
                  setI(i + 1);
                  setPicked(null);
                }
              }}
              className="btn-primary hover:translate-y-0"
            >
              {i + 1 >= rounds.length ? x.finish : x.nextQuestion} <ArrowRight size={16} />
            </button>
          </div>
        )}
      </div>
      <style>{`@keyframes quizIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}@keyframes shake{0%,100%{transform:none}25%{transform:translateX(-6px)}75%{transform:translateX(6px)}}`}</style>
    </div>
  );
}
