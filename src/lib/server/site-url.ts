import { headers } from "next/headers";

/**
 * The public address of the site, for links printed in QR codes.
 * Uses NEXT_PUBLIC_SITE_URL when it is set to a real address; otherwise
 * (not set, or still "localhost" on a deployed server) it falls back to the
 * address the current request came in on, so printed codes always work.
 */
export function getSiteUrl(): string {
  const env = (process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/$/, "");
  if (env && !/localhost|127\.0\.0\.1/.test(env)) return env;
  try {
    const h = headers();
    const host = h.get("x-forwarded-host") ?? h.get("host");
    if (host) {
      const proto = h.get("x-forwarded-proto") ?? (/^localhost|^127\./.test(host) ? "http" : "https");
      return `${proto.split(",")[0]}://${host}`;
    }
  } catch {
    /* not inside a request */
  }
  return env || "http://localhost:3000";
}

/**
 * The address the visitor is actually using (from the proxy headers), for
 * redirects that must stay on the same domain as their login cookies.
 */
export function getRequestOrigin(): string {
  try {
    const h = headers();
    const host = h.get("x-forwarded-host") ?? h.get("host");
    if (host) {
      const proto = h.get("x-forwarded-proto") ?? (/^localhost|^127\./.test(host) ? "http" : "https");
      return `${proto.split(",")[0]}://${host}`;
    }
  } catch {
    /* not inside a request */
  }
  return getSiteUrl();
}
