import type { LucideIcon } from "lucide-react";
import { HeroWildlife } from "./JungleAmbience";

// Consistent top-of-page banner for the inner visitor pages (Animals, Map,
// Tickets, Visit…): soft green band with leaf shapes, an icon, title, subtitle.
export function PageHeader({
  icon: Icon,
  eyebrow,
  title,
  subtitle,
  children,
}: {
  icon: LucideIcon;
  eyebrow?: string;
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
}) {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-primary via-primary to-forest text-white">
      <div className="absolute -right-16 -top-20 h-72 w-72 rounded-full bg-leaf/20 blur-3xl" />
      <div className="absolute -bottom-24 left-10 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
      <HeroWildlife />
      <svg viewBox="0 0 200 200" aria-hidden="true" className="absolute -right-6 bottom-0 h-40 w-40 text-white/[0.07] md:h-56 md:w-56">
        <path fill="currentColor" d="M100 10c50 10 85 45 90 95-45 5-85-20-100-60-8-22-6-26 10-35zM20 120c30-10 60 0 75 30-25 15-60 10-75-30z" />
      </svg>
      <div className="relative mx-auto max-w-7xl px-4 pb-14 pt-9 md:px-6 md:pb-16 md:pt-12">
        <div className="flex items-start gap-4">
          <span className="hidden h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/20 backdrop-blur sm:flex">
            <Icon size={28} strokeWidth={2.2} />
          </span>
          <div className="min-w-0">
            {eyebrow && <p className="text-xs font-bold uppercase tracking-[0.2em] text-leaf">{eyebrow}</p>}
            <h1 className="font-display text-3xl font-extrabold leading-tight md:text-5xl">{title}</h1>
            {subtitle && <p className="mt-1.5 max-w-2xl text-white/80">{subtitle}</p>}
          </div>
        </div>
        {children}
      </div>
      <div className="absolute inset-x-0 bottom-0 h-6 rounded-t-[2rem] bg-background" />
    </section>
  );
}
