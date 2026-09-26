import { zooToday } from "@/lib/data/gate";

export type Birthday = { animal: any; next: string; days: number; turning: number; month: number; day: number };

const DAY = 86400000;
const utc = (d: string) => Date.parse(`${d}T00:00:00Z`);

/** Every animal's next birthday (in zoo time), soonest first. 29 Feb counts as 28 Feb in other years. */
export function upcomingBirthdays(animals: any[], today = zooToday()): Birthday[] {
  const year = Number(today.slice(0, 4));
  const leap = (y: number) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
  const on = (y: number, m: number, d: number) => `${y}-${String(m).padStart(2, "0")}-${String(m === 2 && d === 29 && !leap(y) ? 28 : d).padStart(2, "0")}`;
  return animals
    .filter((a) => a.date_of_birth && a.show_birthday_publicly !== false)
    .map((a) => {
      const [by, bm, bd] = String(a.date_of_birth).slice(0, 10).split("-").map(Number);
      let y = year;
      if (on(y, bm, bd) < today) y++;
      const next = on(y, bm, bd);
      return { animal: a, next, days: Math.round((utc(next) - utc(today)) / DAY), turning: y - by, month: bm, day: bd };
    })
    .sort((a, b) => a.days - b.days || String(a.animal.name).localeCompare(String(b.animal.name)));
}
