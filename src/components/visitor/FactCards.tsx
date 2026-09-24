"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Lightbulb, ArrowRight, ArrowLeft, Sparkles, Check } from "lucide-react";
import { useI18n } from "@/lib/i18n/client";
import { cn } from "@/lib/utils/cn";

export type Fact = { code: string; name: string; image: string; text: string };

const TEXT = {
  en: { of: (a: number, b: number) => `Fact ${a} of ${b}`, knew: "I knew that", newToMe: "New to me!", learned: (n: number) => `You learned ${n} new ${n === 1 ? "fact" : "facts"} today`, meet: "Meet", next: "Next", prev: "Back", done: "You read every fact! Come and see these animals for real." },
  km: { of: (a: number, b: number) => `ចំណេះដឹងទី ${a} នៃ ${b}`, knew: "ខ្ញុំដឹងហើយ", newToMe: "ទើបដឹង!", learned: (n: number) => `ថ្ងៃនេះអ្នកបានរៀនចំណេះដឹងថ្មី ${n}`, meet: "ទៅជួប", next: "បន្ទាប់", prev: "ថយក្រោយ", done: "អ្នកអានចំណេះដឹងទាំងអស់ហើយ! មកមើលសត្វទាំងនេះផ្ទាល់ណា។" },
};

/** "Did you know?" cards, one at a time, from our animals' own fact sheets. */
export function FactCards({ facts }: { facts: Fact[] }) {
  const { locale } = useI18n();
  const L = TEXT[locale === "km" ? "km" : "en"];
  const [order, setOrder] = useState<Fact[]>(facts);
  const [i, setI] = useState(0);
  const [learned, setLearned] = useState<Set<number>>(new Set());
  const [answered, setAnswered] = useState<Set<number>>(new Set());

  // Shuffle in the browser only, so every visit starts with a surprise.
  useEffect(() => {
    const a = [...facts];
    for (let k = a.length - 1; k > 0; k--) {
      const j = Math.floor(Math.random() * (k + 1));
      [a[k], a[j]] = [a[j], a[k]];
    }
    setOrder(a);
  }, [facts]);

  if (!order.length) return null;
  const f = order[i];
  const mark = (isNew: boolean) => {
    setAnswered((s) => new Set(s).add(i));
    if (isNew) setLearned((s) => new Set(s).add(i));
    if (i < order.length - 1) setTimeout(() => setI(i + 1), 250);
  };

  return (
    <div className="mx-auto max-w-lg">
      <div className="mb-3 flex items-center justify-between text-sm font-bold">
        <span className="text-ink/55">{L.of(i + 1, order.length)}</span>
        <span className="inline-flex items-center gap-1 rounded-full bg-light-green px-3 py-1 text-primary">
          <Sparkles size={14} /> {learned.size}
        </span>
      </div>
      <div className="mb-4 h-2 overflow-hidden rounded-full bg-light-green">
        <div className="h-full rounded-full bg-gradient-to-r from-accent to-primary transition-all duration-500" style={{ width: `${(answered.size / order.length) * 100}%` }} />
      </div>
      <div key={i} className="overflow-hidden rounded-[2rem] bg-white shadow-lift animate-[gwzDrop_.35s_ease]">
        <div className="relative aspect-[16/10]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={f.image} alt="" className="h-full w-full object-cover" />
          <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-accent px-3 py-1.5 text-sm font-extrabold text-forest shadow-soft">
            <Lightbulb size={16} /> {locale === "km" ? "តើអ្នកដឹងទេ?" : "Did you know?"}
          </span>
        </div>
        <div className="p-5">
          <p className="font-display text-xl font-bold leading-snug text-forest sm:text-2xl">{f.text}</p>
          <Link href={`/animals/${f.code}`} className="mt-3 inline-flex items-center gap-1 text-sm font-bold text-primary">
            {L.meet} {f.name} <ArrowRight size={15} />
          </Link>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <button onClick={() => mark(false)} className={cn("btn-outline justify-center bg-white", answered.has(i) && !learned.has(i) && "border-primary bg-light-green")}>
              <Check size={16} /> {L.knew}
            </button>
            <button onClick={() => mark(true)} className={cn("btn-primary justify-center hover:translate-y-0", learned.has(i) && "ring-4 ring-accent")}>
              <Sparkles size={16} /> {L.newToMe}
            </button>
          </div>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between">
        <button onClick={() => setI(Math.max(0, i - 1))} disabled={i === 0} className="inline-flex items-center gap-1 rounded-full px-3 py-2 text-sm font-bold text-forest disabled:opacity-30">
          <ArrowLeft size={16} /> {L.prev}
        </button>
        <button onClick={() => setI(Math.min(order.length - 1, i + 1))} disabled={i === order.length - 1} className="inline-flex items-center gap-1 rounded-full px-3 py-2 text-sm font-bold text-forest disabled:opacity-30">
          {L.next} <ArrowRight size={16} />
        </button>
      </div>
      {learned.size > 0 && <p className="mt-2 text-center font-display text-lg font-bold text-primary">{L.learned(learned.size)}</p>}
      {answered.size === order.length && <p className="mt-2 rounded-2xl bg-light-green p-3 text-center font-semibold text-forest">{L.done}</p>}
    </div>
  );
}
