// Until an admin uploads a real photo (animals.main_image_url /
// animal_photos), every image slot in the app falls back to this
// category-tinted gradient + icon treatment instead of a generic gray box
// or a fake stock photo — so the UI still looks intentional and finished
// out of the box, and it's obvious at a glance which animals still need a
// real photo uploaded.

export interface CategoryTheme {
  gradient: string; // CSS background
  solid: string; // hex, used for badges/icons
  soft: string; // light tint background
}

const THEMES: Record<string, CategoryTheme> = {
  mammals: { gradient: "linear-gradient(135deg,#FDE9C8,#F4C95D)", solid: "#B8791A", soft: "#FCF3DE" },
  birds: { gradient: "linear-gradient(135deg,#DCEBFF,#8FB8F0)", solid: "#2563EB", soft: "#E8F1FF" },
  reptiles: { gradient: "linear-gradient(135deg,#FBDCDC,#EF9A9A)", solid: "#C0392B", soft: "#FCEBEB" },
  aquatic: { gradient: "linear-gradient(135deg,#D6F3F7,#7FD3E3)", solid: "#0E7C9C", soft: "#E6F8FA" },
  insects: { gradient: "linear-gradient(135deg,#E4F5D0,#A9D97A)", solid: "#4C8B2B", soft: "#EEF8E4" },
  amphibians: { gradient: "linear-gradient(135deg,#D9F2E6,#7FCBA8)", solid: "#1E7A54", soft: "#E7F6EF" },
};

const DEFAULT: CategoryTheme = { gradient: "linear-gradient(135deg,#E8F5E9,#ffffff)", solid: "#176B3A", soft: "#E8F5E9" };

export function categoryTheme(slug?: string | null): CategoryTheme {
  if (!slug) return DEFAULT;
  return THEMES[slug] ?? DEFAULT;
}
