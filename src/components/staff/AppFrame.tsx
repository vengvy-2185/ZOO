"use client";

import { useEffect, useState } from "react";

/**
 * A full-screen frame that always matches the part of the screen you can
 * see. On phones the keyboard shrinks the visible area; iPhones would then
 * push the whole page up and hide the chat's header. Following
 * window.visualViewport keeps the header on top and the typing box right
 * above the keyboard, with only the messages scrolling in between.
 */
export function AppFrame({ className, children }: { className?: string; children: React.ReactNode }) {
  const [box, setBox] = useState<{ h: number; top: number } | null>(null);
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const fit = () => {
      setBox({ h: vv.height, top: vv.offsetTop });
      // iOS scrolls the page when an input gets focus; undo it
      if (window.scrollY) window.scrollTo(0, 0);
    };
    fit();
    vv.addEventListener("resize", fit);
    vv.addEventListener("scroll", fit);
    return () => {
      vv.removeEventListener("resize", fit);
      vv.removeEventListener("scroll", fit);
    };
  }, []);
  return (
    <div className={className} style={box ? { position: "fixed", left: 0, right: 0, top: box.top, height: box.h } : { position: "fixed", inset: 0 }}>
      {children}
    </div>
  );
}
