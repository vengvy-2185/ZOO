import Link from "next/link";
import { Baby, Palette, Layers, Puzzle, Utensils, Grid3x3, Brain, ZoomIn, ScanLine, Camera, Ticket, ArrowRight, type LucideIcon } from "lucide-react";
import { Navbar } from "@/components/visitor/Navbar";
import { BottomNav } from "@/components/visitor/BottomNav";
import { PageHeader } from "@/components/visitor/PageHeader";
import { SiteFooter } from "@/components/visitor/SiteFooter";
import { getI18n } from "@/lib/i18n/server";

type Game = { href: string; Icon: LucideIcon; en: [string, string]; km: [string, string]; from: string; to: string; atZoo?: boolean };

const AT_HOME: Game[] = [
  { href: "/coloring", Icon: Palette, en: ["Coloring Book", "Tap to colour 11 animal pictures"], km: ["សៀវភៅគូររូប", "ចុចលាបពណ៌រូបសត្វ 11"], from: "#F472B6", to: "#DB2777" },
  { href: "/kids/memory", Icon: Layers, en: ["Memory Match", "Find the matching animal cards"], km: ["ល្បែងចងចាំ", "រកកាតសត្វដែលដូចគ្នា"], from: "#8B5CF6", to: "#6D28D9" },
  { href: "/kids/puzzle", Icon: Puzzle, en: ["Animal Puzzle", "Put the photo back together"], km: ["ផ្គុំរូបសត្វ", "ផ្គុំរូបថតឲ្យត្រឹមត្រូវវិញ"], from: "#5EC4E8", to: "#1D6FA3" },
  { href: "/kids/feed", Icon: Utensils, en: ["Feed the Animals", "What does each animal eat?"], km: ["ឲ្យចំណីសត្វ", "តើសត្វនីមួយៗស៊ីអ្វី?"], from: "#F4A62A", to: "#D97706" },
  { href: "/quiz", Icon: Brain, en: ["Animal Quiz", "Who is in the photo?"], km: ["ល្បែងសំណួរ", "តើសត្វអ្វីនៅក្នុងរូប?"], from: "#8CCB63", to: "#2E8B57" },
  { href: "/guess", Icon: ZoomIn, en: ["Zoom Guess", "Guess from a close-up"], km: ["ទាយពីរូបជិត", "ទាយសត្វពីរូបពង្រីក"], from: "#F59E7B", to: "#C2410C" },
];

const AT_ZOO: Game[] = [
  { href: "/kids/bingo", Icon: Grid3x3, en: ["Zoo Bingo", "Spot things on your visit"], km: ["ប៊ីងហ្គោសួនសត្វ", "ស្វែងរករបស់ពេលទៅលេង"], from: "#A3E635", to: "#2E8B57", atZoo: true },
  { href: "/quest", Icon: ScanLine, en: ["Animal Quest", "Scan the signs, earn medals"], km: ["បេសកកម្មសត្វ", "ស្កេនផ្លាក ទទួលមេដាយ"], from: "#0E3F24", to: "#2E8B57", atZoo: true },
  { href: "/photo-booth", Icon: Camera, en: ["Photo Booth", "Selfies with animal stickers"], km: ["ថតរូបជាមួយសត្វ", "សែលហ្វីជាមួយស្ទីគ័រសត្វ"], from: "#FB923C", to: "#9D174D", atZoo: true },
];

function Card({ g, km }: { g: Game; km: boolean }) {
  const [title, sub] = km ? g.km : g.en;
  return (
    <Link href={g.href} className="group relative flex min-h-[9.5rem] flex-col justify-between overflow-hidden rounded-[1.75rem] p-4 text-white shadow-soft transition hover:-translate-y-1 hover:shadow-lift active:scale-[.98] sm:p-5" style={{ background: `linear-gradient(135deg, ${g.from}, ${g.to})` }}>
      <g.Icon size={86} className="pointer-events-none absolute -bottom-3 -right-3 text-white/15 transition group-hover:rotate-6 group-hover:scale-110" />
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 ring-1 ring-white/30 backdrop-blur">
        <g.Icon size={24} strokeWidth={2.4} />
      </span>
      <span>
        <span className="block font-display text-lg font-extrabold leading-tight sm:text-xl">{title}</span>
        <span className="mt-0.5 block text-xs leading-snug text-white/85 sm:text-sm">{sub}</span>
      </span>
    </Link>
  );
}

export default function KidsPage() {
  const { locale } = getI18n();
  const km = locale === "km";
  return (
    <div className="pb-20 md:pb-0">
      <Navbar />
      <PageHeader
        icon={Baby}
        eyebrow={km ? "សម្រាប់កុមារ" : "For children"}
        title={km ? "តំបន់កុមារ" : "Kids Zone"}
        subtitle={km ? "ល្បែងសប្បាយៗជាមួយសត្វពិតៗរបស់យើង។ លេងនៅផ្ទះ ហើយមកជួបពួកវាផ្ទាល់នៅសួនសត្វ!" : "Fun games with our real animals. Play at home, then come and meet them in person at the zoo!"}
      />
      <main className="mx-auto max-w-6xl space-y-8 px-4 pb-12 md:px-6">
        <section>
          <h2 className="section-title text-xl md:text-2xl">{km ? "លេងនៅផ្ទះ" : "Play at home"}</h2>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
            {AT_HOME.map((g) => (
              <Card key={g.href} g={g} km={km} />
            ))}
          </div>
        </section>
        <section>
          <h2 className="section-title text-xl md:text-2xl">{km ? "លេងពេលមកសួនសត្វ" : "Play at the zoo"}</h2>
          <p className="mt-1 text-sm text-ink/60">{km ? "ល្បែងទាំងនេះសប្បាយបំផុត ពេលអ្នកនៅក្បែរសត្វពិតៗ។" : "These games are the most fun when you are right next to the real animals."}</p>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
            {AT_ZOO.map((g) => (
              <Card key={g.href} g={g} km={km} />
            ))}
          </div>
        </section>
        <Link href="/tickets" className="flex items-center gap-4 rounded-[2rem] bg-gradient-to-r from-accent to-leaf p-5 text-forest shadow-lift transition hover:-translate-y-0.5 sm:p-6">
          <span className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-white/70">
            <Ticket size={28} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-display text-xl font-extrabold leading-tight">{km ? "មកលេងជាមួយគ្រួសារ!" : "Come with your family!"}</span>
            <span className="block text-sm text-forest/80">{km ? "សត្វទាំងអស់កំពុងរង់ចាំជួបអ្នកនៅសួនសត្វ។" : "All the animals are waiting to meet you at the zoo."}</span>
          </span>
          <ArrowRight size={22} className="flex-shrink-0" />
        </Link>
      </main>
      <SiteFooter />
      <BottomNav />
    </div>
  );
}
