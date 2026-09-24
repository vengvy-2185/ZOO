"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { useI18n } from "@/lib/i18n/client";

// Ambient wildlife decorations (CSS-animated SVG). Hidden for "reduce motion" users.

const MONKEY_KEY = "gwz_monkey";

/**
 * The climbing monkey, with an on/off switch: some visitors love it, others
 * find it distracting. The × on the vine hides it (remembered on this
 * device); a small 🐒 button brings it back.
 */
export function MonkeyOnVine() {
  const { t } = useI18n();
  const [on, setOn] = useState<boolean | null>(null); // null until we've read the saved choice (avoids a flash)

  useEffect(() => {
    try {
      setOn(localStorage.getItem(MONKEY_KEY) !== "off");
    } catch {
      setOn(true);
    }
  }, []);

  const set = (value: boolean) => {
    setOn(value);
    try {
      localStorage.setItem(MONKEY_KEY, value ? "on" : "off");
    } catch {
      /* private mode — still works for this visit */
    }
  };

  if (on === null) return null;
  if (!on) {
    return (
      <button
        type="button"
        onClick={() => set(true)}
        title={t.extra.showMonkey}
        aria-label={t.extra.showMonkey}
        className="side-tab fixed right-0 top-[88px] z-30 md:top-[96px]"
      >
        <MonkeyFace className="h-7 w-7" />
      </button>
    );
  }
  return <MonkeyScene onHide={() => set(false)} hideLabel={t.extra.hideMonkey} />;
}

/** Just the monkey's face — used for the small "bring the monkey back" tab. */
export function MonkeyFace({ className }: { className?: string }) {
  return (
    <svg viewBox="24 32 72 50" className={className} aria-hidden>
      <circle cx="36" cy="58" r="9" fill="#8B5A2B" />
      <circle cx="36" cy="58" r="5" fill="#E8C49A" />
      <circle cx="84" cy="58" r="9" fill="#8B5A2B" />
      <circle cx="84" cy="58" r="5" fill="#E8C49A" />
      <circle cx="60" cy="58" r="23" fill="#8B5A2B" />
      <path d="M60 46 C 50 40, 40 48, 44 58 C 40 66, 46 76, 60 76 C 74 76, 80 66, 76 58 C 80 48, 70 40, 60 46 Z" fill="#E8C49A" />
      <ellipse cx="52" cy="56" rx="3.6" ry="4.4" fill="#2B1B10" />
      <ellipse cx="68" cy="56" rx="3.6" ry="4.4" fill="#2B1B10" />
      <circle cx="53.2" cy="54.4" r="1.3" fill="#fff" />
      <circle cx="69.2" cy="54.4" r="1.3" fill="#fff" />
      <ellipse cx="60" cy="64" rx="3" ry="2" fill="#5C3A1E" />
      <path d="M53 68 Q 60 74, 67 68" fill="none" stroke="#5C3A1E" strokeWidth="2" strokeLinecap="round" />
      <circle cx="47" cy="66" r="3" fill="#F2A7A0" opacity="0.6" />
      <circle cx="73" cy="66" r="3" fill="#F2A7A0" opacity="0.6" />
    </svg>
  );
}

