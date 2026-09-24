"use client";

import { useEffect } from "react";

// Tapping a link to the page you're already on (the Home tab, the logo, a
// menu item…) smoothly scrolls back to the top, like in phone apps. This
// replaces the old floating "back to top" button.
export function ScrollTopOnSameLink() {
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a || a.target === "_blank" || a.hasAttribute("download")) return;
      const url = new URL(a.href, window.location.href);
      if (url.origin !== window.location.origin || url.hash) return;
      if (url.pathname === window.location.pathname && url.search === window.location.search) {
        e.preventDefault();
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    };
    // Capture phase, so it runs before Next's <Link> handler.
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);
  return null;
}
