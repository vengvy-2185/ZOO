import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils/cn";

const SIZES = {
  sm: { box: "h-8 w-8", icon: 16 },
  md: { box: "h-11 w-11", icon: 20 },
  lg: { box: "h-14 w-14", icon: 26 },
};

export function IconBadge({
  icon: Icon,
  size = "md",
  tone = "light",
  className,
}: {
  icon: LucideIcon;
  size?: keyof typeof SIZES;
  /** "light" = light-green circle with green icon (default, most places).
   *  "solid" = solid green circle with white icon (for emphasis, e.g. active states). */
  tone?: "light" | "solid";
  className?: string;
}) {
  const s = SIZES[size];
  return (
    <div
      className={cn(
        "flex flex-shrink-0 items-center justify-center rounded-full",
        s.box,
        tone === "light" ? "bg-light-green text-primary" : "bg-primary text-white",
        className
      )}
    >
      <Icon size={s.icon} strokeWidth={2} />
    </div>
  );
}
