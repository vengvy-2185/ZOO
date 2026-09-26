"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, QrCode, ClipboardCheck, Wrench, ScanLine, UserRoundPlus, Ticket, PawPrint, Map, Sparkles, BarChart3, Clock, CalendarOff, Wallet, UserRound, Package, ListChecks, Archive, NotebookPen, MessagesSquare, CalendarRange, ChevronDown, Briefcase, Users } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export const STAFF_ICONS = { home: Home, checkin: QrCode, team: ClipboardCheck, issues: Wrench, scanner: ScanLine, gate: UserRoundPlus, bookings: Ticket, animals: PawPrint, schedule: Map, cleaning: Sparkles, reports: BarChart3, attendance: Clock, leave: CalendarOff, pay: Wallet, profile: UserRound, supplies: Package, tasks: ListChecks, lost: Archive, handover: NotebookPen, chat: MessagesSquare, roster: CalendarRange };
const ICONS = STAFF_ICONS;
export type StaffNavItem = { key: keyof typeof ICONS; href: string; label: string; group: "main" | "tools" | "team" | "me" };
const GROUP_ICONS = { tools: Briefcase, team: Users, me: UserRound };

/** Which item is the current page (longest matching address). */
export function activeKey(items: StaffNavItem[], pathname: string) {
  const path = pathname === "/staff/attendance-qr" ? "/staff/team" : pathname;
  return [...items].sort((a, b) => b.href.length - a.href.length).find((n) => path === n.href || (n.href !== "/staff" && path.startsWith(`${n.href}/`)))?.key;
}

/**
 * Computers: the main pages as tabs, the rest in three small drop-down
 * groups (Work · Team · Me), so nothing is repeated or squeezed.
 */
export function StaffNav({ items, groups }: { items: StaffNavItem[]; groups: Record<"tools" | "team" | "me", string> }) {
  const pathname = usePathname();
  const active = activeKey(items, pathname);
  const [open, setOpen] = useState<string | null>(null);
  const ref = useRef<HTMLElement>(null);
  useEffect(() => setOpen(null), [pathname]);
  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(null);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  return (
    <nav aria-label="Staff menu" ref={ref} className="mx-auto flex max-w-6xl flex-wrap items-center gap-1 px-3 pb-2 md:px-7">
      {items
        .filter((n) => n.group === "main")
        .map((n) => {
          const Icon = ICONS[n.key];
          const on = n.key === active;
          return (
            <Link key={n.key} href={n.href} aria-current={on ? "page" : undefined} className={cn("inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-2 text-sm font-bold transition", on ? "bg-white text-[#1E3A8A] shadow-soft" : "text-white/85 hover:bg-white/10 hover:text-white")}>
              <Icon size={16} strokeWidth={on ? 2.5 : 2} /> {n.label}
            </Link>
          );
        })}
      <span className="mx-1 h-5 w-px bg-white/20" aria-hidden />
      {(["tools", "team", "me"] as const).map((g) => {
        const list = items.filter((n) => n.group === g);
        if (!list.length) return null;
        const GIcon = GROUP_ICONS[g];
        const current = list.find((n) => n.key === active);
        return (
          <div key={g} className="relative" onMouseEnter={() => setOpen(g)} onMouseLeave={() => setOpen((o) => (o === g ? null : o))}>
            <button type="button" onClick={() => setOpen(open === g ? null : g)} aria-expanded={open === g} className={cn("inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-2 text-sm font-bold transition", current ? "bg-white text-[#1E3A8A] shadow-soft" : "text-white/85 hover:bg-white/10 hover:text-white")}>
              <GIcon size={16} /> {current ? current.label : groups[g]}
              <ChevronDown size={14} className={cn("transition-transform", open === g && "rotate-180")} />
            </button>
            <div className={cn("absolute left-0 top-full z-50 pt-2 transition", open === g ? "visible translate-y-0 opacity-100" : "invisible -translate-y-1 opacity-0")}>
              <div className="w-60 rounded-2xl bg-white p-2 text-ink shadow-lift ring-1 ring-black/5">
                <p className="px-2 pb-1 pt-1 text-[11px] font-bold uppercase tracking-wider text-ink/40">{groups[g]}</p>
                {list.map((n) => {
                  const Icon = ICONS[n.key];
                  const act = n.key === active;
                  return (
                    <Link key={n.key} href={n.href} className={cn("flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm font-bold transition", act ? "bg-[#EEF2FF] text-[#1D4ED8]" : "text-forest hover:bg-slate-50")}>
                      <span className={cn("flex h-8 w-8 items-center justify-center rounded-lg", act ? "bg-[#1D4ED8] text-white" : "bg-[#EEF2FF] text-[#1D4ED8]")}>
                        <Icon size={16} />
                      </span>
                      {n.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })}
    </nav>
  );
}
