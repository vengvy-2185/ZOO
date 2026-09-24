import { NextResponse } from "next/server";
import { REF_COOKIE, REF_AT_COOKIE, isReferralCode } from "@/lib/server/points";
import { getRequestOrigin } from "@/lib/server/site-url";

// A friend's invite link: remember who invited this visitor for 30 days,
// then take them to tickets. The friend earns points when they create an
// account (see claimSignupReferral) and more when they pay.
export function GET(_req: Request, { params }: { params: { code: string } }) {
  const code = params.code.toUpperCase();
  // Public address (behind Render/Vercel the request URL is the internal one).
  const res = NextResponse.redirect(`${getRequestOrigin()}${isReferralCode(code) ? "/tickets?invited=1" : "/tickets"}`);
  if (isReferralCode(code)) {
    const opts = { maxAge: 60 * 60 * 24 * 30, path: "/", sameSite: "lax" as const, httpOnly: true, secure: process.env.NODE_ENV === "production" };
    res.cookies.set(REF_COOKIE, code, opts);
    res.cookies.set(REF_AT_COOKIE, String(Date.now()), opts);
  }
  return res;
}
