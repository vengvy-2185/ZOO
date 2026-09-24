import { getActiveAnimals } from "@/lib/data/zoo";
import type { QuizAnimal } from "@/components/visitor/AnimalQuiz";

/** The zoo's real animals (with a photo), in the shape the games use. */
export async function getGameAnimals(): Promise<QuizAnimal[]> {
  const animals = (await getActiveAnimals()) as any[];
  return animals
    .filter((a) => a.main_image_url)
    .map((a) => ({
      code: a.animal_code,
      name: a.name,
      name_km: a.khmer_name,
      species: a.species?.common_name ?? null,
      species_km: a.species?.khmer_name ?? null,
      image: a.main_image_url,
    }));
}
