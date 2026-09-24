/** Adoption support levels (USD). The price is always taken from here on the server. */
export const ADOPTION_TIERS = { friend: 5, guardian: 15, hero: 50 } as const;
export type AdoptionTier = keyof typeof ADOPTION_TIERS;
