"use client";

import { useEffect } from "react";

// Scroll-triggered entrance animations for the whole site.
//
// Mark any element with data-reveal (="up" | "zoom" | "left" | "right") and
// it fades/slides in the first time it scrolls into view. Put
// data-reveal-stagger on a grid and each child reveals one after another.
// Works with server components (no wrapper needed), picks up elements that
// appear after client-side navigation, and respects "reduce motion".
// The "shown" state is a data attribute, not a class: React rewrites
// className on re-render, which would hide a card again after a click.
export function ScrollReveal() {
  useEffect(() => {
    const root = document.documentElement;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            (e.target as HTMLElement).dataset.shown = "1";
            io.unobserve(e.target);
          }
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -6% 0px" }
    );

    function scan() {
      document.querySelectorAll<HTMLElement>("[data-reveal-stagger]:not([data-stagger-done])").forEach((parent) => {
        parent.dataset.staggerDone = "1";
        const kind = parent.dataset.revealStagger || "up";
        Array.from(parent.children).forEach((child, i) => {
          const el = child as HTMLElement;
          el.dataset.reveal ??= kind;
          el.style.setProperty("--reveal-delay", `${Math.min(i, 10) * 70}ms`);
        });
      });
      const vh = window.innerHeight;
      document.querySelectorAll<HTMLElement>("[data-reveal]:not([data-reveal-seen])").forEach((el) => {
        el.dataset.revealSeen = "1";
        // Already on screen at load: show immediately (no flash, no animation).
        if (!root.classList.contains("reveal-on") && el.getBoundingClientRect().top < vh) {
          el.dataset.shown = "1";
        } else {
          io.observe(el);
        }
      });
    }

    scan();
    root.classList.add("reveal-on");
    const mo = new MutationObserver(() => scan());
    mo.observe(document.body, { childList: true, subtree: true });
    return () => {
      mo.disconnect();
      io.disconnect();
    };
  }, []);

  return null;
}
