import "server-only";
import { unstable_cache } from "next/cache";
import { getZonesAndFacilities } from "@/lib/data/zoo";

// "Today at the zoo": live weather for the park.

const PHNOM_PENH = { lat: 11.5564, lon: 104.9282 };

/** `time` = when the station reading was taken (zoo local time, "YYYY-MM-DDTHH:mm"). */
export type Weather = { temp: number; feels: number; code: number; max: number; min: number; rain: number; uv: number; time: string };

/** Current weather from Open-Meteo (free, no key; model data updated every 15 min), cached 15 min. Null if unreachable. */
const fetchWeather = unstable_cache(
  async (lat: number, lon: number): Promise<Weather> => {
    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
      `&current=temperature_2m,apparent_temperature,weather_code` +
      `&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,uv_index_max` +
      `&timezone=Asia%2FPhnom_Penh&forecast_days=1`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000), cache: "no-store" });
    if (!res.ok) throw new Error(`weather ${res.status}`); // thrown → not cached
    const j = await res.json();
    return {
      temp: Math.round(j.current.temperature_2m),
      feels: Math.round(j.current.apparent_temperature),
      code: j.current.weather_code,
      max: Math.round(j.daily.temperature_2m_max[0]),
      min: Math.round(j.daily.temperature_2m_min[0]),
      rain: j.daily.precipitation_probability_max[0] ?? 0,
      uv: Math.round(j.daily.uv_index_max[0] ?? 0),
      time: j.current.time,
    };
  },
  ["weather"],
  { revalidate: 900 }
);

export async function getWeather(): Promise<Weather | null> {
  try {
    // Use the zoo's own location when the map has been calibrated in Admin.
    const { calibration: c } = await getZonesAndFacilities().catch(() => ({ calibration: null as any }));
    const lat = c?.nwLat && c?.seLat ? (Number(c.nwLat) + Number(c.seLat)) / 2 : PHNOM_PENH.lat;
    const lon = c?.nwLng && c?.seLng ? (Number(c.nwLng) + Number(c.seLng)) / 2 : PHNOM_PENH.lon;
    return await fetchWeather(Math.round(lat * 100) / 100, Math.round(lon * 100) / 100);
  } catch {
    return null;
  }
}