// A cartoon monkey that climbs up and down a jungle vine hanging along the
// right edge of the screen, forever. Tap it and it says hello. Drawn as
// SVG (sharper and lighter than a PNG). Hidden for "reduce motion" users.
function MonkeyScene({ onHide, hideLabel }: { onHide: () => void; hideLabel: string }) {
  const { t } = useI18n();
  const [hello, setHello] = useState(false);
  // On phones the vine would cover text at the right edge, so it steps aside
  // once the visitor scrolls and comes back at the top of the page.
  const [away, setAway] = useState(false);
  useEffect(() => {
    const onScroll = () => setAway(window.innerWidth < 768 && window.scrollY > 120);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return (
    <div
      className={`pointer-events-none fixed right-1 top-16 z-30 h-[62vh] w-16 transition-[opacity,transform] duration-500 motion-reduce:hidden md:right-3 md:top-[72px] md:w-24 ${away ? "translate-x-full opacity-0 [&_*]:!pointer-events-none" : ""}`}
    >
      {/* switch it off */}
      <button
        type="button"
        onClick={onHide}
        title={hideLabel}
        aria-label={hideLabel}
        className="pointer-events-auto absolute -left-1 top-1 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-white/90 text-ink/60 shadow-soft ring-1 ring-black/5 transition hover:bg-red-50 hover:text-red-600 md:left-0"
      >
        <X size={13} strokeWidth={2.8} />
      </button>
      {/* the vine */}
      <svg viewBox="0 0 40 400" preserveAspectRatio="none" className="absolute left-1/2 top-0 h-full w-8 -translate-x-1/2 md:w-10">
        <path d="M20 0 C 8 50, 32 100, 20 150 S 8 250, 20 300 S 32 370, 20 400" fill="none" stroke="#3F7F32" strokeWidth="4" strokeLinecap="round" />
        <path d="M20 0 C 8 50, 32 100, 20 150 S 8 250, 20 300 S 32 370, 20 400" fill="none" stroke="#6BAE4E" strokeWidth="1.6" strokeLinecap="round" strokeDasharray="6 10" />
        {[40, 110, 175, 240, 305, 365].map((y, i) => (
          <path key={y} d={i % 2 ? `M20 ${y} q -16 -4 -18 -16 q 14 0 18 16` : `M20 ${y} q 16 -4 18 -16 q -14 0 -18 16`} fill={i % 3 ? "#5FA046" : "#8CCB63"} />
        ))}
      </svg>

      {/* the climbing monkey */}
      <div className="gwz-climb absolute left-1/2 top-0 -translate-x-1/2">
        <button
          type="button"
          onClick={() => {
            setHello(true);
            setTimeout(() => setHello(false), 2200);
          }}
          className="pointer-events-auto relative block w-14 cursor-pointer md:w-[4.5rem]"
        >
          {hello && (
            <span className="absolute -left-40 top-2 w-36 animate-[gwzPop_.3s_ease] rounded-2xl rounded-tr-sm bg-white px-3 py-2 text-left text-xs font-bold text-forest shadow-lift ring-1 ring-black/5">
              {t.extra.hello}
            </span>
          )}
          <svg viewBox="0 0 120 150" className="w-full drop-shadow-lg">
            {/* tail */}
            <path className="gwz-tail" d="M72 108 C 100 112, 108 138, 88 142 C 76 144, 74 132, 84 130" fill="none" stroke="#7A4A26" strokeWidth="6" strokeLinecap="round" />
            {/* arms reaching up to the vine */}
            <g className="gwz-arm-l">
              <path d="M52 78 C 44 60, 50 36, 58 18" fill="none" stroke="#8B5A2B" strokeWidth="11" strokeLinecap="round" />
              <circle cx="58" cy="16" r="6.5" fill="#E8C49A" />
            </g>
            <g className="gwz-arm-r">
              <path d="M68 78 C 76 60, 70 36, 62 18" fill="none" stroke="#8B5A2B" strokeWidth="11" strokeLinecap="round" />
              <circle cx="62" cy="16" r="6.5" fill="#E8C49A" />
            </g>
            {/* legs */}
            <g className="gwz-leg-l">
              <path d="M50 112 C 40 120, 40 132, 50 136" fill="none" stroke="#8B5A2B" strokeWidth="11" strokeLinecap="round" />
              <ellipse cx="52" cy="137" rx="7" ry="5" fill="#E8C49A" />
            </g>
            <g className="gwz-leg-r">
              <path d="M70 112 C 80 120, 80 132, 70 136" fill="none" stroke="#8B5A2B" strokeWidth="11" strokeLinecap="round" />
              <ellipse cx="68" cy="137" rx="7" ry="5" fill="#E8C49A" />
            </g>
            {/* body */}
            <ellipse cx="60" cy="98" rx="20" ry="24" fill="#8B5A2B" />
            <ellipse cx="60" cy="102" rx="12" ry="15" fill="#E8C49A" />
            {/* head */}
            <circle cx="36" cy="58" r="9" fill="#8B5A2B" />
            <circle cx="36" cy="58" r="5" fill="#E8C49A" />
            <circle cx="84" cy="58" r="9" fill="#8B5A2B" />
            <circle cx="84" cy="58" r="5" fill="#E8C49A" />
            <circle cx="60" cy="58" r="23" fill="#8B5A2B" />
            <path d="M60 46 C 50 40, 40 48, 44 58 C 40 66, 46 76, 60 76 C 74 76, 80 66, 76 58 C 80 48, 70 40, 60 46 Z" fill="#E8C49A" />
            {/* face */}
            <g className="gwz-blink">
              <ellipse cx="52" cy="56" rx="3.6" ry="4.4" fill="#2B1B10" />
              <ellipse cx="68" cy="56" rx="3.6" ry="4.4" fill="#2B1B10" />
              <circle cx="53.2" cy="54.4" r="1.3" fill="#fff" />
              <circle cx="69.2" cy="54.4" r="1.3" fill="#fff" />
            </g>
            <ellipse cx="60" cy="64" rx="3" ry="2" fill="#5C3A1E" />
            <path d="M53 68 Q 60 74, 67 68" fill="none" stroke="#5C3A1E" strokeWidth="2" strokeLinecap="round" />
            <circle cx="47" cy="66" r="3" fill="#F2A7A0" opacity="0.6" />
            <circle cx="73" cy="66" r="3" fill="#F2A7A0" opacity="0.6" />
          </svg>
        </button>
      </div>
    </div>
  );
}


/** Leaves drifting down — for hero banners. */
export function HeroWildlife() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden motion-reduce:hidden">
      {[
        { left: "12%", dur: "13s", delay: "0s", c: "#9BD13B" },
        { left: "34%", dur: "16s", delay: "5s", c: "#F4C95D" },
        { left: "58%", dur: "14s", delay: "2s", c: "#8CCB63" },
        { left: "78%", dur: "18s", delay: "8s", c: "#9BD13B" },
        { left: "90%", dur: "15s", delay: "11s", c: "#F4C95D" },
      ].map((l, i) => (
        <svg
          key={i}
          viewBox="0 0 20 20"
          width="18"
          className="gwz-leaf absolute -top-6"
          style={{ left: l.left, animationDuration: l.dur, animationDelay: l.delay }}
        >
          <path d="M10 1 C 18 6, 18 14, 10 19 C 2 14, 2 6, 10 1 Z" fill={l.c} opacity="0.85" />
          <path d="M10 3 L10 17" stroke="#0E3F24" strokeWidth="0.8" opacity="0.4" />
        </svg>
      ))}
    </div>
  );
}

/** A couple of butterflies fluttering around inside a section. */
export function Butterflies() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-visible motion-reduce:hidden">
      {[
        { c1: "#F4A261", c2: "#E76F51", path: "gwz-flutter-a", top: "10%", left: "8%" },
        { c1: "#9BD13B", c2: "#2A9D8F", path: "gwz-flutter-b", top: "60%", left: "70%" },
      ].map((b, i) => (
        <div key={i} className={`${b.path} absolute`} style={{ top: b.top, left: b.left }}>
          <svg viewBox="0 0 40 30" width="30" className="gwz-wings">
            <ellipse cx="12" cy="11" rx="10" ry="8" fill={b.c1} />
            <ellipse cx="28" cy="11" rx="10" ry="8" fill={b.c1} />
            <ellipse cx="14" cy="22" rx="7" ry="6" fill={b.c2} />
            <ellipse cx="26" cy="22" rx="7" ry="6" fill={b.c2} />
            <rect x="19" y="6" width="2.4" height="20" rx="1.2" fill="#2B1B10" />
          </svg>
        </div>
      ))}
    </div>
  );
}
