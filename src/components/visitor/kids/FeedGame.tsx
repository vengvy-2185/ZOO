"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Beef, Fish, Banana, Leaf, Shell, Wheat, Bug, Sprout, Check, X, RotateCcw, Trophy, ArrowRight, type LucideIcon } from "lucide-react";
import { useI18n } from "@/lib/i18n/client";
import { cn } from "@/lib/utils/cn";
import type { QuizAnimal } from "../AnimalQuiz";

type FoodKey = "meat" | "fish" | "fruit" | "leaves" | "bamboo" | "shrimp" | "seeds" | "insects";
const FOODS: Record<FoodKey, { Icon: LucideIcon; en: string; km: string; color: string }> = {
  meat: { Icon: Beef, en: "Meat", km: "សាច់", color: "#E63946" },
  fish: { Icon: Fish, en: "Fish", km: "ត្រី", color: "#1D6FA3" },
  fruit: { Icon: Banana, en: "Fruit", km: "ផ្លែឈើ", color: "#F4A62A" },
  leaves: { Icon: Leaf, en: "Leaves and grass", km: "ស្លឹកឈើ និងស្មៅ", color: "#2E8B57" },
  bamboo: { Icon: Sprout, en: "Bamboo", km: "ឫស្សី", color: "#7FBF6A" },
  shrimp: { Icon: Shell, en: "Tiny shrimp", km: "បង្គាតូចៗ", color: "#F472B6" },
  seeds: { Icon: Wheat, en: "Seeds and grain", km: "គ្រាប់ធញ្ញជាតិ", color: "#C9A66B" },
  insects: { Icon: Bug, en: "Insects", km: "សត្វល្អិត", color: "#8B5A2B" },
};

// What each kind of animal eats (matched on the species' English name), with a fun fact.
const DIETS: { re: RegExp; food: FoodKey; en: string; km: string }[] = [
  // most specific first
  { re: /flamingo/i, food: "shrimp", en: "Flamingos are pink because of the tiny shrimp they eat!", km: "ក្រៀលផ្កាឈូកមានពណ៌ផ្កាឈូក ដោយសារវាស៊ីបង្គាតូចៗ!" },
  { re: /seahorse|clownfish|blue tang|jellyfish|stingray|zebra shark|octopus/i, food: "shrimp", en: "It eats tiny shrimp and other small sea animals.", km: "វាស៊ីបង្គាតូចៗ និងសត្វសមុទ្រតូចៗផ្សេងទៀត។" },
  { re: /bald eagle|water monitor|gharial|stork|adjutant|shark|penguin|seal|otter|pelican|dolphin/i, food: "fish", en: "It catches fish, its favourite meal.", km: "វាចាប់ត្រី ដែលជាអាហារចូលចិត្តបំផុតរបស់វា។" },
  { re: /panda/i, food: "bamboo", en: "It munches bamboo leaves almost all day.", km: "វាស៊ីស្លឹកឫស្សីស្ទើរពេញមួយថ្ងៃ។" },
  { re: /macaw|parrot|monkey|gibbon|orangutan|chimp|gorilla|lemur|macaque|marmoset|hornbill|cockatoo|lorikeet|cassowary|toucan|binturong|sun bear|black bear|beetle/i, food: "fruit", en: "It loves sweet fruit.", km: "វាចូលចិត្តផ្លែឈើផ្អែម។" },
  { re: /peacock|peafowl|junglefowl|chicken|pigeon|dove|ostrich|emu|duck|crane/i, food: "seeds", en: "It pecks seeds and grain.", km: "វាចឹកគ្រាប់ និងធញ្ញជាតិ។" },
  { re: /crocodile|alligator|lion|tiger|leopard|cheetah|jaguar|puma|wolf|dhole|fox|eagle|hyena|owl|cobra|python|komodo/i, food: "meat", en: "It is a meat eater, a real hunter!", km: "វាជាសត្វស៊ីសាច់ ជាអ្នកប្រមាញ់ពិតប្រាកដ!" },
  { re: /elephant|giraffe|zebra|rhino|hippo|deer|kangaroo|koala|tortoise|turtle|goat|banteng|gaur|tapir|sloth|capybara|iguana|swan|catfish|boar|stick insect/i, food: "leaves", en: "It eats plants: leaves, grass and branches.", km: "វាស៊ីរុក្ខជាតិ៖ ស្លឹកឈើ ស្មៅ និងមែកឈើ។" },
  { re: /anteater|pangolin|frog|toad|gecko|lizard|meerkat|chameleon|loris|axolotl|arowana/i, food: "insects", en: "It eats lots of little insects.", km: "វាស៊ីសត្វល្អិតតូចៗច្រើនណាស់។" },
];

