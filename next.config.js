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
