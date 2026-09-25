import type { Metadata } from "next";
import { Suspense } from "react";
import { NavigationProgress } from "@/components/NavigationProgress";
import { ScrollReveal } from "@/components/ScrollReveal";
import { OAuthCodeCatcher } from "@/components/OAuthCodeCatcher";
import { AuthToast } from "@/components/AuthFeedback";
import { IntroSplash, INTRO_SCRIPT } from "@/components/IntroSplash";
import { TEXT_SIZE_SCRIPT } from "@/lib/text-size";
import { ZooAssistant } from "@/components/ZooAssistant";
import { LiveRefresh } from "@/components/LiveRefresh";
import { GlobalAttendanceQR } from "@/components/staff/GlobalAttendanceQR";
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

export const metadata: Metadata = {
  title: "Green Wild Zoo: Discover, Learn, Explore and Protect",
  description:
    "Explore Green Wild Zoo: individual animal profiles, digital storybooks, multi-language audio guides, an interactive zoo map, and digital tickets.",
  // Browsers still request /favicon.ico directly — point it at the SVG icon.
  icons: { icon: "/icon.svg", shortcut: "/icon.svg" },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = getLocale();
  const { heroVideoUrl } = await getBranding().catch(() => ({ heroVideoUrl: undefined }));
  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        {/* Decides before the first paint whether to play the opening animation. */}
        <script dangerouslySetInnerHTML={{ __html: INTRO_SCRIPT }} />
        <script dangerouslySetInnerHTML={{ __html: TEXT_SIZE_SCRIPT }} />
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
