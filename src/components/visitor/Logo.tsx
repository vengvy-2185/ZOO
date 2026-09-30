import Link from "next/link";
import { cn } from "@/lib/utils/cn";

// Brand mark: the zoo's logo picture (public/logo-sm.png, made from
// design/logo-original.png by scripts/make-logo-icons.cjs). `tone="light"`
// is for dark backgrounds (admin sidebar, footer, hero overlays).
export function LogoMark({ className }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src="/logo-sm.png" alt="" aria-hidden="true" width={160} height={160} decoding="async" className={cn("h-10 w-10 flex-shrink-0 object-contain", className)} />
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
    <Link href={href} className={cn("group flex min-w-0 items-center gap-1.5 min-[360px]:gap-2 sm:gap-2.5", className)} aria-label="Green Wild Zoo home page">
      <LogoMark className="h-8 w-8 transition-transform duration-300 group-hover:-rotate-6 min-[360px]:h-9 min-[360px]:w-9 sm:h-10 sm:w-10" />
      <span className="min-w-0 whitespace-nowrap leading-none">
        <span
          className={cn(
            "block font-display text-[0.74rem] font-extrabold uppercase min-[360px]:text-[0.9rem] min-[381px]:text-base min-[381px]:tracking-wide sm:text-[1.15rem]",
            tone === "dark" ? "text-forest" : "text-white"
          )}
        >
          Green Wild <span className={tone === "dark" ? "text-primary" : "text-leaf"}>Zoo</span>
        </span>
        {subtitle && (
          <span className={cn("mt-0.5 block truncate text-[10px] font-medium max-[380px]:hidden", tone === "dark" ? "text-ink/50" : "text-white/60")}>
            {subtitle}
          </span>
        )}
      </span>
    </Link>
  );
}
