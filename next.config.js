/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Admin forms upload photos through Server Actions (default limit is 1 MB).
    serverActions: { bodySizeLimit: "10mb" },
  },
  // Browsers ask for /favicon.ico by default; serve the SVG app icon instead.
  async redirects() {
    return [
      { source: "/match", destination: "/games", permanent: false },
      { source: "/love", destination: "/games", permanent: false },
      { source: "/kids", destination: "/games", permanent: false },
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
