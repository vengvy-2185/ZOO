"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const SESSION_KEY = "gwz_quest_session_id";

async function getOrCreateSession(): Promise<string> {
  const existing = localStorage.getItem(SESSION_KEY);
  if (existing) return existing;

  const supabase = createClient();
  const { data } = await supabase.from("quest_sessions").insert({}).select("id").single();
  if (data) {
    localStorage.setItem(SESSION_KEY, data.id);
    return data.id;
  }
  throw new Error("Could not start quest session");
}

export function QuestDiscoveryTrigger({ animalId, animalName }: { animalId: string; animalName: string }) {
  const [awarded, setAwarded] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const sessionId = await getOrCreateSession();
        const supabase = createClient();
        const { data } = await supabase.rpc("add_quest_discovery", {
          p_session_id: sessionId,
          p_animal_id: animalId,
          p_points: 10,
        });
        if (!cancelled && data?.[0]?.awarded) {
          setAwarded(data[0].total_points);
        }
      } catch {
        // Quest points are a bonus feature — never block the profile from showing.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [animalId]);

  if (awarded === null) return null;

  return (
    <div className="fixed bottom-20 left-1/2 z-50 -translate-x-1/2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-lg md:bottom-6">
      +10 points! You discovered {animalName} 🎉 ({awarded} total)
    </div>
  );
}
