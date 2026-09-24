"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Check, X, Trophy, RotateCcw, ZoomOut, ArrowRight, Eye } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useI18n } from "@/lib/i18n/client";
import type { QuizAnimal } from "./AnimalQuiz";

const ROUNDS = 6;
// Zoom steps: the photo starts very close and pulls back. Guessing earlier earns more points.
const STEPS = [5, 3.2, 2, 1];
const POINTS = [4, 3, 2, 1];
const STEP_MS = 3500;
const BEST_KEY = "gwz_zoom_best";

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
    .map((answer) => ({
      answer,
      options: shuffle([answer, ...shuffle(animals.filter((a) => a.code !== answer.code)).slice(0, 3)]),
      // a random spot to zoom into, kept away from the edges
      focus: { x: 25 + Math.random() * 50, y: 25 + Math.random() * 50 },
    }));
}

/** "Zoom Guess": a close-up of an animal slowly zooms out. Guess it early for more points. */
export function ZoomGuess({ animals }: { animals: QuizAnimal[] }) {
  const { locale, t } = useI18n();
  const g = t.guess;
  const [seed, setSeed] = useState(0);
  const rounds = useMemo(() => makeRounds(animals), [animals, seed]);
  const [phase, setPhase] = useState<"intro" | "play" | "done">("intro");
  const [i, setI] = useState(0);
  const [step, setStep] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [gained, setGained] = useState(0);
  const [best, setBest] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const label = (a: QuizAnimal) => (locale === "km" ? a.species_km || a.species || a.name_km || a.name : a.species || a.name);

  useEffect(() => {
    try {
      setBest(Number(localStorage.getItem(BEST_KEY)) || 0);
    } catch {
      /* ignore */
    }
  }, []);

  // Pull the camera back one step every few seconds until the player answers.
  useEffect(() => {
    if (phase !== "play" || picked) return;
    timer.current = setInterval(() => setStep((s) => Math.min(s + 1, STEPS.length - 1)), STEP_MS);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [phase, picked, i]);

  function start() {
    setSeed((s) => s + 1);
    setI(0);
    setStep(0);
    setPicked(null);
    setScore(0);
    setPhase("play");
  }

  function choose(code: string) {
    if (picked) return;
    const round = rounds[i];
    const pts = code === round.answer.code ? POINTS[step] : 0;
    setPicked(code);
    setGained(pts);
    setScore((s) => s + pts);
    setStep(STEPS.length - 1); // show the whole animal
  }

  function next() {
    if (i + 1 >= rounds.length) {
      if (score > best) {
        setBest(score);
        try {
          localStorage.setItem(BEST_KEY, String(score));
        } catch {
          /* ignore */
        }
      }
      setPhase("done");
      return;
    }
    setI(i + 1);
    setStep(0);
    setPicked(null);
  }

  if (animals.length < 4) return null;
  const max = rounds.length * POINTS[0];

  if (phase === "intro") {
    return (
      <div className="card mx-auto max-w-xl overflow-hidden text-center">
        <div className="relative aspect-[16/9] overflow-hidden bg-forest">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={animals[0].image} alt="" className="h-full w-full scale-[3] object-cover blur-[1px] animate-[zgPulse_6s_ease-in-out_infinite]" />
          <div className="absolute inset-0 flex items-center justify-center bg-forest/30">
            <span className="flex h-20 w-20 items-center justify-center rounded-full bg-white/90 text-forest shadow-lift">
              <Eye size={36} />
            </span>
          </div>
        </div>
        <div className="p-7">
          <ul className="mx-auto max-w-sm space-y-2 text-left text-[15px] text-ink/70">
            {g.rules.map((r, n) => (
              <li key={n} className="flex gap-3">
                <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-light-green text-xs font-bold text-primary">{n + 1}</span>
                {r}
              </li>
            ))}
          </ul>
          {best > 0 && <p className="mt-4 text-sm font-semibold text-primary">{g.best(best)}</p>}
          <button onClick={start} className="btn-primary mt-5 px-8 py-3.5 text-base hover:translate-y-0">
            {g.start} <ArrowRight size={18} />
          </button>
        </div>
        <style>{`@keyframes zgPulse{0%,100%{transform:scale(3)}50%{transform:scale(2.4)}}`}</style>
      </div>
    );
  }

  if (phase === "done") {
    const ratio = score / max;
    return (
      <div className="card mx-auto max-w-xl p-8 text-center animate-[gwzDrop_.4s_ease]">
        <span className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-accent to-leaf text-forest shadow-lift">
          <Trophy size={40} />
        </span>
        <h2 className="mt-4 font-display text-3xl font-extrabold text-forest">{g.score(score, max)}</h2>
        <p className="mt-2 text-ink/65">{ratio >= 0.75 ? g.eagle : ratio >= 0.4 ? g.good : g.tryAgain}</p>
        <p className="mt-1 text-sm font-semibold text-primary">{g.best(Math.max(best, score))}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button onClick={start} className="btn-primary hover:translate-y-0">
            <RotateCcw size={16} /> {g.playAgain}
          </button>
          <Link href="/quiz" className="btn-outline">
            {g.otherGame}
          </Link>
        </div>
      </div>
    );
  }

  const round = rounds[i];
  const correct = picked === round.answer.code;
  const zoom = STEPS[step];

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-3 flex items-center justify-between text-sm font-semibold text-ink/55">
        <span>{g.round(i + 1, rounds.length)}</span>
        <span className="rounded-full bg-light-green px-3 py-1 font-bold text-primary">{g.points(score)}</span>
      </div>
      <div className="mb-4 h-2 overflow-hidden rounded-full bg-light-green">
        <div className="h-full rounded-full bg-gradient-to-r from-primary to-leaf transition-all duration-500" style={{ width: `${((i + (picked ? 1 : 0)) / rounds.length) * 100}%` }} />
      </div>

      <div key={i} className="card overflow-hidden">
        <div className="relative aspect-[4/3] overflow-hidden bg-forest sm:aspect-[16/10]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={round.answer.image}
            alt=""
            draggable={false}
            className="h-full w-full select-none object-cover transition-transform duration-[1200ms] ease-out"
            style={{ transform: `scale(${zoom})`, transformOrigin: `${round.focus.x}% ${round.focus.y}%` }}
          />
          <span className="absolute left-3 top-3 rounded-full bg-white/90 px-3.5 py-1.5 text-sm font-bold text-forest shadow-soft">
            {picked ? label(round.answer) : g.worth(POINTS[step])}
          </span>
          {!picked && step < STEPS.length - 1 && (
            <button
              onClick={() => setStep((s) => Math.min(s + 1, STEPS.length - 1))}
              className="absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-black/45 px-3.5 py-1.5 text-sm font-bold text-white backdrop-blur hover:bg-black/60"
            >
              <ZoomOut size={16} /> {g.zoomOut}
            </button>
          )}
          {picked && (
            <span className={cn("absolute inset-x-3 bottom-3 rounded-2xl px-4 py-3 text-center font-display text-lg font-bold text-white shadow-lift animate-[gwzDrop_.3s_ease]", correct ? "bg-primary" : "bg-red-500")}>
              {correct ? g.correct(gained) : g.wrong(label(round.answer))}
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2 p-3 sm:p-4">
          {round.options.map((o) => {
            const isAnswer = o.code === round.answer.code;
            const isPicked = o.code === picked;
            return (
              <button
                key={o.code}
                disabled={!!picked}
                onClick={() => choose(o.code)}
                className={cn(
                  "flex min-h-[3.25rem] items-center justify-between gap-2 rounded-2xl border-2 px-3.5 py-2.5 text-left text-[15px] font-semibold transition",
                  !picked && "border-black/10 bg-white hover:border-primary hover:bg-light-green active:scale-[.98]",
                  picked && isAnswer && "border-primary bg-light-green text-primary",
                  picked && isPicked && !isAnswer && "border-red-400 bg-red-50 text-red-700",
                  picked && !isAnswer && !isPicked && "border-black/5 opacity-50"
                )}
              >
                <span className="min-w-0">{label(o)}</span>
                {picked && isAnswer && <Check size={18} className="flex-shrink-0" />}
                {picked && isPicked && !isAnswer && <X size={18} className="flex-shrink-0" />}
              </button>
            );
          })}
        </div>
        {picked && (
          <div className="flex justify-end border-t border-black/5 p-3 sm:p-4">
            <button onClick={next} className="btn-primary hover:translate-y-0">
              {i + 1 >= rounds.length ? g.finish : g.next} <ArrowRight size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
