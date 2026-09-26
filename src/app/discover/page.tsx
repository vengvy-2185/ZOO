import Link from "next/link";
import {
  LayoutGrid, PawPrint, Map, Heart, Lightbulb, Cake, BarChart3, ShieldAlert, Gamepad2, Brain, ZoomIn, Palette, Layers, Puzzle, Utensils, Grid3x3, Ruler,
  Camera, Mail, Ticket, TicketCheck, CalendarClock, Route, CalendarDays, Accessibility, ScanLine, Gift, HeartHandshake, Newspaper, Star, CircleHelp, MessageCircle, type LucideIcon,
} from "lucide-react";
import { Navbar } from "@/components/visitor/Navbar";
import { BottomNav } from "@/components/visitor/BottomNav";
import { PageHeader } from "@/components/visitor/PageHeader";
import { SiteFooter } from "@/components/visitor/SiteFooter";
import { getI18n } from "@/lib/i18n/server";

export async function generateMetadata() {
  const { locale } = getI18n();
  return { title: locale === "km" ? "មុខងារទាំងអស់" : "All Features" };
}

type Item = { href: string; Icon: LucideIcon; en: string; km: string };
type Group = { en: string; km: string; enSub: string; kmSub: string; color: string; soft: string; items: Item[] };

// Every page on the site, in groups, so nothing is hard to find.
const GROUPS: Group[] = [
  {
    en: "Meet the animals", km: "ស្គាល់សត្វ", enSub: "Profiles, map and fun facts", kmSub: "ប្រវត្តិ ផែនទី និងចំណេះដឹង", color: "#176B3A", soft: "#E8F5E9",
    items: [
      { href: "/animals", Icon: PawPrint, en: "All animals", km: "សត្វទាំងអស់" },
      { href: "/map", Icon: Map, en: "Zoo map", km: "ផែនទីសួនសត្វ" },
      { href: "/favorites", Icon: Heart, en: "My favourites", km: "សត្វដែលខ្ញុំចូលចិត្ត" },
      { href: "/facts", Icon: Lightbulb, en: "Animal facts", km: "ចំណេះដឹងពីសត្វ" },
      { href: "/birthdays", Icon: Cake, en: "Birthdays", km: "ខួបកំណើតសត្វ" },
      { href: "/stats", Icon: BarChart3, en: "Zoo in numbers", km: "សួនសត្វជាលេខ" },
      { href: "/conservation", Icon: ShieldAlert, en: "Protect wildlife", km: "ការពារសត្វ" },
    ],
  },
  {
    en: "Games", km: "ល្បែង", enSub: "For kids and grown-ups", kmSub: "សម្រាប់ក្មេង និងមនុស្សធំ", color: "#7C3AED", soft: "#F3E8FF",
    items: [
      { href: "/games", Icon: Gamepad2, en: "All games", km: "ល្បែងទាំងអស់" },
      { href: "/quiz", Icon: Brain, en: "Animal quiz", km: "ល្បែងសំណួរ" },
      { href: "/guess", Icon: ZoomIn, en: "Zoom guess", km: "ទាយពីរូបជិត" },
      { href: "/older", Icon: Cake, en: "Who is older?", km: "អ្នកណាចាស់ជាង?" },
      { href: "/coloring", Icon: Palette, en: "Coloring book", km: "សៀវភៅគូររូប" },
      { href: "/kids/memory", Icon: Layers, en: "Memory match", km: "ល្បែងចងចាំ" },
      { href: "/kids/puzzle", Icon: Puzzle, en: "Puzzle", km: "ផ្គុំរូប" },
      { href: "/kids/feed", Icon: Utensils, en: "Feed the animals", km: "ឲ្យចំណីសត្វ" },
      { href: "/kids/bingo", Icon: Grid3x3, en: "Zoo bingo", km: "ប៊ីងហ្គោ" },
      { href: "/compare", Icon: Ruler, en: "You vs animals", km: "អ្នក និងសត្វ" },
    ],
  },
  {
    en: "Make and share", km: "បង្កើត និងចែករំលែក", enSub: "Photos and cards", kmSub: "រូបថត និងកាត", color: "#0284C7", soft: "#E0F2FE",
    items: [
      { href: "/photo-booth", Icon: Camera, en: "Photo booth", km: "ថតរូបជាមួយសត្វ" },
      { href: "/postcard", Icon: Mail, en: "Postcard", km: "កាតប៉ុស្តាល់" },
    ],
  },
  {
    en: "Plan your visit", km: "រៀបចំការទស្សនា", enSub: "Tickets, times and tips", kmSub: "សំបុត្រ ម៉ោង និងគន្លឹះ", color: "#D97706", soft: "#FEF3C7",
    items: [
      { href: "/tickets", Icon: Ticket, en: "Buy tickets", km: "ទិញសំបុត្រ" },
      { href: "/my-tickets", Icon: TicketCheck, en: "My tickets", km: "សំបុត្ររបស់ខ្ញុំ" },
      { href: "/events", Icon: CalendarClock, en: "Events & feeding", km: "ព្រឹត្តិការណ៍" },
      { href: "/planner", Icon: Route, en: "Day planner", km: "រៀបចំថ្ងៃទស្សនា" },
      { href: "/visit", Icon: CalendarDays, en: "Visitor info", km: "ព័ត៌មានទស្សនា" },
      { href: "/easy", Icon: Accessibility, en: "Easy visit", km: "ទស្សនាងាយស្រួល" },
    ],
  },
  {
    en: "Quest, points and support", km: "បេសកកម្ម ពិន្ទុ និងការគាំទ្រ", enSub: "Collect, earn and help", kmSub: "ប្រមូល ទទួល និងជួយ", color: "#DB2777", soft: "#FCE7F3",
    items: [
      { href: "/quest", Icon: ScanLine, en: "Animal quest", km: "បេសកកម្មសត្វ" },
      { href: "/rewards", Icon: Gift, en: "Points & rewards", km: "ពិន្ទុ និងរង្វាន់" },
      { href: "/adopt", Icon: HeartHandshake, en: "Adopt an animal", km: "ឧបត្ថម្ភសត្វ" },
    ],
  },
  {
    en: "News and help", km: "ព័ត៌មាន និងជំនួយ", enSub: "Stay in touch", kmSub: "ទាក់ទងជាមួយយើង", color: "#475569", soft: "#F1F5F9",
    items: [
      { href: "/news", Icon: Newspaper, en: "News", km: "ព័ត៌មាន" },
      { href: "/reviews", Icon: Star, en: "Reviews", km: "មតិភ្ញៀវ" },
      { href: "/faq", Icon: CircleHelp, en: "Questions", km: "សំណួរញឹកញាប់" },
      { href: "/contact", Icon: MessageCircle, en: "Contact us", km: "ទាក់ទងយើង" },
    ],
  },
];

