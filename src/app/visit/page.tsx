import Link from "next/link";
import { CalendarDays, Clock, Ticket, MapPin, Phone, ArrowRight, User, Map as MapIcon } from "lucide-react";
import { getSettings, getZonesAndFacilities, getTicketTypes } from "@/lib/data/zoo";
import { Navbar } from "@/components/visitor/Navbar";
import { BottomNav } from "@/components/visitor/BottomNav";
import { PageHeader } from "@/components/visitor/PageHeader";
import { SiteFooter } from "@/components/visitor/SiteFooter";
import { facilityStyle } from "@/lib/icons/facilityIcons";
import { OpenStatus } from "@/components/visitor/OpenStatus";
import { TodayConditions } from "@/components/visitor/TodayConditions";
import { getI18n } from "@/lib/i18n/server";
import { num } from "@/lib/utils/age";

export default async function VisitPage() {
  const [{ zooProfile: profile }, { facilities }, ticketTypes] = await Promise.all([getSettings(), getZonesAndFacilities(), getTicketTypes()]);
  const prices = ticketTypes.map((t: any) => Number(t.price_usd)).filter((p: number) => p > 0);
  const cheapest = prices.length ? { price_usd: Math.min(...prices) } : null;
  const { locale, t } = getI18n();

  const info = [
    { icon: Clock, label: t.visit.openingHours, value: num(`${profile.opening_time ?? "08:00"} – ${profile.closing_time ?? "18:00"}`, locale) },
    { icon: Ticket, label: t.visit.ticketsFrom, value: cheapest?.price_usd != null ? `$${num(Number(cheapest.price_usd), locale)}` : t.visit.seeTickets },
    { icon: MapPin, label: t.visit.location, value: (locale === "km" && profile.address_km) || profile.address || t.footer.address },
    { icon: Phone, label: t.visit.contact, value: profile.phone ?? "+855 00 000 000" },
  ];

  return (
    <div className="pb-20 md:pb-0">
      <Navbar />
      <PageHeader icon={CalendarDays} eyebrow={t.visit.eyebrow} title={t.visit.title} subtitle={t.visit.subtitle}>
        <OpenStatus className="mt-5" />
      </PageHeader>
      <main className="mx-auto max-w-6xl px-4 md:px-6">
        <TodayConditions className="mb-6" />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4" data-reveal-stagger>
          {info.map(({ icon: Icon, label, value }) => (
            <div key={label} className="card p-5">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-light-green text-primary">
                <Icon size={22} />
              </span>
              <div className="mt-3 text-xs font-semibold uppercase tracking-wider text-ink/45">{label}</div>
              <div className="font-display text-lg font-bold leading-snug text-forest">{value}</div>
            </div>
          ))}
        </div>

        <h2 className="section-title mt-14">{t.visit.facilities}</h2>
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5" data-reveal-stagger="zoom">
          {(facilities ?? []).map((f) => {
            const s = facilityStyle(f.type);
            return (
              <div key={f.id} className="card flex min-w-0 items-center gap-3 p-3 sm:p-4">
                <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl text-white sm:h-11 sm:w-11" style={{ backgroundColor: s.color }}>
                  <s.icon size={20} />
                </span>
                <div className="min-w-0">
                  <div className="text-sm font-bold leading-snug text-forest [overflow-wrap:anywhere]">{(locale === "km" && f.khmer_name) || f.name}</div>
                  <div className="truncate text-xs text-ink/50">{(t.facility as Record<string, string>)[f.type] ?? t.facility.other}</div>
                </div>
              </div>
            );
          })}
          {(facilities ?? []).length === 0 && <p className="col-span-full text-sm text-ink/50">{t.visit.noFacilities}</p>}
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-2" data-reveal-stagger>
          <Link href="/map" className="group flex items-center gap-4 rounded-3xl bg-primary p-6 text-white shadow-lift">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15">
              <MapIcon size={26} />
            </span>
            <span className="flex-1">
              <span className="block font-display text-xl font-bold">{t.visit.openMap}</span>
              <span className="text-sm text-white/75">{t.visit.openMapText}</span>
            </span>
            <ArrowRight className="transition group-hover:translate-x-1" />
          </Link>
          <Link href="/account" className="group flex items-center gap-4 rounded-3xl bg-cream p-6 ring-1 ring-primary/10">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-light-green text-primary">
              <User size={26} />
            </span>
            <span className="flex-1">
              <span className="block font-display text-xl font-bold text-forest">{t.visit.myAccount}</span>
              <span className="text-sm text-ink/60">{t.visit.myAccountText}</span>
            </span>
            <ArrowRight className="text-primary transition group-hover:translate-x-1" />
          </Link>
        </div>
      </main>
      <SiteFooter />
      <BottomNav />
    </div>
  );
}
