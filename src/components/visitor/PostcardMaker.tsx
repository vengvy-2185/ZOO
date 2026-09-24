"use client";

import { useEffect, useRef, useState } from "react";
import { Download, Share2, Check } from "lucide-react";
import { useI18n } from "@/lib/i18n/client";
import { cn } from "@/lib/utils/cn";
import type { QuizAnimal } from "./AnimalQuiz";

const W = 1500;
const H = 1000;

const DESIGNS = {
  classic: { paper: ["#FFFBF1", "#F6EBD3"], ink: "#0E3F24", accent: "#2E8B57", line: "#D9C9A3" },
  sunset: { paper: ["#FFF1E6", "#FFD9C2"], ink: "#7A2E0E", accent: "#E76F51", line: "#EDB99A" },
  jungle: { paper: ["#123D27", "#1F5E3A"], ink: "#F4FBE9", accent: "#A3E635", line: "#3F7F55" },
  sky: { paper: ["#F0F8FF", "#D6ECFB"], ink: "#0C3B5E", accent: "#0EA5E9", line: "#A9CFE8" },
} as const;
type DesignKey = keyof typeof DESIGNS;

const FONT_EN = `"Baloo 2", "Inter", system-ui, sans-serif`;
const FONT_KM = `"Battambang", "Inter", system-ui, sans-serif`;

/** Splits text into words (Khmer has no spaces, so use the browser's word segmenter). */
function words(text: string): string[] {
  const Seg = (Intl as any).Segmenter;
  if (Seg) return [...new Seg(undefined, { granularity: "word" }).segment(text)].map((s: any) => s.segment);
  return text.split(/(\s+)/);
}

function wrap(ctx: CanvasRenderingContext2D, text: string, maxW: number, maxLines: number) {
  const lines: string[] = [];
  let line = "";
  for (const w of words(text)) {
    const test = line + w;
    if (ctx.measureText(test).width > maxW && line.trim()) {
      lines.push(line.trim());
      line = w.trimStart();
      if (lines.length === maxLines) break;
    } else line = test;
  }
  if (lines.length < maxLines && line.trim()) lines.push(line.trim());
  return lines.slice(0, maxLines);
}

function coverImage(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number) {
  const s = Math.max(w / img.naturalWidth, h / img.naturalHeight);
  ctx.drawImage(img, x + (w - img.naturalWidth * s) / 2, y + (h - img.naturalHeight * s) / 2, img.naturalWidth * s, img.naturalHeight * s);
}