export default function DiscoverPage() {
  const { locale } = getI18n();
  const km = locale === "km";
  return (
    <div className="pb-20 md:pb-0">
      <Navbar />
      <PageHeader
        icon={LayoutGrid}
        eyebrow={km ? "រកឃើញភ្លាមៗ" : "Find it fast"}
        title={km ? "មុខងារទាំងអស់" : "All Features"}
        subtitle={km ? "គ្រប់យ៉ាងដែលអ្នកអាចធ្វើបាននៅលើគេហទំព័រនេះ ដាក់ជាក្រុមៗ ងាយរក។" : "Everything you can do on this website, in simple groups."}
      />
      <main className="mx-auto max-w-6xl px-4 pb-14 md:px-6">
        {/* quick jump chips */}
        <div className="no-scrollbar -mx-4 mb-6 flex gap-2 overflow-x-auto px-4 md:mx-0 md:flex-wrap md:px-0">
          {GROUPS.map((g, i) => (
            <a key={g.en} href={`#g${i}`} className="flex-shrink-0 rounded-full px-4 py-2 text-sm font-extrabold ring-1 ring-black/5 transition hover:-translate-y-0.5" style={{ background: g.soft, color: g.color }}>
              {km ? g.km : g.en}
            </a>
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          {GROUPS.map((g, i) => (
            <section key={g.en} id={`g${i}`} className="scroll-mt-28 overflow-hidden rounded-[2rem] bg-white shadow-soft ring-1 ring-black/5">
              <div className="flex items-center gap-3 px-5 pb-3 pt-5" style={{ background: `linear-gradient(135deg, ${g.soft}, #ffffff)` }}>
                <span className="h-9 w-1.5 rounded-full" style={{ background: g.color }} />
                <div className="min-w-0">
                  <h2 className="font-display text-xl font-extrabold" style={{ color: g.color }}>{km ? g.km : g.en}</h2>
                  <p className="text-xs font-semibold text-ink/50">{km ? g.kmSub : g.enSub}</p>
                </div>
                <span className="ml-auto rounded-full px-2.5 py-0.5 text-xs font-extrabold" style={{ background: g.soft, color: g.color }}>{g.items.length}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 p-4 sm:grid-cols-4">
                {g.items.map((it) => (
                  <Link key={it.href} href={it.href} className="group flex flex-col items-center gap-2 rounded-2xl p-2 text-center transition hover:bg-slate-50">
                    <span className="flex h-12 w-12 items-center justify-center rounded-2xl text-white shadow-sm transition group-hover:-translate-y-0.5 group-hover:shadow-lift" style={{ background: g.color }}>
                      <it.Icon size={22} />
                    </span>
                    <span className="text-xs font-bold leading-snug text-forest">{km ? it.km : it.en}</span>
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>
      </main>
      <SiteFooter />
      <BottomNav />
    </div>
  );
}
