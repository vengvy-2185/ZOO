"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Heart, ImagePlus, Share2, RotateCcw, Loader2, ArrowRight, X } from "lucide-react";
import { useI18n } from "@/lib/i18n/client";
import { cn } from "@/lib/utils/cn";
import { LOGO_SVG } from "./logo-svg";

type Person = { name: string; photo: string | null };

// Result bands: each tied to an animal couple you can visit at the zoo.
const BANDS = [
  { min: 95, en: ["Flamingo love", "Like flamingos dancing in perfect step, you two move as one."], km: ["ស្នេហាក្រៀលផ្កាឈូក", "ដូចក្រៀលផ្កាឈូករាំជាមួយគ្នាយ៉ាងស៊ីចង្វាក់ អ្នកទាំងពីរដូចជាមនុស្សតែម្នាក់។"], q: "flamingo" },
  { min: 88, en: ["Peacock love", "Like a peacock opening his whole tail, one of you would do anything to make the other smile."], km: ["ស្នេហាក្ងោក", "ដូចក្ងោកលាតកន្ទុយទាំងមូល ម្នាក់ក្នុងចំណោមអ្នកនឹងធ្វើគ្រប់យ៉ាងដើម្បីឲ្យម្នាក់ទៀតញញឹម។"], q: "peacock" },
  { min: 80, en: ["Elephant love", "Elephants never forget the ones they love. Neither will you."], km: ["ស្នេហាដំរី", "ដំរីមិនដែលភ្លេចអ្នកដែលវាស្រលាញ់ទេ។ អ្នកទាំងពីរក៏ដូច្នោះដែរ។"], q: "elephant" },
  { min: 72, en: ["Macaw love", "Macaws choose one partner and stay together for life. A loyal, colourful pair!"], km: ["ស្នេហាសេកម៉ាកាវ", "សេកម៉ាកាវជ្រើសដៃគូតែម្នាក់ ហើយនៅជាមួយគ្នារហូតមួយជីវិត។ គូដ៏ស្មោះត្រង់ និងចម្រុះពណ៌!"], q: "macaw" },
  { min: 0, en: ["Red panda love", "A little shy at first, but so sweet once you get close. Give it time!"], km: ["ស្នេហាផេនដាក្រហម", "ខ្មាសបន្តិចនៅដំបូង ប៉ុន្តែផ្អែមណាស់ពេលស្និទ្ធស្នាល។ ឲ្យពេលវេលាបន្តិច!"], q: "red panda" },
];

const TEXT = {
  en: {
    you: "You",
    them: "Your sweetheart",
    namePh: "Name",
    photo: "Add photo",
    check: "Check our love",
    checking: "Reading the stars and the zoo animals",
    score: "Love score",
    date: "Zoo date idea: come and see them together",
    share: "Share our result",
    again: "Try other names",
    fun: "Just for fun! Photos stay on your phone and are never uploaded.",
    need: "Please type both names.",
  },
  km: {
    you: "អ្នក",
    them: "សង្សាររបស់អ្នក",
    namePh: "ឈ្មោះ",
    photo: "ដាក់រូប",
    check: "ទស្សន៍ទាយស្នេហា",
    checking: "កំពុងមើលផ្កាយ និងសត្វនៅសួនសត្វ",
    score: "ពិន្ទុស្នេហា",
    date: "គំនិតណាត់ជួប៖ មកមើលពួកវាជាមួយគ្នានៅសួនសត្វ",
    share: "ចែករំលែកលទ្ធផល",
    again: "សាកឈ្មោះផ្សេង",
    fun: "គ្រាន់តែសម្រាប់សប្បាយ! រូបថតនៅលើទូរស័ព្ទរបស់អ្នក ហើយមិនត្រូវបាន upload ទេ។",
    need: "សូមវាយឈ្មោះទាំងពីរ។",
  },
};

