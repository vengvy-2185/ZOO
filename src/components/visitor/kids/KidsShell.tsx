import Link from "next/link";
import { ArrowLeft, type LucideIcon } from "lucide-react";
import { Navbar } from "@/components/visitor/Navbar";
import { BottomNav } from "@/components/visitor/BottomNav";
import { PageHeader } from "@/components/visitor/PageHeader";
import { SiteFooter } from "@/components/visitor/SiteFooter";
import { getI18n } from "@/lib/i18n/server";

/** Page frame for the Kids Zone games, with a way back to the hub. */
export function KidsShell({ icon, title, subtitle, children }: { icon: LucideIcon; title: [string, string]; subtitle: [string, string]; children: React.ReactNode }) {
  const { locale } = getI18n();
  const km = locale === "km";
  return (
    <div className="pb-20 md:pb-0">
      <Navbar />
      <PageHeader icon={icon} eyebrow={km ? "ល្បែង" : "Games"} title={km ? title[1] : title[0]} subtitle={km ? subtitle[1] : subtitle[0]} />
      <main className="mx-auto max-w-5xl px-4 pb-12 md:px-6">
        <Link href="/games" className="mb-4 inline-flex items-center gap-1.5 text-sm font-bold text-primary">
          <ArrowLeft size={16} /> {km ? "ត្រឡប់ទៅល្បែង" : "Back to Games"}
        </Link>
        {children}
      </main>
      <SiteFooter />
      <BottomNav />
    </div>
  );
}
