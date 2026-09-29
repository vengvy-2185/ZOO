// The site's one public address, for search engines and sharing (canonical
// links, sitemap, robots.txt, structured data). Set NEXT_PUBLIC_CANONICAL_URL
// when the site moves to its own domain.
export const CANONICAL_URL = (process.env.NEXT_PUBLIC_CANONICAL_URL || "https://zoo-seven-rho.vercel.app").replace(/\/$/, "");
