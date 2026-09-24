"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

// A thin progress bar at the very top that appears the instant a link is
// clicked and completes when the new page has rendered — so every click
// gives immediate feedback, even when the next page takes a moment.
export function NavigationProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval>>();

  // Start on clicks of same-site links that change the URL.
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as HTMLElement).closest("a");
      if (!a || a.target === "_blank" || a.hasAttribute("download")) return;
      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin) return;
      if (url.pathname === location.pathname && url.search === location.search) return;
      clearInterval(timer.current);
      setVisible(true);
      setProgress(12);
      // Creep towards 90% until the route actually changes.
      timer.current = setInterval(() => setProgress((p) => (p < 90 ? p + (90 - p) * 0.12 : p)), 120);
    }
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  // Finish when the new route has rendered.
  useEffect(() => {
    if (!visible) return;
    clearInterval(timer.current);
    setProgress(100);
    const t = setTimeout(() => {
      setVisible(false);
      setProgress(0);
    }, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, searchParams]);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-x-0 top-0 z-[100] h-[3px]"
      style={{ opacity: visible ? 1 : 0, transition: "opacity 200ms" }}
    >
      <div
        className="h-full bg-gradient-to-r from-leaf via-primary to-leaf shadow-[0_0_8px_rgba(155,209,59,0.8)]"
        style={{ width: `${progress}%`, transition: "width 200ms ease-out" }}
      />
    </div>
  );
}
