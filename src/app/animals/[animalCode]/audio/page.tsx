import { notFound } from "next/navigation";
import { getAudio as getCachedAudio } from "@/lib/data/zoo";
import { Navbar } from "@/components/visitor/Navbar";
import { BottomNav } from "@/components/visitor/BottomNav";
import { AudioPlayer } from "@/components/visitor/AudioPlayer";
import { getI18n } from "@/lib/i18n/server";
import type { AudioGuide } from "@/types/domain";

const getAudio = getCachedAudio;

export default async function AudioPageRoute({ params }: { params: { animalCode: string } }) {
  const data = await getAudio(params.animalCode);
  if (!data) notFound();
  const { locale } = getI18n();
  const { animal } = data;

  return (
    <div className="min-h-screen bg-gradient-to-b from-light-green to-background pb-24 md:pb-10">
      <Navbar />
      <main className="mx-auto max-w-6xl px-4 py-8 md:px-6 md:py-12">
        <AudioPlayer
          animalCode={animal.animal_code}
          animalName={(locale === "km" && animal.khmer_name) || animal.name}
          guides={data.guides as AudioGuide[]}
          fallbackText={{ en: animal.biography, km: animal.biography_km }}
        />
      </main>
      <BottomNav />
    </div>
  );
}
