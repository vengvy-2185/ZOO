import Link from "next/link";
import { Megaphone, ArrowRight } from "lucide-react";
import { getSettings } from "@/lib/data/zoo";
import { getI18n } from "@/lib/i18n/server";

const COLORS: Record<string, string> = {
  green: "from-primary to-forest text-white",
  amber: "from-amber-300 to-amber-400 text-forest",
  red: "from-red-500 to-red-600 text-white",
  blue: "from-sky-500 to-blue-600 text-white",
};

/** The admin's site-wide notice (Admin → Settings), above the header. */
export async function NoticeBar() {
  const { siteContact: c } = await getSettings().catch(() => ({ siteContact: {} as Record<string, any> }));
  const { locale } = getI18n();
  const text = (locale === "km" && c.notice_km) || c.notice_en || c.notice_km;
  if (!c.notice_on || !text) return null;
  const body = (
    <span className="mx-auto flex max-w-7xl items-center justify-center gap-2 px-4 py-2 text-center text-sm font-bold">
      <Megaphone size={15} className="flex-shrink-0 animate-[gwzPop_.6s_ease-out_both]" />
      <span className="min-w-0">{text}</span>
      {c.notice_link && <ArrowRight size={15} className="flex-shrink-0" />}
    </span>
  );
  const cls = `block bg-gradient-to-r ${COLORS[c.notice_color] ?? COLORS.green}`;
  return c.notice_link ? (
    <Link href={c.notice_link} className={`${cls} transition hover:brightness-110`}>{body}</Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}
