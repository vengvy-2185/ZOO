import type { MetadataRoute } from "next";
import { CANONICAL_URL } from "@/lib/site";

const SITE = CANONICAL_URL;

/** Search engines: the public site yes; staff, admin, accounts, tickets and payments no. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/staff", "/account", "/api/", "/ticket/", "/pay/", "/checkout", "/my-tickets", "/q/", "/verify/", "/scan/", "/auth/"] }],
    sitemap: `${SITE}/sitemap.xml`,
    host: SITE,
  };
}
