import { NextResponse } from "next/server";
import { REF_COOKIE, isReferralCode } from "@/lib/server/points";
import { getRequestOrigin } from "@/lib/server/site-url";

// A friend's invite link: remember who invited this visitor for 30 days,
// then take them to tickets. The friend earns points only if they pay.
export function GET(_req: Request, { params }: { params: { code: string } }) {
  const code = params.code.toUpperCase();
  // Public address (behind Render/Vercel the request URL is the internal one).
  const res = NextResponse.redirect(`${getRequestOrigin()}${isReferralCode(code) ? "/tickets?invited=1" : "/tickets"}`);
  if (isReferralCode(code)) {
    res.cookies.set(REF_COOKIE, code, { maxAge: 60 * 60 * 24 * 30, path: "/", sameSite: "lax", httpOnly: true, secure: process.env.NODE_ENV === "production" });
  }
  return res;
}
