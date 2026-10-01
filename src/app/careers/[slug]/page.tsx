import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Briefcase, Clock, MapPin } from "lucide-react";
import { Navbar } from "@/components/visitor/Navbar";
import { BottomNav } from "@/components/visitor/BottomNav";
import { SiteFooter } from "@/components/visitor/SiteFooter";
import { getI18n } from "@/lib/i18n/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { hrSettings } from "@/lib/server/hr";
import { ApplyForm } from "@/components/careers/ApplyForm";
import { JOB_TYPE } from "@/lib/careers";

export const dynamic = "force-dynamic";

async function load(slug: string) {
  if (!/^[a-z0-9-]{2,60}$/.test(slug)) return null;
  const { data } = await createServiceRoleClient().from("hr_jobs").select("*").eq("slug", slug).maybeSingle();
  return data;
}
export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const j = await load(params.slug);
  return j ? { title: `${j.title} · Jobs`, description: j.description?.slice(0, 160) } : { title: "Jobs" };
}

/** One job: what it is, and the application form (with the CV). */
export default async function JobPage({ params }: { params: { slug: string } }) {
  const j = await load(params.slug);
  if (!j) notFound();
  const { locale } = getI18n();
  const km = locale === "km";
  const s = await hrSettings();
  const open = j.open && s.accept;
  const { data: jobs } = await createServiceRoleClient().from("hr_jobs").select("id, title, title_km, department, salary, job_type").eq("open", true).order("sort");
  const block = (title: string, text?: string | null) =>
    text ? (
      <section className="mt-5">
        <h2 className="font-display text-lg font-extrabold text-forest">{title}</h2>
        <p className="mt-1 whitespace-pre-line text-ink/75">{text}</p>
      </section>
    ) : null;
  return (
    <div className="pb-20 md:pb-0">
      <Navbar />
      <main className="mx-auto max-w-3xl px-4 py-6 md:px-6">
        <Link href="/careers" className="inline-flex items-center gap-1 text-sm font-bold text-primary"><ChevronLeft size={16} /> {km ? "ការងារទាំងអស់" : "All jobs"}</Link>
        <article className="mt-3 rounded-3xl bg-white p-6 shadow-soft ring-1 ring-black/5">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-light-green text-primary"><Briefcase size={22} /></span>
          <h1 className="mt-3 font-display text-3xl font-extrabold text-forest">{(km && j.title_km) || j.title}</h1>
          <p className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink/55">
            {j.department && <span className="inline-flex items-center gap-1"><MapPin size={14} /> {j.department}</span>}
            <span className="inline-flex items-center gap-1"><Clock size={14} /> {JOB_TYPE[j.job_type]?.[km ? 1 : 0] ?? j.job_type}</span>
            {j.salary && <span className="font-bold text-primary">{j.salary}</span>}
          </p>
          {block(km ? "ការងារ" : "The job", (km && j.description_km) || j.description)}
          {block(km ? "លក្ខខណ្ឌ" : "What we look for", (km && j.requirements_km) || j.requirements)}
        </article>
        <section className="mt-5 rounded-3xl bg-white p-6 shadow-soft ring-1 ring-black/5" id="apply">
          <h2 className="font-display text-2xl font-extrabold text-forest">{km ? "ដាក់ពាក្យ" : "Apply"}</h2>
          {open ? <ApplyForm jobs={(jobs ?? []) as any} jobId={j.id} km={km} /> : <p className="mt-2 text-ink/60">{km ? "ការងារនេះបិទទទួលពាក្យហើយ។" : "This job is closed."}</p>}
        </section>
      </main>
      <SiteFooter />
      <BottomNav />
    </div>
  );
}
