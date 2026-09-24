import { getActiveAnimals } from "@/lib/data/zoo";
import { dayNumber } from "@/lib/data/invites";
import { zooToday } from "@/lib/data/gate";
import { getI18n } from "@/lib/i18n/server";
import { AnimalSpotlight, type SpotlightAnimal } from "./AnimalSpotlight";

/**
 * A different resident in the spotlight every day (rotates through all
 * active animals), plus a "meet another" button to keep browsing.
 */
export async function AnimalOfTheDay() {
  const animals = (await getActiveAnimals()) as any[];
  const withPhoto = animals.filter((a) => a.main_image_url);
  if (!withPhoto.length) return null;
  const { locale, t } = getI18n();
  const km = locale === "km";
  const c = t.conditions;
  const start = dayNumber(zooToday()) % withPhoto.length;
  // Today's animal first, then the rest in a fixed daily order (a big step so neighbours differ).
  const step = withPhoto.length > 7 ? 7 : 1;
  const order: SpotlightAnimal[] = [];
  for (let i = 0; i < Math.min(12, withPhoto.length); i++) {
    const a = withPhoto[(start + i * step) % withPhoto.length];
    if (order.some((o) => o.code === a.animal_code)) continue;
    const factText: string | null = (km && a.interesting_facts_km) || a.interesting_facts || (km && a.personality_km) || a.personality || null;
    order.push({
      code: a.animal_code,
      name: (km && a.khmer_name) || a.name,
      species: (km && a.species?.khmer_name) || a.species?.common_name || null,
      image: a.main_image_url,
      fact: factText?.split(/(?<=[.!?។])\s+/)[0] ?? null,
    });
  }

  return (
    <AnimalSpotlight
      animals={order}
      labels={{ title: c.animalOfDay, meet: c.meet, listen: c.listen, next: c.nextAnimal, another: km ? "ជួបសត្វមួយទៀត" : "Meet another animal", today: km ? "ថ្ងៃនេះ" : "Today" }}
    />
  );
}
