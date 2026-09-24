// GPS calibration: an admin records the real-world lat/lng of the map
// image's top-left (northwest) and bottom-right (southeast) corners once,
// in Admin → Settings. Everything else (converting a phone's GPS reading
// into an x/y position on the map, and turning GPS accuracy into an
// on-screen "how sure are we" circle) is derived from those two points.
//
// This is a flat linear approximation (fine for small venues — a zoo, a
// shop, a campus — but would drift for anything city-sized or bigger).

export interface MapCalibration {
  nwLat: number;
  nwLng: number;
  seLat: number;
  seLng: number;
}

export function latLngToMapPercent(lat: number, lng: number, cal: MapCalibration) {
  const x = ((lng - cal.nwLng) / (cal.seLng - cal.nwLng)) * 100;
  const y = ((lat - cal.nwLat) / (cal.seLat - cal.nwLat)) * 100;
  return { x, y };
}

// Haversine distance in meters — used to figure out how big the mapped
// area actually is in real life, so a GPS accuracy reading (in meters)
// can be drawn as a correctly-sized circle on the map.
function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export function venueSizeMeters(cal: MapCalibration) {
  const widthMeters = haversineMeters(cal.nwLat, cal.nwLng, cal.nwLat, cal.seLng);
  const heightMeters = haversineMeters(cal.nwLat, cal.nwLng, cal.seLat, cal.nwLng);
  return { widthMeters, heightMeters };
}

// A GPS accuracy radius (meters) expressed as a percentage of the map's
// width — used to draw the "this could be anywhere in this circle" ring
// around a GPS-suggested pin, so the uncertainty is visible rather than
// implying false precision.
export function accuracyToMapPercent(accuracyMeters: number, cal: MapCalibration) {
  const { widthMeters } = venueSizeMeters(cal);
  if (!widthMeters) return 0;
  return (accuracyMeters / widthMeters) * 100;
}
