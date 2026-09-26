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

// Contact details, social links, footer text and the site-wide notice bar.
export async function updateSiteContact(formData: FormData) {
  const supabase = createClient();
  const url = (k: string) => {
    const v = String(formData.get(k) ?? "").trim().slice(0, 300);
    if (!v) return "";
    return /^https?:\/\//i.test(v) ? v : `https://${v}`;
  };
  const txt = (k: string, n = 300) => String(formData.get(k) ?? "").trim().slice(0, n);
  const value = {
    facebook: url("facebook"),
    instagram: url("instagram"),
    youtube: url("youtube"),
    tiktok: url("tiktok"),
    telegram: url("telegram"),
    email: txt("email", 120),
    phone2: txt("phone2", 40),
    map_link: url("map_link"),
    about_en: txt("about_en", 400),
    about_km: txt("about_km", 400),
    notice_on: formData.get("notice_on") === "on",
    notice_en: txt("notice_en", 200),
    notice_km: txt("notice_km", 200),
    notice_link: txt("notice_link", 300),
    notice_color: ["green", "amber", "red", "blue"].includes(txt("notice_color")) ? txt("notice_color") : "green",
  };
  const { error } = await supabase.from("app_settings").upsert({ key: "site_contact", value });
  if (error) throw new Error(error.message);
  revalidateTag(ZOO_TAG);
  revalidatePath("/", "layout");
}

// Scratch card campaign: discount range, number of winners and dates.
export async function saveScratchSettings(formData: FormData) {
  const supabase = createClient();
  const n = (k: string, d: number, min: number, max: number) => {
    const raw = String(formData.get(k) ?? "").trim();
    const v = Number(raw);
    return raw !== "" && Number.isFinite(v) ? Math.round(Math.min(max, Math.max(min, v))) : d;
  };
  const day = (k: string) => {
    const v = String(formData.get(k) ?? "");
    return /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : "";
  };
  const txt = (k: string) => String(formData.get(k) ?? "").trim().slice(0, 200);
  let min_pct = n("min_pct", 5, 1, 100);
  let max_pct = n("max_pct", 25, 1, 100);
  if (min_pct > max_pct) [min_pct, max_pct] = [max_pct, min_pct];
  let start_date = day("start_date");
  let end_date = day("end_date");
  if (start_date && end_date && start_date > end_date) [start_date, end_date] = [end_date, start_date];
  const value = {
    enabled: formData.get("enabled") === "on",
    min_pct,
    max_pct,
    winners: n("winners", 100, 0, 100000),
    start_date,
    end_date,
    valid_days: n("valid_days", 60, 1, 365),
    thanks_en: txt("thanks_en"),
    thanks_km: txt("thanks_km"),
  };
  const { error } = await supabase.from("app_settings").upsert({ key: "scratch_card", value });
  if (error) throw new Error(error.message);
  revalidatePath("/admin/discounts");
}
