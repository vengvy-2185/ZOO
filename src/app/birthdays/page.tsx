import Link from "next/link";
import Image from "next/image";
import { Cake, PartyPopper, CalendarHeart, Gift, PawPrint } from "lucide-react";
import { Navbar } from "@/components/visitor/Navbar";
import { BottomNav } from "@/components/visitor/BottomNav";
import { PageHeader } from "@/components/visitor/PageHeader";
import { SiteFooter } from "@/components/visitor/SiteFooter";
import { getActiveAnimals } from "@/lib/data/zoo";
import { upcomingBirthdays, type Birthday } from "@/lib/data/birthdays";
import { zooToday } from "@/lib/data/gate";
import { categoryTheme } from "@/lib/utils/category";
import { getI18n } from "@/lib/i18n/server";

export const revalidate = 600;

export async function generateMetadata() {
  const { locale } = getI18n();
  return { title: locale === "km" ? "ខួបកំណើតសត្វ" : "Animal Birthdays" };
}

const CONFETTI = ["#F59E0B", "#EC4899", "#22C55E", "#3B82F6", "#A855F7", "#EF4444"];

export default async function BirthdaysPage() {
  const { locale } = getI18n();
  const km = locale === "km";
  const today = zooToday();
  const all = upcomingBirthdays((await getActiveAnimals()) as any[], today);
  const name = (a: any) => (km && a.khmer_name) || a.name;
  const species = (a: any) => (km && a.species?.khmer_name) || a.species?.common_name || "";
  const monthName = (m: number, style: "long" | "short" = "long") => new Intl.DateTimeFormat(km ? "km-KH" : "en-GB", { month: style, timeZone: "UTC" }).format(new Date(Date.UTC(2024, m - 1, 1)));
  const dateLabel = (b: Birthday) => `${b.day} ${monthName(b.month)}`;
  const inDays = (d: number) => (d === 0 ? (km ? "ថ្ងៃនេះ!" : "Today!") : d === 1 ? (km ? "ស្អែក" : "Tomorrow") : km ? `${d} ថ្ងៃទៀត` : `in ${d} days`);
  const years = (n: number) => (km ? `${n} ឆ្នាំ` : `${n} year${n === 1 ? "" : "s"} old`);

  const todays = all.filter((b) => b.days === 0);
  const hero = todays.length ? todays : all.slice(0, 1);
  const soon = all.filter((b) => b.days > 0).slice(0, 10);
  const thisMonth = Number(today.slice(5, 7));
  const byMonth = Array.from({ length: 12 }, (_, i) => all.filter((b) => b.month === i + 1).sort((a, b) => a.day - b.day));

  return (
    <div className="pb-20 md:pb-0">
      <Navbar />
      <PageHeader
        icon={Cake}
        eyebrow={km ? "ថ្មី · អបអរជាមួយគ្នា" : "New · Celebrate with us"}
        title={km ? "ខួបកំណើតសត្វ" : "Animal Birthdays"}
        subtitle={km ? "សត្វនីមួយៗមានថ្ងៃកំណើតរបស់ខ្លួន។ មកមើលថាអ្នកណាខួបកំណើតឆាប់ៗនេះ ហើយមកជូនពរពួកគេនៅសួនសត្វ!" : "Every animal here has a birthday. See who is celebrating soon, then come and wish them a happy day at the zoo!"}
      />

      <main className="mx-auto max-w-6xl space-y-10 px-4 pb-14 md:px-6">
        {/* ── Today (or the very next one) ── */}
        {hero.length > 0 && (
          <section className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#FFF1F2] via-[#FFF7ED] to-[#FEF9C3] p-5 shadow-soft ring-1 ring-black/5 md:p-8">
            <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
              {Array.from({ length: 22 }, (_, i) => (
                <span
                  key={i}
                  className="gwz-confetti absolute top-0 block h-2.5 w-1.5 rounded-sm"
                  style={{ left: `${(i * 37) % 100}%`, background: CONFETTI[i % CONFETTI.length], animationDelay: `${(i % 8) * 0.4}s`, animationDuration: `${2.6 + (i % 5) * 0.5}s` }}
                />
              ))}
            </div>
            <p className="relative mb-4 inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 text-xs font-extrabold text-rose-600 shadow-sm">
              <PartyPopper size={15} /> {todays.length ? (km ? "រីករាយថ្ងៃកំណើត!" : "Happy birthday!") : km ? "ខួបកំណើតបន្ទាប់" : "Next birthday"}
            </p>
            <div className={`relative grid gap-4 ${hero.length > 1 ? "md:grid-cols-2" : ""}`}>
              {hero.map((b) => (
                <Link key={b.animal.id} href={`/animals/${b.animal.animal_code}`} className="group flex items-center gap-4 rounded-3xl bg-white/85 p-3 shadow-sm ring-1 ring-black/5 backdrop-blur transition hover:-translate-y-0.5 hover:shadow-lift md:gap-6 md:p-4">
                  <div className="relative h-28 w-28 flex-shrink-0 overflow-hidden rounded-[1.4rem] ring-4 ring-white md:h-36 md:w-36" style={{ background: categoryTheme(b.animal.category?.slug).gradient }}>
                    {b.animal.main_image_url && <Image src={b.animal.main_image_url} alt="" fill sizes="144px" className="object-cover transition duration-500 group-hover:scale-105" />}
                    <span className="absolute -bottom-1 -right-1 flex h-10 w-10 items-center justify-center rounded-full bg-rose-500 text-white shadow-md ring-4 ring-white">
                      <Cake size={18} />
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="font-display text-2xl font-extrabold leading-tight text-forest md:text-3xl">{name(b.animal)}</p>
                    <p className="text-sm font-semibold text-ink/55">{species(b.animal)}</p>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs font-extrabold">
                      <span className="rounded-full bg-rose-500 px-3 py-1 text-white">{inDays(b.days)}</span>
                      <span className="rounded-full bg-amber-100 px-3 py-1 text-amber-800">{dateLabel(b)}</span>
                      <span className="rounded-full bg-emerald-100 px-3 py-1 text-emerald-800">{km ? `ចូល ${years(b.turning)}` : `Turning ${b.turning}`}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* ── Coming soon ── */}
        {soon.length > 0 && (
          <section>
            <h2 className="mb-4 flex items-center gap-2 font-display text-xl font-extrabold text-forest md:text-2xl">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-100 text-rose-600"><Gift size={18} /></span>
              {km ? "ខួបកំណើតឆាប់ៗនេះ" : "Coming up soon"}
            </h2>
            <div className="no-scrollbar -mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 md:mx-0 md:grid md:grid-cols-5 md:overflow-visible md:px-0">
              {soon.map((b) => (
                <Link key={b.animal.id} href={`/animals/${b.animal.animal_code}`} className="group w-40 flex-shrink-0 snap-start overflow-hidden rounded-3xl bg-white shadow-soft ring-1 ring-black/5 transition hover:-translate-y-1 hover:shadow-lift md:w-auto">
                  <div className="relative aspect-square" style={{ background: categoryTheme(b.animal.category?.slug).gradient }}>
                    {b.animal.main_image_url ? (
                      <Image src={b.animal.main_image_url} alt="" fill sizes="(min-width:768px) 20vw, 160px" className="object-cover transition duration-500 group-hover:scale-105" />
                    ) : (
                      <PawPrint className="absolute inset-0 m-auto text-white/70" size={40} />
                    )}
                    <span className="absolute left-2 top-2 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-extrabold text-rose-600 shadow-sm">{inDays(b.days)}</span>
                  </div>
                  <div className="p-3">
                    <p className="truncate font-display font-extrabold text-forest">{name(b.animal)}</p>
                    <p className="truncate text-xs font-semibold text-ink/50">
                      {dateLabel(b)} · {km ? `ចូល ${b.turning}` : `turns ${b.turning}`}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* ── Calendar: every month ── */}
        <section>
          <h2 className="mb-4 flex items-center gap-2 font-display text-xl font-extrabold text-forest md:text-2xl">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 text-amber-600"><CalendarHeart size={18} /></span>
            {km ? "ប្រតិទិនខួបកំណើតពេញមួយឆ្នាំ" : "Birthday calendar"}
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {byMonth.map((list, i) => {
              const current = i + 1 === thisMonth;
              return (
                <div key={i} className={`rounded-3xl p-4 ring-1 ${current ? "bg-gradient-to-br from-primary to-forest text-white shadow-lift ring-primary/30" : "bg-white shadow-soft ring-black/5"}`}>
                  <div className="mb-3 flex items-center justify-between">
                    <p className={`font-display text-lg font-extrabold ${current ? "" : "text-forest"}`}>{monthName(i + 1)}</p>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-extrabold ${current ? "bg-white/20" : "bg-rose-50 text-rose-600"}`}>
                      <Cake size={12} className="-mt-0.5 mr-1 inline" />
                      {list.length}
                    </span>
                  </div>
                  {list.length ? (
                    <ul className="space-y-1.5">
                      {list.map((b) => (
                        <li key={b.animal.id}>
                          <Link href={`/animals/${b.animal.animal_code}`} className={`flex items-center gap-2.5 rounded-2xl p-1 pr-2 transition ${current ? "hover:bg-white/10" : "hover:bg-emerald-50"}`}>
                            <span className={`w-8 flex-shrink-0 text-center font-display text-sm font-extrabold ${current ? "text-leaf" : "text-rose-500"}`}>{b.day}</span>
                            <span className="relative h-8 w-8 flex-shrink-0 overflow-hidden rounded-full ring-2 ring-white" style={{ background: categoryTheme(b.animal.category?.slug).gradient }}>
                              {b.animal.main_image_url && <Image src={b.animal.main_image_url} alt="" fill sizes="32px" className="object-cover" />}
                            </span>
                            <span className="min-w-0 flex-1 truncate text-sm font-bold">{name(b.animal)}</span>
                            {b.days === 0 && <PartyPopper size={15} className="text-amber-400" />}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className={`text-sm ${current ? "text-white/70" : "text-ink/40"}`}>{km ? "គ្មានខួបកំណើតខែនេះ" : "No birthdays this month"}</p>
                  )}
                </div>
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
