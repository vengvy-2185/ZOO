import { Map as MapIcon } from "lucide-react";
import { getZonesAndFacilities, getActiveAnimals } from "@/lib/data/zoo";
import { getBranding } from "@/lib/branding";
import { Navbar } from "@/components/visitor/Navbar";
import { BottomNav } from "@/components/visitor/BottomNav";
import { PageHeader } from "@/components/visitor/PageHeader";
import { SiteFooter } from "@/components/visitor/SiteFooter";
import { MapClient } from "./MapClient";
import { getI18n } from "@/lib/i18n/server";
import type { AnimalMarker } from "@/components/visitor/ZooMap";
import type { MapCalibration } from "@/lib/utils/geoCalibration";
import type { ZooZone, Facility } from "@/types/domain";

export const revalidate = 30;

async function getMapData() {
  const [{ zones, facilities, calibration: calValue }, animals] = await Promise.all([getZonesAndFacilities(), getActiveAnimals()]);

  const animalMarkers: AnimalMarker[] = (animals as any[])
    .map((a) => {
      const loc = (a.animal_locations ?? []).find((l: any) => l.is_current);
      if (!loc) return null;
      return {
        id: a.id,
        animal_code: a.animal_code,
        name: a.name,
        name_km: a.khmer_name,
        image: a.main_image_url,
        categorySlug: a.category?.slug ?? null,
        map_x: loc.map_x,
        map_y: loc.map_y,
      };
    })
    .filter(Boolean) as AnimalMarker[];

  const calibration: MapCalibration | null =
    calValue && calValue.nwLat != null && calValue.seLat != null
      ? { nwLat: calValue.nwLat, nwLng: calValue.nwLng, seLat: calValue.seLat, seLng: calValue.seLng }
      : null;

  return {
    zones: zones as ZooZone[],
    facilities: facilities as Facility[],
    animals: animalMarkers,
    calibration,
  };
}

export default async function MapPage() {
  const [{ zones, facilities, animals, calibration }, { mapImageUrl }] = await Promise.all([getMapData(), getBranding()]);
  const { t } = getI18n();

  return (
    <div className="pb-20 md:pb-0">
      <Navbar />
      <PageHeader
        icon={MapIcon}
        eyebrow={t.map.eyebrow}
        title={t.map.title}
        subtitle={t.map.subtitle}
      />
      <main className="relative z-10 mx-auto -mt-4 max-w-7xl px-4 md:px-6">
        <MapClient zones={zones} facilities={facilities} animals={animals} calibration={calibration} mapImageUrl={mapImageUrl} />
      </main>
      <SiteFooter />
      <BottomNav />
    </div>
  );
}
