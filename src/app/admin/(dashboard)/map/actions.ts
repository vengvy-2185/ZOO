"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { ZOO_TAG } from "@/lib/data/zoo";

// Authorized purely by RLS (locations_admin_write / facilities_admin_write
// in 0003_rls.sql) — this action itself carries no special privilege.
export async function saveMarkerPosition(kind: "animal" | "facility", id: string, x: number, y: number) {
  const supabase = createClient();

  if (kind === "animal") {
    const { data: current } = await supabase
      .from("animal_locations")
      .select("id")
      .eq("animal_id", id)
      .eq("is_current", true)
      .maybeSingle();

    if (current) {
      await supabase.from("animal_locations").update({ map_x: x, map_y: y }).eq("id", current.id);
    }
  } else {
    await supabase.from("facilities").update({ map_x: x, map_y: y }).eq("id", id);
  }

  revalidateTag(ZOO_TAG);
  revalidatePath("/admin/map");
  revalidatePath("/map");
}
