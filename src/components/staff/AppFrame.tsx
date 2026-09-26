"use client";

import { useEffect, useRef } from "react";

/**
 * A full-screen frame that matches the part of the screen you can see.
 * On phones the keyboard shrinks the visible area; this keeps the chat
 * header on top and the typing box right above the keyboard. The page
 * itself is locked (no scrolling behind), and the size is set straight on
 * the element once per frame, so it doesn't shake while the keyboard opens.
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
    let raf = 0;
    const fit = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const el = ref.current;
        if (!el) return;
        const h = vv ? vv.height : window.innerHeight;
        el.style.height = `${Math.round(h)}px`;
        // iOS may still nudge the page when the keyboard opens: put it back
        if (window.scrollY !== 0) window.scrollTo(0, 0);
      });
    };
    fit();
    vv?.addEventListener("resize", fit);
    window.addEventListener("resize", fit);
    return () => {
      cancelAnimationFrame(raf);
      vv?.removeEventListener("resize", fit);
      window.removeEventListener("resize", fit);
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
