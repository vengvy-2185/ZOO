import { NextResponse } from "next/server";
import { getRequestOrigin } from "@/lib/server/site-url";
import { createClient } from "@/lib/supabase/server";
import { claimSignupReferral } from "@/lib/server/points";

// Supabase redirects here after Google sign-in with a one-time `code`.
// This is the ONE place that code is exchanged for a session — every login
// entry point (visitor /account/login, /staff/login, /admin/login) points
// its OAuth redirect here with a `next` param saying where to go afterward.
/** Tells the next page to show the "connected, welcome" card (see components/AuthFeedback). */
function welcome(res: NextResponse) {
  res.cookies.set("gwz_auth", "welcome", { path: "/", maxAge: 120, sameSite: "lax" });
  return res;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  // The public address: behind Render/Vercel, request.url carries the internal host (e.g. localhost:10000).
  const origin = getRequestOrigin();
  const code = searchParams.get("code");
  // Only same-site paths: "@evil.com" or "//evil.com" appended to origin
  // would otherwise send a freshly signed-in user to another site.
  const requested = searchParams.get("next") ?? "/account";
  const next =
    requested.startsWith("/") && !requested.startsWith("//") && !requested.startsWith("/\\") ? requested : "/account";

  // Google / Supabase can also send the visitor back with an error (e.g. they cancelled).
  const providerError = searchParams.get("error_description") ?? searchParams.get("error");

  if (code) {
    const supabase = createClient();
    const { data: exchanged, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Came through a friend's invite link and just made an account? Credit the friend.
      if (exchanged.user) await claimSignupReferral(exchanged.user.id).catch(() => {});
      return welcome(NextResponse.redirect(`${origin}${next}`));
    }
    console.error("[auth/callback] code exchange failed:", error.message);
    // If the exchange did go through (e.g. a slow reply), the session cookie
    // is already set — let the visitor in instead of showing an error.
    const { data } = await supabase.auth.getSession();
    if (data.session) return welcome(NextResponse.redirect(`${origin}${next}`));
  } else if (providerError) {
    console.error("[auth/callback] provider returned an error:", providerError);
  }

  const loginPath = next.startsWith("/admin") ? "/admin/login" : next.startsWith("/staff") ? "/staff/login" : "/account/login";
  return NextResponse.redirect(`${origin}${loginPath}?error=oauth_failed`);
}
