"use client";

import { useEffect, useRef } from "react";

/**
 * Plays a Lottie animation (a small JSON file) in a loop. Loaded only in the
 * browser, paused when the tab is hidden, and held still for people who
 * asked their phone for less motion.
 */
export function LottiePlayer({ src, className, speed = 1, label }: { src: string; className?: string; speed?: number; label?: string }) {
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let anim: any;
    let alive = true;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    (async () => {
      const [{ default: lottie }, data] = await Promise.all([import("lottie-web/build/player/lottie_light"), fetch(src).then((r) => r.json())]);
      if (!alive || !box.current) return;
      anim = lottie.loadAnimation({ container: box.current, renderer: "svg", loop: !still, autoplay: !still, animationData: data, rendererSettings: { preserveAspectRatio: "xMidYMid meet", progressiveLoad: true } });
      anim.setSpeed(speed);
      if (still) anim.goToAndStop(0, true);
    })().catch(() => {});
    const vis = () => anim && !still && (document.hidden ? anim.pause() : anim.play());
    document.addEventListener("visibilitychange", vis);
    return () => {
      alive = false;
      document.removeEventListener("visibilitychange", vis);
      anim?.destroy();
    };
  }, [src, speed]);
  return <div ref={box} className={className} role={label ? "img" : undefined} aria-label={label} aria-hidden={label ? undefined : true} />;
}
