"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * Keeps every page up to date without pressing refresh. The database bumps a
 * row in `live_updates` whenever something changes (see migration 0026);
 * this listens over Supabase Realtime and re-renders the current page's
 * server data in place (router.refresh keeps scroll position and anything
 * typed). It waits while someone is typing in a box, and while the tab is
 * hidden, and never refreshes more than once every few seconds.
 */
export function LiveRefresh() {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    let timer: ReturnType<typeof setTimeout> | undefined;
    let pending = false;
    let last = 0;

    const typing = () => {
      const el = document.activeElement as HTMLElement | null;
      // boxes marked data-live-ok (the chat box) keep what's typed across a refresh
      if (el?.dataset.liveOk !== undefined) return false;
      return !!el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT" || el.isContentEditable);
    };
    const run = () => {
      if (document.visibilityState !== "visible" || typing()) {
        pending = true; // do it when they come back / stop typing
        return;
      }
      pending = false;
      last = Date.now();
      router.refresh();
    };
    const schedule = () => {
      clearTimeout(timer);
      timer = setTimeout(run, Math.max(700, 4000 - (Date.now() - last)));
    };
    const resume = () => {
      if (pending) schedule();
    };

    const channel = supabase
      .channel("live-updates")
      .on("postgres_changes", { event: "*", schema: "public", table: "live_updates" }, schedule)
      .subscribe();
    document.addEventListener("visibilitychange", resume);
    document.addEventListener("focusout", resume);

    return () => {
      clearTimeout(timer);
      supabase.removeChannel(channel);
      document.removeEventListener("visibilitychange", resume);
      document.removeEventListener("focusout", resume);
    };
  }, [router]);

  return null;
}
