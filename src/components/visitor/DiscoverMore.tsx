import Link from "next/link";
import Image from "next/image";
import { Cake, ShieldAlert, BarChart3, ArrowRight, Sparkles } from "lucide-react";
import { getActiveAnimals } from "@/lib/data/zoo";
import { upcomingBirthdays } from "@/lib/data/birthdays";
import { getI18n } from "@/lib/i18n/server";

/** Home page: three big cards for the "Learn" pages, each with a live number. */
export async function DiscoverMore() {
  const { locale } = getI18n();
  const km = locale === "km";
  const animals = (await getActiveAnimals()) as any[];
  const next = upcomingBirthdays(animals)[0];
  const threatened = animals.filter((a) => ["Critically Endangered", "Endangered", "Vulnerable"].includes(a.species?.conservation_status)).length;
  const rare = animals.find((a) => a.species?.conservation_status === "Critically Endangered" && a.main_image_url);
  const nm = (a: any) => (km && a.khmer_name) || a.name;

  const cards = [
    {
      href: "/birthdays",
      Icon: Cake,
      bg: "from-rose-400 via-pink-500 to-fuchsia-600",
      title: km ? "ខួបកំណើតសត្វ" : "Animal Birthdays",
      big: next ? (next.days === 0 ? (km ? "ថ្ងៃនេះ!" : "Today!") : km ? `${next.days} ថ្ងៃទៀត` : `${next.days} days`) : "—",
      line: next ? (km ? `${nm(next.animal)} ចូល ${next.turning} ឆ្នាំ` : `${nm(next.animal)} turns ${next.turning}`) : "",
      img: next?.animal.main_image_url,
    },
    {
      href: "/conservation",
      Icon: ShieldAlert,
      bg: "from-orange-400 via-red-500 to-rose-700",
      title: km ? "ការពារសត្វជិតផុតពូជ" : "Protect Wildlife",
      big: km ? `${threatened} ក្បាល` : `${threatened}`,
      line: km ? "ជាប្រភេទងាយរងគ្រោះ ឬជិតផុតពូជ" : "animals from threatened species",
      img: rare?.main_image_url,
    },
    {
      href: "/stats",
      Icon: BarChart3,
      bg: "from-sky-400 via-blue-600 to-indigo-700",
      title: km ? "សួនសត្វជាលេខ" : "Zoo in Numbers",
      big: km ? `${animals.length} ក្បាល` : `${animals.length}`,
      line: km ? "អ្នកណាចាស់ជាងគេ? អ្នកណាក្មេងជាងគេ?" : "Who is the oldest? The youngest?",
      img: null,
    },
  ];

  return (
    <section data-reveal>
      <div className="mb-4 flex items-center gap-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-leaf/25 text-primary"><Sparkles size={18} /></span>
        <h2 className="font-display text-2xl font-extrabold text-forest md:text-3xl">{km ? "រៀនស្គាល់សត្វបន្ថែម" : "Discover more"}</h2>
        <span className="rounded-full bg-rose-500 px-2.5 py-0.5 text-[11px] font-extrabold text-white">{km ? "ថ្មី" : "NEW"}</span>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        {cards.map((c) => (
          <Link key={c.href} href={c.href} className={`group relative flex min-h-[11rem] overflow-hidden rounded-[1.75rem] bg-gradient-to-br p-5 text-white shadow-lift transition hover:-translate-y-1 ${c.bg}`}>
            {c.img && (
              <div className="absolute -bottom-6 -right-6 h-36 w-36 overflow-hidden rounded-full ring-8 ring-white/20 transition duration-500 group-hover:scale-105">
                <Image src={c.img} alt="" fill sizes="144px" className="object-cover" />
              </div>
            )}
            {!c.img && <c.Icon className="absolute -bottom-4 -right-3 text-white/15" size={140} />}
            <div className="relative flex max-w-[65%] flex-col">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/20 backdrop-blur"><c.Icon size={20} /></span>
              <p className="mt-3 font-display text-lg font-extrabold leading-tight">{c.title}</p>
              <p className="mt-1 font-display text-3xl font-extrabold leading-none">{c.big}</p>
              <p className="mt-1 text-xs font-semibold text-white/85">{c.line}</p>
              <span className="mt-auto inline-flex items-center gap-1 pt-3 text-sm font-extrabold">
                {km ? "ចូលមើល" : "Explore"} <ArrowRight size={15} className="transition group-hover:translate-x-1" />
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
