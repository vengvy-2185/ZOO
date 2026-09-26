"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, LayoutGrid, X } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { STAFF_ICONS } from "./StaffNav";
import type { StaffNavItem } from "./StaffNav";

const ICONS = STAFF_ICONS;

/**
 * Phones: the staff menu sits at the bottom of the screen (thumb reach):
 * Home · Scan attendance · the main tool · Me · More (everything else in a sheet).
 */
export function StaffBottomNav({ items, groups, moreLabel, closeLabel }: { items: StaffNavItem[]; groups: Record<StaffNavItem["group"], string>; moreLabel: string; closeLabel: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [pathname]);
  const path = pathname === "/staff/attendance-qr" ? "/staff/team" : pathname;
  const isOn = (href: string) => path === href || (href !== "/staff" && path.startsWith(`${href}/`));

  const pick = (k: string) => items.find((i) => i.key === k);
  const mainTool = items.find((i) => i.group === "tools") ?? pick("team") ?? pick("pay");
  const bar = [pick("home"), pick("chat"), mainTool, pick("checkin") ?? pick("roster")].filter((x, i, a): x is StaffNavItem => Boolean(x) && a.findIndex((y) => y?.key === x!.key) === i);
  const moreOn = !bar.some((b) => isOn(b.href)) && items.some((i) => isOn(i.href));

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-[60] md:hidden" onClick={() => setOpen(false)}>
          <div className="absolute inset-0 bg-[#0B1433]/50 backdrop-blur-sm" />
          <div className="absolute inset-x-0 bottom-0 rounded-t-[2rem] bg-white p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] shadow-2xl animate-[gwzDrop_.25s_ease]" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <span className="mx-auto h-1.5 w-12 rounded-full bg-black/10" />
              <button onClick={() => setOpen(false)} className="absolute right-4 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-[#F1F5FF] text-[#1E3A8A]" aria-label={closeLabel}><X size={18} /></button>
            </div>
            <div className="max-h-[65dvh] space-y-4 overflow-y-auto">
              {(["main", "tools", "team", "me"] as const).map((g) => {
                const list = items.filter((n) => n.group === g);
                if (!list.length) return null;
                return (
                  <div key={g}>
                    <p className="mb-2 px-1 text-[11px] font-bold uppercase tracking-wider text-ink/40">{groups[g]}</p>
                    <div className="grid grid-cols-4 gap-2">
                      {list.map((n) => {
                        const Icon = ICONS[n.key as keyof typeof ICONS] ?? Home;
                        const on = isOn(n.href);
                        return (
                          <Link key={n.key} href={n.href} className={cn("flex flex-col items-center gap-1.5 rounded-2xl p-2.5 text-center text-[11px] font-bold leading-tight", on ? "bg-[#1D4ED8] text-white" : "bg-[#F8FAFF] text-[#1E3A8A] ring-1 ring-[#2563EB]/10")}>
                            <Icon size={22} />
                            {n.label}
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
      <nav aria-label="Staff menu" className="fixed inset-x-0 bottom-0 z-50 border-t border-black/5 bg-white/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_30px_rgba(30,58,138,0.12)] backdrop-blur md:hidden">
        <div className="mx-auto grid max-w-md grid-cols-5">
          {bar.map((n) => {
            const Icon = ICONS[n.key as keyof typeof ICONS] ?? Home;
            const on = isOn(n.href);
            return (
              <Link key={n.key} href={n.href} className={cn("relative flex flex-col items-center gap-0.5 px-1 py-2 text-[10px] font-bold", on ? "text-[#1D4ED8]" : "text-ink/45")}>
                {on && <span className="absolute top-0 h-1 w-8 rounded-b-full bg-[#1D4ED8]" />}
                <span className={cn("flex h-8 w-12 items-center justify-center rounded-full", on && "bg-[#EEF2FF]")}><Icon size={20} strokeWidth={on ? 2.5 : 2} /></span>
                <span className="w-full truncate text-center">{n.label}</span>
              </Link>
            );
          })}
          <button type="button" onClick={() => setOpen(true)} className={cn("relative flex flex-col items-center gap-0.5 px-1 py-2 text-[10px] font-bold", moreOn ? "text-[#1D4ED8]" : "text-ink/45")}>
            {moreOn && <span className="absolute top-0 h-1 w-8 rounded-b-full bg-[#1D4ED8]" />}
            <span className={cn("flex h-8 w-12 items-center justify-center rounded-full", moreOn && "bg-[#EEF2FF]")}><LayoutGrid size={20} /></span>
            {moreLabel}
          </button>
        </div>
      </nav>
    </>
  );
}
