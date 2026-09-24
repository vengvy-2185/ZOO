import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { SignOutButton } from "@/components/visitor/SignOutButton";
import { ProfileEditor } from "@/components/visitor/ProfileEditor";
import { ClaimQuestSession } from "@/components/visitor/ClaimQuestSession";
import { IconBadge } from "@/components/visitor/IconBadge";
import { Medal, Search, Trophy, Star, PawPrint, Ticket, QrCode, ArrowRight, Download, Wallet, Receipt, CheckCircle2, Clock, HeartHandshake, Users, Gift } from "lucide-react";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { zooToday } from "@/lib/data/gate";
import { formatFullDate, num } from "@/lib/utils/age";
import { getI18n } from "@/lib/i18n/server";
import { getVerifiedUserId, getSessionUser } from "@/lib/auth/session";

async function getAccountData() {
  const supabase = createClient();
  // Identity was verified by middleware; display details come from the session cookie.
  const userId = getVerifiedUserId();
  const me = await getSessionUser();
  if (!userId || !me) return null;
  const user = { id: userId, email: me.email, fullName: me.fullName, user_metadata: { avatar_url: me.avatarUrl } };

  const [{ data: profile }, { data: bookings }, { data: questSessions }, { count: totalAnimals }] =
    await Promise.all([
      supabase.from("profiles").select("*").eq("id", user.id).single(),
      supabase
        .from("bookings")
        .select("*, booking_items(quantity, ticket_types(name, khmer_name)), visitor_checkins(checked_in_at), payments(id, amount_usd, status, provider, currency, paid_at, created_at)")
        .eq("visitor_id", user.id)
        .order("visit_date", { ascending: false }),
      supabase
        .from("quest_sessions")
        .select("*, quest_discoveries(animal_id)")
        .eq("visitor_id", user.id),
      supabase.from("animals").select("*", { count: "exact", head: true }).eq("status", "active"),
    ]);

// Adoptions are made without an account, so match them by the verified email.
  const { data: adoptions } = me.email
    ? await createServiceRoleClient()
        .from("adoptions")
        .select("code, access_key, tier, amount_usd, status, created_at, animal:animal_id(name, khmer_name, main_image_url)")
        .ilike("adopter_email", me.email)
        .eq("status", "paid")
        .order("created_at", { ascending: false })
    : { data: [] };

  const discoveredIds = new Set(
    (questSessions ?? []).flatMap((s: any) => (s.quest_discoveries ?? []).map((d: any) => d.animal_id))
  );
  // Spendable points (quest animals, purchases, invites, minus rewards): see lib/server/points.
  const { data: balance } = await createServiceRoleClient().rpc("points_balance", { p_user: user.id });
  const totalPoints = Number(balance ?? 0);

  return {
    user,
    profile,
    bookings: bookings ?? [],
    adoptions: (adoptions ?? []) as any[],
    discoveredCount: discoveredIds.size,
    totalPoints,
    totalAnimals: totalAnimals ?? 0,
  };
}

