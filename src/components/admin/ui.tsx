import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowLeft, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils/cn";

// Shared building blocks so every admin page has the same header, cards,
// tables, badges and form fields. Server-safe (no hooks) — interactive
// pieces live in ./ui-client.tsx.

export function AdminPageHeader({
  icon: Icon,
  title,
  subtitle,
  actions,
  back,
}: {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  back?: { href: string; label: string };
}) {
  return (
    <div className="mb-6">
      {back && (
        <Link href={back.href} className="mb-3 inline-flex items-center gap-1.5 text-sm font-semibold text-ink/50 hover:text-primary">
          <ArrowLeft size={15} /> {back.label}
        </Link>
      )}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <span className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-forest text-white shadow-soft">
            <Icon size={26} />
          </span>
          <div>
            <h1 className="font-display text-3xl font-extrabold leading-tight text-forest">{title}</h1>
            {subtitle && <p className="text-sm text-ink/55">{subtitle}</p>}
          </div>
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
    </div>
  );
}

export function StatusBadge({ active, label }: { active: boolean; label: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold",
        active ? "bg-light-green text-primary" : "bg-black/5 text-ink/45"
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", active ? "bg-primary" : "bg-ink/30")} />
      {label}
    </span>
  );
}

const IUCN_COLORS: Record<string, string> = {
  "least concern": "bg-emerald-100 text-emerald-700",
  "near threatened": "bg-lime-100 text-lime-700",
  vulnerable: "bg-amber-100 text-amber-700",
  endangered: "bg-orange-100 text-orange-700",
  "critically endangered": "bg-red-100 text-red-700",
};
export function ConservationBadge({ status, label }: { status: string | null; label?: string | null }) {
  if (!status) return <span className="text-ink/40">—</span>;
  return (
    <span className={cn("rounded-full px-2.5 py-1 text-xs font-bold", IUCN_COLORS[status.toLowerCase()] ?? "bg-black/5 text-ink/60")}>
      {label || status}
    </span>
  );
}

export function AdminCard({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn("card", className)}>{children}</div>;
}

export function AdminTable({ head, children, empty }: { head: React.ReactNode[]; children: React.ReactNode; empty?: string | false }) {
  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-cream text-[11px] font-bold uppercase tracking-wider text-ink/45">
            <tr>
              {head.map((h, i) => (
                <th key={i} className="whitespace-nowrap px-4 py-3">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-black/5">{children}</tbody>
        </table>
      </div>
      {empty && <p className="p-8 text-center text-sm text-ink/50">{empty}</p>}
    </div>
  );
}

export function FormSection({ icon: Icon, title, hint, children }: { icon: LucideIcon; title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="card p-5 md:p-6">
      <div className="mb-4 flex items-start gap-3">
        <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-light-green text-primary">
          <Icon size={19} />
        </span>
        <div>
          <h2 className="font-display text-lg font-bold text-forest">{title}</h2>
          {hint && <p className="text-xs text-ink/50">{hint}</p>}
        </div>
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

const fieldCls =
  "w-full rounded-2xl border border-black/10 bg-white px-4 py-2.5 text-sm text-ink outline-none transition placeholder:text-ink/30 focus:border-primary focus:ring-2 focus:ring-primary/15";

export function Field({
  label,
  hint,
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string }) {
  return (
    <label className={cn("block", className)}>
      <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-ink/50">
        {label}
        {props.required && <span className="text-red-500"> *</span>}
      </span>
      <input {...props} className={fieldCls} />
      {hint && <span className="mt-1 block text-[11px] text-ink/45">{hint}</span>}
    </label>
  );
}

export function SelectField({
  label,
  children,
  className,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & { label: string }) {
  return (
    <label className={cn("block", className)}>
      <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-ink/50">
        {label}
        {props.required && <span className="text-red-500"> *</span>}
      </span>
      <span className="relative block">
        <select {...props} className={cn(fieldCls, "cursor-pointer appearance-none pr-10")}>
          {children}
        </select>
        <ChevronDown size={16} strokeWidth={2.6} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-primary" />
      </span>
    </label>
  );
}

/** English + Khmer inputs side by side (stacked on phones). */
export function BilingualField({
  label,
  name,
  en,
  km,
  multiline = false,
  rows = 3,
  enLabel = "English",
  kmLabel = "ខ្មែរ",
}: {
  label: string;
  /** English column; the Khmer one is `${name}_km`. */
  name: string;
  en?: string | null;
  km?: string | null;
  multiline?: boolean;
  rows?: number;
  enLabel?: string;
  kmLabel?: string;
}) {
  const input = (n: string, value: string | null | undefined, lang: "en" | "km") =>
    multiline ? (
      <textarea name={n} defaultValue={value ?? ""} rows={rows} lang={lang} className={cn(fieldCls, "resize-y leading-relaxed", lang === "km" && "font-khmer")} />
    ) : (
      <input name={n} defaultValue={value ?? ""} lang={lang} className={cn(fieldCls, lang === "km" && "font-khmer")} />
    );
  return (
    <div>
      <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-ink/50">{label}</span>
      <div className="grid gap-2 md:grid-cols-2">
        <div className="relative">
          <span className="pointer-events-none absolute right-3 top-2 z-10 rounded-md bg-black/5 px-1.5 py-0.5 text-[10px] font-bold text-ink/45">{enLabel}</span>
          {input(name, en, "en")}
        </div>
        <div className="relative">
          <span className="pointer-events-none absolute right-3 top-2 z-10 rounded-md bg-light-green px-1.5 py-0.5 text-[10px] font-bold text-primary">{kmLabel}</span>
          {input(`${name}_km`, km, "km")}
        </div>
      </div>
    </div>
  );
}

export function Thumb({ src, alt = "", className }: { src?: string | null; alt?: string; className?: string }) {
  return (
    <span className={cn("relative block overflow-hidden rounded-xl bg-light-green", className)}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={alt} className="h-full w-full object-cover" />
      ) : (
        <span className="flex h-full w-full items-center justify-center text-lg">🐾</span>
      )}
    </span>
  );
}
