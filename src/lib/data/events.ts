// Daily programme of shows, feedings and keeper talks. Times are local zoo
// time (Asia/Phnom_Penh). Edit this list to change the schedule.
export interface ZooEvent {
  id: string;
  start: string; // "HH:MM"
  minutes: number;
  days: "daily" | "weekends";
  title: string;
  title_km: string;
  place: string;
  place_km: string;
  animalCode: string | null;
  image: string;
  icon: "bath" | "bird" | "meat" | "mic" | "fish" | "leaf" | "walk" | "water";
}

export const ZOO_EVENTS: ZooEvent[] = [
  { id: "elephant-bath", start: "09:00", minutes: 30, days: "daily", title: "Elephant Bath Time", title_km: "ពេលងូតទឹករបស់ដំរី", place: "Elephant Yard, Zone A", place_km: "ទីធ្លាដំរី តំបន់ A", animalCode: "ELEP-A-003", image: "/animals/milo-2.jpg", icon: "bath" },
  { id: "bird-show", start: "10:00", minutes: 30, days: "daily", title: "Tropical Bird Show", title_km: "កម្មវិធីសម្តែងបក្សីត្រូពិច", place: "Tropical Aviary, Zone B", place_km: "ទ្រុងបក្សីត្រូពិច តំបន់ B", animalCode: "MACW-B-006", image: "/animals/rio-1.jpg", icon: "bird" },
  { id: "lion-feeding", start: "11:00", minutes: 20, days: "daily", title: "Lion Feeding", title_km: "ការផ្តល់ចំណីសិង្ហ", place: "Lion Habitat, Zone A", place_km: "ទីជម្រកសិង្ហ តំបន់ A", animalCode: "LION-A-001", image: "/animals/koma-1.jpg", icon: "meat" },
  { id: "croc-talk", start: "13:30", minutes: 20, days: "daily", title: "Keeper Talk: Crocodiles", title_km: "អ្នកថែទាំនិយាយអំពីក្រពើ", place: "Reptile House, Zone C", place_km: "ផ្ទះសត្វល្មូន តំបន់ C", animalCode: "CROC-C-009", image: "/animals/coco-1.jpg", icon: "mic" },
  { id: "flamingo", start: "14:30", minutes: 20, days: "daily", title: "Flamingo Parade", title_km: "ក្បួនក្រៀលផ្កាឈូក", place: "Flamingo Lagoon, Zone B", place_km: "បឹងក្រៀលផ្កាឈូក តំបន់ B", animalCode: "FLAM-B-007", image: "/animals/maya-1.jpg", icon: "water" },
  { id: "tiger-pool", start: "15:30", minutes: 30, days: "daily", title: "Tiger Pool Time", title_km: "ពេលខ្លាហែលទឹក", place: "Tiger Habitat, Zone A", place_km: "ទីជម្រកខ្លា តំបន់ A", animalCode: "TIGER-A-002", image: "/animals/luna-2.jpg", icon: "water" },
  { id: "shark-feed", start: "16:00", minutes: 15, days: "daily", title: "Shark Feeding Demo", title_km: "ការបង្ហាញការផ្តល់ចំណីត្រីឆ្លាម", place: "Aquarium, Zone D", place_km: "អាងសត្វទឹក តំបន់ D", animalCode: "SHRK-D-010", image: "/animals/finn-1.jpg", icon: "fish" },
  { id: "giraffe-feed", start: "16:30", minutes: 30, days: "daily", title: "Feed the Giraffes", title_km: "ផ្តល់ចំណីហ្សីរ៉ាហ្វ", place: "Giraffe Savanna, Zone A", place_km: "វាលហ្សីរ៉ាហ្វ តំបន់ A", animalCode: "GIRA-A-004", image: "/animals/nala-1.jpg", icon: "leaf" },
  { id: "sunset-walk", start: "17:00", minutes: 45, days: "weekends", title: "Sunset Safari Walk", title_km: "ដើរទស្សនាពេលថ្ងៃលិច", place: "Main Entrance", place_km: "ច្រកចូលសំខាន់", animalCode: null, image: "/animals/luna-1.jpg", icon: "walk" },
];

/** Minutes since midnight and weekday in the zoo's own time zone. */
export function zooNow(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Phnom_Penh",
    hour: "2-digit",
    minute: "2-digit",
    weekday: "short",
    hour12: false,
  }).formatToParts(date);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const weekday = get("weekday");
  return { minutes: Number(get("hour")) * 60 + Number(get("minute")), weekend: weekday === "Sat" || weekday === "Sun" };
}

export function toMinutes(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

export type EventStatus = "now" | "next" | "later" | "done";

/** Today's events (weekend-only ones dropped on weekdays) with a live status. */
export function todaysEvents(date = new Date()) {
  const { minutes, weekend } = zooNow(date);
  const list = ZOO_EVENTS.filter((e) => e.days === "daily" || weekend);
  let nextMarked = false;
  return list.map((e) => {
    const s = toMinutes(e.start);
    let status: EventStatus;
    if (minutes >= s && minutes < s + e.minutes) status = "now";
    else if (minutes >= s + e.minutes) status = "done";
    else if (!nextMarked) {
      status = "next";
      nextMarked = true;
    } else status = "later";
    return { ...e, status, startsInMin: s - minutes };
  });
}

export const OPENING = { open: "08:00", close: "18:00" };
