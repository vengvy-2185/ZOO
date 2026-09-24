/**
 * Member / staff ID cards. Visitors earn a member card by visiting (tickets
 * checked in at the gate) or by spending on paid tickets; admins and staff
 * each get their own card colour so their role is obvious at a glance.
 */
export type CardType = "admin" | "staff" | "platinum" | "gold" | "silver";

/** Member levels: reach EITHER the visits OR the amount spent. */
export const TIERS: { key: Extract<CardType, "silver" | "gold" | "platinum">; visits: number; spent: number }[] = [
  { key: "silver", visits: 3, spent: 30 },
  { key: "gold", visits: 6, spent: 60 },
  { key: "platinum", visits: 10, spent: 100 },
];

export const CARD_STYLE: Record<CardType, { en: string; km: string; from: string; to: string; ink: string }> = {
  admin: { en: "Administrator", km: "អ្នកគ្រប់គ្រង", from: "#881337", to: "#E11D48", ink: "#FFE4E6" },
  staff: { en: "Zoo Staff", km: "បុគ្គលិកសួនសត្វ", from: "#1E3A8A", to: "#2563EB", ink: "#DBEAFE" },
  platinum: { en: "Platinum Member", km: "សមាជិកប្លាទីន", from: "#1E1B4B", to: "#4338CA", ink: "#E0E7FF" },
  gold: { en: "Gold Member", km: "សមាជិកមាស", from: "#92400E", to: "#F59E0B", ink: "#FEF3C7" },
  silver: { en: "Silver Member", km: "សមាជិកប្រាក់", from: "#334155", to: "#64748B", ink: "#E2E8F0" },
};

/** The highest member level reached, or null if not yet. */
export function tierFor(visits: number, spent: number) {
  let t: (typeof TIERS)[number] | null = null;
  for (const tier of TIERS) if (visits >= tier.visits || spent >= tier.spent) t = tier;
  return t;
}

/** The card a person should get: role cards first, then member levels. */
export function cardTypeFor(role: string | null | undefined, visits: number, spent: number): CardType | null {
  if (role === "admin") return "admin";
  if (role === "staff") return "staff";
  return tierFor(visits, spent)?.key ?? null;
}

/** A short, printable member number (not secret). */
export const memberNo = (userId: string) => `GWZ-${userId.replace(/-/g, "").slice(0, 8).toUpperCase()}`;
