import type { Metadata } from "next";

// The admin area installs as its own app ("GWZ Admin"), opening on /admin.
export const metadata: Metadata = {
  manifest: "/admin.webmanifest",
  appleWebApp: { capable: true, title: "GWZ Admin", statusBarStyle: "default" },
};

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
