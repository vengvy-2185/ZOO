import { NextResponse } from "next/server";
import { REF_COOKIE, isReferralCode } from "@/lib/server/points";

// A friend's invite link: remember who invited this visitor for 30 days,
// then take them to tickets. The friend earns points only if they pay.
export function GET(req: Request, { params }: { params: { code: string } }) {
  const code = params.code.toUpperCase();
  const res = NextResponse.redirect(new URL(isReferralCode(code) ? "/tickets?invited=1" : "/tickets", req.url));
  if (isReferralCode(code)) {
    res.cookies.set(REF_COOKIE, code, { maxAge: 60 * 60 * 24 * 30, path: "/", sameSite: "lax", httpOnly: true, secure: process.env.NODE_ENV === "production" });
  }
  return res;
}
