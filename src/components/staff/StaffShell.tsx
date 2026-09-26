import Link from "next/link";
import { LogOut, ShieldCheck, Siren } from "lucide-react";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { getVerifiedUserId } from "@/lib/auth/session";
import { staffAccess } from "@/lib/server/staff";
import { getMembers } from "@/lib/server/members";
import { getI18n } from "@/lib/i18n/server";
import { LogoMark } from "@/components/visitor/Logo";
import { SignOutButton } from "@/components/visitor/SignOutButton";
import { LanguageSwitcher } from "@/components/visitor/LanguageSwitcher";
import { StaffNav, type StaffNavItem } from "./StaffNav";
import { StaffBottomNav } from "./StaffBottomNav";
import { SosDock } from "./SosDock";
import { AppFrame } from "./AppFrame";

/** Kept for the pages' `active` prop; the menu itself highlights from the address. */
export type StaffNavKey = StaffNavItem["key"];

/**
 * The frame around every staff page, in one blue theme: a top bar + menu
 * that stay pinned while scrolling (phone and computer), the page title,
 * then the content. Only the tools the position allows are in the menu.
 */
export async function StaffShell({ title, subtitle, hero, children, bare = false, hideBottomNav = false }: { active?: StaffNavKey; title: string; subtitle?: string; hero?: React.ReactNode; children: React.ReactNode; /** no title band: the page fills the screen (chat) */ bare?: boolean; hideBottomNav?: boolean }) {
  const userId = getVerifiedUserId()!;
  const { locale } = getI18n();
  const km = locale === "km";
  const access = await staffAccess(userId);
  const [me] = await getMembers(userId);
  const isStaff = Boolean(access.staff);
  const can = (p: Parameters<typeof access.perms.has>[0]) => access.perms.has(p);
  // open SOS alerts: managers see every one, others see their own
  const manager = access.admin || access.perms.has("reports");
  const { data: alertRows } = await createServiceRoleClient().from("staff_alerts").select("*").eq("status", "open").order("created_at", { ascending: false }).limit(5);
  const alerts = (alertRows ?? []).filter((a: any) => manager || a.user_id === userId);
  const senderIds = [...new Set(alerts.map((a: any) => a.user_id).filter(Boolean))];
  const { data: senders } = senderIds.length ? await createServiceRoleClient().from("staff_members").select("user_id, full_name, phone").in("user_id", senderIds) : { data: [] as any[] };
  const senderOf = new Map((senders ?? []).map((x: any) => [x.user_id, x]));

  const T = km
    ? { checkin: "ស្កេនវត្តមាន", team: "វត្តមានក្រុម", issues: "រាយការណ៍បញ្ហា", home: "ទំព័រដើម", scanner: "ស្កេន", gate: "រាប់ភ្ញៀវ", bookings: "ការកក់", animals: "ថែសត្វ", schedule: "កម្មវិធីថ្ងៃនេះ", cleaning: "សម្អាត", reports: "របាយការណ៍", attendance: "វត្តមានខ្ញុំ", leave: "សុំច្បាប់", pay: "ប្រាក់ខែ", profile: "ខ្ញុំ", supplies: "សុំសម្ភារៈ", roster: "កាលវិភាគ", chat: "ជជែកក្រុម", tasks: "ការងារ", lost: "របស់បាត់", handover: "ប្រគល់វេន", signOut: "ចាកចេញ", admin: "ផ្ទាំងគ្រប់គ្រង", staff: "បុគ្គលិក" }
    : { checkin: "Check in", team: "Team attendance", issues: "Report a problem", home: "Home", scanner: "Scanner", gate: "Gate", bookings: "Bookings", animals: "Animal care", schedule: "Today's programme", cleaning: "Cleaning", reports: "Reports", attendance: "My attendance", leave: "Leave", pay: "Pay", profile: "Me", supplies: "Supplies", roster: "Schedule", chat: "Team chat", tasks: "Tasks", lost: "Lost & found", handover: "Handover", signOut: "Sign out", admin: "Admin panel", staff: "Staff" };

  const items: StaffNavItem[] = (
    [
      ["home", "/staff", "main", true],
      ["chat", "/staff/chat", "main", true],
      ["tasks", "/staff/tasks", "main", true],
      ["roster", "/staff/roster", "main", true],
      ["scanner", "/staff/scanner", "tools", can("tickets")],
      ["gate", "/staff/gate", "tools", can("tickets")],
      ["bookings", "/staff/bookings", "tools", can("tickets")],
      ["animals", "/staff/animals", "tools", can("animals")],
      ["schedule", "/staff/schedule", "tools", can("guide")],
      ["cleaning", "/staff/cleaning", "tools", can("cleaning")],
      ["reports", "/staff/reports", "tools", can("reports")],
      ["checkin", "/staff/checkin", "team", isStaff],
      ["team", "/staff/team", "team", access.admin || can("reports")],
      ["issues", "/staff/issues", "team", true],
      ["supplies", "/staff/supplies", "team", true],
      ["handover", "/staff/handover", "team", true],
      ["attendance", "/staff/attendance", "me", isStaff],
      ["leave", "/staff/leave", "me", isStaff],
      ["pay", "/staff/pay", "me", isStaff],
      ["profile", "/staff/profile", "me", true],
    ] as const
  )
    .filter((x) => x[3])
    .map(([key, href, group]) => ({ key, href, group, label: T[key] }));

  return (
    <Frame bare={bare}>
      {/* pinned top bar + menu */}
      <div className={`sticky top-0 z-40 bg-gradient-to-r from-[#1E3A8A] to-[#1D4ED8] text-white shadow-[0_8px_24px_-12px_rgba(30,58,138,0.6)] ${bare && hideBottomNav ? "hidden md:block" : ""}`}>
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-2.5 md:px-8">
          <Link href="/staff" className="flex min-w-0 items-center gap-2.5">
            <span className="flex-shrink-0 rounded-full bg-white p-0.5 shadow-soft"><LogoMark className="h-8 w-8" /></span>
            <span className="min-w-0 leading-tight">
              <span className="block truncate font-display text-sm font-extrabold tracking-wide">GREEN WILD ZOO</span>
              <span className="block text-[10px] font-bold uppercase tracking-[0.2em] text-[#BFDBFE]">{T.staff}</span>
            </span>
          </Link>
          <div className="flex flex-shrink-0 items-center gap-2">
            <Link href="/staff/sos" title="SOS" className="relative flex h-10 items-center gap-1.5 rounded-full bg-red-500 px-3 text-xs font-extrabold text-white shadow-[0_0_0_3px_rgba(255,255,255,0.15)] transition hover:bg-red-600">
              <span className="absolute inset-0 animate-ping rounded-full bg-red-400/40 [animation-duration:2.4s]" />
              <Siren size={16} className="relative" /> <span className="relative">SOS</span>
            </Link>
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
        {/* computers: tabs under the top bar · phones: a bar at the bottom */}
        <div className="hidden md:block">
          <StaffNav items={items} groups={km ? { tools: "ការងារ", team: "ក្រុម", me: "ខ្ញុំ" } : { tools: "Work", team: "Team", me: "Me" }} />
        </div>
      </div>

      {/* live SOS alerts: a small button + a sheet (the page refreshes by itself when one arrives) */}
      <SosDock
        km={km}
        alerts={alerts.map((a: any) => ({ id: a.id, kind: a.kind, place: a.place, note: a.note, lat: a.lat, lng: a.lng, created_at: a.created_at, name: senderOf.get(a.user_id)?.full_name ?? "Admin", phone: senderOf.get(a.user_id)?.phone ?? null, own: a.user_id === userId }))}
      />

      {!bare && (
        <>
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

        </>
      )}
      {bare ? <main className={`relative mx-auto flex min-h-0 w-full max-w-6xl flex-1 flex-col ${hideBottomNav ? "" : "pb-[4.5rem] md:pb-0"}`}>{children}</main> : <main className="relative mx-auto -mt-12 max-w-6xl space-y-5 px-4 md:px-8">{children}</main>}
      {!hideBottomNav && <StaffBottomNav items={items} groups={km ? { main: "សំខាន់", tools: "ការងារ", team: "ក្រុម", me: "ខ្ញុំ" } : { main: "Main", tools: "Work", team: "Team", me: "Me" }} moreLabel={km ? "ច្រើនទៀត" : "More"} closeLabel={km ? "បិទ" : "Close"} />}
    </Frame>
  );
}

/** Normal pages scroll; "bare" pages (chat) fill exactly the visible screen. */
function Frame({ bare, children }: { bare: boolean; children: React.ReactNode }) {
  return bare ? <AppFrame className="flex flex-col overflow-hidden bg-[#F4F7FF]">{children}</AppFrame> : <div className="min-h-screen bg-[#F4F7FF] pb-28 md:pb-14">{children}</div>;
}
