import Link from "next/link";
import { MessageCircle, CircleHelp, Clock, MapPin, ArrowRight } from "lucide-react";
import { Navbar } from "@/components/visitor/Navbar";
import { BottomNav } from "@/components/visitor/BottomNav";
import { PageHeader } from "@/components/visitor/PageHeader";
import { SiteFooter } from "@/components/visitor/SiteFooter";
import { ContactForm } from "@/components/visitor/ContactForm";
import { getI18n } from "@/lib/i18n/server";
import { OPENING } from "@/lib/data/events";

export default function ContactPage() {
  const { locale, t } = getI18n();
  const km = locale === "km";
  return (
    <div className="pb-20 md:pb-0">
      <Navbar />
      <PageHeader
        icon={MessageCircle}
        eyebrow={km ? "យើងនៅទីនេះដើម្បីជួយ" : "We are here to help"}
        title={km ? "ទាក់ទងយើង" : "Contact Us"}
        subtitle={km ? "មានសំណួរ បាត់របស់ ឬមានគំនិតល្អ? ផ្ញើសារមកយើង ហើយយើងនឹងឆ្លើយតប។" : "A question, something lost, or a good idea? Send us a message and we will get back to you."}
      />
      <main className="mx-auto grid max-w-5xl grid-cols-1 gap-6 px-4 pb-12 md:px-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <ContactForm />
        <aside className="min-w-0 space-y-3">
          <Link href="/faq" className="flex items-center gap-3 rounded-3xl bg-gradient-to-r from-accent to-leaf p-4 font-bold text-forest shadow-soft">
            <CircleHelp size={24} className="flex-shrink-0" />
            <span className="min-w-0 flex-1 text-sm">{km ? "ចម្លើយរហ័សនៅក្នុងសំណួរញឹកញាប់" : "Quick answers in our FAQ"}</span>
            <ArrowRight size={18} />
          </Link>
          <div className="card space-y-3 p-4 text-sm">
            <p className="flex items-center gap-2 font-semibold text-forest">
              <Clock size={18} className="text-primary" /> {OPENING.open} {km ? "ដល់" : "to"} {OPENING.close}
            </p>
            <p className="flex items-start gap-2 text-ink/70">
              <MapPin size={18} className="mt-0.5 flex-shrink-0 text-primary" /> {t.footer.address}
            </p>
          </div>
        </aside>
      </main>
      <SiteFooter />
      <BottomNav />
    </div>
  );
}
