import { PawPrint, Bird, Turtle, Fish, Bug, Droplet, type LucideIcon } from "lucide-react";

// One clean, consistent icon set for every category — used instead of
// emoji so icon spots render crisply at any size and can be recolored
// (the app's brand green) rather than looking like mismatched clip-art.
export const CATEGORY_ICONS: Record<string, LucideIcon> = {
  mammals: PawPrint,
  birds: Bird,
  reptiles: Turtle,
  aquatic: Fish,
  insects: Bug,
  amphibians: Droplet, // lucide has no frog/amphibian glyph; a water drop
  // reads well for pond/semi-aquatic species and stays in the same family.
};

export function getCategoryIcon(slug?: string | null): LucideIcon {
  return CATEGORY_ICONS[slug ?? ""] ?? PawPrint;
}
