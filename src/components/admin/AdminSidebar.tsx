"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  BarChart3,
  PawPrint,
  Tags,
  Dna,
  BookOpen,
  Headphones,
  Cake,
  QrCode,
  Map,
  MapPinned,
  Trees,
  Fence,
  Ticket,
  ClipboardList,
  Users,
  Settings,
  Menu,
  X,
  ExternalLink,
  ScanLine,
  Store,
  HeartHandshake,
  UserRoundPlus,
  PlugZap,
  Sticker,
  Star,
  Newspaper,
  TicketPercent,
  type LucideIcon, MessageCircle, IdCard, BadgeCheck, MessagesSquare } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { LogoMark } from "@/components/visitor/Logo";
import { SignOutButton } from "@/components/visitor/SignOutButton";
import { LanguageSwitcher } from "@/components/visitor/LanguageSwitcher";
import { useI18n } from "@/lib/i18n/client";
import type { Dictionary } from "@/lib/i18n/dictionaries";

type ItemKey = keyof Dictionary["admin"]["items"];
type GroupKey = keyof Dictionary["admin"]["groups"];

const GROUPS: { title: GroupKey; items: { key: ItemKey; href: string; icon: LucideIcon }[] }[] = [
  {
    title: "overview",
    items: [
      { key: "dashboard", href: "/admin", icon: LayoutDashboard },
      { key: "reports", href: "/admin/reports", icon: BarChart3 },
    ],
  },
  {
    title: "animals",
    items: [
      { key: "animals", href: "/admin/animals", icon: PawPrint },
      { key: "categories", href: "/admin/categories", icon: Tags },
      { key: "species", href: "/admin/manage/species", icon: Dna },
      { key: "stories", href: "/admin/manage/stories", icon: BookOpen },
      { key: "news", href: "/admin/manage/news", icon: Newspaper },
      { key: "audio", href: "/admin/audio", icon: Headphones },
      { key: "birthdays", href: "/admin/birthdays", icon: Cake },
      { key: "qr", href: "/admin/qr", icon: QrCode },
      { key: "stickers", href: "/admin/manage/stickers", icon: Sticker },
    ],
  },
  {
    title: "park",
    items: [
      { key: "map", href: "/admin/map", icon: Map },
      { key: "zones", href: "/admin/manage/zones", icon: MapPinned },
      { key: "habitats", href: "/admin/manage/habitats", icon: Trees },
      { key: "enclosures", href: "/admin/manage/enclosures", icon: Fence },
      { key: "facilities", href: "/admin/manage/facilities", icon: Store },
    ],
  },
  {
    title: "visitors",
    items: [
      { key: "gate", href: "/admin/gate", icon: UserRoundPlus },
      { key: "tickets", href: "/admin/manage/tickets", icon: Ticket },
      { key: "bookings", href: "/admin/bookings", icon: ClipboardList },
      { key: "visitors", href: "/admin/visitors", icon: Users },
      { key: "members", href: "/admin/members", icon: IdCard },
      { key: "staff", href: "/admin/staff", icon: BadgeCheck },
      { key: "chat", href: "/staff/chat", icon: MessagesSquare },
      { key: "discounts", href: "/admin/discounts", icon: TicketPercent },
      { key: "adoptions", href: "/admin/adoptions", icon: HeartHandshake },
      { key: "reviews", href: "/admin/manage/reviews", icon: Star },
      { key: "messages", href: "/admin/manage/messages", icon: MessageCircle },
    ],
  },
  {
    title: "system",
    items: [
      { key: "settings", href: "/admin/settings", icon: Settings },
      { key: "integrations", href: "/admin/integrations", icon: PlugZap },
    ],
  },
];

const ALL_ITEMS = GROUPS.flatMap((g) => g.items);

