"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, PawPrint, Map, Ticket, User } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { isActivePath } from "./nav-links";
import { useI18n } from "@/lib/i18n/client";
import type { Dictionary } from "@/lib/i18n/dictionaries";

const items: { href: string; key: keyof Dictionary["nav"]; icon: typeof Home }[] = [
  { href: "/", key: "home", icon: Home },
  { href: "/animals", key: "animals", icon: PawPrint },
  { href: "/map", key: "mapShort", icon: Map },
  { href: "/tickets", key: "tickets", icon: Ticket },
  { href: "/account", key: "profile", icon: User },
];

// Phone-only tab bar. The active tab gets a filled pill behind its icon so
// it reads at a glance; everything else in the menu lives in the header's
// slide-out menu (NavbarClient).
export function BottomNav() {
  const pathname = usePathname();
  const { t } = useI18n();
  return (
    <nav
      aria-label="Tabs"
      className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-black/5 bg-white/95 shadow-[0_-8px_30px_-12px_rgba(14,63,36,0.25)] backdrop-blur-lg md:hidden"
    >
      <div className="flex px-1.5 pt-1.5">
        {items.map(({ href, key, icon: Icon }) => {
          const active = isActivePath(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              prefetch
              aria-current={active ? "page" : undefined}
              className="flex flex-1 flex-col items-center gap-0.5 pb-1.5 text-[11px] font-semibold"
            >
              <span
                className={cn(
                  "flex h-8 w-14 items-center justify-center rounded-full transition-all duration-300",
                  active ? "bg-primary text-white shadow-soft" : "text-ink/45"
                )}
              >
                <Icon size={20} strokeWidth={active ? 2.5 : 2.1} />
              </span>
              <span className={active ? "text-primary" : "text-ink/50"}>{t.nav[key]}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
