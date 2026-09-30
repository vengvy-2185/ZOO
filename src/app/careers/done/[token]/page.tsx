import type { Metadata } from "next";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { CheckCircle2, Send } from "lucide-react";
import { Navbar } from "@/components/visitor/Navbar";
import { BottomNav } from "@/components/visitor/BottomNav";
import { SiteFooter } from "@/components/visitor/SiteFooter";
import { getI18n } from "@/lib/i18n/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { HR_STATUS, hrSettings, type HrStatus } from "@/lib/server/hr";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Application received", robots: { index: false } };

/** After applying (and any time later with the same private link): the status, and the Telegram button. */
export default async function Done({ params }: { params: { token: string } }) {
  if (!/^[0-9a-f-]{36}$/.test(params.token)) notFound();
  const { data: a } = await createServiceRoleClient().from("hr_applicants").select("code, full_name, status, tg_chat_id, job:hr_jobs(title, title_km)").eq("token", params.token).maybeSingle();
  if (!a) notFound();
  const { locale } = getI18n();
  const km = locale === "km";
  const s = await hrSettings();
  const tgLink = s.telegram_on && s.bot_username ? `https://t.me/${s.bot_username}?start=${params.token}` : null;
  const qr = tgLink ? await QRCode.toDataURL(tgLink, { margin: 1, width: 360, color: { dark: "#0E3F24", light: "#ffffff" } }) : null;
  const st = HR_STATUS[a.status as HrStatus];
  const job: any = a.job;
  return (
    <div className="pb-20 md:pb-0">
      <Navbar />
      <main className="mx-auto max-w-xl px-4 py-8 md:px-6">
        <div className="rounded-3xl bg-white p-6 text-center shadow-soft ring-1 ring-black/5">
          <CheckCircle2 size={56} className="mx-auto text-primary" />
          <h1 className="mt-3 font-display text-2xl font-extrabold text-forest">{km ? "បានទទួលពាក្យសុំរបស់អ្នកហើយ!" : "We received your application!"}</h1>
          <p className="mt-1 text-ink/60">{a.full_name} · {(km && job?.title_km) || job?.title}</p>
          <p className="mt-4 inline-block rounded-2xl bg-cream px-5 py-3 font-mono text-2xl font-extrabold tracking-wider text-forest">{a.code}</p>
          <p className="mt-2 text-sm text-ink/55">{km ? "ស្ថានភាព" : "Status"}: <b className={`rounded-full px-2 py-0.5 ${st.tone}`}>{km ? st.km : st.en}</b></p>

          {tgLink && (
            <div className="mt-6 rounded-3xl bg-[#E7F4FD] p-5">
              <p className="font-display text-lg font-extrabold text-[#0B6BA8]">{a.tg_chat_id ? (km ? "✓ បានភ្ជាប់ Telegram ហើយ" : "✓ Telegram is linked") : km ? "ភ្ជាប់ Telegram ដើម្បីតាមដានពាក្យ" : "Follow your application on Telegram"}</p>
              <p className="mt-1 text-sm text-[#0B6BA8]/80">{km ? "ស្ថានភាព ការសម្ភាសន៍ លទ្ធផល និងសួរ HR ផ្ទាល់" : "Status, interview, result — and ask HR directly"}</p>
              <a href={tgLink} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#229ED9] px-6 py-3 font-extrabold text-white shadow-lift">
                <Send size={18} /> {km ? "បើក Telegram" : "Open Telegram"}
              </a>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {qr && <img src={qr} alt="Telegram QR" className="mx-auto mt-4 hidden w-40 rounded-xl bg-white p-2 md:block" />}
              <p className="mt-2 hidden text-xs text-ink/50 md:block">{km ? "ស្កេនដោយទូរស័ព្ទ" : "Scan with your phone"}</p>
            </div>
          )}
          <p className="mt-6 text-xs text-ink/45">{km ? "រក្សាទុក link នៃទំព័រនេះ ដើម្បីមើលស្ថានភាពម្តងទៀត។" : "Keep this page's link to check your status again."}</p>
        </div>
      </main>
      <SiteFooter />
      <BottomNav />
    </div>
  );
}
