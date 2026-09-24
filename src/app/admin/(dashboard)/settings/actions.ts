"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { ZOO_TAG } from "@/lib/data/zoo";

export async function updateZooProfile(formData: FormData) {
  const supabase = createClient();
  // Merge into the stored profile so keys this form doesn't show are kept.
  const { data: current } = await supabase.from("app_settings").select("value").eq("key", "zoo_profile").maybeSingle();
  const value = {
    ...((current?.value as Record<string, unknown>) ?? {}),
    name: formData.get("name"),
    tagline: formData.get("tagline"),
    opening_time: formData.get("opening_time"),
    closing_time: formData.get("closing_time"),
    address: formData.get("address"),
    address_km: formData.get("address_km"),
    phone: formData.get("phone"),
    currency: "USD",
  };
  await supabase.from("app_settings").upsert({ key: "zoo_profile", value });
  revalidateTag(ZOO_TAG);
  revalidatePath("/admin/settings");
  revalidatePath("/visit");
}

// GPS calibration for the Friends-on-the-Map "Use My GPS" suggestion.
// Two corner coordinates are enough to linearly map any lat/lng within
// the venue onto the map's 0–100% coordinate space — see
// src/lib/utils/geoCalibration.ts for how this gets used.
export async function updateMapCalibration(formData: FormData) {
  const supabase = createClient();
  const nwLat = Number(formData.get("nw_lat"));
  const nwLng = Number(formData.get("nw_lng"));
  const seLat = Number(formData.get("se_lat"));
  const seLng = Number(formData.get("se_lng"));

  if ([nwLat, nwLng, seLat, seLng].some((n) => Number.isNaN(n))) {
    throw new Error("All four coordinates are required and must be numbers.");
  }

  await supabase.from("app_settings").upsert({
    key: "map_calibration",
    value: { nwLat, nwLng, seLat, seLng },
  });
  revalidateTag(ZOO_TAG);
  revalidatePath("/admin/settings");
  revalidatePath("/map");
}

// Optional real photo and/or looping video for the split-screen login pages
// (visitor/staff/admin). Paste public URLs — e.g. upload anywhere in Supabase
// Storage (an existing bucket like animal-images works fine) and paste its
// public URL here. Leave both blank to keep the built-in animated scene.
export async function updateBranding(formData: FormData) {
  const supabase = createClient();
  const imageUrl = String(formData.get("login_hero_image_url") ?? "").trim();
  const videoUrl = String(formData.get("login_hero_video_url") ?? "").trim();
  const mapImageUrl = String(formData.get("map_image_url") ?? "").trim();

  await supabase.from("app_settings").upsert({
    key: "branding",
    value: {
      login_hero_image_url: imageUrl || null,
      login_hero_video_url: videoUrl || null,
      map_image_url: mapImageUrl || null,
    },
  });
  revalidateTag(ZOO_TAG);
  revalidatePath("/");
  revalidatePath("/map");
  revalidatePath("/admin/map");
  revalidatePath("/admin/settings");
  revalidatePath("/account/login");
  revalidatePath("/staff/login");
  revalidatePath("/admin/login");
}
