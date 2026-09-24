import { ShieldCheck, ShieldX, ShieldAlert, Clock } from "lucide-react";
import { Navbar } from "@/components/visitor/Navbar";
import { BottomNav } from "@/components/visitor/BottomNav";
import { LogoMark } from "@/components/visitor/Logo";
import { getCardByToken } from "@/lib/server/members";
import { CARD_STYLE, memberNo } from "@/lib/members";
import { getI18n } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false } };

/** Big, sharp version of the owner's photo (Google photos default to 96px). */
const sharpPhoto = (url: string | null) => (url && /^https:\/\//.test(url) ? `/api/avatar?u=${encodeURIComponent(url)}` : url);

/** What the QR on a printed ID card opens: the real card from our records, or "not valid". */
export default async function VerifyCardPage({ params }: { params: { token: string } }) {
  const { locale } = getI18n();
  const km = locale === "km";
  const m = await getCardByToken(params.token);
  const valid = !!m && !!m.card;
  const s = m?.card ? CARD_STYLE[m.card] : null;
  const now = new Intl.DateTimeFormat(km ? "km-KH" : "en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit", day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Phnom_Penh", numberingSystem: "latn" }).format(new Date());

  return (
    <div className="min-h-screen bg-gradient-to-b from-light-green to-background pb-24 md:pb-10">
      <Navbar />
      <main className="mx-auto max-w-md px-4 py-8">
        {valid && m && s ? (
          <div className="overflow-hidden rounded-[2rem] bg-white shadow-lift animate-[gwzDrop_.45s_ease]">
            {/* card-coloured header */}
            <div className="relative overflow-hidden px-6 pb-20 pt-6 text-center text-white" style={{ background: `linear-gradient(135deg, ${s.from}, ${s.to})` }}>
              <svg viewBox="0 0 200 120" className="pointer-events-none absolute inset-0 h-full w-full opacity-15" aria-hidden preserveAspectRatio="none">
                <ellipse cx="170" cy="20" rx="40" ry="22" fill="#fff" transform="rotate(-30 170 20)" />
                <ellipse cx="20" cy="90" rx="34" ry="18" fill="#fff" transform="rotate(40 20 90)" />
              </svg>
              <div className="relative flex items-center justify-center gap-2">
                <span className="rounded-full bg-white p-1">
                  <LogoMark className="h-8 w-8" />
                </span>
                <span className="font-display text-lg font-extrabold tracking-wide">GREEN WILD ZOO</span>
              </div>
              <span className="relative mt-4 inline-flex items-center gap-2 rounded-full bg-emerald-500 px-4 py-2 font-display text-lg font-extrabold shadow-lift ring-4 ring-white/40">
                <span className="relative flex h-7 w-7 items-center justify-center">
                  <span className="absolute inset-0 animate-ping rounded-full bg-white/50" />
                  <ShieldCheck size={24} className="relative" />
                </span>
                {km ? "កាតពិតប្រាកដ" : "Genuine card"}
              </span>
              <p className="relative mt-2 text-sm text-white/85">{km ? "កាតនេះមាននៅក្នុងប្រព័ន្ធរបស់សួនសត្វ" : "This card is in the zoo's own system"}</p>
            </div>

            {/* photo overlapping the header */}
            <div className="relative -mt-16 flex justify-center">
              <div className="h-36 w-36 overflow-hidden rounded-[32px] bg-white p-1.5 shadow-lift">
                <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-[26px]" style={{ background: `linear-gradient(135deg, ${s.to}, ${s.from})` }}>
                  {m.avatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={sharpPhoto(m.avatar)!} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span className="font-display text-6xl font-extrabold text-white">{[...m.name][0]?.toUpperCase()}</span>
                  )}
                </div>
              </div>
            </div>

            <div className="px-6 pb-6 pt-4 text-center">
              <p className="font-display text-3xl font-extrabold leading-tight text-forest">{m.name}</p>
              <span className="mt-2 inline-flex flex-col rounded-2xl px-5 py-1.5 text-white" style={{ background: `linear-gradient(135deg, ${s.from}, ${s.to})` }}>
                <span className="text-xs font-extrabold uppercase tracking-[0.14em]">{s.en}</span>
                <span className="font-khmer text-xs" style={{ color: s.ink }}>
                  {s.km}
                </span>
              </span>
              <dl className="mt-5 grid grid-cols-2 gap-3 rounded-2xl bg-cream p-4 text-left text-sm">
                <div>
                  <dt className="text-xs text-ink/50">ID No.</dt>
                  <dd className="font-mono font-bold text-forest">{memberNo(m.id)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-ink/50">{km ? "ជាសមាជិកតាំងពី" : "Member since"}</dt>
                  <dd className="font-mono font-bold text-forest">{new Date(m.since).toISOString().slice(0, 7).replace("-", ".")}</dd>
                </div>
              </dl>
              <p className="mt-4 flex items-center justify-center gap-1.5 rounded-full bg-light-green px-4 py-2 text-xs font-semibold text-primary">
                <Clock size={14} /> {km ? "ពិនិត្យនៅ" : "Checked"} {now}
              </p>
              <p className="mt-3 text-xs text-ink/50">{km ? "សូមប្រៀបធៀបរូប និងឈ្មោះនេះជាមួយកាតដែលអ្នកកំពុងមើល។" : "Compare this photo and name with the card in front of you."}</p>
            </div>
          </div>
        ) : m ? (
          <Result icon={ShieldAlert} tone="from-amber-500 to-orange-600" title={km ? "កាតនេះលែងប្រើបានហើយ" : "This card is no longer valid"} text={km ? "កាតនេះមិនត្រូវបានប្រើទៀតទេ។ សូមសួរបុគ្គលិកសួនសត្វ។" : "This card is not in use any more. Please ask a member of staff."} now={now} />
        ) : (
          <Result icon={ShieldX} tone="from-red-500 to-rose-700" title={km ? "មិនមែនជាកាតត្រឹមត្រូវ" : "Not a valid card"} text={km ? "រកមិនឃើញកាតនេះនៅក្នុងប្រព័ន្ធទេ។ វាអាចជាកាតចាស់ដែលត្រូវបានជំនួស ឬកាតក្លែងក្លាយ។" : "This card is not in our system. It may be an old card that was replaced, or a fake."} now={now} />
        )}
      </main>
      <BottomNav />
    </div>
  );
}

function Result({ icon: Icon, tone, title, text, now }: { icon: any; tone: string; title: string; text: string; now: string }) {
  return (
    <div className="overflow-hidden rounded-[2rem] bg-white text-center shadow-lift animate-[gwzDrop_.45s_ease]">
      <div className={`bg-gradient-to-br ${tone} px-5 py-10 text-white`}>
        <Icon size={72} className="mx-auto" />
        <p className="mt-3 font-display text-2xl font-extrabold">{title}</p>
      </div>
      <p className="px-6 pt-5 text-ink/70">{text}</p>
      <p className="mx-6 my-5 flex items-center justify-center gap-1.5 rounded-full bg-cream px-4 py-2 text-xs font-semibold text-ink/55">
        <Clock size={14} /> {now}
      </p>
    </div>
  );
}
