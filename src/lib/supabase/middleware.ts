// Session refresh + verification used by the root middleware.ts.
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { resilientFetch } from "./resilient-fetch";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;

// The project signs access tokens with an asymmetric key (ES256) published
// at this JWKS endpoint. jose fetches it once and caches it in memory, so
// verifying a token is a local signature check — no network round trip to
// Supabase Auth on every click, which is what made admin pages feel slow.
const JWKS = createRemoteJWKSet(new URL(`${SUPABASE_URL}/auth/v1/.well-known/jwks.json`), { timeoutDuration: 10000 });

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request: { headers: request.headers } });

  const supabase = createServerClient(SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    global: { fetch: resilientFetch },
    cookies: {
      get(name: string) {
        return request.cookies.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        response.cookies.set({ name, value, ...options });
      },
      remove(name: string, options: CookieOptions) {
        response.cookies.set({ name, value: "", ...options });
      },
    },
  });

  // Reads the session from the cookie; only talks to Supabase when the
  // access token has expired and needs refreshing.
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  let user: { id: string } | null = null;
  // True when we couldn't reach Supabase at all — the caller shows a
  // "connection problem, try again" page instead of logging the user out.
  // (e.g. refreshing an expired session failed because the network is down)
  let offline = !session && !!sessionError && !sessionError.status;
  if (session?.access_token) {
    try {
      const { payload } = await jwtVerify(session.access_token, JWKS, { issuer: `${SUPABASE_URL}/auth/v1` });
      if (payload.sub) user = { id: payload.sub };
    } catch {
      // Not verifiable locally (e.g. an old HS256-signed token, or the key
      // list couldn't be downloaded): ask Supabase.
      const { data, error } = await supabase.auth.getUser();
      user = data.user ? { id: data.user.id } : null;
      if (!user && error && !error.status) offline = true;
    }
  }

  return { response, user, supabase, offline };
}