export default async function AccountPage() {
  const data = await getAccountData();
  if (!data) return null;
  const { user, profile, bookings, adoptions, discoveredCount, totalPoints, totalAnimals } = data;
  const { locale, t } = getI18n();
  const A = t.account;
  const km = locale === "km";
  const today = zooToday();

  // Group tickets: waiting for payment, still to use, and used/past.
  const usedAt = (b: any) => ([b.visitor_checkins].flat()[0] as any)?.checked_in_at as string | undefined;
  const unpaid = bookings.filter((b: any) => b.status === "pending");
  const upcoming = bookings.filter((b: any) => b.status === "confirmed" && !usedAt(b) && b.visit_date >= today).reverse();
  const past = bookings.filter((b: any) => !unpaid.includes(b) && !upcoming.includes(b));
  const payments = bookings
    .flatMap((b: any) => (b.payments ?? []).map((p: any) => ({ ...p, booking_code: b.booking_code, qr_token: b.qr_token })))
    .sort((a: any, b: any) => String(b.paid_at ?? b.created_at).localeCompare(String(a.paid_at ?? a.created_at)));
  const spent = payments.filter((p: any) => p.status === "paid").reduce((s: number, p: any) => s + Number(p.amount_usd), 0);
  const visitors = (b: any) => (b.booking_items ?? []).reduce((s: number, i: any) => s + i.quantity, 0);
  const dt = (iso: string) =>
    new Intl.DateTimeFormat(km ? "km-KH" : "en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Phnom_Penh", numberingSystem: "latn" }).format(new Date(iso));
  const month = (d: string) => new Intl.DateTimeFormat(km ? "km-KH" : "en-GB", { month: "short" }).format(new Date(d + "T12:00:00"));

  const ticketRow = (b: any, kind: "unpaid" | "upcoming" | "past") => {
    const used = usedAt(b);
    const href = kind === "unpaid" ? `/pay/${b.booking_code}?k=${b.qr_token}` : `/ticket/${b.booking_code}?k=${b.qr_token}`;
    return (
      <Link key={b.id} href={href} className={`card flex items-center gap-4 p-4 transition hover:-translate-y-0.5 hover:shadow-lift ${kind === "past" ? "opacity-70" : ""}`}>
        <span
          className={`flex h-14 w-14 flex-shrink-0 flex-col items-center justify-center rounded-2xl ${
            kind === "unpaid" ? "bg-red-50 text-[#E1232E]" : kind === "upcoming" ? "bg-primary text-white" : "bg-black/5 text-ink/50"
          }`}
        >
          <span className="font-display text-xl font-extrabold leading-none">{b.visit_date.slice(8, 10)}</span>
          <span className="text-[10px] font-bold uppercase">{month(b.visit_date)}</span>
        </span>
        <div className="min-w-0 flex-1">
          <div className="font-mono text-base font-bold text-forest">{b.booking_code}</div>
          <div className="flex flex-wrap items-center gap-x-3 text-xs text-ink/55">
            <span className="inline-flex items-center gap-1">
              <Users size={12} /> {A.visitorsN(visitors(b))}
            </span>
            <span>${Number(b.total_usd).toFixed(2)}</span>
          </div>
          <div className="mt-1 truncate text-[11px] text-ink/45">
            {(b.booking_items ?? []).map((i: any) => `${(km && i.ticket_types?.khmer_name) || i.ticket_types?.name} × ${i.quantity}`).join(", ")}
          </div>
        </div>
        {kind === "unpaid" ? (
          <span className="rounded-full bg-[#E1232E] px-3 py-1.5 text-xs font-extrabold text-white">{A.payNow}</span>
        ) : kind === "upcoming" ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-light-green px-3 py-1.5 text-xs font-bold text-primary">
            <QrCode size={13} /> {A.showQr}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full bg-black/5 px-3 py-1.5 text-xs font-bold text-ink/55">
            {used ? (
              <>
                <CheckCircle2 size={13} /> {A.used}
              </>
            ) : (
              t.ticket.status[b.status] ?? b.status
            )}
          </span>
        )}
      </Link>
    );
  };

  const achievements = [
    { label: t.account.firstAnimal, earned: discoveredCount >= 1, icon: Medal },
    { label: t.account.explorer, earned: discoveredCount >= 5, icon: Search },
    { label: t.account.zooExplorer, earned: totalAnimals > 0 && discoveredCount === totalAnimals, icon: Trophy },
  ];

  const progress = totalAnimals > 0 ? Math.round((discoveredCount / totalAnimals) * 100) : 0;
  // The name the visitor chose (login token) wins over the one copied from Google.
  const name = user.fullName || profile?.full_name || user.email || "";
  const avatar = user.user_metadata?.avatar_url as string | undefined;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 md:px-6 md:py-10">
      <ClaimQuestSession />

      {/* Profile header */}
      <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-primary to-forest p-6 text-white shadow-lift md:p-8">
        <div className="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-leaf/20 blur-2xl" />
        <div className="relative flex flex-wrap items-center gap-4">
          <ProfileEditor name={name} avatar={avatar ?? null} email={user.email ?? null} />
          <SignOutButton label={t.account.signOut} className="btn w-full border border-white/30 bg-white/10 px-4 py-2 text-white hover:bg-white hover:text-red-600 sm:w-auto" />
        </div>
        <div className="relative mt-6 grid grid-cols-3 gap-2 md:gap-3">
          {[
            [Star, num(totalPoints, locale), t.account.questPoints],
            [PawPrint, `${num(discoveredCount, locale)}/${num(totalAnimals, locale)}`, t.account.discovered],
            [Ticket, num(bookings.length, locale), t.account.tickets],
          ].map(([Icon, value, label]: any) => (
            <div key={label} className="rounded-2xl bg-white/10 p-3 ring-1 ring-white/15 md:p-4">
              <Icon size={18} className="text-leaf" />
              <div className="mt-1 font-display text-2xl font-extrabold leading-none">{value}</div>
              <div className="text-[11px] text-white/70">{label}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-8 grid gap-6 md:grid-cols-[1.4fr_1fr]">
        <section className="min-w-0">
          <h2 className="section-title text-xl md:text-2xl">
            <Ticket size={22} className="text-primary" /> {t.account.myTickets}
          </h2>
          {bookings.length === 0 ? (
            <div className="card mt-4 flex items-center justify-between gap-3 p-5 text-sm text-ink/60">
              {A.noTickets}
              <Link href="/tickets" className="btn-primary px-4 py-2">
                {A.getTickets} <ArrowRight size={15} />
              </Link>
            </div>
          ) : (
            <div className="mt-4 space-y-5">
              {(
                [
                  ["unpaid", unpaid, A.unpaid, Wallet],
                  ["upcoming", upcoming, A.upcoming, Clock],
                  ["past", past, A.pastTickets, CheckCircle2],
                ] as const
              ).map(([kind, list, label, Icon]) =>
                list.length ? (
                  <div key={kind}>
                    <p className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-ink/45">
                      <Icon size={13} /> {label} ({list.length})
                    </p>
                    <div className="space-y-2.5">{list.map((bk: any) => ticketRow(bk, kind))}</div>
                  </div>
                ) : null
              )}
            </div>
          )}

          {/* Payment history */}
          <h2 className="section-title mt-10 text-xl md:text-2xl">
            <Receipt size={22} className="text-primary" /> {A.paymentHistory}
          </h2>
          <div className="card mt-4 overflow-hidden">
            {payments.length === 0 ? (
              <p className="p-5 text-sm text-ink/55">{A.noPayments}</p>
            ) : (
              <>
                <ul className="divide-y divide-black/5">
                  {payments.map((p: any) => (
                    <li key={p.id} className="flex items-center gap-3 px-4 py-3 text-sm">
                      <span
                        className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl ${p.status === "paid" ? "bg-light-green text-primary" : "bg-amber-50 text-amber-600"}`}
                      >
                        {p.status === "paid" ? <CheckCircle2 size={17} /> : <Clock size={17} />}
                      </span>
                      <div className="min-w-0 flex-1">
                        <Link href={`/ticket/${p.booking_code}?k=${p.qr_token}`} className="font-mono font-semibold text-forest hover:text-primary">
                          {p.booking_code}
                        </Link>
                        <div className="text-[11px] text-ink/45">
                          {dt(p.paid_at ?? p.created_at)}, {A.paidVia} {/khqr|bakong/i.test(p.provider ?? "") ? "Bakong KHQR" : p.provider === "free" ? A.methodFree : A.methodTest}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-display text-base font-extrabold text-forest">${Number(p.amount_usd).toFixed(2)}</div>
                        <div className={`text-[10px] font-bold uppercase ${p.status === "paid" ? "text-primary" : "text-amber-600"}`}>
                          {t.ticket.status[p.status === "paid" ? "confirmed" : "pending"]}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
                <div className="flex items-center justify-between bg-cream px-4 py-3 text-sm">
                  <span className="font-semibold text-ink/60">{A.totalSpent}</span>
                  <span className="font-display text-lg font-extrabold text-primary">${spent.toFixed(2)}</span>
                </div>
              </>
            )}
          </div>

          {adoptions.length > 0 && (
            <>
              <h2 className="section-title mt-10 text-xl md:text-2xl">
                <HeartHandshake size={22} className="text-primary" /> {A.myAdoptions}
              </h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {adoptions.map((ad: any) => (
                  <Link key={ad.code} href={`/adopt/${ad.code}?k=${ad.access_key}`} className="card flex items-center gap-3 p-3 transition hover:-translate-y-0.5 hover:shadow-lift">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={ad.animal?.main_image_url ?? ""} alt="" className="h-14 w-14 rounded-2xl object-cover" />
                    <div className="min-w-0">
                      <div className="truncate font-display font-bold text-forest">{(km && ad.animal?.khmer_name) || ad.animal?.name}</div>
                      <div className="inline-flex items-center gap-1 text-xs text-primary">{A.certificate} <ArrowRight size={12} /></div>
                    </div>
                  </Link>
                ))}
              </div>
            </>
          )}
        </section>

        <div className="min-w-0 space-y-6">
          <Link href="/rewards" className="flex items-center gap-4 rounded-3xl bg-gradient-to-r from-accent to-leaf p-5 text-forest shadow-soft transition hover:-translate-y-0.5">
            <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-white/70">
              <Gift size={24} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-display text-lg font-extrabold leading-tight">{locale === "km" ? "ពិន្ទុ និងរង្វាន់" : "Points & Rewards"}</span>
              <span className="block text-sm text-forest/80">
                {locale === "km" ? `អ្នកមាន ${num(totalPoints, locale)} ពិន្ទុ។ ប្តូរជាការបញ្ចុះតម្លៃ ឬអញ្ជើញមិត្ត។` : `You have ${num(totalPoints, locale)} points. Swap them for discounts or invite friends.`}
              </span>
            </span>
            <ArrowRight size={20} className="flex-shrink-0" />
          </Link>
          <section className="card p-5">
            <h2 className="flex items-center gap-2 font-display text-xl font-bold text-forest">
              <Star size={20} className="text-primary" /> {t.account.myQuest}
            </h2>
            <div className="mt-3 flex justify-between text-sm font-semibold text-forest">
              <span>{t.account.progress}</span>
              <span>{num(progress, locale)}%</span>
            </div>
            <div className="mt-2 h-3 overflow-hidden rounded-full bg-light-green">
              <div className="h-full rounded-full bg-gradient-to-r from-primary to-leaf" style={{ width: `${progress}%` }} />
            </div>
            <Link href="/quest" className="btn-outline mt-4 w-full py-2">
              {t.account.continueExploring} <ArrowRight size={15} />
            </Link>
          </section>

          <section className="card p-5">
            <h2 className="flex items-center gap-2 font-display text-xl font-bold text-forest">
              <Trophy size={20} className="text-primary" /> {t.account.achievements}
            </h2>
            <div className="mt-4 grid grid-cols-3 gap-2">
              {achievements.map((a) => (
                <div key={a.label} className={`rounded-2xl p-3 text-center ${a.earned ? "bg-light-green" : "bg-black/[0.03] grayscale"}`}>
                  <IconBadge icon={a.icon} tone={a.earned ? "solid" : "light"} className="mx-auto" />
                  <div className="mt-2 text-[11px] font-bold leading-tight text-forest">{a.label}</div>
                  <div className="text-[10px] text-ink/40">{a.earned ? t.account.earned : t.account.locked}</div>
                </div>
              ))}
            </div>
          </section>

          <section className="card flex items-start gap-3 p-5 text-sm text-ink/60">
            <Download size={18} className="mt-0.5 flex-shrink-0 text-primary" />
            {t.account.downloads}
          </section>
        </div>
      </div>
    </div>
  );
}
