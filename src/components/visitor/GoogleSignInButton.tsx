"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ConnectingOverlay } from "@/components/AuthFeedback";
import { useI18n } from "@/lib/i18n/client";

export function GoogleSignInButton({ next = "/account" }: { next?: string }) {
  const supabase = createClient();
  const { t } = useI18n();
  const [connecting, setConnecting] = useState(false);

  async function signInWithGoogle() {
    setConnecting(true);
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo },
    });
  }

  return (
    <>
    {connecting && <ConnectingOverlay provider="Google" />}
    <button
      type="button"
      onClick={signInWithGoogle}
      className="flex w-full items-center justify-center gap-2 rounded-full border border-black/10 bg-white py-2.5 text-sm font-medium text-ink hover:bg-black/5"
    >
      <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden="true">
        <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.9 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 8 3l6-6C34.6 5.1 29.6 3 24 3 12.4 3 3 12.4 3 24s9.4 21 21 21 21-9.4 21-21c0-1.2-.1-2.4-.4-3.5z"/>
        <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.5 16 18.9 13 24 13c3.1 0 5.8 1.1 8 3l6-6C34.6 5.1 29.6 3 24 3c-7.7 0-14.3 4.4-17.7 10.7z"/>
        <path fill="#4CAF50" d="M24 45c5.5 0 10.4-1.9 14.3-5.1l-6.6-5.6c-2.1 1.5-4.8 2.4-7.7 2.4-5.3 0-9.7-3.4-11.3-8.1l-6.6 5.1C9.6 40.5 16.2 45 24 45z"/>
        <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-1 2.8-2.9 5.2-5.3 6.8l6.6 5.6C39.9 38.1 45 32 45 24c0-1.2-.1-2.4-.4-3.5z"/>
      </svg>
      {t.auth.google}
    </button>
    </>
  );
}