/** Same two names always give the same score, whichever order they are typed in. */
function loveScore(a: string, b: string) {
  const key = [a, b].map((s) => s.trim().toLowerCase().replace(/\s+/g, " ")).sort().join("♥");
  let h = 2166136261;
  for (const ch of key) h = Math.imul(h ^ ch.codePointAt(0)!, 16777619);
  return 62 + (Math.abs(h) % 38); // 62..99, always a happy result
}

function PersonCard({ label, p, set, ph, photoLabel }: { label: string; p: Person; set: (p: Person) => void; ph: string; photoLabel: string }) {
  const file = useRef<HTMLInputElement>(null);
  return (
    <div className="flex min-w-0 flex-col items-center gap-3 rounded-3xl bg-white p-4 shadow-soft">
      <p className="text-sm font-bold text-rose-500">{label}</p>
      <button type="button" onClick={() => file.current?.click()} className="relative h-24 w-24 overflow-hidden rounded-full bg-rose-50 ring-4 ring-rose-100 transition hover:ring-rose-300">
        {p.photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={p.photo} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="flex h-full w-full flex-col items-center justify-center gap-0.5 text-rose-400">
            <ImagePlus size={24} />
            <span className="text-[11px] font-bold">{photoLabel}</span>
          </span>
        )}
      </button>
      {p.photo && (
        <button type="button" onClick={() => set({ ...p, photo: null })} className="-mt-2 inline-flex items-center gap-1 text-xs font-semibold text-ink/45">
          <X size={12} />
        </button>
      )}
      <input ref={file} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) set({ ...p, photo: URL.createObjectURL(f) }); e.target.value = ""; }} />
      <input value={p.name} onChange={(e) => set({ ...p, name: e.target.value })} maxLength={24} placeholder={ph} className="input text-center" />
    </div>
  );
}

function loadImg(src: string, cors = false) {
  return new Promise<HTMLImageElement | null>((res) => {
    const i = new Image();
    if (cors) i.crossOrigin = "anonymous";
    i.onload = () => res(i);
    i.onerror = () => res(null);
    i.src = src;
  });
}

