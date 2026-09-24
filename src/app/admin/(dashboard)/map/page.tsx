import { createClient } from "@/lib/supabase/server";
import { getBranding } from "@/lib/branding";
import { Map as MapIcon } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/ui";
import { getI18n } from "@/lib/i18n/server";
import { MapEditorCanvas } from "./MapEditorCanvas";

export default async function AdminMapPage() {
  const supabase = createClient();

  const [{ data: animals }, { data: facilities }, { mapImageUrl }] = await Promise.all([
    supabase
      .from("animals")
      .select("id, name, category:category_id(icon), animal_locations(map_x, map_y, is_current)")
      .eq("status", "active"),
    supabase.from("facilities").select("*").eq("is_active", true),
    getBranding(),
  ]);

  const markers = [
    ...(animals ?? [])
      .map((a: any) => {
        const loc = (a.animal_locations ?? []).find((l: any) => l.is_current);
        if (!loc) return null;
        return {
          id: a.id,
          kind: "animal" as const,
          label: a.name,
          icon: a.category?.icon ?? "🦁",
          map_x: Number(loc.map_x),
          map_y: Number(loc.map_y),
        };
      })
      .filter(Boolean),
    ...(facilities ?? []).map((f: any) => ({
      id: f.id,
      kind: "facility" as const,
      label: f.name,
      icon: f.icon ?? "📍",
      map_x: Number(f.map_x),
      map_y: Number(f.map_y),
    })),
  ] as any[];

  return (
    <div className="p-8">
      <AdminPageHeader
        icon={MapIcon}
        title={getI18n().t.admin.mapEditor}
        subtitle="Drag any marker to reposition it, then Save Location. To use a real map image, set it in Settings → Branding → Map Image URL."
      />
      <MapEditorCanvas markers={markers} backgroundImageUrl={mapImageUrl} />
    </div>
  );
}
