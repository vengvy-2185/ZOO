import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { NavigationProgress } from "@/components/NavigationProgress";
import { ScrollReveal } from "@/components/ScrollReveal";
import { OAuthCodeCatcher } from "@/components/OAuthCodeCatcher";
import { AuthToast } from "@/components/AuthFeedback";
import { IntroSplash, INTRO_SCRIPT } from "@/components/IntroSplash";
import { TEXT_SIZE_SCRIPT } from "@/lib/text-size";
import { ZooAssistant } from "@/components/ZooAssistant";
import { LiveRefresh } from "@/components/LiveRefresh";
import { OfflineKit } from "@/components/OfflineKit";
import { AppBackButton } from "@/components/AppBackButton";
import { AppUpdateBar } from "@/components/AppUpdateBar";
import { GlobalVoice } from "@/components/GlobalVoice";
import { GlobalAttendanceQR } from "@/components/staff/GlobalAttendanceQR";
import { GlobalStaffSound } from "@/components/staff/GlobalStaffSound";
import { getBranding } from "@/lib/branding";
import { ScrollTopOnSameLink } from "@/components/ScrollTopOnSameLink";
import { getLocale } from "@/lib/i18n/server";
import { LocaleProvider } from "@/lib/i18n/client";
// Self-hosted fonts (bundled from npm) — no download from Google at build or
// dev-compile time, so pages don't stall on a slow connection.
import "@fontsource/inter/latin-400.css";
import "@fontsource/inter/latin-500.css";
import "@fontsource/inter/latin-600.css";
import "@fontsource/inter/latin-700.css";
import "@fontsource/baloo-2/latin-600.css";
import "@fontsource/baloo-2/latin-700.css";
import "@fontsource/baloo-2/latin-800.css";
// Khmer: Battambang — declared in globals.css so it applies to Khmer letters only.
import "./globals.css";

import { CANONICAL_URL } from "@/lib/site";
const SITE = CANONICAL_URL;

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  // pages give their own name; search results then read "Our Animals · Green Wild Zoo"
  title: { default: "Green Wild Zoo: Discover, Learn, Explore and Protect", template: "%s · Green Wild Zoo" },
  description:
    "Explore Green Wild Zoo: every animal's profile, an interactive zoo map, events and digital tickets with Bakong KHQR.",
  applicationName: "Green Wild Zoo",
  // the site's own name and picture when shared or shown by search engines (not "Vercel")
  openGraph: { type: "website", siteName: "Green Wild Zoo", title: "Green Wild Zoo", description: "Animals, tickets, zoo map and more at Green Wild Zoo.", images: [{ url: "/og.png", width: 1200, height: 630, alt: "Green Wild Zoo" }], locale: "km_KH", alternateLocale: ["en_US"] },
  twitter: { card: "summary_large_image", title: "Green Wild Zoo", images: ["/og.png"] },
  // Browsers still request /favicon.ico directly — point it at the SVG icon;
  // search engines prefer a square PNG in sizes of 48px steps
  icons: {
    icon: [{ url: "/icon.png?v=2", sizes: "96x96", type: "image/png" }, { url: "/icons/icon-192.png?v=2", sizes: "192x192", type: "image/png" }, { url: "/icons/icon-512.png?v=2", sizes: "512x512", type: "image/png" }],
    shortcut: "/icon.png?v=2",
    apple: "/icons/apple-touch-icon.png?v=2",
  },
  // can be installed on a phone's home screen like an app
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Green Wild Zoo", statusBarStyle: "default" },
};

export const viewport: Viewport = { themeColor: "#176B3A" };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = getLocale();
  const { heroVideoUrl } = await getBranding().catch(() => ({ heroVideoUrl: undefined }));
  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        {/* Decides before the first paint whether to play the opening animation. */}
        <script dangerouslySetInnerHTML={{ __html: INTRO_SCRIPT }} />
        <script dangerouslySetInnerHTML={{ __html: TEXT_SIZE_SCRIPT }} />
        {/* Chrome says "this can be installed" very early, often before the page is ready: keep it for the Install button */}
        <script dangerouslySetInnerHTML={{ __html: `addEventListener("beforeinstallprompt",function(e){e.preventDefault();window.__gwzInstall=e;dispatchEvent(new Event("gwz-install-ready"))});addEventListener("appinstalled",function(){window.__gwzInstall=null;window.__gwzInstalled=1})` }} />
      </head>
      <body>
        <Suspense fallback={null}>
          <NavigationProgress />
        </Suspense>
        <LocaleProvider locale={locale}>
          {children}
          <AuthToast />
          <ZooAssistant />
          <GlobalAttendanceQR />
          <GlobalStaffSound />
          <OfflineKit />
          <AppBackButton />
          <AppUpdateBar />
          <GlobalVoice />
          <IntroSplash videoUrl={heroVideoUrl} />
        </LocaleProvider>
        <ScrollReveal />
        <OAuthCodeCatcher />
        <ScrollTopOnSameLink />
        <LiveRefresh />
      </body>
    </html>
  );
}
