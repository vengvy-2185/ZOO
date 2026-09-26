import { Ticket, PawPrint, Sparkles, Map, Package, HandHeart, Users, Zap, Heart, Star, Smartphone, Briefcase, Wallet, KeyRound, Shirt, Baby, HelpCircle, Stethoscope, ShieldAlert, Flame, Siren, BarChart3 } from "lucide-react";

// Shared by server pages and client forms (kept out of "use client" files).

export type Section = "tickets" | "animals" | "cleaning" | "guide" | "general";

// Quick picks for each section, so asking takes one tap.
export const SUPPLY_SECTIONS: Record<Section, { Icon: typeof Ticket; en: string; km: string; color: string; items: [string, string][] }> = {
  tickets: { Icon: Ticket, en: "Tickets & gate", km: "សំបុត្រ និងច្រកចូល", color: "#1D4ED8", items: [["Receipt paper rolls", "ក្រដាសបោះពុម្ព"], ["Wristbands", "ខ្សែដៃភ្ញៀវ"], ["Pens", "ប៊ិច"], ["Change money", "ប្រាក់អាប់"], ["Scanner batteries", "ថ្មម៉ាស៊ីនស្កេន"]] },
  animals: { Icon: PawPrint, en: "Animal care", km: "ថែសត្វ", color: "#B45309", items: [["Animal food", "ចំណីសត្វ"], ["Medicine", "ថ្នាំពេទ្យ"], ["Bedding / straw", "ចំបើង / កម្រាល"], ["Gloves", "ស្រោមដៃ"], ["Vitamins", "វីតាមីន"]] },
  cleaning: { Icon: Sparkles, en: "Cleaning", km: "សម្អាត", color: "#0F766E", items: [["Trash bags", "ថង់សំរាម"], ["Soap", "សាប៊ូ"], ["Disinfectant", "ថ្នាំសម្លាប់មេរោគ"], ["Broom", "អំបោស"], ["Tissue", "ក្រដាសអនាម័យ"]] },
  guide: { Icon: Map, en: "Tour guide", km: "មគ្គុទ្ទេសក៍", color: "#7C3AED", items: [["Microphone batteries", "ថ្មមីក្រូហ្វូន"], ["Brochures", "ខិត្តប័ណ្ណ"], ["Paper maps", "ផែនទីក្រដាស"], ["Drinking water", "ទឹកផឹក"]] },
  general: { Icon: Package, en: "General", km: "ទូទៅ", color: "#475569", items: [["Uniform", "ឯកសណ្ឋាន"], ["Drinking water", "ទឹកផឹក"], ["First aid kit", "ប្រអប់សង្គ្រោះបឋម"], ["Raincoat", "អាវភ្លៀង"]] },
};

export type Badge = "helpful" | "teamwork" | "fast" | "kind" | "star";
export const BADGES: Record<Badge, { Icon: typeof Star; en: string; km: string; from: string; to: string }> = {
  helpful: { Icon: HandHeart, en: "Helpful", km: "ជួយគេ", from: "#34D399", to: "#059669" },
  teamwork: { Icon: Users, en: "Teamwork", km: "សហការល្អ", from: "#60A5FA", to: "#1D4ED8" },
  fast: { Icon: Zap, en: "Quick", km: "រហ័សរហួន", from: "#FBBF24", to: "#D97706" },
  kind: { Icon: Heart, en: "Kind", km: "ចិត្តល្អ", from: "#F472B6", to: "#DB2777" },
  star: { Icon: Star, en: "Star of the day", km: "តារាប្រចាំថ្ងៃ", from: "#A78BFA", to: "#6D28D9" },
};

export type LostCat = "phone" | "bag" | "wallet" | "keys" | "clothes" | "child" | "other";
export const LOST_CATS: Record<LostCat, { Icon: typeof Ticket; en: string; km: string; color: string }> = {
  phone: { Icon: Smartphone, en: "Phone", km: "ទូរស័ព្ទ", color: "#2563EB" },
  bag: { Icon: Briefcase, en: "Bag", km: "កាបូប/វ៉ាលី", color: "#7C3AED" },
  wallet: { Icon: Wallet, en: "Wallet", km: "កាបូបលុយ", color: "#B45309" },
  keys: { Icon: KeyRound, en: "Keys", km: "សោ", color: "#0F766E" },
  clothes: { Icon: Shirt, en: "Clothes / hat", km: "សម្លៀកបំពាក់/មួក", color: "#DB2777" },
  child: { Icon: Baby, en: "Lost child", km: "ក្មេងវង្វេង", color: "#DC2626" },
  other: { Icon: HelpCircle, en: "Other", km: "ផ្សេងៗ", color: "#475569" },
};

export type SosKind = "medical" | "animal" | "security" | "fire" | "child" | "other";
export const SOS_KINDS: Record<SosKind, { Icon: typeof Ticket; en: string; km: string; color: string }> = {
  medical: { Icon: Stethoscope, en: "Someone is hurt", km: "មានអ្នករបួស/ឈឺ", color: "#DC2626" },
  animal: { Icon: PawPrint, en: "Animal escaped / danger", km: "សត្វរត់ចេញ/គ្រោះថ្នាក់", color: "#EA580C" },
  security: { Icon: ShieldAlert, en: "Security problem", km: "បញ្ហាសន្តិសុខ", color: "#7C2D12" },
  fire: { Icon: Flame, en: "Fire / smoke", km: "ភ្លើង/ផ្សែង", color: "#B91C1C" },
  child: { Icon: Baby, en: "Lost child", km: "ក្មេងវង្វេង", color: "#DB2777" },
  other: { Icon: Siren, en: "Other emergency", km: "បន្ទាន់ផ្សេងៗ", color: "#475569" },
};

/** Sections a task can be given to (reports = managers). */
export const TASK_SECTIONS: Record<"tickets" | "animals" | "cleaning" | "guide" | "reports", { Icon: typeof Ticket; en: string; km: string }> = {
  tickets: { Icon: Ticket, en: "Tickets & gate", km: "សំបុត្រ និងច្រកចូល" },
  animals: { Icon: PawPrint, en: "Animal care", km: "ថែសត្វ" },
  cleaning: { Icon: Sparkles, en: "Cleaning", km: "សម្អាត" },
  guide: { Icon: Map, en: "Tour guides", km: "មគ្គុទ្ទេសក៍" },
  reports: { Icon: BarChart3, en: "Managers", km: "អ្នកគ្រប់គ្រង" },
};
