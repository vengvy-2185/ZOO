import { Ticket, PawPrint, Sparkles, Map, Package, HandHeart, Users, Zap, Heart, Star } from "lucide-react";

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
