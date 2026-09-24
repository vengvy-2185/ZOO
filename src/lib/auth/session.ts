import { headers } from "next/headers";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { createClient } from "@/lib/supabase/server";
import { VERIFIED_USER_HEADER } from "./constants";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
// Cached in memory by jose after the first fetch — verifying is a local check.
const JWKS = createRemoteJWKSet(new URL(`${SUPABASE_URL}/auth/v1/.well-known/jwks.json`));

/**
 * The user id that middleware.ts already verified for this request (admin /
 * staff / account routes only). Middleware always strips any client-sent
 * copy of this header first, so it can't be spoofed.
 */
export function getVerifiedUserId(): string | null {
  return headers().get(VERIFIED_USER_HEADER);
}

export interface SessionUser {
  id: string;
  email: string | null;
  fullName: string | null;
  avatarUrl: string | null;
}

/**
 * Who is signed in, from the session cookie. The access token's signature
 * is verified locally against the project's public key (no network call),
 * so the returned id can be trusted; a forged or foreign token yields null.
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) return null;
  try {
    const { payload } = await jwtVerify(session.access_token, JWKS, { issuer: `${SUPABASE_URL}/auth/v1` });
    const meta = (payload.user_metadata ?? {}) as Record<string, string | undefined>;
    if (!payload.sub) return null;
    return {
      id: payload.sub,
      email: (payload.email as string | undefined) ?? null,
      // display_name / custom_avatar_url are what the visitor chose on their
      // account page; Google overwrites full_name / avatar_url on every login.
      fullName: meta.display_name ?? meta.full_name ?? meta.name ?? null,
      avatarUrl: meta.custom_avatar_url ?? meta.avatar_url ?? meta.picture ?? null,
    };
  } catch {
    return null;
  }
}
