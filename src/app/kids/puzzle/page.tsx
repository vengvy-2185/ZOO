import { Puzzle } from "lucide-react";
import { KidsShell } from "@/components/visitor/kids/KidsShell";
import { AnimalPuzzle } from "@/components/visitor/kids/AnimalPuzzle";
import { getGameAnimals } from "@/lib/data/game-animals";

export default async function PuzzlePage() {
  return (
    <KidsShell icon={Puzzle} title={["Animal Puzzle", "ផ្គុំរូបសត្វ"]} subtitle={["The photo is all mixed up. Swap the pieces to put our animal back together.", "រូបត្រូវបានលាយចូលគ្នា។ ប្តូរបំណែកដើម្បីផ្គុំរូបសត្វឲ្យត្រឹមត្រូវវិញ។"]}>
      <AnimalPuzzle animals={await getGameAnimals()} />
    </KidsShell>
  );
}
