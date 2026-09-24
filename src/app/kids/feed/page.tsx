import { Utensils } from "lucide-react";
import { KidsShell } from "@/components/visitor/kids/KidsShell";
import { FeedGame } from "@/components/visitor/kids/FeedGame";
import { getGameAnimals } from "@/lib/data/game-animals";

export default async function FeedPage() {
  return (
    <KidsShell icon={Utensils} title={["Feed the Animals", "ឲ្យចំណីសត្វ"]} subtitle={["Every animal is hungry! Choose the food each of our animals really eats.", "សត្វទាំងអស់ឃ្លានហើយ! ជ្រើសចំណីដែលសត្វនីមួយៗស៊ីពិតប្រាកដ។"]}>
      <FeedGame animals={await getGameAnimals()} />
    </KidsShell>
  );
}
