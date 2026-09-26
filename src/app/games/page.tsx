import Link from "next/link";
import { Gamepad2, Palette, Layers, Puzzle, Utensils, Grid3x3, Brain, ZoomIn, ScanLine, Ruler, Ticket, Camera, Mail, Cake, ArrowRight, type LucideIcon } from "lucide-react";
import { Navbar } from "@/components/visitor/Navbar";
import { BottomNav } from "@/components/visitor/BottomNav";
import { PageHeader } from "@/components/visitor/PageHeader";
import { SiteFooter } from "@/components/visitor/SiteFooter";
import { getI18n } from "@/lib/i18n/server";

type Game = { href: string; Icon: LucideIcon; en: [string, string]; km: [string, string]; from: string; to: string };

// All the games in one place, split into small groups.
const SECTIONS: { en: [string, string]; km: [string, string]; games: Game[] }[] = [
  {
    en: ["For little ones", "Easy, colourful games for young children."],
    km: ["សម្រាប់ក្មេងតូច", "ល្បែងងាយៗ ពណ៌ចម្រុះ សម្រាប់កុមារតូចៗ។"],
    games: [
      { href: "/coloring", Icon: Palette, en: ["Coloring Book", "Tap to colour 11 animals"], km: ["សៀវភៅគូររូប", "ចុចលាបពណ៌រូបសត្វ 11"], from: "#F472B6", to: "#DB2777" },
      { href: "/kids/memory", Icon: Layers, en: ["Memory Match", "Find the matching cards"], km: ["ល្បែងចងចាំ", "រកកាតសត្វដែលដូចគ្នា"], from: "#8B5CF6", to: "#6D28D9" },
      { href: "/kids/puzzle", Icon: Puzzle, en: ["Animal Puzzle", "Put the photo back together"], km: ["ផ្គុំរូបសត្វ", "ផ្គុំរូបថតឲ្យត្រឹមត្រូវវិញ"], from: "#5EC4E8", to: "#1D6FA3" },
      { href: "/kids/feed", Icon: Utensils, en: ["Feed the Animals", "What does each animal eat?"], km: ["ឲ្យចំណីសត្វ", "តើសត្វនីមួយៗស៊ីអ្វី?"], from: "#F4A62A", to: "#D97706" },
    ],
  },
  {
    en: ["Brain games", "Test what you know about our animals."],
    km: ["ល្បែងប្រាជ្ញា", "សាកល្បងចំណេះដឹងរបស់អ្នកអំពីសត្វរបស់យើង។"],
    games: [
      { href: "/quiz", Icon: Brain, en: ["Animal Quiz", "Who is in the photo?"], km: ["ល្បែងសំណួរ", "តើសត្វអ្វីនៅក្នុងរូប?"], from: "#8CCB63", to: "#2E8B57" },
      { href: "/guess", Icon: ZoomIn, en: ["Zoom Guess", "Guess from a close-up"], km: ["ទាយពីរូបជិត", "ទាយសត្វពីរូបពង្រីក"], from: "#F59E7B", to: "#C2410C" },
      { href: "/older", Icon: Cake, en: ["Who Is Older?", "Pick the older animal, keep your streak"], km: ["អ្នកណាចាស់ជាង?", "ជ្រើសសត្វដែលចាស់ជាង រក្សាស៊េរីឈ្នះ"], from: "#FB7185", to: "#BE123C" },
      { href: "/compare", Icon: Ruler, en: ["You vs Animals", "How big are you next to them?"], km: ["អ្នក និងសត្វ", "តើអ្នកធំប៉ុនណាបើធៀបនឹងសត្វ?"], from: "#94A3B8", to: "#475569" },
    ],
  },
  {
    en: ["Make and share", "Take photos with animals and send cards to friends."],
    km: ["បង្កើត និងចែករំលែក", "ថតរូបជាមួយសត្វ ហើយផ្ញើកាតទៅមិត្តភក្តិ។"],
    games: [
      { href: "/photo-booth", Icon: Camera, en: ["Photo Booth", "Selfies with animal stickers"], km: ["ថតរូបជាមួយសត្វ", "សែលហ្វីជាមួយស្ទីគ័រសត្វ"], from: "#38BDF8", to: "#0369A1" },
      { href: "/postcard", Icon: Mail, en: ["Animal Postcard", "Make a card and share it"], km: ["កាតប៉ុស្តាល់សត្វ", "បង្កើតកាត ហើយចែករំលែក"], from: "#FBBF24", to: "#C2410C" },
    ],
  },
  {
    en: ["Play at the zoo", "The most fun when you are right next to the real animals."],
    km: ["លេងពេលមកសួនសត្វ", "សប្បាយបំផុត ពេលអ្នកនៅក្បែរសត្វពិតៗ។"],
    games: [
      { href: "/kids/bingo", Icon: Grid3x3, en: ["Zoo Bingo", "Spot things on your visit"], km: ["ប៊ីងហ្គោសួនសត្វ", "ស្វែងរករបស់ពេលទៅលេង"], from: "#A3E635", to: "#2E8B57" },
      { href: "/quest", Icon: ScanLine, en: ["Animal Quest", "Scan the signs, earn medals"], km: ["បេសកកម្មសត្វ", "ស្កេនផ្លាក ទទួលមេដាយ"], from: "#0E3F24", to: "#2E8B57" },
    ],
  },
];

function Card({ g, km }: { g: Game; km: boolean }) {
  const [title, sub] = km ? g.km : g.en;
  return (
    <Link href={g.href} className="group relative flex min-h-[9.5rem] flex-col justify-between overflow-hidden rounded-[1.75rem] p-4 text-white shadow-soft transition hover:-translate-y-1 hover:shadow-lift active:scale-[.98] sm:p-5" style={{ background: `linear-gradient(135deg, ${g.from}, ${g.to})` }}>
      <g.Icon size={86} className="pointer-events-none absolute -bottom-3 -right-3 text-white/15 transition group-hover:rotate-6 group-hover:scale-110" aria-hidden />
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

export default function GamesPage() {
  const { locale } = getI18n();
  const km = locale === "km";
  return (
    <div className="pb-20 md:pb-0">
      <Navbar />
      <PageHeader
        icon={Gamepad2}
        eyebrow={km ? "សម្រាប់គ្រប់វ័យ" : "For all ages"}
        title={km ? "ល្បែង" : "Games"}
        subtitle={km ? "ល្បែងសប្បាយៗជាមួយសត្វពិតៗរបស់យើង។ លេងនៅផ្ទះ ហើយមកជួបពួកវាផ្ទាល់នៅសួនសត្វ!" : "Fun games with our real animals. Play at home, then come and meet them in person at the zoo!"}
      />
      <main className="mx-auto max-w-6xl space-y-9 px-4 pb-12 md:px-6">
        {SECTIONS.map((s) => (
          <section key={s.en[0]}>
            <h2 className="section-title text-xl md:text-2xl">{km ? s.km[0] : s.en[0]}</h2>
            <p className="mt-1 text-sm text-ink/60">{km ? s.km[1] : s.en[1]}</p>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
              {s.games.map((g) => (
                <Card key={g.href} g={g} km={km} />
              ))}
            </div>
          </section>
        ))}
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