function isActive(pathname: string, href: string) {
  return href === "/admin" ? pathname === "/admin" : pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminSidebar() {
  const pathname = usePathname();
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const current = ALL_ITEMS.find((i) => isActive(pathname, i.href));

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const nav = (
    <>
      <nav className="no-scrollbar flex-1 space-y-3.5 overflow-y-auto px-3 pb-4">
        {GROUPS.map((group) => (
          <div key={group.title}>
            <p className="mb-1 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-white/35">{t.admin.groups[group.title]}</p>
            <div className="space-y-0.5">
              {group.items.map(({ key, href, icon: Icon }) => {
                const active = isActive(pathname, href);
                return (
                  <Link
                    key={href}
                    href={href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "group flex items-center gap-3 whitespace-nowrap rounded-xl px-3 py-2 text-sm font-medium transition-all",
                      active ? "bg-leaf font-bold text-forest shadow-lg shadow-black/20" : "text-white/70 hover:bg-white/[0.07] hover:text-white"
                    )}
                  >
                    <Icon size={18} strokeWidth={active ? 2.5 : 2} className={active ? "" : "text-white/50 group-hover:text-leaf"} />
                    {t.admin.items[key]}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-white/10 p-3">
        <Link href="/staff/scanner" className="flex items-center gap-3 rounded-xl bg-white/[0.06] px-3 py-2.5 text-sm font-semibold text-white/80 hover:bg-white/[0.12] hover:text-white">
          <ScanLine size={17} className="text-leaf" /> {t.admin.ticketScanner}
        </Link>
        {/* Phones have no top bar — show its controls here instead. */}
        <div className="mt-2 space-y-1 md:hidden">
          <Link href="/" className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-white/70 hover:bg-white/[0.07] hover:text-white">
            <ExternalLink size={17} /> {t.admin.viewWebsite}
          </Link>
          <SignOutButton
            redirectTo="/admin/login"
            label={t.admin.signOut}
            className="w-full rounded-xl px-3 py-2 text-left text-sm text-white/50 transition hover:bg-red-500/15 hover:text-red-300"
          />
        </div>
      </div>
    </>
  );

  const brand = (
    <Link href="/admin" className="flex h-16 flex-shrink-0 items-center gap-2.5 px-5">
      <LogoMark className="h-10 w-10" />
      <span className="leading-none">
        <span className="block font-display text-base font-extrabold uppercase tracking-wide text-white">
          Green Wild <span className="text-leaf">Zoo</span>
        </span>
        <span className="mt-0.5 block text-[10px] font-semibold uppercase tracking-[0.2em] text-white/45">{t.admin.panel}</span>
      </span>
    </Link>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-64 flex-shrink-0 flex-col bg-gradient-to-b from-forest to-[#0A2E1A] md:flex">
        {brand}
        {nav}
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-40 flex h-14 items-center justify-between bg-forest px-3 text-white shadow-lg md:hidden">
        <Link href="/admin" className="flex items-center gap-2">
          <LogoMark className="h-8 w-8" />
          <span className="font-display text-sm font-bold">{current ? t.admin.items[current.key] : t.admin.panel}</span>
        </Link>
        <div className="flex items-center gap-2">
          <LanguageSwitcher tone="dark" />
          <button onClick={() => setOpen(true)} aria-label={t.admin.openMenu} className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10">
            <Menu size={20} />
          </button>
        </div>
      </header>

      {/* Mobile drawer */}
      <div className={cn("fixed inset-0 z-50 md:hidden", open ? "pointer-events-auto" : "pointer-events-none")} aria-hidden={!open}>
        <div onClick={() => setOpen(false)} className={cn("absolute inset-0 bg-black/50 transition-opacity duration-300", open ? "opacity-100" : "opacity-0")} />
        <aside
          className={cn(
            "absolute inset-y-0 left-0 flex w-72 max-w-[85%] flex-col bg-gradient-to-b from-forest to-[#0A2E1A] shadow-2xl transition-transform duration-300 ease-out",
            open ? "translate-x-0" : "-translate-x-full"
          )}
        >
          <div className="flex items-center justify-between pr-3">
            {brand}
            <button onClick={() => setOpen(false)} aria-label={t.nav.closeMenu} className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-white">
              <X size={18} />
            </button>
          </div>
          {nav}
        </aside>
      </div>
    </>
  );
}
