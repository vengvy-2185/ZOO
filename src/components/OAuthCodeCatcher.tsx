"use client";

import { useEffect } from "react";

// If Supabase ever sends a visitor back from Google to a page other than
// /auth/callback (it falls back to the Site URL when the redirect address
// isn't on its allow-list), the one-time ?code= would be ignored and the
// sign-in lost. Forward it to the callback so the login still completes.
export function OAuthCodeCatcher() {
  useEffect(() => {
    const url = new URL(window.location.href);
    const code = url.searchParams.get("code");
    if (url.pathname !== "/auth/callback" && code && /^[0-9a-f-]{20,}$/i.test(code)) {
      window.location.replace(`/auth/callback?code=${encodeURIComponent(code)}&next=/account`);
    }
  }, []);
  return null;
}
