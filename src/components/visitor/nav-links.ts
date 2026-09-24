import { Home, PawPrint, Map, Ticket, Trophy, CalendarDays, CalendarClock, Brain, HeartHandshake, Camera, Ruler, Star, Newspaper, Route, CircleHelp, Sparkles, type LucideIcon } from "lucide-react";
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
export const MORE_LINKS: { href: string; key: keyof Dictionary["nav"]; icon: LucideIcon }[] = [
  { href: "/planner", key: "planner", icon: Route },
  { href: "/match", key: "match", icon: Sparkles },
  { href: "/photo-booth", key: "booth", icon: Camera },
  { href: "/compare", key: "compare", icon: Ruler },
  { href: "/reviews", key: "reviews", icon: Star },
  { href: "/adopt", key: "adopt", icon: HeartHandshake },
  { href: "/quiz", key: "quiz", icon: Brain },
  { href: "/news", key: "news", icon: Newspaper },
  { href: "/faq", key: "faq", icon: CircleHelp },
];

export function isActivePath(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}
