import * as kh from "@thyrith/momentkh";

// The Khmer lunar calendar (ចន្ទគតិ) and Cambodian holidays, worked out
// from the date itself with the traditional chhankitek rules
// (@thyrith/momentkh), so no year needs to be typed in by hand.

const KH_DIGITS = "០១២៣៤៥៦៧៨៩";
export const khNum = (n: number | string) => String(n).replace(/\d/g, (d) => KH_DIGITS[Number(d)]);
export const KH_SOLAR_MONTHS = ["មករា", "កុម្ភៈ", "មីនា", "មេសា", "ឧសភា", "មិថុនា", "កក្កដា", "សីហា", "កញ្ញា", "តុលា", "វិច្ឆិកា", "ធ្នូ"];
export const KH_WEEKDAYS = ["អាទិត្យ", "ចន្ទ", "អង្គារ", "ពុធ", "ព្រហស្បតិ៍", "សុក្រ", "សៅរ៍"];

export type LunarDay = {
  date: string; // YYYY-MM-DD
  day: number; // 1–15
  waxing: boolean; // កើត / រោច
  phase: string; // "កើត" | "រោច"
  month: string; // ខែភទ្របទ
  monthIndex: number;
  beYear: number;
  animal: string;
  sak: string;
  /** ថ្ងៃសីល: 8 and 15 waxing, 8 and the last day waning */
  sil: boolean;
};

export type Holiday = { date: string; km: string; en: string; kind: "public" | "religious" };

const pad = (n: number) => String(n).padStart(2, "0");
const iso = (y: number, m: number, d: number) => `${y}-${pad(m)}-${pad(d)}`;
const addDays = (d: string, n: number) => {
  const t = new Date(`${d}T12:00:00Z`);
  t.setUTCDate(t.getUTCDate() + n);
  return t.toISOString().slice(0, 10);
};
const daysIn = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate();

const cache = new Map<string, LunarDay>();
export function lunar(date: string): LunarDay {
  const hit = cache.get(date);
  if (hit) return hit;
  const [y, m, d] = date.split("-").map(Number);
  const k = kh.fromGregorian(y, m, d, 12).khmer;
  const waxing = k.moonPhase === kh.MoonPhase.Waxing;
  // the last day of a waning half is 14 or 15: it is a sil day when tomorrow is 1 waxing
  const lastWaning = !waxing && (k.day === 15 || (k.day === 14 && kh.fromGregorian(...(addDays(date, 1).split("-").map(Number) as [number, number, number])).khmer.moonPhase === kh.MoonPhase.Waxing));
  const out: LunarDay = {
    date,
    day: k.day,
    waxing,
    phase: waxing ? "កើត" : "រោច",
    month: k.monthName,
    monthIndex: k.monthIndex,
    beYear: k.beYear,
    animal: k.animalYearName,
    sak: k.sakName,
    sil: k.day === 8 || (waxing && k.day === 15) || lastWaning,
  };
  cache.set(date, out);
  return out;
}

/** "២រោច ខែភទ្របទ" */
export const lunarLabel = (l: LunarDay, withMonth = true) => `${khNum(l.day)}${l.phase}${withMonth ? ` ខែ${l.month}` : ""}`;

const M = kh.MonthIndex;
/**
 * Cambodia's holidays for a Gregorian year: the fixed-date ones, plus the
 * lunar ones found by walking the year's days (Khmer New Year from the
 * chhankitek sun calculation). The government can still move a holiday by
 * decree, so managers may add or remove days by hand as well.
 */
