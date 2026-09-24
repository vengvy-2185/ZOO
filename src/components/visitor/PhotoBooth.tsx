"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, ImagePlus, RefreshCcw, Download, Share2, RotateCcw, Eraser, Aperture, Undo2, Trash2 } from "lucide-react";
import { useI18n } from "@/lib/i18n/client";
import { cn } from "@/lib/utils/cn";

const W = 1080;
const H = 1350;

const FRAMES = {
  jungle: { bg: ["#0B3B21", "#176B3A"], accent: "#A3E635", deco: ["🌿", "🍃", "🌴", "🌺"] },
  safari: { bg: ["#B45309", "#F59E0B"], accent: "#FEF3C7", deco: ["🌾", "🌵", "☀️", "🦒"] },
  ocean: { bg: ["#0C4A6E", "#0EA5E9"], accent: "#BAE6FD", deco: ["🐚", "🌊", "🫧", "🐠"] },
  sunset: { bg: ["#9D174D", "#FB923C"], accent: "#FFE4E6", deco: ["🌅", "🦩", "🌸", "✨"] },
} as const;
type FrameKey = keyof typeof FRAMES;

const EMOJI = ["🌺", "🌴", "⭐", "❤️", "👑", "🕶️", "🎉", "🦋", "🍌"];

/** A real animal cut-out (transparent PNG) managed by admins. */
export type BoothSticker = { id: string; name: string; image: string };

type NewSticker = { size: number } & ({ emoji: string } | { img: HTMLImageElement; ratio: number });
type Placed = NewSticker & { id: number; x: number; y: number };

// Photo area inside the frame (canvas px).
const PAD = 60;
const PHOTO = { x: PAD, y: PAD, w: W - PAD * 2, h: H - PAD * 2 - 170 };

