import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, CheckCircle2, PackageCheck, RefreshCw, History } from "lucide-react";
import { getCachedRole } from "@/lib/auth/role";
import { getVerifiedUserId } from "@/lib/auth/session";
import { getMembers, ensureCard } from "@/lib/server/members";
import { getSiteUrl } from "@/lib/server/site-url";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { memberNo, CARD_STYLE } from "@/lib/members";
import { IdCard } from "@/components/IdCard";
import { getI18n } from "@/lib/i18n/server";
import { markPrinted, handOver, makeReplacement } from "./actions";
import { ConfirmSubmit, PendingSubmit } from "./ConfirmSubmit";

export const dynamic = "force-dynamic";

const fmt = (iso: string, km: boolean) =>
  new Intl.DateTimeFormat(km ? "km-KH" : "en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Phnom_Penh", numberingSystem: "latn" }).format(new Date(iso));

export default async function AdminCardPage({ params }: { params: { id: string } }) {
  const me = getVerifiedUserId();
  if (!me || (await getCachedRole(me)).role !== "admin") redirect("/admin/login");
  const { locale } = getI18n();
  const km = locale === "km";
  const [found] = await getMembers(params.id);
  if (!found || !found.card) notFound();
  const m = await ensureCard(found);
  const card = m.card!;
  const site = getSiteUrl();
  const { data: issues } = await createServiceRoleClient().from("member_card_issues").select("issued_at, card_type").eq("user_id", m.id).order("issued_at", { ascending: false }).limit(10);

  const L = km
    ? { back: "ត្រឡប់ទៅសមាជិក", title: "កាតសម្គាល់", visits: "ដងមកលេង", save: "រក្សាទុកក្នុងទូរស័ព្ទ", print: "បោះពុម្ព", printed: "សម្គាល់ថាបានបោះពុម្ព", handOver: "ប្រគល់កាតឲ្យម្ចាស់", handAgain: "ប្រគល់ម្តងទៀត (កាតជំនួស)", replace: "ធ្វើកាតជំនួស (កាតចាស់លែងប្រើបាន)", replaceQ: "ធ្វើកាតជំនួស? QR លើកាតចាស់នឹងលែងដំណើរការ ហើយត្រូវបោះពុម្ពកាតថ្មី។", count: (n: number) => `បានប្រគល់ ${n} ដង`, none: "មិនទាន់បានប្រគល់", history: "ប្រវត្តិការប្រគល់", status: { ready: "មិនទាន់បោះពុម្ព", printed: "បានបោះពុម្ព រង់ចាំប្រគល់", collected: "បានប្រគល់ហើយ" } as Record<string, string>, tip: "ទំហំកាតស្តង់ដារ 54 x 86 មម។ ពេលបោះពុម្ព ជ្រើស Scale 100% ហើយចោះរន្ធនៅខាងលើសម្រាប់ខ្សែពាក់ក។ QR បញ្ជាក់ថាកាតនេះមាននៅក្នុងប្រព័ន្ធ។" }
    : { back: "Back to members", title: "ID card", visits: "visits", save: "Save to phone", print: "Print", printed: "Mark as printed", handOver: "Hand card to owner", handAgain: "Hand over again (replacement)", replace: "Make a replacement (old card stops working)", replaceQ: "Make a replacement? The QR on the old card will stop working and a new card must be printed.", count: (n: number) => `Handed over ${n} ${n === 1 ? "time" : "times"}`, none: "Not handed over yet", history: "Hand-over history", status: { ready: "Not printed yet", printed: "Printed, waiting to be handed over", collected: "Handed over" } as Record<string, string>, tip: "Standard card size, 54 x 86 mm. Print at 100% scale, then punch the slot at the top for the lanyard. The QR proves the card is in our system." };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="mx-auto max-w-4xl">
        <Link href="/admin/members" className="inline-flex items-center gap-1.5 text-sm font-bold text-primary">
          <ArrowLeft size={16} /> {L.back}
        </Link>
        <h1 className="mt-3 font-display text-2xl font-extrabold text-forest">
          {L.title}: {m.name}
        </h1>
        <p className="text-sm text-ink/60">
          {km ? CARD_STYLE[card].km : CARD_STYLE[card].en} | {m.visits} {L.visits} | ${m.spent.toFixed(2)}
        </p>

        <div className="mt-6 grid grid-cols-1 gap-8 md:grid-cols-[auto_minmax(0,1fr)]">
          <IdCard
            data={{ type: card, name: m.name, photo: m.avatar, memberNo: memberNo(m.id), since: new Date(m.since).toISOString().slice(0, 7).replace("-", "."), site, verifyUrl: m.verifyToken ? `${site}/verify/${m.verifyToken}` : null }}
            fileName={`card-${memberNo(m.id)}`}
            labels={{ save: L.save, print: L.print }}
            width={300}
          />

          <div className="min-w-0 space-y-4">
            <div className="card p-5">
              <p className="text-sm font-semibold text-ink/55">{L.status[m.cardStatus ?? "ready"]}</p>
              <p className="mt-1 flex items-center gap-2 font-display text-2xl font-extrabold text-forest">
                <PackageCheck size={26} className="text-primary" /> {m.issueCount ? L.count(m.issueCount) : L.none}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <form action={markPrinted.bind(null, m.id)}>
                  <button className="btn-outline bg-white" disabled={m.cardStatus === "printed"}>
                    <CheckCircle2 size={16} /> {L.printed}
                  </button>
                </form>
                <form action={handOver.bind(null, m.id)}>
                  <PendingSubmit className="btn-primary hover:translate-y-0 disabled:opacity-60">
                    <PackageCheck size={16} /> {m.issueCount ? L.handAgain : L.handOver}
                  </PendingSubmit>
                </form>
              </div>
              <form action={makeReplacement.bind(null, m.id)} className="mt-3">
                <ConfirmSubmit question={L.replaceQ} className="inline-flex items-center gap-1.5 text-sm font-bold text-red-600 hover:underline">
                  <RefreshCw size={15} /> {L.replace}
                </ConfirmSubmit>
              </form>
            </div>

            {!!issues?.length && (
              <div className="card p-5">
                <p className="flex items-center gap-2 font-display text-lg font-bold text-forest">
                  <History size={19} className="text-primary" /> {L.history}
                </p>
                <ol className="mt-2 divide-y divide-black/5 text-sm">
                  {issues.map((i, n) => (
                    <li key={i.issued_at} className="flex justify-between py-2">
                      <span className="font-semibold text-forest">#{issues.length - n}</span>
                      <span className="text-ink/60">{fmt(i.issued_at, km)}</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}
            <p className="text-xs text-ink/50">{L.tip}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
