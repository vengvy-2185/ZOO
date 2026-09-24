"use client";

import { useEffect, useRef, useState } from "react";
import { Gift, Copy, Check, Loader2, PartyPopper } from "lucide-react";
import { useI18n } from "@/lib/i18n/client";
import { cn } from "@/lib/utils/cn";
import { formatFullDate } from "@/lib/utils/age";

type Prize = { code: string; percent: number; endsOn: string };

/**
 * A silver card the visitor scratches with a finger or the mouse. The prize is
 * chosen on the server the first time they scratch (one per paid ticket);
 * once revealed it stays revealed.
 */
export function ScratchCard({ bookingCode, accessKey, initial }: { bookingCode: string; accessKey: string; initial: Prize | null }) {
  const { locale, t } = useI18n();
  const s = t.scratch;
  const km = locale === "km";
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [prize, setPrize] = useState<Prize | null>(initial);
  const [revealed, setRevealed] = useState(!!initial);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [burst, setBurst] = useState(false);
  const drawing = useRef(false);
  const requested = useRef(!!initial);
  const strokes = useRef(0);

  // Paint the silver cover.
  useEffect(() => {
    if (revealed) return;
    const c = canvasRef.current;
    if (!c) return;
    const box = c.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    c.width = box.width * dpr;
    c.height = box.height * dpr;
    const ctx = c.getContext("2d")!;
    ctx.scale(dpr, dpr);
    const g = ctx.createLinearGradient(0, 0, box.width, box.height);
    g.addColorStop(0, "#C9CED6");
    g.addColorStop(0.5, "#EEF1F5");
    g.addColorStop(1, "#B7BDC7");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, box.width, box.height);
    // sparkle dots
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    for (let i = 0; i < 60; i++) {
      ctx.beginPath();
      ctx.arc(Math.random() * box.width, Math.random() * box.height, Math.random() * 1.6 + 0.4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = "#5B6472";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `700 ${Math.max(16, box.width / 16)}px "Battambang", "Baloo 2", system-ui, sans-serif`;
    ctx.fillText(s.scratchHere, box.width / 2, box.height / 2);
  }, [revealed, s.scratchHere]);

  async function claim() {
    if (requested.current) return;
    requested.current = true;
    setLoading(true);
    try {
      const res = await fetch("/api/scratch", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code: bookingCode, k: accessKey }) });
      if (res.ok) setPrize(await res.json());
    } finally {
      setLoading(false);
    }
  }

  function scratch(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current || revealed) return;
    const c = canvasRef.current!;
    const box = c.getBoundingClientRect();
    const ctx = c.getContext("2d")!;
    ctx.globalCompositeOperation = "destination-out";
    ctx.beginPath();
    ctx.arc(e.clientX - box.left, e.clientY - box.top, Math.max(18, box.width / 14), 0, Math.PI * 2);
    ctx.fill();
    // Every few strokes, check how much is cleared.
    if (++strokes.current % 8 === 0) {
      const { data } = ctx.getImageData(0, 0, c.width, c.height);
      let clear = 0;
      for (let i = 3; i < data.length; i += 4 * 16) if (data[i] === 0) clear++;
      if (clear / (data.length / (4 * 16)) > 0.45) reveal();
    }
  }

  function reveal() {
    setRevealed(true);
    setBurst(true);
    navigator.vibrate?.([40, 30, 80]);
    setTimeout(() => setBurst(false), 1800);
  }

  // Same month names on the server and in every browser (no hydration mismatch).
  const until = prize ? formatFullDate(prize.endsOn + "T12:00:00", km ? "km" : "en") ?? "" : "";

  return (
    <section className="relative mt-6 overflow-hidden rounded-[2rem] bg-gradient-to-br from-accent/40 via-cream to-light-green p-5 shadow-lift ring-1 ring-black/5">
      <p className="flex items-center gap-2 font-display text-lg font-extrabold text-forest">
        <Gift size={20} className="text-[#B8791A]" /> {s.title}
      </p>
      <p className="text-sm text-ink/60">{revealed ? s.wonText : s.subtitle}</p>

      <div className="relative mt-4 aspect-[2/1] overflow-hidden rounded-3xl bg-white shadow-soft">
        {/* The prize underneath */}
        <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center">
          {prize ? (
            <>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">{s.youWon}</p>
              <p className="font-display text-5xl font-extrabold leading-none text-forest">{s.percentOff(prize.percent)}</p>
              <p className="mt-1 text-xs text-ink/55">{s.nextVisit}</p>
            </>
          ) : (
            <Loader2 className={cn("text-primary", loading && "animate-spin")} />
          )}
        </div>
        {/* The silver cover */}
        {!revealed && (
          <canvas
            ref={canvasRef}
            className="absolute inset-0 h-full w-full cursor-grab touch-none"
            onPointerDown={(e) => {
              // Keep scratching even if the finger slides past the edge.
              e.currentTarget.setPointerCapture(e.pointerId);
              drawing.current = true;
              claim();
              scratch(e);
            }}
            onPointerMove={scratch}
            onPointerUp={() => (drawing.current = false)}
            onPointerCancel={() => (drawing.current = false)}
          />
        )}
        {/* Celebration */}
        {burst && (
          <div className="pointer-events-none absolute inset-0" aria-hidden>
            {Array.from({ length: 18 }).map((_, i) => (
              <span
                key={i}
                className="absolute left-1/2 top-1/2 h-2.5 w-2.5 rounded-sm"
                style={{
                  background: ["#F4C95D", "#9BD13B", "#176B3A", "#E76F51", "#0EA5E9"][i % 5],
                  animation: `gwzBurst 1.2s ease-out forwards`,
                  ["--dx" as any]: `${Math.cos((i / 18) * Math.PI * 2) * 140}px`,
                  ["--dy" as any]: `${Math.sin((i / 18) * Math.PI * 2) * 90}px`,
                }}
              />
            ))}
          </div>
        )}
      </div>

      {!revealed && (
        <button
          onClick={() => {
            claim();
            reveal();
          }}
          className="mt-3 text-xs font-bold text-primary underline-offset-2 hover:underline"
        >
          {s.revealAll}
        </button>
      )}

      {revealed && prize && (
        <div className="mt-4 flex flex-wrap items-center gap-3 animate-[gwzPop_.4s_ease]">
          <PartyPopper size={20} className="text-[#B8791A]" />
          <span className="rounded-xl bg-white px-4 py-2 font-mono text-lg font-extrabold tracking-widest text-forest shadow-soft">{prize.code}</span>
          <button
            onClick={() => {
              navigator.clipboard?.writeText(prize.code).catch(() => {});
              setCopied(true);
              setTimeout(() => setCopied(false), 1800);
            }}
            className="btn-outline bg-white px-4 py-2 text-sm"
          >
            {copied ? <Check size={15} /> : <Copy size={15} />} {copied ? s.copied : s.copy}
          </button>
          <p className="w-full text-xs text-ink/55">{s.validUntil(until)}</p>
        </div>
      )}
    </section>
  );
}
