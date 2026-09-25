import Link from "next/link";
import { Home, ScanLine, UserRoundPlus, PawPrint, Clock, CalendarOff, Wallet, UserRound, LogOut, ShieldCheck } from "lucide-react";
import { getVerifiedUserId } from "@/lib/auth/session";
import { staffAccess } from "@/lib/server/staff";
import { getMembers } from "@/lib/server/members";
import { getI18n } from "@/lib/i18n/server";
import { LogoMark } from "@/components/visitor/Logo";
import { SignOutButton } from "@/components/visitor/SignOutButton";
import { cn } from "@/lib/utils/cn";

export type StaffNavKey = "home" | "scanner" | "gate" | "animals" | "attendance" | "leave" | "pay" | "profile";

/**
 * The frame around every staff page: blue header with the menu (tabs on a
 * computer, a bottom bar on a phone), who is signed in, and sign out. Only
 * the tools the person's position allows are listed.
 */
export async function StaffShell({ active, title, subtitle, hero, children }: { active: StaffNavKey; title: string; subtitle?: string; hero?: React.ReactNode; children: React.ReactNode }) {
  const userId = getVerifiedUserId()!;
  const { locale } = getI18n();
  const km = locale === "km";
  const access = await staffAccess(userId);
  const [me] = await getMembers(userId);
  const isStaff = Boolean(access.staff);

  const N = km
    ? { home: "ទំព័រដើម", scanner: "ស្កេន", gate: "រាប់ភ្ញៀវ", animals: "ថែសត្វ", attendance: "ម៉ោងធ្វើការ", leave: "សុំច្បាប់", pay: "ប្រាក់ខែ", profile: "ខ្ញុំ", signOut: "ចាកចេញ", admin: "ផ្ទាំងគ្រប់គ្រង" }
    : { home: "Home", scanner: "Scanner", gate: "Gate", animals: "Animal care", attendance: "Hours", leave: "Leave", pay: "Pay", profile: "Me", signOut: "Sign out", admin: "Admin panel" };

  const all: { key: StaffNavKey; href: string; icon: typeof Home; show: boolean }[] = [
    { key: "home", href: "/staff", icon: Home, show: true },
    { key: "scanner", href: "/staff/scanner", icon: ScanLine, show: access.perms.has("tickets") },
    { key: "gate", href: "/staff/gate", icon: UserRoundPlus, show: access.perms.has("tickets") },
    { key: "animals", href: "/staff/animals", icon: PawPrint, show: access.perms.has("animals") },
    { key: "attendance", href: "/staff/attendance", icon: Clock, show: isStaff },
    { key: "leave", href: "/staff/leave", icon: CalendarOff, show: isStaff },
    { key: "pay", href: "/staff/pay", icon: Wallet, show: isStaff },
    { key: "profile", href: "/staff/profile", icon: UserRound, show: true },
  ];
  const nav = all.filter((n) => n.show);
  // phone bottom bar: the everyday five
  const bar = nav.filter((n) => ["home", "attendance", "leave", "pay", "profile"].includes(n.key) || (!isStaff && n.key !== "profile"));

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#EEF2FF] via-background to-background pb-24 md:pb-12">
      <header className="relative overflow-hidden bg-gradient-to-br from-[#1E3A8A] via-[#1D4ED8] to-[#2563EB] text-white">
        <svg viewBox="0 0 400 200" className="pointer-events-none absolute -right-10 -top-10 h-72 w-[28rem] opacity-[0.08]" aria-hidden>
          <circle cx="300" cy="80" r="120" fill="#fff" />
          <circle cx="120" cy="170" r="70" fill="#fff" />
        </svg>
        <div className="relative mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 pt-4 md:px-8">
          <Link href="/staff" className="flex min-w-0 items-center gap-2.5">
            <span className="flex-shrink-0 rounded-full bg-white p-1 shadow-soft"><LogoMark className="h-8 w-8" /></span>
            <span className="min-w-0 leading-tight">
              <span className="block truncate font-display text-sm font-extrabold tracking-wide md:text-base">GREEN WILD ZOO</span>
              <span className="block text-[10px] font-bold uppercase tracking-[0.2em] text-[#BFDBFE]">{km ? "បុគ្គលិក" : "Staff"}</span>
            </span>
          </Link>
          <div className="flex flex-shrink-0 items-center gap-2">
            {access.admin && (
              <Link href="/admin" className="hidden items-center gap-1.5 rounded-full bg-white/15 px-3 py-2 text-xs font-bold hover:bg-white/25 sm:inline-flex">
                <ShieldCheck size={14} /> {N.admin}
              </Link>
            )}
            <Link href="/staff/profile" className="flex items-center gap-2 rounded-full bg-white/10 py-1 pl-1 pr-3 ring-1 ring-white/20 hover:bg-white/20">
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
            <SignOutButton redirectTo="/staff/login" label={N.signOut} className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 ring-1 ring-white/20 hover:bg-red-500/80 md:w-auto md:gap-1.5 md:px-4 md:text-sm md:font-bold">
              <LogOut size={16} /> <span className="hidden md:inline">{N.signOut}</span>
            </SignOutButton>
          </div>
        </div>

        {/* desktop / tablet menu */}
        <nav className="relative mx-auto mt-4 hidden max-w-6xl gap-1 px-4 md:flex md:px-8" aria-label="Staff menu">
          {nav.map((n) => (
            <Link
              key={n.key}
              href={n.href}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-t-2xl px-4 py-2.5 text-sm font-bold transition",
                active === n.key ? "bg-[#EEF2FF] text-[#1E3A8A]" : "text-white/80 hover:bg-white/10 hover:text-white"
              )}
            >
              <n.icon size={16} /> {N[n.key]}
            </Link>
          ))}
        </nav>

        <div className="relative mx-auto max-w-6xl px-4 pb-16 pt-5 md:px-8 md:pb-20 md:pt-6">
          <h1 className="font-display text-3xl font-extrabold leading-tight md:text-4xl">{title}</h1>
          {subtitle && <p className="mt-1 max-w-2xl text-sm text-white/80">{subtitle}</p>}
          {hero}
        </div>
      </header>

      <main className="relative mx-auto -mt-12 max-w-6xl space-y-5 px-4 md:px-8">{children}</main>

      {/* phone bottom bar */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-black/5 bg-white/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_30px_rgba(30,58,138,0.12)] backdrop-blur md:hidden" aria-label="Staff menu">
        <div className="mx-auto grid max-w-md" style={{ gridTemplateColumns: `repeat(${bar.length}, minmax(0, 1fr))` }}>
          {bar.map((n) => {
            const on = active === n.key || (n.key === "home" && ["scanner", "gate", "animals"].includes(active));
            return (
              <Link key={n.key} href={n.href} className={cn("relative flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-bold", on ? "text-[#1D4ED8]" : "text-ink/45")}>
                {on && <span className="absolute top-0 h-1 w-8 rounded-b-full bg-[#2563EB]" />}
                <n.icon size={21} strokeWidth={on ? 2.4 : 2} />
                {N[n.key]}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