/** A playful "love match" for couples, tied to animal pairs they can visit together. */
export function LoveMatch() {
  const { locale } = useI18n();
  const km = locale === "km";
  const L = TEXT[km ? "km" : "en"];
  const [a, setA] = useState<Person>({ name: "", photo: null });
  const [b, setB] = useState<Person>({ name: "", photo: null });
  const [phase, setPhase] = useState<"form" | "loading" | "result">("form");
  const [shown, setShown] = useState(0);
  const [err, setErr] = useState(false);
  const score = loveScore(a.name, b.name);
  const band = BANDS.find((x) => score >= x.min)!;

  // Count the score up for a bit of drama.
  useEffect(() => {
    if (phase !== "result") return;
    setShown(0);
    const t = setInterval(() => setShown((s) => (s >= score ? (clearInterval(t), s) : s + 1)), 18);
    return () => clearInterval(t);
  }, [phase, score]);

  function check() {
    if (!a.name.trim() || !b.name.trim()) return setErr(true);
    setErr(false);
    setPhase("loading");
    setTimeout(() => setPhase("result"), 1800);
  }

  async function share() {
    await document.fonts?.ready;
    const W = 1080;
    const H = 1080;
    const c = document.createElement("canvas");
    c.width = W;
    c.height = H;
    const ctx = c.getContext("2d")!;
    const g = ctx.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, "#FFD6E3");
    g.addColorStop(1, "#FF8FB1");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    // little hearts
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    for (let i = 0; i < 26; i++) {
      const x = (i * 211) % W;
      const y = (i * 367) % H;
      const s = 14 + (i % 4) * 8;
      ctx.beginPath();
      ctx.moveTo(x, y + s / 4);
      ctx.bezierCurveTo(x, y, x - s / 2, y, x - s / 2, y + s / 4);
      ctx.bezierCurveTo(x - s / 2, y + s / 2, x, y + s * 0.75, x, y + s);
      ctx.bezierCurveTo(x, y + s * 0.75, x + s / 2, y + s / 2, x + s / 2, y + s / 4);
      ctx.bezierCurveTo(x + s / 2, y, x, y, x, y + s / 4);
      ctx.fill();
    }
    const circle = async (p: Person, cx: number) => {
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, 400, 170, 0, Math.PI * 2);
      ctx.fillStyle = "#fff";
      ctx.fill();
      ctx.beginPath();
      ctx.arc(cx, 400, 155, 0, Math.PI * 2);
      ctx.clip();
      ctx.fillStyle = "#FDA4BF";
      ctx.fillRect(cx - 160, 240, 320, 320);
      const img = p.photo ? await loadImg(p.photo) : null;
      if (img) {
        const s = Math.max(310 / img.naturalWidth, 310 / img.naturalHeight);
        ctx.drawImage(img, cx - (img.naturalWidth * s) / 2, 400 - (img.naturalHeight * s) / 2, img.naturalWidth * s, img.naturalHeight * s);
      } else {
        ctx.fillStyle = "#fff";
        ctx.font = `800 130px "Baloo 2", "Battambang", sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText([...p.name.trim()][0]?.toUpperCase() ?? "?", cx, 410);
      }
      ctx.restore();
    };
    await circle(a, 330);
    await circle(b, 750);
    // heart with the score
    const hx = 540;
    const hy = 330;
    const s = 230;
    ctx.save();
    ctx.shadowColor = "rgba(190,24,93,0.45)";
    ctx.shadowBlur = 30;
    ctx.fillStyle = "#E11D48";
    ctx.beginPath();
    ctx.moveTo(hx, hy + s / 4);
    ctx.bezierCurveTo(hx, hy, hx - s / 2, hy, hx - s / 2, hy + s / 4);
    ctx.bezierCurveTo(hx - s / 2, hy + s / 2, hx, hy + s * 0.75, hx, hy + s);
    ctx.bezierCurveTo(hx, hy + s * 0.75, hx + s / 2, hy + s / 2, hx + s / 2, hy + s / 4);
    ctx.bezierCurveTo(hx + s / 2, hy, hx, hy, hx, hy + s / 4);
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = "#fff";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `800 76px "Baloo 2", sans-serif`;
    ctx.fillText(`${score}%`, hx, hy + 105);
    ctx.fillStyle = "#881337";
    ctx.font = `800 58px "Battambang", "Baloo 2", sans-serif`;
    ctx.fillText(`${a.name.trim()}  &  ${b.name.trim()}`, W / 2, 680);
    ctx.font = `700 46px "Battambang", "Baloo 2", sans-serif`;
    ctx.fillText(km ? band.km[0] : band.en[0], W / 2, 770);
    ctx.fillStyle = "rgba(136,19,55,0.8)";
    ctx.font = `500 30px "Battambang", "Inter", sans-serif`;
    ctx.fillText(km ? "គ្រាន់តែសម្រាប់សប្បាយ" : "Just for fun", W / 2, 840);
    const logo = await loadImg("data:image/svg+xml;charset=utf-8," + encodeURIComponent(LOGO_SVG));
    if (logo) ctx.drawImage(logo, W / 2 - 190, 940, 70, 70);
    ctx.textAlign = "left";
    ctx.fillStyle = "#881337";
    ctx.font = `800 40px "Baloo 2", sans-serif`;
    ctx.fillText("GREEN WILD ZOO", W / 2 - 105, 976);

    const blob: Blob = await new Promise((r) => c.toBlob((x) => r(x!), "image/png"));
    const file = new File([blob], "green-wild-zoo-love.png", { type: "image/png" });
    const phone = window.matchMedia("(pointer: coarse)").matches;
    if (phone && navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file], title: "Green Wild Zoo" }).catch(() => {});
    else {
      const el = document.createElement("a");
      el.href = URL.createObjectURL(file);
      el.download = file.name;
      el.click();
    }
  }

  if (phase === "loading") {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-12 text-center">
        <span className="relative flex h-28 w-28 items-center justify-center">
          <span className="absolute inset-0 animate-ping rounded-full bg-rose-300/50" />
          <Heart size={80} className="animate-pulse fill-rose-500 text-rose-500" />
        </span>
        <p className="flex items-center gap-2 font-semibold text-rose-600">
          <Loader2 size={16} className="animate-spin" /> {L.checking}
        </p>
      </div>
    );
  }

  if (phase === "result") {
    return (
      <div className="mx-auto max-w-lg animate-[gwzDrop_.4s_ease]">
        <div className="overflow-hidden rounded-[2rem] bg-gradient-to-br from-rose-100 via-pink-100 to-rose-200 p-6 text-center shadow-lift">
          <div className="flex items-center justify-center gap-3">
            {[a, b].map((p, i) => (
              <span key={i} className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-rose-300 font-display text-3xl font-extrabold text-white ring-4 ring-white sm:h-24 sm:w-24">
                {p.photo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.photo} alt="" className="h-full w-full object-cover" />
                ) : (
                  [...p.name.trim()][0]?.toUpperCase()
                )}
              </span>
            ))}
          </div>
          <p className="mt-3 font-display text-xl font-extrabold text-rose-900">
            {a.name.trim()} <Heart size={18} className="inline fill-rose-500 text-rose-500" /> {b.name.trim()}
          </p>
          <p className="mt-4 text-sm font-bold uppercase tracking-wider text-rose-500">{L.score}</p>
          <p className="font-display text-7xl font-extrabold leading-none text-rose-600">{shown}%</p>
          <div className="mx-auto mt-3 h-3 max-w-xs overflow-hidden rounded-full bg-white/70">
            <div className="h-full rounded-full bg-gradient-to-r from-pink-400 to-rose-600 transition-all" style={{ width: `${shown}%` }} />
          </div>
          <p className="mt-5 font-display text-2xl font-extrabold text-rose-900">{km ? band.km[0] : band.en[0]}</p>
          <p className="mt-1 text-rose-900/80">{km ? band.km[1] : band.en[1]}</p>
          <Link href={`/animals?q=${encodeURIComponent(band.q)}`} className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-sm font-bold text-rose-600 shadow-soft">
            {L.date} <ArrowRight size={15} />
          </Link>
        </div>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <button onClick={share} className="btn bg-rose-500 text-white hover:translate-y-0 hover:bg-rose-600">
            <Share2 size={16} /> {L.share}
          </button>
          <button onClick={() => setPhase("form")} className="btn-outline bg-white">
            <RotateCcw size={16} /> {L.again}
          </button>
        </div>
        <p className="mt-3 text-center text-xs text-ink/45">{L.fun}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="grid grid-cols-1 items-center gap-3 sm:grid-cols-[1fr_auto_1fr]">
        <PersonCard label={L.you} p={a} set={setA} ph={L.namePh} photoLabel={L.photo} />
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose-500 text-white shadow-lift">
          <Heart size={24} className="fill-white" />
        </span>
        <PersonCard label={L.them} p={b} set={setB} ph={L.namePh} photoLabel={L.photo} />
      </div>
      {err && <p className="mt-3 text-center text-sm font-semibold text-rose-600">{L.need}</p>}
      <button onClick={check} className={cn("btn mx-auto mt-5 flex w-full max-w-sm justify-center bg-gradient-to-r from-pink-500 to-rose-600 py-3.5 text-base text-white shadow-lift hover:translate-y-0")}>
        <Heart size={18} className="fill-white" /> {L.check}
      </button>
      <p className="mt-3 text-center text-xs text-ink/45">{L.fun}</p>
    </div>
  );
}