export function PhotoBooth({ animals }: { animals: BoothSticker[] }) {
  const { locale, t } = useI18n();
  const b = t.booth;
  const videoRef = useRef<HTMLVideoElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [facing, setFacing] = useState<"user" | "environment">("user");
  const [live, setLive] = useState(false);
  const [photo, setPhoto] = useState<HTMLImageElement | HTMLCanvasElement | null>(null);
  const [frame, setFrame] = useState<FrameKey>("jungle");
  const [stickers, setStickers] = useState<Placed[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [past, setPast] = useState<Placed[][]>([]);
  const imgCache = useRef(new Map<string, HTMLImageElement>());
  const [result, setResult] = useState<string | null>(null);
  const [noCamera, setNoCamera] = useState(false);
  const [flash, setFlash] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const drag = useRef<{ id: number; dx: number; dy: number } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const previewRef = useRef<HTMLCanvasElement>(null);

  const stop = () => {
    streamRef.current?.getTracks().forEach((tr) => tr.stop());
    streamRef.current = null;
    setLive(false);
  };
  useEffect(() => stop, []);

  async function startCamera(mode = facing) {
    stop();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: mode, width: { ideal: 1280 }, height: { ideal: 1600 } }, audio: false });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setPhoto(null);
      setResult(null);
      setLive(true);
      setNoCamera(false);
    } catch {
      setNoCamera(true);
    }
  }

  function snap() {
    setCountdown(3);
    let n = 3;
    const timer = setInterval(() => {
      n -= 1;
      if (n > 0) return setCountdown(n);
      clearInterval(timer);
      setCountdown(null);
      const v = videoRef.current;
      if (!v) return;
      const c = document.createElement("canvas");
      c.width = v.videoWidth;
      c.height = v.videoHeight;
      const ctx = c.getContext("2d")!;
      if (facing === "user") {
        ctx.translate(c.width, 0);
        ctx.scale(-1, 1);
      }
      ctx.drawImage(v, 0, 0);
      setFlash(true);
      setTimeout(() => setFlash(false), 350);
      setPhoto(c);
      stop();
    }, 800);
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const img = new Image();
    img.onload = () => {
      stop();
      setPhoto(img);
      setResult(null);
    };
    img.src = URL.createObjectURL(f);
    e.target.value = "";
  }

  /** Draws the whole composition (frame + photo + stickers + caption) onto a canvas. */
  function compose(canvas: HTMLCanvasElement) {
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d")!;
    const f = FRAMES[frame];
    const g = ctx.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, f.bg[0]);
    g.addColorStop(1, f.bg[1]);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    // Decorative emoji scattered on the border.
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.globalAlpha = 0.35;
    for (let i = 0; i < 26; i++) {
      const x = (i * 197) % W;
      const y = (i * 353) % H;
      ctx.font = `${48 + (i % 3) * 16}px serif`;
      ctx.fillText(f.deco[i % f.deco.length], x, y);
    }
    ctx.globalAlpha = 1;

    // Photo, cropped to cover the photo area, with rounded corners.
    ctx.save();
    const r = 36;
    ctx.beginPath();
    ctx.roundRect(PHOTO.x, PHOTO.y, PHOTO.w, PHOTO.h, r);
    ctx.clip();
    ctx.fillStyle = "#0003";
    ctx.fillRect(PHOTO.x, PHOTO.y, PHOTO.w, PHOTO.h);
    if (photo) {
      const pw = photo instanceof HTMLImageElement ? photo.naturalWidth : photo.width;
      const ph = photo instanceof HTMLImageElement ? photo.naturalHeight : photo.height;
      const s = Math.max(PHOTO.w / pw, PHOTO.h / ph);
      ctx.drawImage(photo, PHOTO.x + (PHOTO.w - pw * s) / 2, PHOTO.y + (PHOTO.h - ph * s) / 2, pw * s, ph * s);
    }
    ctx.restore();
    ctx.lineWidth = 8;
    ctx.strokeStyle = f.accent;
    ctx.beginPath();
    ctx.roundRect(PHOTO.x, PHOTO.y, PHOTO.w, PHOTO.h, r);
    ctx.stroke();

    // Stickers (stored as fractions of the photo area).
    for (const s of stickers) {
      const cx = PHOTO.x + s.x * PHOTO.w;
      const cy = PHOTO.y + s.y * PHOTO.h;
      if ("emoji" in s) {
        ctx.font = `${s.size * PHOTO.w}px serif`;
        ctx.fillText(s.emoji, cx, cy);
      } else {
        const w = s.size * PHOTO.w;
        const h = w / s.ratio;
        ctx.save();
        ctx.shadowColor = "rgba(0,0,0,0.35)";
        ctx.shadowBlur = 18;
        ctx.shadowOffsetY = 8;
        ctx.drawImage(s.img, cx - w / 2, cy - h / 2, w, h);
        ctx.restore();
      }
    }

    // Caption strip.
    const baseY = PHOTO.y + PHOTO.h + 85;
    ctx.fillStyle = "#fff";
    ctx.font = `800 64px "Baloo 2", "Battambang", system-ui, sans-serif`;
    ctx.fillText("Green Wild Zoo", W / 2, baseY - 18);
    ctx.fillStyle = f.accent;
    ctx.font = `600 30px "Battambang", "Inter", system-ui, sans-serif`;
    const date = new Intl.DateTimeFormat(locale === "km" ? "km-KH" : "en-GB", { day: "numeric", month: "long", year: "numeric", numberingSystem: "latn" }).format(new Date());
    ctx.fillText(b.caption, W / 2, baseY + 40);
    ctx.globalAlpha = 0.8;
    ctx.font = `500 26px "Battambang", "Inter", system-ui, sans-serif`;
    ctx.fillText(date, W / 2, baseY + 82);
    ctx.globalAlpha = 1;
  }

  // Live preview: the stage always shows the real frame, exactly as it will be saved.
  useEffect(() => {
    if (!result && previewRef.current) compose(previewRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photo, frame, stickers, locale, result]);

  /** Saves the current stickers so the next change can be undone. */
  const snapshot = () => setPast((h) => [...h.slice(-39), stickers]);
  function undo() {
    setPast((h) => {
      if (!h.length) return h;
      setStickers(h[h.length - 1]);
      return h.slice(0, -1);
    });
  }
  // Ctrl/Cmd + Z
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        undo();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function place(item: NewSticker) {
    snapshot();
    const id = Date.now() + Math.random();
    setStickers((s) => [...s, { ...item, id, x: 0.3 + Math.random() * 0.4, y: 0.35 + Math.random() * 0.35 }]);
    setSelected(id);
  }

  function addEmoji(emoji: string) {
    place({ emoji, size: 0.16 });
  }

  /** Loads the PNG with CORS enabled (so the canvas can still be saved), then places it. */
  function addAnimal(a: BoothSticker) {
    const cached = imgCache.current.get(a.image);
    const go = (img: HTMLImageElement) => place({ img, ratio: img.naturalWidth / img.naturalHeight, size: 0.42 });
    if (cached) return go(cached);
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      imgCache.current.set(a.image, img);
      go(img);
    };
    img.src = a.image;
  }

  const resize = (delta: number) => {
    snapshot();
    setStickers((all) => all.map((st) => (st.id === selected ? { ...st, size: Math.min(1.2, Math.max(0.06, st.size * delta)) } : st)));
  };

  // Dragging stickers on the stage overlay (positions are fractions of the photo area).
  function toFraction(e: React.PointerEvent) {
    const rect = stageRef.current!.getBoundingClientRect();
    const sx = rect.width / W;
    const sy = rect.height / H;
    return { x: (e.clientX - rect.left - PHOTO.x * sx) / (PHOTO.w * sx), y: (e.clientY - rect.top - PHOTO.y * sy) / (PHOTO.h * sy) };
  }

  async function finish() {
    const c = document.createElement("canvas");
    compose(c);
    setResult(c.toDataURL("image/jpeg", 0.92));
  }

  async function share() {
    if (!result) return;
    const blob = await (await fetch(result)).blob();
    const file = new File([blob], "green-wild-zoo.jpg", { type: "image/jpeg" });
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title: "Green Wild Zoo", text: b.caption }).catch(() => {});
    } else {
      const a = document.createElement("a");
      a.href = result;
      a.download = "green-wild-zoo.jpg";
      a.click();
    }
  }

  const f = FRAMES[frame];

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
      {/* Stage */}
      <div className="mx-auto w-full max-w-md">
        <div
          ref={stageRef}
          className="relative aspect-[4/5] w-full touch-none select-none overflow-hidden rounded-[2rem] shadow-lift"
          style={{ background: `linear-gradient(135deg, ${f.bg[0]}, ${f.bg[1]})` }}
          onPointerMove={(e) => {
            if (!drag.current) return;
            const p = toFraction(e);
            const d = drag.current;
            setStickers((s) => s.map((st) => (st.id === d.id ? { ...st, x: p.x - d.dx, y: p.y - d.dy } : st)));
          }}
          onPointerUp={() => (drag.current = null)}
          onPointerLeave={() => (drag.current = null)}
        >
          {result ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={result} alt="" className="h-full w-full object-cover" />
          ) : (
            <canvas ref={previewRef} className="h-full w-full" />
          )}
          {!photo && !result && (
            <div
              className="absolute overflow-hidden rounded-[1.4rem]"
              style={{ left: `${(PHOTO.x / W) * 100}%`, top: `${(PHOTO.y / H) * 100}%`, width: `${(PHOTO.w / W) * 100}%`, height: `${(PHOTO.h / H) * 100}%` }}
            >
              <video ref={videoRef} muted playsInline className={cn("h-full w-full object-cover", facing === "user" && "-scale-x-100", !live && "hidden")} />
              {!live && (
                <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center text-white">
                  <span className="text-6xl">📸</span>
                  <p className="text-sm text-white/85 drop-shadow">{noCamera ? b.noCamera : b.subtitle}</p>
                </div>
              )}
              {countdown && <div className="absolute inset-0 flex items-center justify-center font-display text-8xl font-extrabold text-white drop-shadow-lg">{countdown}</div>}
            </div>
          )}

          {/* Draggable sticker handles while editing */}
          {photo &&
            !result &&
            stickers.map((s) => (
              <span
                key={s.id}
                onPointerDown={(e) => {
                  snapshot();
                  setSelected(s.id);
                  const p = toFraction(e);
                  drag.current = { id: s.id, dx: p.x - s.x, dy: p.y - s.y };
                }}
                onDoubleClick={() => {
                  // pointerdown already saved a snapshot for this gesture
                  setStickers((all) => all.filter((x) => x.id !== s.id));
                }}
                className={cn(
                  "absolute flex -translate-x-1/2 -translate-y-1/2 cursor-grab items-center justify-center rounded-2xl border-2 border-dashed active:cursor-grabbing",
                  selected === s.id ? "border-white/80" : "border-transparent hover:border-white/50"
                )}
                style={{
                  left: `${((PHOTO.x + s.x * PHOTO.w) / W) * 100}%`,
                  top: `${((PHOTO.y + s.y * PHOTO.h) / H) * 100}%`,
                  width: `${((s.size * PHOTO.w * 1.05) / W) * 100}%`,
                  aspectRatio: "emoji" in s ? "1" : String(s.ratio),
                }}
              />
            ))}
          {flash && <div className="absolute inset-0 animate-[gwzFlash_0.35s_ease-out] bg-white" />}
        </div>

        {/* Main actions */}
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {result ? (
            <>
              <a href={result} download="green-wild-zoo.jpg" className="btn-primary hover:translate-y-0">
                <Download size={16} /> {b.save}
              </a>
              <button onClick={share} className="btn-outline bg-white">
                <Share2 size={16} /> {b.share}
              </button>
              <button
                onClick={() => {
                  setResult(null);
                  setPhoto(null);
                  setStickers([]);
                }}
                className="btn-outline bg-white"
              >
                <RotateCcw size={16} /> {b.retake}
              </button>
            </>
          ) : photo ? (
            <>
              <button onClick={undo} disabled={past.length === 0} className="btn-outline bg-white disabled:opacity-40" title="Ctrl+Z">
                <Undo2 size={16} /> {b.undo}
              </button>
              <button onClick={finish} className="btn-primary hover:translate-y-0">
                <Download size={16} /> {b.save}
              </button>
              <button onClick={() => (setPhoto(null), setStickers([]))} className="btn-outline bg-white">
                <RotateCcw size={16} /> {b.retake}
              </button>
            </>
          ) : live ? (
            <>
              <button onClick={snap} disabled={countdown !== null} className="btn-primary px-7 hover:translate-y-0">
                <Aperture size={18} /> {b.capture}
              </button>
              <button
                onClick={() => {
                  const next = facing === "user" ? "environment" : "user";
                  setFacing(next);
                  startCamera(next);
                }}
                className="btn-outline bg-white"
              >
                <RefreshCcw size={16} /> {b.switchCamera}
              </button>
            </>
          ) : (
            <>
              <button onClick={() => startCamera()} className="btn-primary hover:translate-y-0">
                <Camera size={16} /> {b.startCamera}
              </button>
              <button onClick={() => fileRef.current?.click()} className="btn-outline bg-white">
                <ImagePlus size={16} /> {b.upload}
              </button>
            </>
          )}
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFile} />
        </div>
      </div>

      {/* Controls */}
      <div className="space-y-4">
        <div className="card p-4">
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-ink/50">{b.frames}</p>
          <div className="grid grid-cols-4 gap-2">
            {(Object.keys(FRAMES) as FrameKey[]).map((k) => (
              <button
                key={k}
                onClick={() => setFrame(k)}
                className={cn("flex flex-col items-center gap-1 rounded-2xl p-1.5 text-[11px] font-bold transition", frame === k ? "ring-2 ring-primary" : "hover:bg-light-green")}
              >
                <span className="flex aspect-[4/5] w-full items-center justify-center rounded-xl text-lg" style={{ background: `linear-gradient(135deg, ${FRAMES[k].bg[0]}, ${FRAMES[k].bg[1]})` }}>
                  {FRAMES[k].deco[0]}
                </span>
                {b.frameNames[k]}
              </button>
            ))}
          </div>
        </div>
        <div className={cn("card p-4 transition", (!photo || result) && "opacity-75")}>
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-ink/50">{b.stickers}</p>
          {animals.length > 0 && (
            <div className="mb-3 grid grid-cols-3 gap-2">
              {animals.map((a) => (
                <button
                  key={a.id}
                  disabled={!photo || !!result}
                  onClick={() => addAnimal(a)}
                  title={a.name}
                  className="group flex aspect-square flex-col items-center justify-center rounded-2xl bg-gradient-to-b from-light-green to-cream p-1.5 ring-1 ring-primary/10 transition hover:-translate-y-0.5 hover:ring-primary active:scale-95"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={a.image} alt="" className="h-[78%] w-full object-contain drop-shadow transition group-hover:scale-110" />
                  <span className="mt-0.5 w-full truncate text-center text-[10px] font-bold text-forest">{a.name}</span>
                </button>
              ))}
            </div>
          )}
          <div className="grid grid-cols-9 gap-1">
            {EMOJI.map((s) => (
              <button
                key={s}
                disabled={!photo || !!result}
                onClick={() => addEmoji(s)}
                className="flex aspect-square items-center justify-center rounded-xl bg-cream text-2xl transition hover:scale-110 hover:bg-light-green active:scale-95"
              >
                {s}
              </button>
            ))}
          </div>
          <div className="mt-3 flex items-center justify-between gap-2">
            <p className="text-[11px] text-ink/45">{b.hint}</p>
            {selected !== null && stickers.some((x) => x.id === selected) && !result && (
              <span className="flex items-center gap-1">
                <button onClick={() => resize(0.85)} className="h-7 w-7 rounded-lg bg-cream text-base font-bold text-forest" aria-label="smaller">−</button>
                <button onClick={() => resize(1.18)} className="h-7 w-7 rounded-lg bg-cream text-base font-bold text-forest" aria-label="bigger">+</button>
                <button onClick={() => (snapshot(), setStickers((all) => all.filter((x) => x.id !== selected)), setSelected(null))} className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-50 text-red-600" aria-label="delete">
                  <Trash2 size={14} />
                </button>
              </span>
            )}
            {stickers.length > 0 && !result && (
              <button onClick={() => (snapshot(), setStickers([]))} className="inline-flex items-center gap-1 text-xs font-bold text-red-600">
                <Eraser size={13} /> {b.clearStickers}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
