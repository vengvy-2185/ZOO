import Link from "next/link";
import { LogOut, ShieldCheck } from "lucide-react";
import { getVerifiedUserId } from "@/lib/auth/session";
import { staffAccess } from "@/lib/server/staff";
import { getMembers } from "@/lib/server/members";
import { getI18n } from "@/lib/i18n/server";
import { LogoMark } from "@/components/visitor/Logo";
import { SignOutButton } from "@/components/visitor/SignOutButton";
import { LanguageSwitcher } from "@/components/visitor/LanguageSwitcher";
import { StaffNav, type StaffNavItem } from "./StaffNav";

/** Kept for the pages' `active` prop; the menu itself highlights from the address. */
export type StaffNavKey = StaffNavItem["key"];

/**
 * The frame around every staff page, in one blue theme: a top bar + menu
 * that stay pinned while scrolling (phone and computer), the page title,
 * then the content. Only the tools the position allows are in the menu.
 */
export async function StaffShell({ title, subtitle, hero, children }: { active?: StaffNavKey; title: string; subtitle?: string; hero?: React.ReactNode; children: React.ReactNode }) {
  const userId = getVerifiedUserId()!;
  const { locale } = getI18n();
  const km = locale === "km";
  const access = await staffAccess(userId);
  const [me] = await getMembers(userId);
  const isStaff = Boolean(access.staff);
  const can = (p: Parameters<typeof access.perms.has>[0]) => access.perms.has(p);

  const T = km
    ? { checkin: "ស្កេនវត្តមាន", team: "វត្តមានក្រុម", issues: "រាយការណ៍បញ្ហា", home: "ទំព័រដើម", scanner: "ស្កេន", gate: "រាប់ភ្ញៀវ", bookings: "ការកក់", animals: "ថែសត្វ", schedule: "កម្មវិធីថ្ងៃនេះ", cleaning: "សម្អាត", reports: "របាយការណ៍", attendance: "ម៉ោងធ្វើការ", leave: "សុំច្បាប់", pay: "ប្រាក់ខែ", profile: "ខ្ញុំ", signOut: "ចាកចេញ", admin: "ផ្ទាំងគ្រប់គ្រង", staff: "បុគ្គលិក" }
    : { checkin: "Check in", team: "Team attendance", issues: "Report a problem", home: "Home", scanner: "Scanner", gate: "Gate", bookings: "Bookings", animals: "Animal care", schedule: "Today's programme", cleaning: "Cleaning", reports: "Reports", attendance: "Hours", leave: "Leave", pay: "Pay", profile: "Me", signOut: "Sign out", admin: "Admin panel", staff: "Staff" };

  const items: StaffNavItem[] = (
    [
      ["home", "/staff", "main", true],
      ["checkin", "/staff/checkin", "main", isStaff],
      ["team", "/staff/team", "main", access.admin || can("reports")],
      ["issues", "/staff/issues", "main", true],
      ["scanner", "/staff/scanner", "tools", can("tickets")],
      ["gate", "/staff/gate", "tools", can("tickets")],
      ["bookings", "/staff/bookings", "tools", can("tickets")],
      ["animals", "/staff/animals", "tools", can("animals")],
      ["schedule", "/staff/schedule", "tools", can("guide")],
      ["cleaning", "/staff/cleaning", "tools", can("cleaning")],
      ["reports", "/staff/reports", "tools", can("reports")],
      ["attendance", "/staff/attendance", "me", isStaff],
      ["leave", "/staff/leave", "me", isStaff],
      ["pay", "/staff/pay", "me", isStaff],
      ["profile", "/staff/profile", "me", true],
    ] as const
  )
    .filter((x) => x[3])
    .map(([key, href, group]) => ({ key, href, group, label: T[key] }));

  return (
    <div className="min-h-screen bg-[#F4F7FF] pb-14">
      {/* pinned top bar + menu */}
      <div className="sticky top-0 z-40 bg-gradient-to-r from-[#1E3A8A] to-[#1D4ED8] text-white shadow-[0_8px_24px_-12px_rgba(30,58,138,0.6)]">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-2.5 md:px-8">
          <Link href="/staff" className="flex min-w-0 items-center gap-2.5">
            <span className="flex-shrink-0 rounded-full bg-white p-0.5 shadow-soft"><LogoMark className="h-8 w-8" /></span>
            <span className="min-w-0 leading-tight">
              <span className="block truncate font-display text-sm font-extrabold tracking-wide">GREEN WILD ZOO</span>
              <span className="block text-[10px] font-bold uppercase tracking-[0.2em] text-[#BFDBFE]">{T.staff}</span>
            </span>
          </Link>
          <div className="flex flex-shrink-0 items-center gap-2">
            <LanguageSwitcher tone="blue" className="[&>svg]:hidden sm:[&>svg]:block" />
            {access.admin && (
              <Link href="/admin" className="hidden items-center gap-1.5 rounded-full bg-white/15 px-3 py-2 text-xs font-bold hover:bg-white/25 sm:inline-flex">
                <ShieldCheck size={14} /> {T.admin}
              </Link>
            )}
            <Link href="/staff/profile" className="flex items-center gap-2 rounded-full bg-white/10 py-1 pl-1 pr-1 ring-1 ring-white/20 hover:bg-white/20 sm:pr-3">
              <span className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-white/20 font-display text-sm font-extrabold">
                {me?.avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={me.avatar} alt="" className="h-full w-full object-cover" />
                ) : (
                  [...(me?.name ?? "S")][0]?.toUpperCase()
                )}
              </span>
              <span className="hidden max-w-[9rem] truncate text-sm font-bold sm:block">{access.staff?.full_name ?? me?.name}</span>
            </Link>
            <SignOutButton redirectTo="/staff/login" label={T.signOut} className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 ring-1 ring-white/20 transition hover:bg-white/25 md:w-auto md:gap-1.5 md:px-4 md:text-sm md:font-bold">
              <LogOut size={16} /> <span className="hidden md:inline">{T.signOut}</span>
            </SignOutButton>
          </div>
        </div>
        <StaffNav items={items} />
      </div>

      {/* page title */}
      <header className="relative overflow-hidden bg-gradient-to-br from-[#1D4ED8] to-[#2563EB] text-white">
        <svg viewBox="0 0 400 200" className="pointer-events-none absolute -right-16 -top-16 h-72 w-[28rem] opacity-[0.07]" aria-hidden>
          <circle cx="300" cy="80" r="120" fill="#fff" />
          <circle cx="110" cy="170" r="70" fill="#fff" />
        </svg>
        <div className="relative mx-auto max-w-6xl px-4 pb-16 pt-6 md:px-8 md:pb-20">
          <h1 className="font-display text-3xl font-extrabold leading-tight md:text-4xl">{title}</h1>
          {subtitle && <p className="mt-1 max-w-2xl text-sm text-white/80">{subtitle}</p>}
          {hero}
        </div>
      </header>

      <main className="relative mx-auto -mt-12 max-w-6xl space-y-5 px-4 md:px-8">{children}</main>
    </div>
  );
}
