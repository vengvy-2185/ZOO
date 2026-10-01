import { Briefcase, Home, PawPrint, Map, Ticket, Trophy, CalendarDays, CalendarClock, HeartHandshake, Star, Newspaper, Route, CircleHelp, MessageCircle, ShieldAlert, type LucideIcon } from "lucide-react";
import type { Dictionary } from "@/lib/i18n/dictionaries";

// Single source of truth for the visitor site's menu — the desktop header,
// the mobile slide-out menu, and the footer all read from this list.
// `key` is the label's key in the dictionary's `nav` section.
export const NAV_LINKS: { href: string; key: keyof Dictionary["nav"]; icon: LucideIcon }[] = [
  { href: "/", key: "home", icon: Home },
  { href: "/animals", key: "animals", icon: PawPrint },
  { href: "/map", key: "map", icon: Map },
  { href: "/tickets", key: "tickets", icon: Ticket },
  { href: "/events", key: "events", icon: CalendarClock },
  { href: "/quest", key: "quest", icon: Trophy },
  { href: "/visit", key: "visit", icon: CalendarDays },
];

/** Extra pages: the desktop "More" dropdown, the mobile menu and the footer.
 *  (My tickets and Favourites are NOT here — they have their own header icons.) */
type NavLink = { href: string; key: keyof Dictionary["nav"]; icon: LucideIcon };

// Kept short on purpose: every game lives inside the one "Games" page.
export const MORE_GROUPS: { key: keyof Dictionary["nav"]; links: NavLink[] }[] = [
  {
    key: "groupCreate",
    links: [
      { href: "/planner", key: "planner", icon: Route },
      { href: "/calendar", key: "calendar", icon: CalendarDays },
      { href: "/adopt", key: "adopt", icon: HeartHandshake },
      { href: "/conservation", key: "conservation", icon: ShieldAlert },
      { href: "/news", key: "news", icon: Newspaper },
    ],
  },
  {
    key: "groupPlan",
    links: [
      { href: "/reviews", key: "reviews", icon: Star },
      { href: "/faq", key: "faq", icon: CircleHelp },
      { href: "/contact", key: "contact", icon: MessageCircle },
      { href: "/careers", key: "careers", icon: Briefcase },
    ],
  },
];
export const MORE_LINKS: NavLink[] = MORE_GROUPS.flatMap((g) => g.links);

/** Pages that live inside another menu item (Points is a tab of the Quest). */
const PART_OF: Record<string, string[]> = { "/quest": ["/rewards"] };

export function isActivePath(pathname: string, href: string) {
  if (PART_OF[href]?.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return true;
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}
