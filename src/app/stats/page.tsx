import Link from "next/link";
import Image from "next/image";
import { BarChart3, PawPrint, Dna, Layers, MapPin, Crown, Baby, Home, ShieldAlert, ArrowRight, Cake } from "lucide-react";
import { Navbar } from "@/components/visitor/Navbar";
import { BottomNav } from "@/components/visitor/BottomNav";
import { PageHeader } from "@/components/visitor/PageHeader";
import { SiteFooter } from "@/components/visitor/SiteFooter";
import { CountUp } from "@/components/visitor/CountUp";
import { getActiveAnimals, getCategories, getSpeciesCount, getZonesAndFacilities } from "@/lib/data/zoo";
import { zooToday } from "@/lib/data/gate";
import { IUCN } from "@/lib/data/iucn";
import { categoryTheme } from "@/lib/utils/category";
import { getCategoryIcon } from "@/lib/icons/categoryIcons";
import { getI18n } from "@/lib/i18n/server";

export const revalidate = 600;

export async function generateMetadata() {
  const { locale } = getI18n();
  return { title: locale === "km" ? "សួនសត្វជាលេខ" : "Zoo in Numbers" };
}

export default async function StatsPage() {
  const { locale } = getI18n();
  const km = locale === "km";
  const [animals, categories, speciesCount, { zones }] = (await Promise.all([getActiveAnimals(), getCategories(), getSpeciesCount(), getZonesAndFacilities()])) as [any[], any[], number, { zones: any[] }];
  const today = zooToday();
  const name = (a: any) => (km && a.khmer_name) || a.name;
  const species = (a: any) => (km && a.species?.khmer_name) || a.species?.common_name || "";
  const ageYears = (dob: string) => {
    const [y, m, d] = dob.slice(0, 10).split("-").map(Number);
    const [ty, tm, td] = today.split("-").map(Number);
    return ty - y - (tm < m || (tm === m && td < d) ? 1 : 0);
  };
  const withDob = animals.filter((a) => a.date_of_birth);
  const byDob = [...withDob].sort((a, b) => String(a.date_of_birth).localeCompare(String(b.date_of_birth)));
  const oldest = byDob[0];
  const youngest = byDob[byDob.length - 1];
  const longest = [...animals].filter((a) => a.arrival_date).sort((a, b) => String(a.arrival_date).localeCompare(String(b.arrival_date)))[0];
  const avgAge = withDob.length ? withDob.reduce((n, a) => n + ageYears(a.date_of_birth), 0) / withDob.length : 0;

  const male = animals.filter((a) => a.gender === "male").length;
  const female = animals.filter((a) => a.gender === "female").length;
  const other = animals.length - male - female;

  const perCat = categories
    .map((c) => ({ c, n: animals.filter((a) => a.category_id === c.id).length }))
    .filter((x) => x.n)
    .sort((a, b) => b.n - a.n);
  const catMax = Math.max(1, ...perCat.map((x) => x.n));

  // birth years
  const yearsList = withDob.map((a) => Number(String(a.date_of_birth).slice(0, 4)));
  const y0 = Math.min(...yearsList);
  const y1 = Math.max(...yearsList);
  const births = yearsList.length ? Array.from({ length: y1 - y0 + 1 }, (_, i) => ({ y: y0 + i, n: yearsList.filter((y) => y === y0 + i).length })) : [];
  const birthMax = Math.max(1, ...births.map((b) => b.n));

  const risk = IUCN.map((l) => ({ ...l, n: animals.filter((a) => a.species?.conservation_status === l.key).length }));
  const riskTotal = risk.reduce((n, r) => n + r.n, 0) || 1;

  const big = [
    { Icon: PawPrint, v: animals.length, k: km ? "សត្វសរុប" : "Animals", c: "from-emerald-500 to-primary" },
    { Icon: Dna, v: speciesCount, k: km ? "ប្រភេទសត្វ" : "Species", c: "from-sky-500 to-blue-700" },
    { Icon: Layers, v: perCat.length, k: km ? "ក្រុមសត្វ" : "Animal groups", c: "from-amber-400 to-orange-600" },
    { Icon: MapPin, v: zones.length, k: km ? "តំបន់ក្នុងសួន" : "Zoo zones", c: "from-fuchsia-500 to-purple-700" },
  ];

  const star = (a: any, Icon: any, title: string, line: string, tint: string) =>
    a && (
      <Link href={`/animals/${a.animal_code}`} className="group flex items-center gap-4 rounded-3xl bg-white p-3 shadow-soft ring-1 ring-black/5 transition hover:-translate-y-1 hover:shadow-lift">
        <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-2xl" style={{ background: categoryTheme(a.category?.slug).gradient }}>
          {a.main_image_url && <Image src={a.main_image_url} alt="" fill sizes="80px" className="object-cover transition duration-500 group-hover:scale-105" />}
        </div>
        <div className="min-w-0">
          <p className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-extrabold ${tint}`}>
            <Icon size={12} /> {title}
          </p>
          <p className="mt-1 truncate font-display text-lg font-extrabold text-forest">{name(a)}</p>
          <p className="truncate text-xs font-semibold text-ink/50">
            {species(a)} · {line}
          </p>
        </div>
      </Link>
    );

  return (
    <div className="pb-20 md:pb-0">
      <Navbar />
      <PageHeader
        icon={BarChart3}
        eyebrow={km ? "ថ្មី · ស្គាល់សួនសត្វយើង" : "New · Get to know our zoo"}
        title={km ? "សួនសត្វជាលេខ" : "Zoo in Numbers"}
        subtitle={km ? "តើយើងមានសត្វប៉ុន្មាន? អ្នកណាចាស់ជាងគេ? អ្នកណាក្មេងជាងគេ? ចម្លើយទាំងអស់នៅទីនេះ។" : "How many animals live here? Who is the oldest? Who is the youngest? All the answers are here."}
      />

      <main className="mx-auto max-w-6xl space-y-8 px-4 pb-14 md:px-6">
        {/* ── Big numbers ── */}
        <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {big.map((b) => (
            <div key={b.k} className={`relative overflow-hidden rounded-3xl bg-gradient-to-br p-4 text-white shadow-lift md:p-5 ${b.c}`}>
              <div className="absolute -right-5 -top-5 h-20 w-20 rounded-full bg-white/15" />
              <b.Icon size={22} className="relative opacity-90" />
              <p className="relative mt-3 font-display text-4xl font-extrabold leading-none md:text-5xl">
                <CountUp value={b.v} />
              </p>
              <p className="relative mt-1 text-sm font-bold text-white/85">{b.k}</p>
            </div>
          ))}
        </section>

        {/* ── Record holders ── */}
        <section className="grid gap-3 md:grid-cols-3">
          {star(oldest, Crown, km ? "ចាស់ជាងគេ" : "Oldest", km ? `${ageYears(oldest?.date_of_birth ?? today)} ឆ្នាំ` : `${ageYears(oldest?.date_of_birth ?? today)} years`, "bg-amber-100 text-amber-800")}
          {star(youngest, Baby, km ? "ក្មេងជាងគេ" : "Youngest", km ? `${ageYears(youngest?.date_of_birth ?? today)} ឆ្នាំ` : `${ageYears(youngest?.date_of_birth ?? today)} years`, "bg-sky-100 text-sky-800")}
          {star(longest, Home, km ? "នៅយូរជាងគេ" : "Here the longest", km ? `តាំងពីឆ្នាំ ${String(longest?.arrival_date).slice(0, 4)}` : `since ${String(longest?.arrival_date).slice(0, 4)}`, "bg-emerald-100 text-emerald-800")}
        </section>

        <div className="grid gap-4 lg:grid-cols-2">
          {/* ── Per group ── */}
          <section className="rounded-[2rem] bg-white p-5 shadow-soft ring-1 ring-black/5 md:p-6">
            <h2 className="mb-4 font-display text-lg font-extrabold text-forest">{km ? "សត្វតាមក្រុម" : "Animals by group"}</h2>
            <ul className="space-y-3">
              {perCat.map(({ c, n }, i) => {
                const th = categoryTheme(c.slug);
                const Icon = getCategoryIcon(c.slug);
                return (
                  <li key={c.id} className="flex items-center gap-3">
                    <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl" style={{ background: th.soft, color: th.solid }}>
                      <Icon size={19} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex justify-between text-sm font-bold">
                        <span className="truncate text-forest">{(km && c.khmer_name) || c.name}</span>
                        <span style={{ color: th.solid }}>{n}</span>
                      </div>
                      <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                        <div className="gwz-grow h-full rounded-full" style={{ width: `${(n / catMax) * 100}%`, background: th.solid, animationDelay: `${i * 0.08}s` }} />
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>

          {/* ── Boys & girls + age ── */}
          <section className="rounded-[2rem] bg-white p-5 shadow-soft ring-1 ring-black/5 md:p-6">
            <h2 className="mb-4 font-display text-lg font-extrabold text-forest">{km ? "ឈ្មោល និងញី" : "Boys and girls"}</h2>
            <div className="flex items-end justify-between">
              <div className="text-sky-600">
                <span className="block text-3xl font-black leading-none">♂</span>
                <p className="font-display text-4xl font-extrabold">{male}</p>
                <p className="text-xs font-bold text-ink/50">{km ? "ឈ្មោល" : "Male"}</p>
              </div>
              <div className="text-right text-pink-500">
                <span className="block text-3xl font-black leading-none">♀</span>
                <p className="font-display text-4xl font-extrabold">{female}</p>
                <p className="text-xs font-bold text-ink/50">{km ? "ញី" : "Female"}</p>
              </div>
            </div>
            <div className="mt-3 flex h-4 overflow-hidden rounded-full bg-slate-100">
              <div className="gwz-grow bg-gradient-to-r from-sky-400 to-sky-600" style={{ width: `${(male / (animals.length || 1)) * 100}%` }} />
              <div className="bg-slate-300" style={{ width: `${(other / (animals.length || 1)) * 100}%` }} />
              <div className="bg-gradient-to-r from-pink-400 to-pink-500" style={{ width: `${(female / (animals.length || 1)) * 100}%` }} />
            </div>
            {other > 0 && <p className="mt-2 text-center text-xs font-semibold text-ink/40">{km ? `មិនទាន់ដឹង ${other}` : `${other} not known yet`}</p>}

            <div className="mt-6 flex items-center gap-4 rounded-2xl bg-amber-50 p-4">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-400 text-white"><Cake size={22} /></span>
              <div>
                <p className="font-display text-2xl font-extrabold text-amber-700">{km ? `${avgAge.toFixed(1)} ឆ្នាំ` : `${avgAge.toFixed(1)} years`}</p>
                <p className="text-xs font-bold text-ink/50">{km ? "អាយុមធ្យមរបស់សត្វ" : "Average animal age"}</p>
              </div>
              <Link href="/birthdays" className="ml-auto inline-flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-xs font-extrabold text-amber-700 shadow-sm">
                {km ? "ខួបកំណើត" : "Birthdays"} <ArrowRight size={13} />
              </Link>
            </div>
          </section>
        </div>

        {/* ── Birth years ── */}
        {births.length > 0 && (
          <section className="rounded-[2rem] bg-white p-5 shadow-soft ring-1 ring-black/5 md:p-6">
            <h2 className="mb-5 font-display text-lg font-extrabold text-forest">{km ? "ឆ្នាំកំណើតរបស់សត្វ" : "Year of birth"}</h2>
            <div className="flex h-44 items-end gap-1.5 sm:gap-2.5">
              {births.map((b, i) => (
                <div key={b.y} className="flex h-full flex-1 flex-col items-center justify-end">
                  <span className="mb-1 text-[11px] font-extrabold text-primary">{b.n || ""}</span>
                  <div
                    className={`gwz-grow-up w-full rounded-t-xl ${b.n ? "bg-gradient-to-t from-primary to-leaf" : "bg-slate-100"}`}
                    style={{ height: b.n ? `${Math.max(6, (b.n / birthMax) * 100)}%` : "4px", animationDelay: `${i * 0.04}s` }}
                  />
                  <span className="mt-1.5 text-[10px] font-bold text-ink/40 sm:text-[11px]">
                    <span className="sm:hidden">’{String(b.y).slice(2)}</span>
                    <span className="hidden sm:inline">{b.y}</span>
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Conservation teaser ── */}
        <Link href="/conservation" className="group block rounded-[2rem] bg-white p-5 shadow-soft ring-1 ring-black/5 transition hover:shadow-lift md:p-6">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 font-display text-lg font-extrabold text-forest">
              <ShieldAlert size={20} className="text-[#D81E05]" /> {km ? "កម្រិតហានិភ័យក្នុងធម្មជាតិ" : "Risk in the wild"}
            </h2>
            <span className="inline-flex items-center gap-1 text-sm font-extrabold text-primary transition group-hover:translate-x-0.5">
              {km ? "មើលបន្ថែម" : "See more"} <ArrowRight size={15} />
            </span>
          </div>
          <div className="flex h-5 overflow-hidden rounded-full">
            {risk.map((r) => (
              <div key={r.code} className="gwz-grow" style={{ width: `${(r.n / riskTotal) * 100}%`, background: r.color }} title={`${r.code} ${r.n}`} />
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
            {risk.map((r) => (
              <span key={r.code} className="inline-flex items-center gap-1.5 text-xs font-bold text-ink/60">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: r.color }} />
                {km ? r.km : r.en} · {r.n}
              </span>
            ))}
          </div>
        </Link>
      </main>
      <SiteFooter />
      <BottomNav />
    </div>
  );
}
