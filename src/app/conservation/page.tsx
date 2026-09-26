import Link from "next/link";
import Image from "next/image";
import { ShieldAlert, HeartHandshake, Ban, Share2, Ticket, Leaf, PawPrint, ArrowRight } from "lucide-react";
import { Navbar } from "@/components/visitor/Navbar";
import { BottomNav } from "@/components/visitor/BottomNav";
import { PageHeader } from "@/components/visitor/PageHeader";
import { SiteFooter } from "@/components/visitor/SiteFooter";
import { getActiveAnimals } from "@/lib/data/zoo";
import { categoryTheme } from "@/lib/utils/category";
import { getI18n } from "@/lib/i18n/server";
import { IUCN } from "@/lib/data/iucn";

export const revalidate = 600;

export async function generateMetadata() {
  const { locale } = getI18n();
  return { title: locale === "km" ? "ការពារសត្វ" : "Protect Wildlife" };
}


export default async function ConservationPage() {
  const { locale } = getI18n();
  const km = locale === "km";
  const animals = (await getActiveAnimals()) as any[];
  const name = (a: any) => (km && a.khmer_name) || a.name;
  const species = (a: any) => (km && a.species?.khmer_name) || a.species?.common_name || "";

  const groups = IUCN.map((l) => ({ ...l, list: animals.filter((a) => a.species?.conservation_status === l.key) }));
  const total = groups.reduce((n, g) => n + g.list.length, 0) || 1;
  const threatened = groups.filter((g) => ["CR", "EN", "VU"].includes(g.code)).reduce((n, g) => n + g.list.length, 0);
  const pct = Math.round((threatened / total) * 100);
  // donut: one arc per level
  const R = 54;
  const C = 2 * Math.PI * R;
  let offset = 0;
  const arcs = groups.map((g) => {
    const len = (g.list.length / total) * C;
    const arc = { color: g.color, dash: `${len} ${C - len}`, offset: -offset };
    offset += len;
    return arc;
  });

  const help = [
    { Icon: HeartHandshake, href: "/adopt", c: "bg-rose-100 text-rose-600", t: km ? "ឧបត្ថម្ភសត្វមួយ" : "Adopt an animal", d: km ? "ជួយចំណាយលើអាហារ និងការថែទាំ។" : "Help pay for food and care." },
    { Icon: Ban, href: null, c: "bg-amber-100 text-amber-700", t: km ? "កុំទិញផលិតផលពីសត្វព្រៃ" : "Never buy wildlife products", d: km ? "ភ្លុក ស្បែក ឬសត្វព្រៃរស់ ជំរុញការបរបាញ់។" : "Ivory, skins and pet wild animals drive hunting." },
    { Icon: Share2, href: null, c: "bg-sky-100 text-sky-700", t: km ? "ចែករំលែកចំណេះដឹង" : "Tell your friends", d: km ? "អ្នកកាន់តែច្រើនដឹង សត្វកាន់តែមានសុវត្ថិភាព។" : "The more people know, the safer animals are." },
    { Icon: Ticket, href: "/tickets", c: "bg-emerald-100 text-emerald-700", t: km ? "មកលេងសួនសត្វ" : "Visit the zoo", d: km ? "ថ្លៃសំបុត្រជួយគាំទ្រការថែរក្សាសត្វ។" : "Every ticket supports animal care." },
  ];

  return (
    <div className="pb-20 md:pb-0">
      <Navbar />
      <PageHeader
        icon={ShieldAlert}
        eyebrow={km ? "ថ្មី · បញ្ជីក្រហម IUCN" : "New · IUCN Red List"}
        title={km ? "ការពារសត្វជិតផុតពូជ" : "Protect Wildlife"}
        subtitle={km ? "សត្វខ្លះនៅសួនសត្វយើង កម្រណាស់ក្នុងធម្មជាតិ។ ស្គាល់ពួកគេ ហើយរៀនពីរបៀបជួយ។" : "Some of our animals are very rare in the wild. Meet them, and learn how you can help."}
      />

      <main className="mx-auto max-w-6xl space-y-10 px-4 pb-14 md:px-6">
        {/* ── Summary: donut + scale ── */}
        <section className="grid gap-4 md:grid-cols-[18rem_1fr]">
          <div className="flex flex-col items-center justify-center rounded-[2rem] bg-white p-6 shadow-soft ring-1 ring-black/5">
            <div className="relative h-44 w-44">
              <svg viewBox="0 0 128 128" className="h-full w-full -rotate-90">
                <circle cx="64" cy="64" r={R} fill="none" stroke="#F1F5F9" strokeWidth="16" />
                {arcs.map((a, i) => (
                  <circle key={i} cx="64" cy="64" r={R} fill="none" stroke={a.color} strokeWidth="16" strokeDasharray={a.dash} strokeDashoffset={a.offset} />
                ))}
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="font-display text-4xl font-extrabold text-[#D81E05]">{pct}%</span>
                <span className="px-6 text-center text-[11px] font-bold leading-tight text-ink/50">{km ? "ស្ថិតក្នុងគ្រោះថ្នាក់" : "are threatened"}</span>
              </div>
            </div>
            <p className="mt-3 text-center text-sm font-semibold text-ink/60">
              {km ? `សត្វ ${threatened} ក្នុងចំណោម ${total} ក្បាល ជាប្រភេទងាយរងគ្រោះ ឬជិតផុតពូជ។` : `${threatened} of our ${total} animals belong to a threatened species.`}
            </p>
          </div>

          <div className="rounded-[2rem] bg-white p-5 shadow-soft ring-1 ring-black/5 md:p-6">
            <p className="mb-3 text-xs font-extrabold uppercase tracking-[0.18em] text-ink/40">{km ? "កម្រិតហានិភ័យ" : "Risk scale"}</p>
            <div className="flex h-4 overflow-hidden rounded-full">
              {[...groups].reverse().map((g) => (
                <div key={g.code} className="gwz-grow" style={{ width: `${(g.list.length / total) * 100}%`, background: g.color }} />
              ))}
            </div>
            <div className="mt-2 flex justify-between text-[11px] font-bold text-ink/40">
              <span>{km ? "មានសុវត្ថិភាព" : "Safe"}</span>
              <span>{km ? "គ្រោះថ្នាក់ខ្លាំង" : "Most at risk"}</span>
            </div>
            <div className="mt-5 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {groups.map((g) => (
                <a key={g.code} href={`#${g.code}`} className="flex items-center gap-3 rounded-2xl p-2 ring-1 ring-black/5 transition hover:bg-slate-50">
                  <span className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl font-display text-sm font-extrabold ${g.text}`} style={{ background: g.color }}>{g.code}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-extrabold text-forest">{km ? g.km : g.en}</span>
                    <span className="block text-xs font-semibold text-ink/45">{km ? `${g.list.length} ក្បាល` : `${g.list.length} animals`}</span>
                  </span>
                </a>
              ))}
            </div>
          </div>
        </section>

        {/* ── Each level with its animals ── */}
        {groups
          .filter((g) => g.list.length)
          .map((g) => (
            <section key={g.code} id={g.code} className="scroll-mt-40">
              <div className="mb-4 flex flex-wrap items-center gap-3">
                <span className={`rounded-xl px-3 py-1.5 font-display text-sm font-extrabold shadow-sm ${g.text}`} style={{ background: g.color }}>{g.code}</span>
                <h2 className="font-display text-xl font-extrabold text-forest md:text-2xl">{km ? g.km : g.en}</h2>
                <span className="text-sm font-semibold text-ink/50">— {km ? g.kmNote : g.enNote}</span>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                {g.list.map((a) => (
                  <Link key={a.id} href={`/animals/${a.animal_code}`} className="group overflow-hidden rounded-3xl bg-white shadow-soft ring-1 ring-black/5 transition hover:-translate-y-1 hover:shadow-lift">
                    <div className="relative aspect-[4/3]" style={{ background: categoryTheme(a.category?.slug).gradient }}>
                      {a.main_image_url ? (
                        <Image src={a.main_image_url} alt="" fill sizes="(min-width:1024px) 20vw, (min-width:640px) 33vw, 50vw" className="object-cover transition duration-500 group-hover:scale-105" />
                      ) : (
                        <PawPrint className="absolute inset-0 m-auto text-white/70" size={36} />
                      )}
                      <span className="absolute inset-x-0 bottom-0 h-1.5" style={{ background: g.color }} />
                    </div>
                    <div className="p-3">
                      <p className="truncate font-display font-extrabold text-forest">{name(a)}</p>
                      <p className="truncate text-xs font-semibold text-ink/50">{species(a)}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          ))}

        {/* ── How to help ── */}
        <section className="overflow-hidden rounded-[2rem] bg-gradient-to-br from-forest to-primary p-6 text-white shadow-lift md:p-8">
          <h2 className="flex items-center gap-2 font-display text-2xl font-extrabold">
            <Leaf className="text-leaf" /> {km ? "អ្នកអាចជួយបាន!" : "You can help!"}
          </h2>
          <p className="mt-1 text-white/75">{km ? "រឿងតូចៗដែលអ្នករាល់គ្នាធ្វើបាន ដើម្បីការពារសត្វព្រៃ។" : "Small things everyone can do to keep wild animals safe."}</p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {help.map((h) => {
              const body = (
                <>
                  <span className={`flex h-11 w-11 items-center justify-center rounded-2xl ${h.c}`}><h.Icon size={21} /></span>
                  <p className="mt-3 font-display font-extrabold text-forest">{h.t}</p>
                  <p className="mt-1 text-sm text-ink/60">{h.d}</p>
                  {h.href && (
                    <span className="mt-2 inline-flex items-center gap-1 text-sm font-extrabold text-primary">
                      {km ? "ចូលមើល" : "Go"} <ArrowRight size={14} />
                    </span>
                  )}
                </>
              );
              return h.href ? (
                <Link key={h.t} href={h.href} className="rounded-3xl bg-white p-4 transition hover:-translate-y-1 hover:shadow-lift">{body}</Link>
              ) : (
                <div key={h.t} className="rounded-3xl bg-white p-4">{body}</div>
              );
            })}
          </div>
        </section>
      </main>
      <SiteFooter />
      <BottomNav />
    </div>
  );
}
