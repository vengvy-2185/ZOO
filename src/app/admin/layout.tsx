import type { Metadata } from "next";

// The admin area installs as its own app ("GWZ Admin"), opening on /admin.
export const metadata: Metadata = {
  manifest: "/admin.webmanifest",
  // the admin area never shows up in search results
  robots: { index: false, follow: false },
  appleWebApp: { capable: true, title: "GWZ Admin", statusBarStyle: "default" },
};

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
