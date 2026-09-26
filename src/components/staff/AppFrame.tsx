"use client";

import { useEffect, useRef } from "react";

/**
 * A full-screen frame for the chat. Normally it is simply the full screen
 * (100dvh). While you type, the phone keyboard covers part of the screen,
 * so the frame shrinks to the visible part: the header stays on top and the
 * typing box sits right above the keyboard. When the keyboard closes it goes
 * back to the full screen. The page behind is locked so nothing jumps.
 */
export function AppFrame({ className, children }: { className?: string; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const before = { h: html.style.overflow, b: body.style.overflow, o: body.style.overscrollBehavior };
    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    body.style.overscrollBehavior = "none";

    const vv = window.visualViewport;
    const typing = () => {
      const el = document.activeElement as HTMLElement | null;
      return !!el && (el.tagName === "TEXTAREA" || el.tagName === "INPUT");
    };
    let raf = 0;
    const fit = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const el = ref.current;
        if (!el) return;
        // keyboard open → the visible part; otherwise the whole screen
        const keyboard = vv && typing() && vv.height < window.innerHeight - 80;
        el.style.height = keyboard ? `${Math.round(vv!.height)}px` : "100dvh";
        if (window.scrollY !== 0) window.scrollTo(0, 0);
      });
    };
    const timers: ReturnType<typeof setTimeout>[] = [];
    // the keyboard animates in/out: look again a few times
    const settle = () => {
      fit();
      timers.forEach(clearTimeout);
      timers.length = 0;
      for (const ms of [120, 300, 600]) timers.push(setTimeout(fit, ms));
    };
    fit();
    vv?.addEventListener("resize", fit);
    window.addEventListener("resize", fit);
    document.addEventListener("focusin", settle);
    document.addEventListener("focusout", settle);
    return () => {
      cancelAnimationFrame(raf);
      timers.forEach(clearTimeout);
      vv?.removeEventListener("resize", fit);
      window.removeEventListener("resize", fit);
      document.removeEventListener("focusin", settle);
      document.removeEventListener("focusout", settle);
      html.style.overflow = before.h;
      body.style.overflow = before.b;
      body.style.overscrollBehavior = before.o;
    };
  }, []);
  return (
    <div ref={ref} className={className} style={{ position: "fixed", left: 0, right: 0, top: 0, height: "100dvh" }}>
      {children}
    </div>
  );
}
