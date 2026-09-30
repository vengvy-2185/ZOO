"use client";

import { ZooMap, type AnimalMarker } from "@/components/visitor/ZooMap";
import type { MapCalibration } from "@/lib/utils/geoCalibration";
import type { ZooZone, Facility } from "@/types/domain";

export function MapClient({
  zones,
  facilities,
  animals,
  highlightAnimalCode,
  mapImageUrl,
}: {
  zones: ZooZone[];
  facilities: Facility[];
  animals: AnimalMarker[];
  highlightAnimalCode?: string;
  calibration: MapCalibration | null;
  mapImageUrl?: string;
}) {
  return <ZooMap zones={zones} facilities={facilities} animals={animals} highlightAnimalCode={highlightAnimalCode} backgroundImageUrl={mapImageUrl} />;
}