export function holidaysOf(year: number): Holiday[] {
  const out: Holiday[] = [];
  const fixed: [number, number, string, string][] = [
    [1, 1, "ទិវាចូលឆ្នាំសកល", "International New Year's Day"],
    [1, 7, "ទិវាជ័យជម្នះលើរបបប្រល័យពូជសាសន៍", "Victory over Genocide Day"],
    [3, 8, "ទិវានារីអន្តរជាតិ", "International Women's Day"],
    [5, 1, "ទិវាពលកម្មអន្តរជាតិ", "International Labour Day"],
    [5, 14, "ព្រះរាជពិធីបុណ្យចម្រើនព្រះជន្ម ព្រះមហាក្សត្រ", "King's Birthday"],
    [6, 18, "ព្រះរាជពិធីបុណ្យចម្រើនព្រះជន្ម សម្តេចព្រះវររាជមាតា", "Queen Mother's Birthday"],
    [9, 24, "ទិវាប្រកាសរដ្ឋធម្មនុញ្ញ", "Constitution Day"],
    [10, 15, "ទិវាប្រារព្ធពិធីគោរពព្រះវិញ្ញាណក្ខន្ធ ព្រះបរមរតនកោដ្ឋ", "Commemoration of King Father Norodom Sihanouk"],
    [10, 29, "ព្រះរាជពិធីគ្រងព្រះបរមរាជសម្បត្តិ", "Coronation Day"],
    [11, 9, "ពិធីបុណ្យឯករាជ្យជាតិ", "Independence Day"],
    [12, 29, "ទិវាសន្តិភាពនៅកម្ពុជា", "Peace Day in Cambodia"],
  ];
  for (const [m, d, km, en] of fixed) out.push({ date: iso(year, m, d), km, en, kind: "public" });

  // Khmer New Year: the day the new year enters, and the two days after
  const ny = kh.getNewYear(year);
  const nyDay = iso(ny.year, ny.month, ny.day);
  ["មហាសង្ក្រាន្ត", "វារៈវ័នបត", "វារៈឡើងស័ក"].forEach((n, i) => out.push({ date: addDays(nyDay, i), km: `បុណ្យចូលឆ្នាំថ្មី ប្រពៃណីជាតិ (${n})`, en: `Khmer New Year (day ${i + 1})`, kind: "public" }));

  // walk the year for the lunar feasts
  for (let m = 1; m <= 12; m++)
    for (let d = 1; d <= daysIn(year, m); d++) {
      const date = iso(year, m, d);
      const l = lunar(date);
      const is = (day: number, waxing: boolean, month: number) => l.day === day && l.waxing === waxing && l.monthIndex === month;
      if (is(15, true, M.Meak)) out.push({ date, km: "ពិធីបុណ្យមាឃបូជា", en: "Meak Bochea", kind: "religious" });
      if (is(15, true, M.Pisakh)) out.push({ date, km: "ពិធីបុណ្យវិសាខបូជា", en: "Visak Bochea", kind: "public" });
      if (is(4, false, M.Pisakh)) out.push({ date, km: "ព្រះរាជពិធីច្រត់ព្រះនង្គ័ល", en: "Royal Ploughing Ceremony", kind: "public" });
      if (is(1, false, M.Asadh) || is(1, false, M.Tutiyasadh)) out.push({ date, km: "ចូលព្រះវស្សា", en: "Start of Buddhist Lent", kind: "religious" });
      if (is(15, true, M.Assoch)) out.push({ date, km: "ចេញព្រះវស្សា", en: "End of Buddhist Lent", kind: "religious" });
      // Pchum Ben: the last day of waning Phatrabot (the "day of Pchum"), the day before and the day after
      if (l.monthIndex === M.Phatrabot && !l.waxing && lunar(addDays(date, 1)).waxing) {
        out.push({ date: addDays(date, -1), km: "ពិធីបុណ្យភ្ជុំបិណ្ឌ", en: "Pchum Ben", kind: "public" });
        out.push({ date, km: "ពិធីបុណ្យភ្ជុំបិណ្ឌ (ថ្ងៃភ្ជុំ)", en: "Pchum Ben (main day)", kind: "public" });
        out.push({ date: addDays(date, 1), km: "ពិធីបុណ្យភ្ជុំបិណ្ឌ", en: "Pchum Ben", kind: "public" });
      }
      // Water Festival: 14 and 15 waxing Kadeuk and 1 waning
      if (is(14, true, M.Kadeuk) || is(15, true, M.Kadeuk) || is(1, false, M.Kadeuk)) out.push({ date, km: "ព្រះរាជពិធីបុណ្យអុំទូក បណ្តែតប្រទីប និងសំពះព្រះខែ អកអំបុក", en: "Water Festival", kind: "public" });
    }
  const seen = new Set<string>();
  return out
    .filter((h) => {
      const key = `${h.date}|${h.en}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => a.date.localeCompare(b.date));
}

/** Everything a month grid needs. */
export function monthInfo(year: number, month: number) {
  const first = iso(year, month, 1);
  const n = daysIn(year, month);
  const days = Array.from({ length: n }, (_, i) => lunar(iso(year, month, i + 1)));
  const holidays = holidaysOf(year).filter((h) => h.date.startsWith(`${year}-${pad(month)}`));
  const lunarMonths = [...new Set(days.map((d) => d.month))];
  const lead = new Date(`${first}T12:00:00Z`).getUTCDay(); // Sunday first, as on Khmer calendars
  const ny = kh.getNewYear(year);
  return { days, holidays, lunarMonths, lead, last: days[days.length - 1], firstDay: days[0], newYear: ny };
}
