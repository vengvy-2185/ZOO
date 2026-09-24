import Link from "next/link";
import { Gift, Trophy, Ticket, Users, Star, History, LogIn, Check, ScanLine } from "lucide-react";
import { Navbar } from "@/components/visitor/Navbar";
import { BottomNav } from "@/components/visitor/BottomNav";
import { PageHeader } from "@/components/visitor/PageHeader";
import { SiteFooter } from "@/components/visitor/SiteFooter";
import { getI18n } from "@/lib/i18n/server";
import { getSessionUser } from "@/lib/auth/session";
import { getRequestOrigin } from "@/lib/server/site-url";
import { getWallet, REWARDS, REFERRAL, QUEST_POINTS, PURCHASE_RATE } from "@/lib/server/points";
import { RedeemCard, ShareInvite, CopyButton } from "@/components/visitor/RewardsClient";
import { formatFullDate } from "@/lib/utils/age";
import { cn } from "@/lib/utils/cn";

export const dynamic = "force-dynamic";

const TEXT = {
  en: {
    eyebrow: "Collect and spend",
    title: "Points & Rewards",
    subtitle: "Earn points by exploring the zoo and inviting friends, then swap them for discounts on your next visit.",
    balance: "Your points",
    nextReward: (n: number, r: string) => `${n} more points for ${r}`,
    allUnlocked: "You can afford every reward. Treat yourself!",
    rewards: "Swap points for rewards",
    redeem: "Get it",
    needMore: (n: number) => `${n} to go`,
    off: "off tickets",
    got: "Your code is ready",
    copy: "Copy",
    copied: "Copied",
    points: "points",
    errors: { not_enough: "Not enough points yet.", signin: "Please sign in first.", unknown: "This reward isn't available.", error: "Something went wrong. Please try again." } as Record<string, string>,
    myCodes: "My reward codes",
    noCodes: "Codes you get with points appear here. Use them at checkout.",
    used: "Used",
    validTo: (d: string) => `Use by ${d}`,
    useNow: "Use it on tickets",
    invite: "Invite friends, earn points",
    inviteText: `Share your link. Each friend who buys tickets through it gives you ${REFERRAL.perFriend} points, and they get ${REFERRAL.welcome} welcome points.`,
    share: "Share my link",
    shareMsg: "Come to Green Wild Zoo with me! Book your tickets here:",
    friends: (n: number) => `${n} ${n === 1 ? "friend" : "friends"} joined`,
    milestone: (f: number, b: number) => `${f} friends: +${b} bonus`,
    how: "How to earn points",
    howQuest: `Find animals in the Animal Quest: ${QUEST_POINTS.perAnimal} points each, plus ${QUEST_POINTS.allBonus} for finding them all`,
    howBuy: `Buy tickets while signed in: ${PURCHASE_RATE} point for every $1`,
    howInvite: `A friend buys tickets with your link: ${REFERRAL.perFriend} points`,
    history: "Points history",
    reasons: { purchase: "Ticket purchase", referral: "A friend bought tickets", welcome: "Welcome gift from a friend", milestone: "Friends bonus", redeem: "Reward", admin: "Gift from the zoo" } as Record<string, string>,
    questLine: "Animals found in the quest",
    signInTitle: "Sign in to collect points",
    signInText: "Points are saved to your account, so they are never lost and you can spend them on any device.",
    signIn: "Sign in or create an account",
    startQuest: "Start the Animal Quest",
  },
  km: {
    eyebrow: "ប្រមូល និងចាយ",
    title: "ពិន្ទុ និងរង្វាន់",
    subtitle: "ប្រមូលពិន្ទុដោយរុករកសួនសត្វ និងអញ្ជើញមិត្តភក្តិ រួចប្តូរជាការបញ្ចុះតម្លៃសម្រាប់ដំណើរកម្សាន្តលើកក្រោយ។",
    balance: "ពិន្ទុរបស់អ្នក",
    nextReward: (n: number, r: string) => `ខ្វះ ${n} ពិន្ទុទៀត ដើម្បីទទួលបាន${r}`,
    allUnlocked: "អ្នកមានពិន្ទុគ្រប់គ្រាន់សម្រាប់រង្វាន់ទាំងអស់ហើយ!",
    rewards: "ប្តូរពិន្ទុជារង្វាន់",
    redeem: "យករង្វាន់",
    needMore: (n: number) => `ខ្វះ ${n} ពិន្ទុ`,
    off: "បញ្ចុះតម្លៃសំបុត្រ",
    got: "លេខកូដរបស់អ្នករួចរាល់",
    copy: "ចម្លង",
    copied: "បានចម្លង",
    points: "ពិន្ទុ",
    errors: { not_enough: "ពិន្ទុមិនទាន់គ្រប់គ្រាន់ទេ។", signin: "សូមចូលគណនីជាមុនសិន។", unknown: "រង្វាន់នេះមិនមានទេ។", error: "មានបញ្ហាបន្តិច។ សូមព្យាយាមម្តងទៀត។" } as Record<string, string>,
    myCodes: "លេខកូដរង្វាន់របស់ខ្ញុំ",
    noCodes: "លេខកូដដែលអ្នកប្តូរពីពិន្ទុនឹងបង្ហាញនៅទីនេះ។ ប្រើវាពេលទិញសំបុត្រ។",
    used: "បានប្រើ",
    validTo: (d: string) => `ប្រើបានដល់ ${d}`,
    useNow: "ប្រើពេលទិញសំបុត្រ",
    invite: "អញ្ជើញមិត្ត ទទួលពិន្ទុ",
    inviteText: `ចែករំលែក link របស់អ្នក។ មិត្តម្នាក់ៗដែលទិញសំបុត្រតាម link នេះ ផ្តល់ឲ្យអ្នក ${REFERRAL.perFriend} ពិន្ទុ ហើយមិត្តក៏ទទួលបាន ${REFERRAL.welcome} ពិន្ទុស្វាគមន៍ដែរ។`,
    share: "ចែករំលែក link របស់ខ្ញុំ",
    shareMsg: "តោះទៅលេងសួនសត្វ Green Wild Zoo ជាមួយគ្នា! កក់សំបុត្រនៅទីនេះ៖",
    friends: (n: number) => `មិត្ត ${n} នាក់បានចូលរួម`,
    milestone: (f: number, b: number) => `មិត្ត ${f} នាក់៖ បន្ថែម ${b} ពិន្ទុ`,
    how: "របៀបប្រមូលពិន្ទុ",
    howQuest: `រកសត្វក្នុងបេសកកម្មសត្វ៖ ${QUEST_POINTS.perAnimal} ពិន្ទុក្នុងមួយក្បាល និងបន្ថែម ${QUEST_POINTS.allBonus} ពិន្ទុពេលរកឃើញទាំងអស់`,
    howBuy: `ទិញសំបុត្រពេលបានចូលគណនី៖ ${PURCHASE_RATE} ពិន្ទុក្នុង $1`,
    howInvite: `មិត្តទិញសំបុត្រតាម link របស់អ្នក៖ ${REFERRAL.perFriend} ពិន្ទុ`,
    history: "ប្រវត្តិពិន្ទុ",
    reasons: { purchase: "ទិញសំបុត្រ", referral: "មិត្តបានទិញសំបុត្រ", welcome: "អំណោយស្វាគមន៍ពីមិត្ត", milestone: "រង្វាន់មិត្តភក្តិ", redeem: "ប្តូររង្វាន់", admin: "អំណោយពីសួនសត្វ" } as Record<string, string>,
    questLine: "សត្វដែលរកឃើញក្នុងបេសកកម្ម",
    signInTitle: "ចូលគណនីដើម្បីប្រមូលពិន្ទុ",
    signInText: "ពិន្ទុត្រូវបានរក្សាទុកក្នុងគណនីរបស់អ្នក ដូច្នេះមិនបាត់ទេ ហើយអាចប្រើបានលើគ្រប់ឧបករណ៍។",
    signIn: "ចូល ឬបង្កើតគណនី",
    startQuest: "ចាប់ផ្តើមបេសកកម្មសត្វ",
  },
};

