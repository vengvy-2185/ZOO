"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, QrCode, ClipboardCheck, Wrench, ScanLine, UserRoundPlus, Ticket, PawPrint, Map, Sparkles, BarChart3, Clock, CalendarOff, Wallet, UserRound, Package, HandHeart, ListChecks, Archive, NotebookPen, MessagesSquare } from "lucide-react";
import { cn } from "@/lib/utils/cn";

const ICONS = { home: Home, checkin: QrCode, team: ClipboardCheck, issues: Wrench, scanner: ScanLine, gate: UserRoundPlus, bookings: Ticket, animals: PawPrint, schedule: Map, cleaning: Sparkles, reports: BarChart3, attendance: Clock, leave: CalendarOff, pay: Wallet, profile: UserRound, supplies: Package, kudos: HandHeart, tasks: ListChecks, lost: Archive, handover: NotebookPen, chat: MessagesSquare };
export type StaffNavItem = { key: keyof typeof ICONS; href: string; label: string; group: "main" | "tools" | "me" };

/**
 * The staff menu: one row that stays pinned under the top bar. On a phone
 * it scrolls sideways and keeps the current page in view. Exactly one item
 * is highlighted (the longest matching address).
 */
export function StaffNav({ items }: { items: StaffNavItem[] }) {
  const pathname = usePathname();
  // whole path segments only (/staff/attendance must not match /staff/attendance-qr); the QR screen belongs to Team
  const path = pathname === "/staff/attendance-qr" ? "/staff/team" : pathname;
  const active = [...items].sort((a, b) => b.href.length - a.href.length).find((n) => path === n.href || (n.href !== "/staff" && path.startsWith(`${n.href}/`)))?.key;
  const row = useRef<HTMLDivElement>(null);
  useEffect(() => {
    row.current?.querySelector<HTMLElement>("[data-active=true]")?.scrollIntoView({ inline: "center", block: "nearest" });
  }, [active]);

  return (
    <nav aria-label="Staff menu" className="relative">
      <div ref={row} className="no-scrollbar mx-auto flex max-w-6xl gap-1 overflow-x-auto px-3 pb-2 md:px-7">
        {items.map((n, i) => {
          const Icon = ICONS[n.key];
          const on = n.key === active;
          const gap = i > 0 && items[i - 1].group !== n.group;
          return (
            <span key={n.key} className="flex flex-shrink-0 items-center">
              {gap && <span className="mx-1 h-5 w-px bg-white/20" aria-hidden />}
              <Link
                href={n.href}
                data-active={on}
                aria-current={on ? "page" : undefined}
                className={cn(
                  "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-2 text-sm font-bold transition",
                  on ? "bg-white text-[#1E3A8A] shadow-soft" : "text-white/80 hover:bg-white/10 hover:text-white"
                )}
              >
                <Icon size={16} strokeWidth={on ? 2.5 : 2} /> {n.label}
              </Link>
            </span>
          );
        })}
      </div>
      {/* fade at the edges on phones to hint there is more */}
      <span className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-[#1D4ED8] md:hidden" aria-hidden />
    </nav>
  );
}
