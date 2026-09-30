import { Sparkles, ScanSearch, CalendarClock, PartyPopper, BadgeCheck, MailX, Undo2, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils/cn";

// One clean icon per hiring step (instead of emoji), each in its own colour.
const ICONS: Record<string, { icon: LucideIcon; dot: string }> = {
  new: { icon: Sparkles, dot: "bg-sky-500" },
  screening: { icon: ScanSearch, dot: "bg-amber-500" },
  interview: { icon: CalendarClock, dot: "bg-violet-500" },
  offer: { icon: PartyPopper, dot: "bg-emerald-500" },
  hired: { icon: BadgeCheck, dot: "bg-emerald-700" },
  rejected: { icon: MailX, dot: "bg-slate-500" },
  withdrawn: { icon: Undo2, dot: "bg-slate-400" },
};

export function HrStatusIcon({ status, size = 22, className }: { status: string; size?: number; className?: string }) {
  const s = ICONS[status] ?? ICONS.new;
  const Icon = s.icon;
  return (
    <span className={cn("inline-flex flex-shrink-0 items-center justify-center rounded-full text-white shadow-sm", s.dot, className)} style={{ width: size, height: size }}>
      <Icon size={Math.round(size * 0.58)} strokeWidth={2.4} />
    </span>
  );
}

/** A filter chip: coloured icon · label · count. */
export function HrStatusChip({ status, label, count, active }: { status: string; label: string; count?: number; active?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <HrStatusIcon status={status} size={20} className={active ? "ring-2 ring-white/70" : ""} />
      <span>{label}</span>
      {count ? <span className={cn("rounded-full px-1.5 text-[10px] leading-4", active ? "bg-white/25 text-white" : "bg-white text-forest shadow-sm")}>{count}</span> : null}
    </span>
  );
}
