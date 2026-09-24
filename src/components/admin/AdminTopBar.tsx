"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, ExternalLink, LogOut } from "lucide-react";
import { LanguageSwitcher } from "@/components/visitor/LanguageSwitcher";
import { SignOutButton } from "@/components/visitor/SignOutButton";
import { useI18n } from "@/lib/i18n/client";
import type { Dictionary } from "@/lib/i18n/dictionaries";

type ItemKey = keyof Dictionary["admin"]["items"];
const SECTION: Record<string, ItemKey> = {
  animals: "animals",
  categories: "categories",
  species: "species",
  stories: "stories",
  audio: "audio",
  birthdays: "birthdays",
  qr: "qr",
  map: "map",
  zones: "zones",
  habitats: "habitats",
  enclosures: "enclosures",
  tickets: "tickets",
  bookings: "bookings",
  visitors: "visitors",
  reports: "reports",
  settings: "settings",
};

// Desktop top bar for the admin area: where you are, the language switch,
// a link to the public site, and who is signed in. (Phones get the same
// controls in the compact header inside AdminSidebar.)
export function AdminTopBar({ name, email, avatarUrl }: { name: string; email: string | null; avatarUrl: string | null }) {
  const pathname = usePathname();
  const { t } = useI18n();
  const section = SECTION[pathname.split("/")[2] ?? ""];

  return (
    <header className="sticky top-0 z-30 hidden h-16 items-center justify-between gap-4 border-b border-black/5 bg-white/85 px-8 backdrop-blur-lg md:flex">
      <nav className="flex min-w-0 items-center gap-1.5 text-sm">
        <Link href="/admin" className="font-semibold text-ink/45 hover:text-primary">
          {t.admin.panel}
        </Link>
        <ChevronRight size={14} className="text-ink/30" />
        <span className="truncate font-bold text-forest">{section ? t.admin.items[section] : t.admin.items.dashboard}</span>
      </nav>

      <div className="flex flex-shrink-0 items-center gap-3">
        <LanguageSwitcher />
        <Link href="/" target="_blank" className="btn border border-black/10 px-4 py-2 text-xs text-forest hover:border-primary hover:text-primary">
          <ExternalLink size={14} /> {t.admin.viewWebsite}
        </Link>
        <div className="flex items-center gap-2.5 rounded-full border border-black/10 py-1 pl-1 pr-1.5">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarUrl} alt="" referrerPolicy="no-referrer" className="h-8 w-8 rounded-full object-cover" />
          ) : (
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-white">{name[0]?.toUpperCase()}</span>
          )}
          <span className="hidden max-w-[160px] leading-tight lg:block">
            <span className="block truncate text-xs font-bold text-forest">{name}</span>
            {email && <span className="block truncate text-[10px] text-ink/45">{email}</span>}
          </span>
          <SignOutButton
            redirectTo="/admin/login"
            label={t.admin.signOut}
            className="flex h-8 w-8 items-center justify-center rounded-full text-ink/40 transition hover:bg-red-50 hover:text-red-600"
          >
            <LogOut size={16} />
          </SignOutButton>
        </div>
      </div>
    </header>
  );
}
