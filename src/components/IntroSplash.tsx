"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n/client";
import { LogoMark } from "@/components/visitor/Logo";

// Opening animation the first time someone enters the site in a browsing
// session: the zoo video plays behind the logo while real animal photos pop
// in, then everything opens up into the website.
//
// Whether to show it is decided by a tiny inline script in <head> (see
// INTRO_SCRIPT) before the page paints, so there is never a flash of the
// site first; the markup itself is always rendered but hidden by CSS unless
// <html> has the "intro-on" class.

export const INTRO_KEY = "gwz_intro_seen";
export const INTRO_SCRIPT = `try{if(!sessionStorage.getItem("${INTRO_KEY}")&&!matchMedia("(prefers-reduced-motion: reduce)").matches&&!/^\\/(admin|staff|auth|ticket|pay)/.test(location.pathname))document.documentElement.classList.add("intro-on")}catch(e){}`;

const PHOTOS = ["/animals/koma-1.jpg", "/animals/nala-1.jpg", "/animals/rio-1.jpg", "/animals/tiko-1.jpg", "/animals/luna-1.jpg", "/animals/milo-1.jpg"];
const DURATION = 3600;

export function IntroSplash({ videoUrl }: { videoUrl?: string }) {
  const { t } = useI18n();
  const [leaving, setLeaving] = useState(false);
  const [active, setActive] = useState(false);

  useEffect(() => {
    if (!document.documentElement.classList.contains("intro-on")) return;
    setActive(true);
    try {
      sessionStorage.setItem(INTRO_KEY, "1");
    } catch {
      /* private mode: it may show again, that's fine */
    }
    const out = setTimeout(() => setLeaving(true), DURATION);
    const done = setTimeout(() => document.documentElement.classList.remove("intro-on"), DURATION + 700);
    return () => {
      clearTimeout(out);
      clearTimeout(done);
    };
  }, []);

  const skip = () => {
    setLeaving(true);
    setTimeout(() => document.documentElement.classList.remove("intro-on"), 500);
  };

  return (
    <div className={`gwz-intro ${leaving ? "gwz-intro-out" : ""}`} aria-hidden={!active}>
      {active && videoUrl && <video className="gwz-intro-video" src={videoUrl} autoPlay muted playsInline loop preload="auto" />}
      <div className="gwz-intro-shade" />

      {/* falling leaves */}
      {Array.from({ length: 10 }).map((_, i) => (
        <span key={i} className="gwz-intro-leaf" style={{ left: `${(i * 10.3 + 4) % 100}%`, animationDelay: `${(i % 5) * 0.35}s`, animationDuration: `${3.2 + (i % 3) * 0.6}s` }} />
      ))}

      <div className="relative flex flex-col items-center">
        {/* ring of real residents */}
        <div className="gwz-intro-ring">
          {PHOTOS.map((src, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={src}
              src={src}
              alt=""
              className="gwz-intro-photo"
              style={{ ["--a" as any]: `${(i / PHOTOS.length) * 360}deg`, animationDelay: `${0.25 + i * 0.12}s, ${1.2 + i * 0.12}s` }}
            />
          ))}
          <div className="gwz-intro-logo">
            <LogoMark className="h-20 w-20 md:h-24 md:w-24" />
          </div>
        </div>
        <h1 className="gwz-intro-title font-display text-4xl font-extrabold tracking-wide text-white md:text-6xl">
          GREEN WILD <span className="text-leaf">ZOO</span>
        </h1>
        <p className="gwz-intro-tag mt-2 text-sm font-semibold text-white/80 md:text-base">{t.nav.tagline}</p>
        <div className="gwz-intro-bar mt-6 h-1 w-40 overflow-hidden rounded-full bg-white/20">
          <span className="block h-full rounded-full bg-leaf" style={{ animationDuration: `${DURATION}ms` }} />
        </div>
      </div>

      <button onClick={skip} className="absolute right-4 top-4 rounded-full bg-white/15 px-4 py-2 text-sm font-bold text-white ring-1 ring-white/25 backdrop-blur hover:bg-white/25" style={{ top: "calc(1rem + env(safe-area-inset-top, 0px))" }}>
        {t.common.skip}
      </button>
    </div>
  );
}
