import Link from "next/link";
import { cn } from "@/lib/utils/cn";

// Brand mark: a paw print inside a leaf-edged badge. Pure SVG so it stays
// crisp at any size and needs no image upload. `tone="light"` is for dark
// backgrounds (admin sidebar, footer, hero overlays).
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" className={cn("h-10 w-10 flex-shrink-0", className)}>
      <defs>
        <linearGradient id="logo-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#2E8B57" />
          <stop offset="100%" stopColor="#0E3F24" />
        </linearGradient>
      </defs>
      <circle cx="24" cy="24" r="22" fill="url(#logo-bg)" />
      {/* leaf accent */}
      <path d="M33 6c7 1 10 6 9 13-6 0-10-4-9-13z" fill="#9BD13B" />
      <path d="M34.5 8.5c1.8 3 3.4 5.5 6 8.6" stroke="#0E3F24" strokeWidth="0.9" fill="none" strokeLinecap="round" />
      {/* paw */}
      <ellipse cx="24" cy="30" rx="7.2" ry="6" fill="#fff" />
      <ellipse cx="15.2" cy="22" rx="2.7" ry="3.4" fill="#fff" transform="rotate(-18 15.2 22)" />
      <ellipse cx="20.6" cy="16.8" rx="2.7" ry="3.5" fill="#fff" />
      <ellipse cx="27.6" cy="16.8" rx="2.7" ry="3.5" fill="#fff" />
      <ellipse cx="32.8" cy="22" rx="2.7" ry="3.4" fill="#fff" transform="rotate(18 32.8 22)" />
    </svg>
  );
}

export function Logo({
  href = "/",
  tone = "dark",
  subtitle = "Nature, Animals, Together",
  className,
}: {
  href?: string;
  tone?: "dark" | "light";
  subtitle?: string | null;
  className?: string;
}) {
  return (
    <Link href={href} className={cn("group flex min-w-0 items-center gap-2 sm:gap-2.5", className)} aria-label="Green Wild Zoo home page">
      <LogoMark className="h-9 w-9 transition-transform duration-300 group-hover:-rotate-6 sm:h-10 sm:w-10" />
      <span className="min-w-0 whitespace-nowrap leading-none">
        <span
          className={cn(
            "block font-display text-base font-extrabold uppercase tracking-wide max-[380px]:text-[0.9rem] sm:text-[1.15rem]",
            tone === "dark" ? "text-forest" : "text-white"
          )}
        >
          Green Wild <span className={tone === "dark" ? "text-primary" : "text-leaf"}>Zoo</span>
        </span>
        {subtitle && (
          <span className={cn("mt-0.5 block truncate text-[10px] font-medium", tone === "dark" ? "text-ink/50" : "text-white/60")}>
            {subtitle}
          </span>
        )}
      </span>
    </Link>
  );
}
