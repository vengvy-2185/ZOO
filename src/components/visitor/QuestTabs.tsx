import Link from "next/link";
import { ScanLine, Gift } from "lucide-react";
import { getI18n } from "@/lib/i18n/server";

/** One menu item, two tabs: the Animal Quest and Points & Rewards live together. */
export function QuestTabs({ active }: { active: "quest" | "rewards" }) {
  const { locale } = getI18n();
  const km = locale === "km";
  const tabs = [
    { key: "quest", href: "/quest", Icon: ScanLine, label: km ? "បេសកកម្មសត្វ" : "Animal Quest" },
    { key: "rewards", href: "/rewards", Icon: Gift, label: km ? "ពិន្ទុ និងរង្វាន់" : "Points & Rewards" },
  ] as const;
  return (
    <div className="relative z-10 mx-auto -mt-3 mb-6 flex max-w-md px-4">
      <div className="grid w-full grid-cols-2 gap-1 rounded-full bg-white p-1.5 shadow-soft ring-1 ring-black/5">
        {tabs.map((t) => (
          <Link
            key={t.key}
            href={t.href}
            aria-current={active === t.key ? "page" : undefined}
            className={`flex items-center justify-center gap-2 rounded-full px-3 py-2.5 text-sm font-extrabold transition ${active === t.key ? "bg-primary text-white shadow-soft" : "text-forest hover:bg-light-green"}`}
          >
            <t.Icon size={17} /> <span className="truncate">{t.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