const TEXT = {
  en: { q: (n: string) => `What does ${n} eat?`, right: "Yummy! That's right!", wrong: "Oops, not that one!", next: "Next animal", again: "Play again", done: (s: number, t: number) => `You fed ${s} of ${t} animals correctly!`, visit: "Come and watch feeding time at the zoo", round: (i: number, n: number) => `${i} / ${n}` },
  km: { q: (n: string) => `តើ${n}ស៊ីអ្វី?`, right: "ឆ្ងាញ់! ត្រូវហើយ!", wrong: "អូ៎ មិនមែនមួយនេះទេ!", next: "សត្វបន្ទាប់", again: "លេងម្តងទៀត", done: (s: number, t: number) => `អ្នកឲ្យចំណីត្រឹមត្រូវ ${s} លើ ${t} ក្បាល!`, visit: "មកមើលពេលឲ្យចំណីសត្វផ្ទាល់នៅសួនសត្វ", round: (i: number, n: number) => `${i} / ${n}` },
};

function shuffle<T>(a: T[]) {
  const b = [...a];
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [b[i], b[j]] = [b[j], b[i]];
  }
  return b;
}

/** "Feed the animals": pick the right food for each of the zoo's animals. */
export function FeedGame({ animals }: { animals: QuizAnimal[] }) {
  const { locale } = useI18n();
  const km = locale === "km";
  const L = TEXT[km ? "km" : "en"];
  const [seed, setSeed] = useState(0);
  type Round = { a: QuizAnimal; diet: (typeof DIETS)[number]; options: FoodKey[] };
  const [rounds, setRounds] = useState<Round[]>([]);
  useEffect(() => {
    const known = animals
      .map((a) => ({ a, diet: DIETS.find((d) => d.re.test(a.species ?? "") || d.re.test(a.name)) }))
      .filter((x): x is { a: QuizAnimal; diet: (typeof DIETS)[number] } => !!x.diet);
    setRounds(
      shuffle(known).slice(0, 10).map((x) => ({
        ...x,
        options: shuffle([x.diet.food, ...shuffle((Object.keys(FOODS) as FoodKey[]).filter((f) => f !== x.diet.food)).slice(0, 3)]),
      }))
    );
  }, [animals, seed]);
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<FoodKey | null>(null);
  const [score, setScore] = useState(0);

  if (!rounds.length) return null;
  const done = i >= rounds.length;

  if (done) {
    return (
      <div className="card mx-auto max-w-md p-7 text-center">
        <Trophy size={44} className="mx-auto text-accent" />
        <p className="mt-3 font-display text-2xl font-extrabold text-forest">{L.done(score, rounds.length)}</p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <button onClick={() => (setSeed((s) => s + 1), setI(0), setScore(0), setPicked(null))} className="btn-primary hover:translate-y-0">
            <RotateCcw size={16} /> {L.again}
          </button>
          <Link href="/events" className="btn-outline">
            {L.visit} <ArrowRight size={15} />
          </Link>
        </div>
      </div>
    );
  }

  const r = rounds[i];
  const name = km ? r.a.name_km || r.a.name : r.a.name;
  const right = picked === r.diet.food;

  return (
    <div className="mx-auto max-w-xl">
      <div className="mb-3 flex justify-between text-sm font-bold text-ink/55">
        <span>{L.round(i + 1, rounds.length)}</span>
        <span className="rounded-full bg-light-green px-3 py-1 text-primary">{score}</span>
      </div>
      <div key={i} className="card overflow-hidden animate-[gwzDrop_.35s_ease]">
        <div className="relative aspect-[16/10]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={r.a.image} alt="" className="h-full w-full object-cover" />
          <p className="absolute inset-x-3 bottom-3 rounded-2xl bg-white/90 px-4 py-2.5 text-center font-display text-xl font-extrabold text-forest backdrop-blur">{L.q(name)}</p>
        </div>
        <div className="grid grid-cols-2 gap-2 p-3 sm:p-4">
          {r.options.map((f) => {
            const F = FOODS[f];
            const isAnswer = f === r.diet.food;
            return (
              <button
                key={f}
                disabled={!!picked}
                onClick={() => {
                  setPicked(f);
                  if (f === r.diet.food) setScore((s) => s + 1);
                }}
                className={cn(
                  "flex items-center gap-2.5 rounded-2xl border-2 p-2.5 text-left font-bold transition active:scale-[.97]",
                  !picked && "border-black/10 bg-white hover:border-primary",
                  picked && isAnswer && "border-primary bg-light-green",
                  picked && picked === f && !isAnswer && "border-red-400 bg-red-50",
                  picked && !isAnswer && picked !== f && "border-black/5 opacity-40"
                )}
              >
                <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl text-white" style={{ background: F.color }}>
                  <F.Icon size={22} />
                </span>
                <span className="min-w-0 text-sm leading-snug text-forest">{km ? F.km : F.en}</span>
                {picked && isAnswer && <Check size={18} className="ml-auto flex-shrink-0 text-primary" />}
                {picked === f && !isAnswer && <X size={18} className="ml-auto flex-shrink-0 text-red-500" />}
              </button>
            );
          })}
        </div>
        {picked && (
          <div className="border-t border-black/5 p-4">
            <p className={cn("font-display text-lg font-extrabold", right ? "text-primary" : "text-red-600")}>{right ? L.right : L.wrong}</p>
            <p className="text-sm text-ink/70">{km ? r.diet.km : r.diet.en}</p>
            <button onClick={() => (setI(i + 1), setPicked(null))} className="btn-primary mt-3 w-full justify-center hover:translate-y-0">
              {L.next} <ArrowRight size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
