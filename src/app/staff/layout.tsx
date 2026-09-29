import type { Metadata, Viewport } from "next";

// The staff area installs as its own app ("GWZ បុគ្គលិក"), opening on /staff.
export const metadata: Metadata = {
  manifest: "/staff.webmanifest",
  // the staff area never shows up in search results
  robots: { index: false, follow: false },
  appleWebApp: { capable: true, title: "GWZ បុគ្គលិក", statusBarStyle: "default" },
};
export const viewport: Viewport = { themeColor: "#1D4ED8" };

export default function StaffRootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
