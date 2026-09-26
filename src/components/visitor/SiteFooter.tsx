import Link from "next/link";
import { Clock, MapPin, Phone, Mail, Facebook, Instagram, Youtube, Music2, Send } from "lucide-react";
import { getSettings } from "@/lib/data/zoo";
import { Logo } from "./Logo";
import { NAV_LINKS, MORE_LINKS } from "./nav-links";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { getI18n } from "@/lib/i18n/server";

export async function SiteFooter() {
  const { t, locale } = getI18n();
  const km = locale === "km";
  const { siteContact: c, zooProfile: z } = await getSettings().catch(() => ({ siteContact: {} as Record<string, any>, zooProfile: {} as Record<string, any> }));
  // only the networks the admin filled in
  const socials = [
    { url: c.facebook, Icon: Facebook, name: "Facebook" },
    { url: c.instagram, Icon: Instagram, name: "Instagram" },
    { url: c.youtube, Icon: Youtube, name: "YouTube" },
    { url: c.tiktok, Icon: Music2, name: "TikTok" },
    { url: c.telegram, Icon: Send, name: "Telegram" },
  ].filter((x) => x.url);
  const address = (km && z.address_km) || z.address || t.footer.address;
  return (
    <footer className="relative mt-20 overflow-hidden bg-forest text-white">
      {/* Leafy silhouette edge */}
      <svg viewBox="0 0 1440 60" preserveAspectRatio="none" aria-hidden="true" className="absolute inset-x-0 -top-px h-10 w-full text-background">
        <path
          fill="currentColor"
          d="M0 0h1440v18c-60 22-120 30-180 18s-120-26-180-10-120 40-180 30-110-38-170-38-120 34-180 36-120-26-180-28S130 52 60 44 0 30 0 30z"
        />
      </svg>
      <div className="absolute -right-24 top-10 h-72 w-72 rounded-full bg-leaf/10 blur-3xl" />

      <div className="relative mx-auto grid max-w-7xl gap-10 px-6 pb-28 pt-20 md:grid-cols-2 md:pb-12 lg:grid-cols-4" data-reveal-stagger>
        <div className="md:col-span-1">
          <Logo tone="light" subtitle={t.nav.tagline} />
          <p className="mt-4 max-w-xs text-sm text-white/65">
            {(km ? c.about_km : c.about_en) || t.footer.about}
          </p>
          <LanguageSwitcher tone="dark" className="mt-5 w-fit" />
          {socials.length > 0 && (
            <div className="mt-4 flex gap-2">
              {socials.map(({ url, Icon, name }) => (
                <a key={name} href={url} target="_blank" rel="noopener noreferrer" aria-label={name} title={name} className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 transition hover:-translate-y-0.5 hover:bg-leaf hover:text-forest">
                  <Icon size={16} />
                </a>
              ))}
            </div>
          )}
        </div>

        <div>
          <h4 className="mb-3 font-display text-lg font-bold">{t.nav.explore}</h4>
          <ul className="space-y-2 text-sm text-white/70">
            {[...NAV_LINKS, ...MORE_LINKS].map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="inline-flex items-center gap-2 transition hover:text-leaf">
                  <l.icon size={14} /> {t.nav[l.key]}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="mb-3 font-display text-lg font-bold">{t.footer.visitUs}</h4>
          <ul className="space-y-3 text-sm text-white/70">
            <li className="flex gap-2.5">
              <Clock size={16} className="mt-0.5 flex-shrink-0 text-leaf" /> {t.footer.openDaily}
            </li>
            <li className="flex gap-2.5">
              <MapPin size={16} className="mt-0.5 flex-shrink-0 text-leaf" /> {c.map_link ? <a href={c.map_link} target="_blank" rel="noopener noreferrer" className="hover:text-leaf">{address}</a> : address}
            </li>
            <li className="flex gap-2.5">
              <Phone size={16} className="mt-0.5 flex-shrink-0 text-leaf" />
              <span className="flex flex-col">
                {[z.phone, c.phone2].filter(Boolean).map((p: string) => <a key={p} href={`tel:${p.replace(/\s/g, "")}`} className="hover:text-leaf">{p}</a>)}
                {!z.phone && !c.phone2 && "—"}
              </span>
            </li>
            {c.email && (
              <li className="flex gap-2.5">
                <Mail size={16} className="mt-0.5 flex-shrink-0 text-leaf" /> <a href={`mailto:${c.email}`} className="break-all hover:text-leaf">{c.email}</a>
              </li>
            )}
          </ul>
        </div>

        <div>
          <h4 className="mb-3 font-display text-lg font-bold">{t.footer.planDay}</h4>
          <p className="text-sm text-white/70">{t.footer.planDayText}</p>
          <Link href="/tickets" className="btn mt-4 bg-leaf text-forest hover:bg-white">
            {t.footer.getTickets}
          </Link>
        </div>
      </div>

      <div className="relative border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-6 py-5 text-xs text-white/50 md:flex-row">
          <span>© {new Date().getFullYear()} Green Wild Zoo. {t.footer.rights}</span>
          <span className="flex items-center gap-3">
            <Link href="/staff/login" className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 font-bold text-white/70 hover:bg-white/20 hover:text-leaf">
              {locale === "km" ? "ចូលសម្រាប់បុគ្គលិក" : "Staff sign-in"}
            </Link>
            {t.footer.slogan}
          </span>
        </div>
      </div>
    </footer>
  );
}
