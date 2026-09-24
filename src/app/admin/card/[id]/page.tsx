import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, CheckCircle2, PackageCheck } from "lucide-react";
import { getCachedRole } from "@/lib/auth/role";
import { getVerifiedUserId } from "@/lib/auth/session";
import { getMembers } from "@/lib/server/members";
import { getSiteUrl } from "@/lib/server/site-url";
import { memberNo, CARD_STYLE } from "@/lib/members";
import { IdBadge } from "@/components/IdBadge";
import { getI18n } from "@/lib/i18n/server";
import { PrintButton } from "./PrintButton";
import { setCardStatus } from "./actions";

export const dynamic = "force-dynamic";

// Outside the admin layout on purpose: the printout is only the card.
export default async function AdminCardPage({ params }: { params: { id: string } }) {
  const me = getVerifiedUserId();
  if (!me || (await getCachedRole(me)).role !== "admin") redirect("/admin/login");
  const { locale } = getI18n();
  const km = locale === "km";
  const [m] = await getMembers(params.id);
  if (!m || !m.card) notFound();

  const since = new Date(m.since).toISOString().slice(0, 7).replace("-", ".");
  const markPrinted = setCardStatus.bind(null, m.id, "printed");
  const markCollected = setCardStatus.bind(null, m.id, "collected");

  return (
    <div className="min-h-screen bg-background p-4 md:p-8 print:bg-white print:p-0">
      <style>{`@media print { @page { size: 54mm 85.6mm; margin: 0 } .id-card { zoom: 0.729; border-radius: 0 !important; box-shadow: none !important } }`}</style>
      <div className="mx-auto max-w-3xl print:hidden">
        <Link href="/admin/members" className="inline-flex items-center gap-1.5 text-sm font-bold text-primary">
          <ArrowLeft size={16} /> {km ? "ត្រឡប់ទៅសមាជិក" : "Back to members"}
        </Link>
        <h1 className="mt-3 font-display text-2xl font-extrabold text-forest">{km ? "បោះពុម្ពកាតសម្គាល់" : "Print ID card"}</h1>
        <p className="text-sm text-ink/60">
          {km ? CARD_STYLE[m.card].km : CARD_STYLE[m.card].en} | {m.visits} {km ? "ដងមកលេង" : "visits"} | ${m.spent.toFixed(2)}
        </p>
      </div>

      <div className="my-6 flex justify-center print:my-0 print:block">
        <IdBadge type={m.card} name={m.name} photo={m.avatar} memberNo={memberNo(m.id)} since={since} site={getSiteUrl()} />
      </div>

      <div className="mx-auto flex max-w-3xl flex-wrap justify-center gap-2 print:hidden">
        <PrintButton label={km ? "បោះពុម្ព" : "Print"} />
        <form action={markPrinted}>
          <button className="btn-outline bg-white" disabled={m.cardStatus === "printed" || m.cardStatus === "collected"}>
            <CheckCircle2 size={16} /> {m.cardStatus ? (km ? "បានបោះពុម្ពរួច" : "Printed") : km ? "សម្គាល់ថាបានបោះពុម្ព" : "Mark as printed"}
          </button>
        </form>
        <form action={markCollected}>
          <button className="btn-outline bg-white" disabled={m.cardStatus === "collected"}>
            <PackageCheck size={16} /> {m.cardStatus === "collected" ? (km ? "បានប្រគល់ហើយ" : "Handed over") : km ? "សម្គាល់ថាបានប្រគល់" : "Mark as handed over"}
          </button>
        </form>
      </div>
      <p className="mx-auto mt-4 max-w-md text-center text-xs text-ink/50 print:hidden">
        {km ? "ទំហំកាតស្តង់ដារ 54 x 86 មម។ ជ្រើស Scale 100% ពេលបោះពុម្ព ហើយចោះរន្ធនៅខាងលើសម្រាប់ខ្សែពាក់ក។" : "Standard card size, 54 x 86 mm. Print at 100% scale, then punch the slot at the top for the lanyard."}
      </p>
    </div>
  );
}
