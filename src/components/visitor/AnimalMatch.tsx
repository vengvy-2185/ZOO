"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, RotateCcw, Share2, Sparkles, Check } from "lucide-react";
import { useI18n } from "@/lib/i18n/client";
import { MATCH_QUESTIONS, PERSONALITIES, type PersonalityKey } from "@/lib/data/personality";
import { cn } from "@/lib/utils/cn";

export type MatchResident = { key: PersonalityKey; code: string; name: string; species: string; image: string | null };

/** Six quick questions, then the visitor meets the real resident who shares their personality. */
export function AnimalMatch({ residents }: { residents: MatchResident[] }) {
  const { locale, t } = useI18n();
  const m = t.match;
  const km = locale === "km";
  const L = (l: { en: string; km: string }) => (km ? l.km : l.en);
  const [step, setStep] = useState(0);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [picked, setPicked] = useState<number | null>(null);
  const [shared, setShared] = useState(false);
  const available = useMemo(() => new Set(residents.map((r) => r.key)), [residents]);

  const done = step >= MATCH_QUESTIONS.length;
  const result = useMemo(() => {
    if (!done) return null;
    // Highest score among personalities that have a real resident here.
    const ranked = (Object.keys(PERSONALITIES) as PersonalityKey[])
      .filter((k) => available.has(k))
      .sort((a, b) => (scores[b] ?? 0) - (scores[a] ?? 0));
    const key = ranked[0];
    return key ? { key, p: PERSONALITIES[key], resident: residents.find((r) => r.key === key)! } : null;
  }, [done, scores, available, residents]);

  function answer(i: number) {
    if (picked !== null) return;
    setPicked(i);
    const pts = MATCH_QUESTIONS[step].answers[i].points;
    setTimeout(() => {
      setScores((s) => {
        const next = { ...s };
        pts.forEach((k, idx) => (next[k] = (next[k] ?? 0) + (idx === 0 ? 2 : 1)));
        return next;
      });
      setPicked(null);
      setStep((n) => n + 1);
    }, 450);
  }

  async function share() {
    if (!result) return;
    const text = m.shareText(result.resident.name, L(result.p.title));
    const url = `${window.location.origin}/match`;
    try {
      if (navigator.share) await navigator.share({ title: "Green Wild Zoo", text, url });
      else await navigator.clipboard.writeText(`${text} ${url}`);
      setShared(true);
      setTimeout(() => setShared(false), 2000);
    } catch {
      /* cancelled */
    }
  }

  const restart = () => {
    setScores({});
    setStep(0);
  };

  if (result) {
    const { p, resident } = result;
    return (
      <div className="mx-auto max-w-3xl animate-[gwzPop_.5s_ease]">
        <div className="overflow-hidden rounded-[2rem] bg-white shadow-lift ring-1 ring-black/5 md:grid md:grid-cols-2">
          <div className="relative aspect-square md:aspect-auto">
            {resident.image && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={resident.image} alt={resident.name} className="absolute inset-0 h-full w-full object-cover" />
            )}
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-5 text-white">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-leaf">{m.youAre}</p>
              <p className="font-display text-4xl font-extrabold">{resident.name}</p>
              <p className="text-sm text-white/80">{resident.species}</p>
            </div>
          </div>
          <div className="flex flex-col gap-4 p-6 md:p-8">
            <p className="inline-flex w-fit items-center gap-1.5 rounded-full px-3 py-1 text-xs font-extrabold text-white" style={{ background: p.color }}>
              <Sparkles size={13} /> {L(p.title)}
            </p>
            <p className="text-[15px] leading-relaxed text-ink/75">{L(p.text)}</p>
            <div className="flex flex-wrap gap-2">
              {p.traits.map((tr) => (
                <span key={tr.en} className="rounded-full bg-cream px-3 py-1 text-xs font-bold text-forest">
                  {L(tr)}
                </span>
              ))}
            </div>
            <p className="text-sm text-ink/60">{m.visitText(resident.name)}</p>
            <div className="mt-auto flex flex-wrap gap-2">
              <Link href={`/animals/${resident.code}`} className="btn-primary">
                {m.meet(resident.name)} <ArrowRight size={16} />
              </Link>
              <button onClick={share} className="btn-outline bg-white">
                {shared ? <Check size={16} /> : <Share2 size={16} />} {shared ? m.shared : m.share}
              </button>
              <button onClick={restart} className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-bold text-ink/50 hover:text-primary">
                <RotateCcw size={15} /> {m.again}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const q = MATCH_QUESTIONS[step];
  return (
    <div className="mx-auto max-w-2xl">
      {/* progress */}
      <div className="mb-5 flex items-center gap-3">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-cream">
          <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${(step / MATCH_QUESTIONS.length) * 100}%` }} />
        </div>
        <span className="text-xs font-bold text-ink/50">
          {step + 1} / {MATCH_QUESTIONS.length}
        </span>
      </div>
      <div key={step} className="card p-6 animate-[gwzPop_.35s_ease] md:p-8">
        <h2 className="font-display text-2xl font-extrabold text-forest">{L(q.q)}</h2>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {q.answers.map((a, i) => (
            <button
              key={i}
              onClick={() => answer(i)}
              className={cn(
                "rounded-2xl px-4 py-4 text-left text-[15px] font-semibold ring-2 transition",
                picked === i ? "scale-[1.02] bg-primary text-white ring-primary" : "bg-cream text-forest ring-transparent hover:-translate-y-0.5 hover:ring-primary/40"
              )}
            >
              {L(a.a)}
            </button>
          ))}
        </div>
      </div>
      {/* the residents you could be */}
      <div className="mt-6 flex justify-center -space-x-3">
        {residents.slice(0, 10).map((r) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={r.code} src={r.image ?? ""} alt="" className="h-10 w-10 rounded-full border-2 border-white object-cover shadow-soft" />
        ))}
      </div>
      <p className="mt-2 text-center text-xs text-ink/50">{m.whoCouldBe}</p>
    </div>
  );
}