/** A digital postcard: pick an animal, a design and a message, then save or share it. */
export function PostcardMaker({ animals }: { animals: QuizAnimal[] }) {
  const { locale, t } = useI18n();
  const c = t.postcard;
  const [animal, setAnimal] = useState(animals[0]?.code ?? "");
  const [design, setDesign] = useState<DesignKey>("classic");
  const [to, setTo] = useState("");
  const [from, setFrom] = useState("");
  const [message, setMessage] = useState(c.presets[0]);
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [saved, setSaved] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cache = useRef(new Map<string, HTMLImageElement>());

  const current = animals.find((a) => a.code === animal) ?? animals[0];
  const animalName = (a: QuizAnimal) => (locale === "km" ? a.name_km || a.name : a.name);

  // Load the chosen photo with CORS so the finished card can be saved.
  useEffect(() => {
    if (!current) return;
    const hit = cache.current.get(current.image);
    if (hit) return setImg(hit);
    const im = new Image();
    im.crossOrigin = "anonymous";
    im.onload = () => {
      cache.current.set(current.image, im);
      setImg(im);
    };
    im.src = current.image;
  }, [current]);

  // Keep the message in the visitor's language when they switch.
  useEffect(() => setMessage(c.presets[0]), [locale]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv || !current) return;
    cv.width = W;
    cv.height = H;
    const ctx = cv.getContext("2d")!;
    const d = DESIGNS[design];
    const font = locale === "km" ? FONT_KM : FONT_EN;

    // paper
    const g = ctx.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, d.paper[0]);
    g.addColorStop(1, d.paper[1]);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    // air-mail stripes along the edge
    ctx.save();
    for (let i = -40; i < W + H; i += 60) {
      ctx.fillStyle = (i / 60) % 2 ? d.accent : "#E63946";
      ctx.globalAlpha = design === "jungle" ? 0.55 : 0.8;
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i + 30, 0);
      ctx.lineTo(i + 30 - 18, 18);
      ctx.lineTo(i - 18, 18);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(i, H - 18);
      ctx.lineTo(i + 30, H - 18);
      ctx.lineTo(i + 30 - 18, H);
      ctx.lineTo(i - 18, H);
      ctx.fill();
    }
    ctx.restore();

    // photo (left)
    const P = { x: 60, y: 70, w: 760, h: 860 };
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.25)";
    ctx.shadowBlur = 30;
    ctx.shadowOffsetY = 12;
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.roundRect(P.x - 14, P.y - 14, P.w + 28, P.h + 28, 30);
    ctx.fill();
    ctx.restore();
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(P.x, P.y, P.w, P.h, 22);
    ctx.clip();
    ctx.fillStyle = "#cfe3d4";
    ctx.fillRect(P.x, P.y, P.w, P.h);
    if (img) coverImage(ctx, img, P.x, P.y, P.w, P.h);
    // soft shade for the caption
    const sh = ctx.createLinearGradient(0, P.y + P.h - 220, 0, P.y + P.h);
    sh.addColorStop(0, "rgba(0,0,0,0)");
    sh.addColorStop(1, "rgba(0,0,0,0.6)");
    ctx.fillStyle = sh;
    ctx.fillRect(P.x, P.y + P.h - 220, P.w, 220);
    ctx.restore();
    ctx.fillStyle = "#fff";
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    ctx.font = `800 64px ${FONT_EN}`;
    ctx.fillText(c.greetings, P.x + 40, P.y + P.h - 95);
    ctx.font = `600 34px ${font}`;
    ctx.fillText(`${animalName(current)}  |  Green Wild Zoo`, P.x + 42, P.y + P.h - 45);

    // divider
    ctx.strokeStyle = d.line;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(900, 120);
    ctx.lineTo(900, H - 120);
    ctx.stroke();

    // stamp (top right) with scalloped edge
    const S = { x: 1230, y: 70, w: 200, h: 240 };
    ctx.save();
    ctx.fillStyle = "#fff";
    ctx.shadowColor = "rgba(0,0,0,0.18)";
    ctx.shadowBlur = 12;
    ctx.fillRect(S.x, S.y, S.w, S.h);
    ctx.restore();
    ctx.fillStyle = d.paper[0];
    for (let x = S.x; x <= S.x + S.w; x += 20) {
      ctx.beginPath(); ctx.arc(x, S.y, 7, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(x, S.y + S.h, 7, 0, Math.PI * 2); ctx.fill();
    }
    for (let y = S.y; y <= S.y + S.h; y += 20) {
      ctx.beginPath(); ctx.arc(S.x, y, 7, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(S.x + S.w, y, 7, 0, Math.PI * 2); ctx.fill();
    }
    ctx.save();
    ctx.beginPath();
    ctx.rect(S.x + 18, S.y + 18, S.w - 36, S.h - 70);
    ctx.clip();
    if (img) coverImage(ctx, img, S.x + 18, S.y + 18, S.w - 36, S.h - 70);
    ctx.restore();
    ctx.fillStyle = d.accent === "#A3E635" ? "#2E8B57" : d.accent;
    ctx.textAlign = "center";
    ctx.font = `800 26px ${FONT_EN}`;
    ctx.fillText(`GWZ  ${new Date().getFullYear()}`, S.x + S.w / 2, S.y + S.h - 20);

    // postmark over the stamp
    ctx.save();
    ctx.translate(S.x - 20, S.y + 170);
    ctx.rotate(-0.25);
    ctx.globalAlpha = 0.75;
    ctx.strokeStyle = d.ink;
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(0, 0, 78, 0, Math.PI * 2); ctx.stroke();
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, 0, 64, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = d.ink;
    ctx.font = `800 17px ${FONT_EN}`;
    ctx.fillText("GREEN WILD ZOO", 0, -24);
    ctx.font = `700 20px ${FONT_EN}`;
    const date = new Date();
    ctx.fillText(`${String(date.getDate()).padStart(2, "0")}.${String(date.getMonth() + 1).padStart(2, "0")}.${date.getFullYear()}`, 0, 8);
    ctx.font = `700 15px ${FONT_EN}`;
    ctx.fillText("PHNOM PENH", 0, 36);
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.moveTo(90, -30 + i * 20);
      for (let x = 90; x < 330; x += 20) ctx.quadraticCurveTo(x + 5, -38 + i * 20, x + 10, -30 + i * 20), ctx.quadraticCurveTo(x + 15, -22 + i * 20, x + 20, -30 + i * 20);
      ctx.stroke();
    }
    ctx.restore();

    // message
    ctx.textAlign = "left";
    ctx.fillStyle = d.ink;
    const X = 950;
    ctx.font = `700 40px ${font}`;
    ctx.fillText(to.trim() ? c.toLine(to.trim()) : c.toDefault, X, 400);
    ctx.font = `500 38px ${font}`;
    const lines = wrap(ctx, message.trim() || c.presets[0], 480, 6);
    lines.forEach((l, i) => ctx.fillText(l, X, 480 + i * (locale === "km" ? 66 : 58)));
    // writing lines
    ctx.strokeStyle = d.line;
    ctx.lineWidth = 2;
    for (let i = 0; i < 6; i++) {
      const y = 496 + i * (locale === "km" ? 66 : 58);
      ctx.beginPath(); ctx.moveTo(X, y); ctx.lineTo(W - 70, y); ctx.stroke();
    }
    ctx.font = `700 38px ${font}`;
    ctx.textAlign = "right";
    ctx.fillText(from.trim() ? c.fromLine(from.trim()) : c.fromDefault, W - 70, H - 80);
    setSaved(false);
  }, [img, design, to, from, message, locale, current, c]); // eslint-disable-line react-hooks/exhaustive-deps

  async function toFile() {
    const blob: Blob = await new Promise((r) => canvasRef.current!.toBlob((b) => r(b!), "image/jpeg", 0.92));
    return new File([blob], "green-wild-zoo-postcard.jpg", { type: "image/jpeg" });
  }
  async function download() {
    const f = await toFile();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(f);
    a.download = f.name;
    a.click();
    setSaved(true);
  }
  async function share() {
    const f = await toFile();
    if (navigator.canShare?.({ files: [f] })) await navigator.share({ files: [f], title: "Green Wild Zoo", text: message }).catch(() => {});
    else download();
  }

  if (!current) return null;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="min-w-0">
        <div className="overflow-hidden rounded-[1.5rem] shadow-lift ring-4 ring-white">
          <canvas ref={canvasRef} className="block h-auto w-full" style={{ aspectRatio: `${W} / ${H}` }} />
        </div>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <button onClick={download} className="btn-primary hover:translate-y-0">
            {saved ? <Check size={16} /> : <Download size={16} />} {saved ? c.saved : c.save}
          </button>
          <button onClick={share} className="btn-outline bg-white">
            <Share2 size={16} /> {c.share}
          </button>
        </div>
      </div>

      <div className="min-w-0 space-y-4">
        <div className="card p-4">
          <p className="mb-2 text-sm font-bold text-forest">{c.pickAnimal}</p>
          <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 lg:mx-0 lg:grid lg:grid-cols-4 lg:px-0">
            {animals.map((a) => (
              <button
                key={a.code}
                onClick={() => setAnimal(a.code)}
                title={animalName(a)}
                className={cn(
                  "relative aspect-square w-16 flex-shrink-0 overflow-hidden rounded-2xl ring-2 transition lg:w-auto",
                  a.code === animal ? "ring-primary" : "ring-transparent hover:ring-primary/40"
                )}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={a.image} alt="" className="h-full w-full object-cover" />
                {a.code === animal && (
                  <span className="absolute inset-0 flex items-center justify-center bg-primary/40 text-white">
                    <Check size={20} strokeWidth={3} />
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="card p-4">
          <p className="mb-2 text-sm font-bold text-forest">{c.design}</p>
          <div className="grid grid-cols-4 gap-2">
            {(Object.keys(DESIGNS) as DesignKey[]).map((k) => (
              <button
                key={k}
                onClick={() => setDesign(k)}
                className={cn("flex flex-col items-center gap-1 rounded-2xl p-1.5 text-xs font-bold text-forest transition", design === k ? "ring-2 ring-primary" : "hover:bg-light-green")}
              >
                <span className="h-10 w-full rounded-xl ring-1 ring-black/10" style={{ background: `linear-gradient(135deg, ${DESIGNS[k].paper[0]}, ${DESIGNS[k].paper[1]})`, boxShadow: `inset 0 -5px 0 ${DESIGNS[k].accent}` }} />
                {c.designs[k]}
              </button>
            ))}
          </div>
        </div>

        <div className="card space-y-3 p-4">
          <div className="grid grid-cols-2 gap-2">
            <label className="min-w-0 text-sm font-bold text-forest">
              {c.to}
              <input value={to} onChange={(e) => setTo(e.target.value)} maxLength={24} placeholder={c.toPlaceholder} className="input mt-1 w-full" />
            </label>
            <label className="min-w-0 text-sm font-bold text-forest">
              {c.from}
              <input value={from} onChange={(e) => setFrom(e.target.value)} maxLength={24} placeholder={c.fromPlaceholder} className="input mt-1 w-full" />
            </label>
          </div>
          <label className="block text-sm font-bold text-forest">
            {c.message}
            <textarea value={message} onChange={(e) => setMessage(e.target.value)} maxLength={160} rows={3} className="input mt-1 w-full resize-none" />
          </label>
          <div className="flex flex-wrap gap-1.5">
            {c.presets.map((m) => (
              <button
                key={m}
                onClick={() => setMessage(m)}
                className={cn("max-w-full rounded-full px-3 py-1.5 text-left text-xs font-semibold transition", message === m ? "bg-primary text-white" : "bg-cream text-forest hover:bg-light-green")}
              >
                {m}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
