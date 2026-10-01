import type { Metadata } from "next";
import Link from "next/link";
import { Briefcase, MapPin, Clock, ArrowRight, HeartHandshake } from "lucide-react";
import { Navbar } from "@/components/visitor/Navbar";
import { BottomNav } from "@/components/visitor/BottomNav";
import { PageHeader } from "@/components/visitor/PageHeader";
import { SiteFooter } from "@/components/visitor/SiteFooter";
import { getI18n } from "@/lib/i18n/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { hrSettings, pickedByJob } from "@/lib/server/hr";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Jobs at the zoo", description: "Work with animals and people at Green Wild Zoo. See open jobs and apply online with your CV." };

import { JOB_TYPE as TYPE } from "@/lib/careers";

/** Open jobs: anyone can apply online (no account needed). */
export default async function Careers() {
  const { locale } = getI18n();
  const km = locale === "km";
  const s = await hrSettings();
  const { data: jobs } = await createServiceRoleClient().from("hr_jobs").select("*").eq("open", true).order("sort").order("created_at", { ascending: false });
  const picked = await pickedByJob();
  return (
    <div className="pb-20 md:pb-0">
      <Navbar />
      <PageHeader
        icon={Briefcase}
        eyebrow={km ? "ធ្វើការជាមួយយើង" : "Work with us"}
        title={km ? "ការងារនៅសួនសត្វ" : "Jobs at the zoo"}
        subtitle={km ? "ចូលរួមជាមួយក្រុម Green Wild Zoo — ថែទាំសត្វ ស្វាគមន៍ភ្ញៀវ និងការពារធម្មជាតិ។ ដាក់ពាក្យតាមអនឡាញ ជាមួយ CV របស់អ្នក។" : "Join the Green Wild Zoo team — care for animals, welcome visitors and protect nature. Apply online with your CV."}
      />
      <main className="mx-auto max-w-4xl space-y-4 px-4 pb-12 md:px-6">
        {!s.accept || !jobs?.length ? (
          <div className="rounded-3xl bg-white p-8 text-center shadow-soft ring-1 ring-black/5">
            <HeartHandshake size={40} className="mx-auto text-primary/40" />
            <p className="mt-3 font-display text-xl font-extrabold text-forest">{km ? "មិនទាន់មានការងារទំនេរពេលនេះទេ" : "No open jobs right now"}</p>
            <p className="mt-1 text-sm text-ink/55">{km ? "សូមត្រឡប់មកមើលម្តងទៀតឆាប់ៗ។" : "Please check again soon."}</p>
          </div>
        ) : (
          jobs.map((j: any) => (
            <Link key={j.id} href={`/careers/${j.slug}`} className="group block rounded-3xl bg-white p-5 shadow-soft ring-1 ring-black/5 md:p-6">
              <div className="flex flex-wrap items-start gap-3">
                <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-light-green text-primary"><Briefcase size={22} /></span>
                <div className="min-w-0 flex-1">
                  <h2 className="font-display text-xl font-extrabold text-forest">{(km && j.title_km) || j.title}</h2>
                  <p className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink/55">
                    {j.department && <span className="inline-flex items-center gap-1"><MapPin size={14} /> {j.department}</span>}
                    <span className="inline-flex items-center gap-1"><Clock size={14} /> {TYPE[j.job_type]?.[km ? 1 : 0] ?? j.job_type}</span>
                    {j.salary && <span className="font-bold text-primary">{j.salary}</span>}
                    {j.openings && <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-extrabold text-amber-800">{km ? `ត្រូវការ ${Math.max(1, j.openings - (picked.get(j.id) ?? 0))} នាក់ទៀត` : `${Math.max(1, j.openings - (picked.get(j.id) ?? 0))} more needed`}</span>}
                  </p>
                  <p className="mt-2 line-clamp-2 text-sm text-ink/70">{(km && j.description_km) || j.description}</p>
                </div>
                <span className="inline-flex items-center gap-1.5 self-center rounded-full bg-primary px-4 py-2 text-sm font-extrabold text-white transition group-hover:gap-2.5">
                  {km ? "ដាក់ពាក្យ" : "Apply"} <ArrowRight size={16} />
                </span>
              </div>
            </Link>
          ))
        )}
      </main>
      <SiteFooter />
      <BottomNav />
    </div>
  );
}
