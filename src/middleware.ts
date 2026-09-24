import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { VERIFIED_USER_HEADER } from "@/lib/auth/constants";

// Protects /admin/*, /staff/* and /account/* routes. Fine-grained role
// checks (admin vs staff vs visitor) additionally happen in each layout
// via the profiles.role column — this is the first gate.
//
// The user is verified with Supabase Auth exactly once here, and the
// verified id is forwarded to the page as a request header so layouts
// don't have to make the same (slow) network call again.
export async function middleware(request: NextRequest) {
  const { response, user, offline } = await updateSession(request);
  const path = request.nextUrl.pathname;

  const needsAuth = path.startsWith("/admin") && path !== "/admin/login";
  const needsStaffAuth = path.startsWith("/staff") && path !== "/staff/login";
  const needsAccountAuth =
    path.startsWith("/account") && path !== "/account/login" && path !== "/account/reset-password";

  if ((needsAuth || needsStaffAuth || needsAccountAuth) && !user && offline) {
    // The login couldn't be checked because the internet dropped — don't
    // throw the user out to the login page, let them retry.
    return new NextResponse(OFFLINE_PAGE, { status: 503, headers: { "content-type": "text/html; charset=utf-8", "retry-after": "3" } });
  }

  if ((needsAuth || needsStaffAuth || needsAccountAuth) && !user) {
    const loginPath = path.startsWith("/admin")
      ? "/admin/login"
      : path.startsWith("/staff")
        ? "/staff/login"
        : "/account/login";
    const url = request.nextUrl.clone();
    url.pathname = loginPath;
    url.searchParams.set("next", path);
    return NextResponse.redirect(url);
  }

  // Never trust a client-sent copy of the header; set it only from getUser().
  const forwarded = new Headers(request.headers);
  forwarded.delete(VERIFIED_USER_HEADER);
  if (user) forwarded.set(VERIFIED_USER_HEADER, user.id);

  const next = NextResponse.next({ request: { headers: forwarded } });
  // Keep any refreshed auth cookies that updateSession() set.
  response.cookies.getAll().forEach((cookie) => next.cookies.set(cookie));
  return next;
}

const OFFLINE_PAGE = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Green Wild Zoo</title>
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#F4F8F1;font-family:system-ui,sans-serif;color:#17231A}
.c{max-width:360px;margin:16px;padding:32px;border-radius:28px;background:#fff;box-shadow:0 10px 30px rgba(0,0,0,.08);text-align:center}
h1{font-size:20px;margin:12px 0 6px;color:#0E3F24}p{margin:0 0 20px;color:#555;font-size:14px;line-height:1.6}
button{border:0;border-radius:999px;background:#176B3A;color:#fff;font-weight:700;padding:12px 24px;font-size:15px;cursor:pointer}</style></head>
<body><div class="c"><div style="font-size:40px">📶</div><h1>ការតភ្ជាប់ដាច់ · Connection problem</h1>
<p>មិនអាចភ្ជាប់ទៅម៉ាស៊ីនមេបានទេ។ សូមពិនិត្យអ៊ីនធឺណិត។<br>We couldn't reach the server. Check your internet.</p>
<button onclick="location.reload()">សាកម្តងទៀត · Try again</button></div>
<script>setTimeout(function(){location.reload()},5000)</script></body></html>`;

export const config = {
  matcher: ["/admin/:path*", "/staff/:path*", "/account/:path*"],
};
