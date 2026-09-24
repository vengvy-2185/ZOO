import { Layers } from "lucide-react";
import { KidsShell } from "@/components/visitor/kids/KidsShell";
import { MemoryGame } from "@/components/visitor/kids/MemoryGame";
import { getGameAnimals } from "@/lib/data/game-animals";

export default async function MemoryPage() {
  return (
    <KidsShell icon={Layers} title={["Memory Match", "ល្បែងចងចាំ"]} subtitle={["Turn over two cards at a time and find the matching animals.", "បើកកាតម្តងពីរ ហើយរកសត្វដែលដូចគ្នា។"]}>
      <MemoryGame animals={await getGameAnimals()} />
    </KidsShell>
  );
}
