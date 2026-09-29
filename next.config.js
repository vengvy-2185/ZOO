/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Admin forms upload photos through Server Actions (default limit is 1 MB).
    serverActions: { bodySizeLimit: "10mb" },
  },
  // Browsers ask for /favicon.ico by default; serve the SVG app icon instead.
  async redirects() {
    return [
      // the games were removed: old links go to the home page
      ...["/games", "/quiz", "/guess", "/coloring", "/compare", "/older", "/kids", "/kids/:path*", "/match", "/love", "/zodiac"].map((source) => ({ source, destination: "/", permanent: false })),
      // the audio guides and picture-book stories were removed
      { source: "/animals/:code/audio", destination: "/animals/:code", permanent: false },
      { source: "/animals/:code/story", destination: "/animals/:code", permanent: false },
      { source: "/admin/audio", destination: "/admin", permanent: false },
      { source: "/admin/stories", destination: "/admin", permanent: false },
      { source: "/admin/manage/stories", destination: "/admin", permanent: false },
      { source: "/admin/manage/story_pages", destination: "/admin", permanent: false },
      { source: "/admin/manage/audio_guides", destination: "/admin", permanent: false },
      // assigned tasks were removed from the staff area
      { source: "/staff/tasks", destination: "/staff", permanent: false },
    ];
  },
  // Safety headers on every page: no framing by other sites (click-jacking),
  // no guessing file types, only send the site name to other sites (ticket
  // links carry a secret key), HTTPS only, and camera / microphone / location
  // only for this site's own pages (scanner, voice chat, attendance).
  async headers() {
    const security = [
      { key: "X-Frame-Options", value: "SAMEORIGIN" },
      { key: "Content-Security-Policy", value: "frame-ancestors 'self'; base-uri 'self'; object-src 'none'; form-action 'self'" },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
      { key: "Permissions-Policy", value: "camera=(self), microphone=(self), geolocation=(self), payment=(), usb=(), interest-cohort=()" },
    ];
    return [
      { source: "/:path*", headers: security },
      // the offline helper must always be fresh, and may look after the whole site
      { source: "/sw.js", headers: [{ key: "Cache-Control", value: "no-cache, no-store, must-revalidate" }, { key: "Service-Worker-Allowed", value: "/" }] },
    ];
  },
  async rewrites() {
    return [{ source: "/favicon.ico", destination: "/icon.svg" }];
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.supabase.co" },
    ],
  },
};
module.exports = nextConfig;
