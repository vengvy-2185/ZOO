// Age is always derived client/server-side from date_of_birth — never
// stored — mirroring the calculate_animal_age() Postgres function so the
// UI and DB never disagree. Every formatter takes an optional locale
// ("en" | "km"); Khmer output uses Khmer words with regular 0–9 digits.

export type Locale = "en" | "km";

const KHMER_MONTHS = ["មករា", "កុម្ភៈ", "មីនា", "មេសា", "ឧសភា", "មិថុនា", "កក្កដា", "សីហា", "កញ្ញា", "តុលា", "វិច្ឆិកា", "ធ្នូ"];

/** Formats a number for display. Regular 0–9 digits in every language (by design). */
export function num(value: string | number, _locale: Locale = "en"): string {
  return String(value);
}

export function calculateAge(dateOfBirth: string | null, locale: Locale = "en"): string | null {
  if (!dateOfBirth) return null;
  const dob = new Date(dateOfBirth);
  const now = new Date();

  let years = now.getFullYear() - dob.getFullYear();
  let months = now.getMonth() - dob.getMonth();
  if (now.getDate() < dob.getDate()) months -= 1;
  if (months < 0) {
    years -= 1;
    months += 12;
  }

  if (years < 1) {
    const m = Math.max(months, 0);
    return locale === "km" ? `${m} ខែ` : `${m} month${m === 1 ? "" : "s"}`;
  }
  return locale === "km" ? `${years} ឆ្នាំ` : `${years} year${years === 1 ? "" : "s"}`;
}

export function daysUntilNextBirthday(dateOfBirth: string | null): number | null {
  if (!dateOfBirth) return null;
  const dob = new Date(dateOfBirth);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let next = new Date(today.getFullYear(), dob.getMonth(), dob.getDate());
  if (next < today) {
    next = new Date(today.getFullYear() + 1, dob.getMonth(), dob.getDate());
  }
  return Math.round((next.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export function isBirthdayToday(dateOfBirth: string | null): boolean {
  return daysUntilNextBirthday(dateOfBirth) === 0;
}

export function formatBirthday(dateOfBirth: string | null, locale: Locale = "en"): string | null {
  if (!dateOfBirth) return null;
  const dob = new Date(dateOfBirth);
  if (locale === "km") return `${dob.getDate()} ${KHMER_MONTHS[dob.getMonth()]}`;
  return dob.toLocaleDateString("en-US", { day: "numeric", month: "long" });
}

export function formatFullDate(dateStr: string | null, locale: Locale = "en"): string | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (locale === "km") return `${d.getDate()} ${KHMER_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
  return d.toLocaleDateString("en-US", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
