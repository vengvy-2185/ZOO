import { getCategoryIcon } from "@/lib/icons/categoryIcons";

// Used inside photo placeholders (category-tinted gradient backgrounds) —
// color is passed in by the parent (usually the category's own theme
// color) so the glyph reads clearly against whatever background it sits on.
export function SpeciesIcon({
  categorySlug,
  size = 40,
  color,
}: {
  categorySlug?: string | null;
  size?: number;
  color?: string;
}) {
  const Icon = getCategoryIcon(categorySlug);
  return <Icon size={size} strokeWidth={1.75} color={color} />;
}
