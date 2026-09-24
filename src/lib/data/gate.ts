// Visitor categories counted at the gate (must match gate_entries.category check).
export const GATE_CATEGORIES = [
  { key: "adult", emoji: "🧑", color: "#176B3A", en: "Adults", km: "មនុស្សពេញវ័យ" },
  { key: "child", emoji: "🧒", color: "#F59E0B", en: "Children", km: "កុមារ" },
  { key: "senior", emoji: "👴", color: "#7C3AED", en: "Seniors", km: "មនុស្សចាស់" },
  { key: "student", emoji: "🎒", color: "#0E7C9C", en: "Students", km: "សិស្ស/និស្សិត" },
  { key: "foreigner", emoji: "🌏", color: "#DB2777", en: "Foreigners", km: "ជនបរទេស" },
] as const;

export type GateCategory = (typeof GATE_CATEGORIES)[number]["key"];

export const isGateCategory = (v: unknown): v is GateCategory => GATE_CATEGORIES.some((c) => c.key === v);

/** Today's date (YYYY-MM-DD) in the zoo's time zone. */
export function zooToday(offsetDays = 0) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Phnom_Penh" }).format(new Date(Date.now() + offsetDays * 86400000));
}
