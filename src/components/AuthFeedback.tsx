"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useI18n } from "@/lib/i18n/client";
import { LogoMark } from "@/components/visitor/Logo";

// Visible feedback around signing in and out, so it never happens "silently":
//  - a full-screen "connecting" animation while we hand over to Google/Facebook
//  - a "connected, welcome <name>" card when the visitor lands back signed in
//  - a "signed out safely" card after signing out
// The event travels between pages in a short-lived cookie (set here or by
// /auth/callback), because a sign-in always ends with a page navigation.

const COOKIE = "gwz_auth";

export function markAuthEvent(kind: "welcome" | "bye") {
  document.cookie = `${COOKIE}=${kind}; path=/; max-age=120; samesite=lax`;
}

function takeAuthEvent(): "welcome" | "bye" | null {
  const m = document.cookie.match(/(?:^|;\s*)gwz_auth=(welcome|bye)/);
  if (!m) return null;
  document.cookie = `${COOKIE}=; path=/; max-age=0`;
  return m[1] as "welcome" | "bye";
}

/** Full-screen animation shown while the browser is sent to Google or Facebook. */
export function ConnectingOverlay({ provider }: { provider: string }) {
  const { t } = useI18n();
  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-forest/90 text-white backdrop-blur-md animate-[gwzFade_.25s_ease]">
      <div className="relative flex h-28 w-28 items-center justify-center">
        <span className="absolute inset-0 animate-ping rounded-full bg-leaf/30" />
        <span className="absolute inset-2 animate-spin rounded-full border-4 border-white/15 border-t-leaf" style={{ animationDuration: "1.1s" }} />
        <LogoMark className="h-14 w-14" />
      </div>
      <p className="mt-6 font-display text-xl font-bold">{t.auth.connecting(provider)}</p>
      <p className="mt-1 flex gap-1 text-leaf" aria-hidden>
        {[0, 1, 2].map((i) => (
          <span key={i} className="h-2 w-2 animate-bounce rounded-full bg-leaf" style={{ animationDelay: `${i * 0.15}s` }} />
        ))}
      </p>
      <p className="mt-4 max-w-xs text-center text-sm text-white/70">{t.auth.connectingHint}</p>
    </div>
  );
}

/** Mounted once in the root layout: shows the welcome / goodbye card. */
export function AuthToast() {
  const pathname = usePathname();
  const { t } = useI18n();
  const [toast, setToast] = useState<null | { kind: "welcome" | "bye"; name?: string; avatar?: string; provider?: string }>(null);

  useEffect(() => {
    const kind = takeAuthEvent();
    if (!kind) return;
    if (kind === "bye") {
      setToast({ kind });
      return;
    }
    // Local read of the session cookie — no network call.
    createClient()
      .auth.getSession()
      .then(({ data }) => {
        const u = data.session?.user;
        if (!u) return;
        const meta = (u.user_metadata ?? {}) as Record<string, string>;
        setToast({
          kind,
          name: meta.display_name || meta.full_name || meta.name || u.email?.split("@")[0],
          avatar: meta.custom_avatar_url || meta.avatar_url || meta.picture,
          provider: (u.app_metadata?.provider as string) || "email",
        });
      });
  }, [pathname]);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 4500);
    return () => clearTimeout(id);
  }, [toast]);

  if (!toast) return null;
  const welcome = toast.kind === "welcome";
  const via = toast.provider === "google" ? "Google" : toast.provider === "facebook" ? "Facebook" : null;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-20 z-[90] flex justify-center px-4" role="status" aria-live="polite">
      <div className="pointer-events-auto relative w-full max-w-sm overflow-hidden rounded-3xl bg-white p-4 shadow-lift ring-1 ring-black/5 animate-[gwzDrop_.5s_cubic-bezier(.2,.9,.3,1.3)]">
        {welcome && (
          <div className="pointer-events-none absolute left-10 top-10" aria-hidden>
            {Array.from({ length: 14 }).map((_, i) => (
              <span
                key={i}
                className="absolute h-2 w-2 rounded-sm"
                style={{
                  background: ["#F4C95D", "#9BD13B", "#176B3A", "#E76F51", "#0EA5E9"][i % 5],
                  animation: "gwzBurst 1.1s ease-out forwards",
                  ["--dx" as any]: `${Math.cos((i / 14) * Math.PI * 2) * 90}px`,
                  ["--dy" as any]: `${Math.sin((i / 14) * Math.PI * 2) * 60}px`,
                }}
              />
            ))}
          </div>
        )}
        <div className="relative flex items-center gap-3">
          <div className="relative flex-shrink-0">
            {welcome && toast.avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={toast.avatar} alt="" referrerPolicy="no-referrer" className="h-14 w-14 rounded-full object-cover ring-4 ring-light-green" />
            ) : (
              <span className={`flex h-14 w-14 items-center justify-center rounded-full ${welcome ? "bg-primary" : "bg-ink/70"}`}>
                <LogoMark className="h-9 w-9" />
              </span>
            )}
            {/* animated check mark */}
            <span className={`absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full ring-2 ring-white ${welcome ? "bg-leaf" : "bg-ink/60"}`}>
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="white" strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12.5l4.5 4.5L19 7.5" style={{ strokeDasharray: 24, strokeDashoffset: 24, animation: "gwzDraw .5s .35s ease forwards" }} />
              </svg>
            </span>
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-wider text-primary">{welcome ? t.auth.connected : t.auth.signedOut}</p>
            <p className="truncate font-display text-lg font-extrabold text-forest">{welcome ? t.auth.welcomeName(toast.name ?? "") : t.auth.seeYou}</p>
            {welcome && via && <p className="text-xs text-ink/50">{t.auth.via(via)}</p>}
          </div>
        </div>
        <div className="absolute inset-x-0 bottom-0 h-1 bg-light-green">
          <div className="h-full bg-primary" style={{ animation: "gwzShrink 4.5s linear forwards" }} />
        </div>
      </div>
    </div>
  );
}
