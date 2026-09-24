import { ShieldCheck, ShieldX, ShieldAlert } from "lucide-react";
import { Navbar } from "@/components/visitor/Navbar";
import { BottomNav } from "@/components/visitor/BottomNav";
import { getCardByToken } from "@/lib/server/members";
import { CARD_STYLE, memberNo } from "@/lib/members";
import { getI18n } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false } };

/** What the QR on a printed ID card opens: the real card from our records, or "not valid". */
export default async function VerifyCardPage({ params }: { params: { token: string } }) {
  const { locale } = getI18n();
  const km = locale === "km";
  const m = await getCardByToken(params.token);
  // A card whose owner lost the right to it (e.g. a staff member who left) is no longer valid.
  const valid = !!m && !!m.card;
  const s = m?.card ? CARD_STYLE[m.card] : null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-light-green to-background pb-24 md:pb-10">
      <Navbar />
      <main className="mx-auto max-w-md px-4 py-10">
        {valid && m && s ? (
          <div className="overflow-hidden rounded-[2rem] bg-white shadow-lift">
            <div className="flex items-center gap-3 bg-emerald-600 px-5 py-4 text-white">
              <ShieldCheck size={34} className="flex-shrink-0" />
              <div>
                <p className="font-display text-xl font-extrabold leading-tight">{km ? "កាតពិតប្រាកដ" : "Genuine card"}</p>
                <p className="text-sm text-white/85">{km ? "កាតនេះមាននៅក្នុងប្រព័ន្ធរបស់ Green Wild Zoo។" : "This card is in the Green Wild Zoo system."}</p>
              </div>
            </div>
            <div className="p-6 text-center">
              <div className="mx-auto h-32 w-32 overflow-hidden rounded-[28px] ring-4" style={{ background: `linear-gradient(135deg, ${s.to}, ${s.from})`, ["--tw-ring-color" as any]: s.to }}>
                {m.avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={m.avatar} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <span className="flex h-full w-full items-center justify-center font-display text-5xl font-extrabold text-white">{[...m.name][0]?.toUpperCase()}</span>
                )}
              </div>
              <p className="mt-4 font-display text-2xl font-extrabold text-forest">{m.name}</p>
              <span className="mt-2 inline-block rounded-full px-4 py-1.5 text-sm font-bold text-white" style={{ background: `linear-gradient(135deg, ${s.from}, ${s.to})` }}>
                {km ? s.km : s.en}
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
              <p className="mt-4 text-xs text-ink/50">{km ? "សូមប្រៀបធៀបរូប និងឈ្មោះនេះជាមួយកាតដែលអ្នកកំពុងមើល។" : "Compare this photo and name with the card in front of you."}</p>
            </div>
          </div>
        ) : m ? (
          <Result icon={ShieldAlert} tone="bg-amber-500" title={km ? "កាតនេះលែងប្រើបានហើយ" : "This card is no longer valid"} text={km ? "កាតនេះមិនត្រូវបានប្រើទៀតទេ។ សូមសួរបុគ្គលិកសួនសត្វ។" : "This card is not in use any more. Please ask a member of staff."} />
        ) : (
          <Result icon={ShieldX} tone="bg-red-600" title={km ? "មិនមែនជាកាតត្រឹមត្រូវ" : "Not a valid card"} text={km ? "រកមិនឃើញកាតនេះនៅក្នុងប្រព័ន្ធទេ។ វាអាចជាកាតចាស់ដែលត្រូវបានជំនួស ឬកាតក្លែងក្លាយ។" : "This card is not in our system. It may be an old card that was replaced, or a fake."} />
        )}
      </main>
      <BottomNav />
    </div>
  );
}

function Result({ icon: Icon, tone, title, text }: { icon: any; tone: string; title: string; text: string }) {
  return (
    <div className="overflow-hidden rounded-[2rem] bg-white text-center shadow-lift">
      <div className={`${tone} px-5 py-8 text-white`}>
        <Icon size={64} className="mx-auto" />
        <p className="mt-3 font-display text-2xl font-extrabold">{title}</p>
      </div>
      <p className="p-6 text-ink/70">{text}</p>
    </div>
  );
}