export default async function RewardsPage() {
  const { locale } = getI18n();
  const km = locale === "km";
  const L = TEXT[km ? "km" : "en"];
  const user = await getSessionUser();
  const wallet = user ? await getWallet(user.id) : null;
  // The domain the visitor is on right now (Vercel or Render), so the link always matches a working site.
  const inviteUrl = wallet?.referralCode ? `${getRequestOrigin()}/r/${wallet.referralCode}` : null;
  const next = wallet ? REWARDS.find((r) => r.cost > wallet.balance) : null;

  const how = [
    { Icon: ScanLine, text: L.howQuest, href: "/quest" },
    { Icon: Ticket, text: L.howBuy, href: "/tickets" },
    { Icon: Users, text: L.howInvite, href: null },
  ];

  return (
    <div className="pb-20 md:pb-0">
      <Navbar />
      <PageHeader icon={Gift} eyebrow={L.eyebrow} title={L.title} subtitle={L.subtitle} />
      <main className="mx-auto max-w-5xl space-y-6 px-4 pb-12 md:px-6">
        {!wallet ? (
          <div className="card mx-auto max-w-xl p-7 text-center">
            <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-light-green text-primary">
              <Star size={32} />
            </span>
            <h2 className="mt-4 font-display text-2xl font-extrabold text-forest">{L.signInTitle}</h2>
            <p className="mt-2 text-ink/65">{L.signInText}</p>
            <Link href="/account/login?next=/rewards" className="btn-primary mt-5">
              <LogIn size={17} /> {L.signIn}
            </Link>
          </div>
        ) : (
          <>
            {/* Balance */}
            <section className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-primary via-forest to-forest p-6 text-white shadow-lift sm:p-8">
              <Trophy className="pointer-events-none absolute -right-6 -top-6 h-44 w-44 text-white/[0.07]" />
              <p className="text-sm font-bold uppercase tracking-wider text-leaf">{L.balance}</p>
              <p className="mt-1 font-display text-6xl font-extrabold leading-none sm:text-7xl">{wallet.balance}</p>
              <p className="mt-3 text-white/85">{next ? L.nextReward(next.cost - wallet.balance, km ? next.km : next.en) : L.allUnlocked}</p>
              {next && (
                <div className="mt-3 h-2.5 max-w-md overflow-hidden rounded-full bg-white/20">
                  <div className="h-full rounded-full bg-leaf" style={{ width: `${Math.min(100, (wallet.balance / next.cost) * 100)}%` }} />
                </div>
              )}
              <p className="mt-4 text-xs text-white/65">
                {L.questLine}: {wallet.questPoints} {L.points}
              </p>
            </section>

            {/* Rewards */}
            <section>
              <h2 className="section-title text-xl md:text-2xl">
                <Gift size={24} className="text-primary" /> {L.rewards}
              </h2>
              <div className="mt-4 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
                {REWARDS.map((r) => (
                  <RedeemCard
                    key={r.key}
                    reward={r.key}
                    value={r.value}
                    caption={L.off}
                    colors={[r.from, r.to]}
                    cost={r.cost}
                    balance={wallet.balance}
                    t={{ redeem: L.redeem, needMore: L.needMore(Math.max(0, r.cost - wallet.balance)), got: L.got, copy: L.copy, copied: L.copied, errors: L.errors, points: L.points }}
                  />
                ))}
              </div>
            </section>

            {/* My codes */}
            <section className="card p-5 sm:p-6">
              <h2 className="font-display text-lg font-bold text-forest">{L.myCodes}</h2>
              {wallet.codes.length === 0 ? (
                <p className="mt-2 text-sm text-ink/55">{L.noCodes}</p>
              ) : (
                <ul className="mt-3 divide-y divide-black/5">
                  {wallet.codes.map((c) => (
                    <li key={c.code} className={cn("flex flex-wrap items-center gap-3 py-3", c.used && "opacity-50")}>
                      <span className="font-mono text-base font-extrabold tracking-wider text-forest">{c.code}</span>
                      <span className="min-w-0 flex-1 text-sm text-ink/65">
                        {(km && c.name_km) || c.name}
                        {c.ends_on && !c.used && <span className="block text-xs text-ink/45">{L.validTo(formatFullDate(c.ends_on, locale) ?? c.ends_on)}</span>}
                      </span>
                      {c.used ? (
                        <span className="rounded-full bg-black/5 px-3 py-1 text-xs font-bold text-ink/55">{L.used}</span>
                      ) : (
                        <span className="flex gap-2">
                          <CopyButton text={c.code} label={L.copy} done={L.copied} />
                          <Link href="/tickets" className="inline-flex items-center rounded-full bg-primary px-3.5 py-2 text-xs font-bold text-white">
                            {L.useNow}
                          </Link>
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* Invite friends */}
            {inviteUrl && (
              <section className="overflow-hidden rounded-[2rem] bg-gradient-to-br from-cream to-light-green p-5 ring-1 ring-primary/15 sm:p-7">
                <h2 className="section-title text-xl md:text-2xl">
                  <Users size={24} className="text-primary" /> {L.invite}
                </h2>
                <p className="mt-2 max-w-2xl text-ink/70">{L.inviteText}</p>
                <div className="mt-4 flex items-center gap-2 overflow-hidden rounded-2xl bg-white p-2 pl-4 shadow-soft">
                  <span className="min-w-0 flex-1 truncate font-mono text-sm text-forest">{inviteUrl}</span>
                  <CopyButton text={inviteUrl} label={L.copy} done={L.copied} />
                </div>
                <div className="mt-3">
                  <ShareInvite url={inviteUrl} text={L.shareMsg} label={L.share} copyLabel={L.copy} copied={L.copied} />
                </div>
                <p className="mt-5 font-display text-lg font-bold text-forest">{L.friends(wallet.friends)}</p>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  {REFERRAL.milestones.map((m) => {
                    const done = wallet.friends >= m.friends;
                    return (
                      <div key={m.friends} className={cn("rounded-2xl p-3 text-center ring-1", done ? "bg-primary text-white ring-primary" : "bg-white text-forest ring-black/5")}>
                        <span className={cn("mx-auto flex h-9 w-9 items-center justify-center rounded-full", done ? "bg-white/20" : "bg-light-green text-primary")}>
                          {done ? <Check size={18} strokeWidth={3} /> : <Users size={17} />}
                        </span>
                        <p className="mt-1.5 text-xs font-bold leading-snug">{L.milestone(m.friends, m.bonus)}</p>
                        <div className={cn("mx-auto mt-2 h-1.5 overflow-hidden rounded-full", done ? "bg-white/25" : "bg-light-green")}>
                          <div className={cn("h-full rounded-full", done ? "bg-white" : "bg-primary")} style={{ width: `${Math.min(100, (wallet.friends / m.friends) * 100)}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}
          </>
        )}

        {/* How to earn */}
        <section className="card p-5 sm:p-6">
          <h2 className="font-display text-lg font-bold text-forest">{L.how}</h2>
          <ul className="mt-3 space-y-2.5">
            {how.map(({ Icon, text, href }) => {
              const inner = (
                <>
                  <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-light-green text-primary">
                    <Icon size={19} />
                  </span>
                  <span className="text-sm text-ink/75">{text}</span>
                </>
              );
              return (
                <li key={text}>
                  {href ? (
                    <Link href={href} className="flex items-center gap-3 rounded-2xl p-1.5 transition hover:bg-cream">
                      {inner}
                    </Link>
                  ) : (
                    <div className="flex items-center gap-3 p-1.5">{inner}</div>
                  )}
                </li>
              );
            })}
          </ul>
          {!wallet && (
            <Link href="/quest" className="btn-outline mt-4">
              <ScanLine size={16} /> {L.startQuest}
            </Link>
          )}
        </section>

        {/* History */}
        {wallet && wallet.history.length > 0 && (
          <section className="card p-5 sm:p-6">
            <h2 className="flex items-center gap-2 font-display text-lg font-bold text-forest">
              <History size={19} className="text-primary" /> {L.history}
            </h2>
            <ul className="mt-3 divide-y divide-black/5">
              {wallet.history.map((h) => (
                <li key={h.reason + h.ref} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                  <span className="min-w-0">
                    <span className="block font-semibold text-forest">{L.reasons[h.reason] ?? h.reason}</span>
                    <span className="block text-xs text-ink/45">{formatFullDate(h.created_at.slice(0, 10), locale)}</span>
                  </span>
                  <span className={cn("flex-shrink-0 font-display text-lg font-extrabold", h.delta >= 0 ? "text-primary" : "text-red-500")}>
                    {h.delta >= 0 ? `+${h.delta}` : h.delta}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
      <SiteFooter />
      <BottomNav />
    </div>
  );
}
