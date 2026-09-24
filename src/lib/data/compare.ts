// Typical adult sizes by species (approximate, for a fun comparison — not
// scientific data). Matched to the zoo's own animals by species name, so the
// comparison shows the real residents with their real photos.
// height = standing height (cm, null when it doesn't make sense, e.g. sharks),
// weight (kg), top speed (km/h, running / swimming / flying).
export const SPECIES_STATS: Record<string, { height: number | null; weight: number; speed: number; color: string }> = {
  giraffe: { height: 520, weight: 1200, speed: 55, color: "#F59E0B" },
  "asian elephant": { height: 300, weight: 4000, speed: 40, color: "#64748B" },
  "african elephant": { height: 330, weight: 6000, speed: 40, color: "#64748B" },
  "african lion": { height: 120, weight: 190, speed: 80, color: "#D97706" },
  lion: { height: 120, weight: 190, speed: 80, color: "#D97706" },
  "white tiger": { height: 110, weight: 220, speed: 65, color: "#475569" },
  tiger: { height: 110, weight: 220, speed: 65, color: "#EA580C" },
  "red panda": { height: 60, weight: 5, speed: 24, color: "#C2410C" },
  "giant panda": { height: 80, weight: 110, speed: 32, color: "#1F2937" },
  "scarlet macaw": { height: 85, weight: 1.1, speed: 56, color: "#DC2626" },
  "greater flamingo": { height: 140, weight: 3.5, speed: 60, color: "#EC4899" },
  peacock: { height: 105, weight: 5, speed: 16, color: "#0891B2" },
  "saltwater crocodile": { height: 60, weight: 500, speed: 29, color: "#15803D" },
  "blacktip reef shark": { height: null, weight: 25, speed: 30, color: "#0369A1" },
  zebra: { height: 140, weight: 350, speed: 65, color: "#111827" },
  gorilla: { height: 170, weight: 160, speed: 32, color: "#334155" },
  cheetah: { height: 85, weight: 55, speed: 110, color: "#CA8A04" },
};

export type CompareMetric = "height" | "weight" | "speed";

export type CompareAnimal = { code: string; name: string; image: string | null; height: number | null; weight: number; speed: number; color: string };
