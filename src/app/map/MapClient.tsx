"use client";

import { useState } from "react";
import { ZooMap, type AnimalMarker } from "@/components/visitor/ZooMap";
import { FriendsPanel } from "@/components/visitor/FriendsPanel";
import { useFriendsGroup } from "@/components/visitor/useFriendsGroup";
import { latLngToMapPercent, accuracyToMapPercent, type MapCalibration } from "@/lib/utils/geoCalibration";
import type { ZooZone, Facility } from "@/types/domain";
import { useI18n } from "@/lib/i18n/client";

export function MapClient({
  zones,
  facilities,
  animals,
  highlightAnimalCode,
  calibration,
  mapImageUrl,
}: {
  zones: ZooZone[];
  facilities: Facility[];
  animals: AnimalMarker[];
  highlightAnimalCode?: string;
  calibration: MapCalibration | null;
  mapImageUrl?: string;
}) {
  const { t } = useI18n();
  const { group, friends, loading, error, createGroup, joinGroup, shareLocation, leaveGroup } = useFriendsGroup();
  const [placingPin, setPlacingPin] = useState(false);
  const [gpsSuggestion, setGpsSuggestion] = useState<{ x: number; y: number; accuracyPercent: number } | null>(null);
  const [gpsNotice, setGpsNotice] = useState<string | null>(null);

  function handlePlacePin(x: number, y: number) {
    shareLocation(x, y);
    setPlacingPin(false);
    setGpsSuggestion(null);
  }

  function startManualPlacing() {
    setGpsSuggestion(null);
    setGpsNotice(null);
    setPlacingPin(true);
  }

  function useMyGps() {
    if (!calibration) {
      startManualPlacing();
      return;
    }
    if (!("geolocation" in navigator)) {
      setGpsNotice(t.friends.gpsUnsupported);
      startManualPlacing();
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { x, y } = latLngToMapPercent(pos.coords.latitude, pos.coords.longitude, calibration);
        const accuracyPercent = accuracyToMapPercent(pos.coords.accuracy, calibration);

        // Well outside the mapped area — GPS drift or the venue's
        // calibration doesn't cover where they are. Don't show a
        // misleading suggestion; fall back to manual tapping.
        if (x < -25 || x > 125 || y < -25 || y > 125) {
          setGpsNotice(t.friends.gpsOutside);
          startManualPlacing();
          return;
        }

        setGpsNotice(null);
        setGpsSuggestion({ x: Math.min(100, Math.max(0, x)), y: Math.min(100, Math.max(0, y)), accuracyPercent });
        setPlacingPin(true);
      },
      () => {
        setGpsNotice(t.friends.gpsFailed);
        startManualPlacing();
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }

  return (
    <div>
      <FriendsPanel
        group={group}
        friendsCount={friends.length}
        loading={loading}
        error={error}
        placingPin={placingPin}
        hasCalibration={!!calibration}
        onCreate={createGroup}
        onJoin={joinGroup}
        onStartPlacing={startManualPlacing}
        onUseGps={useMyGps}
        onLeave={leaveGroup}
      />

      {gpsNotice && (
        <p className="mb-3 rounded-xl bg-accent/20 px-3 py-2 text-xs text-ink/70">{gpsNotice}</p>
      )}

      <ZooMap
        zones={zones}
        facilities={facilities}
        animals={animals}
        friends={friends}
        highlightAnimalCode={highlightAnimalCode}
        placingPin={placingPin}
        onPlacePin={handlePlacePin}
        gpsSuggestion={gpsSuggestion}
        backgroundImageUrl={mapImageUrl}
      />
    </div>
  );
}
