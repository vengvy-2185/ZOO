import { existsSync } from "fs";
import path from "path";
import { getSettings } from "@/lib/data/zoo";

// Drop a video at public/login-video.mp4 to use it without any database
// setup; a Video URL saved in Admin → Settings → Branding takes priority.
const LOCAL_VIDEO_FILE = "login-video.mp4";

export interface Branding {
  heroImageUrl?: string;
  heroVideoUrl?: string;
  mapImageUrl?: string;
}

// Server-only: branding media shared by the login screens, the homepage
// hero, and the zoo map background (read from the shared settings cache).
export async function getBranding(): Promise<Branding> {
  const { branding: value } = await getSettings();

  return {
    heroImageUrl: value.login_hero_image_url || undefined,
    heroVideoUrl:
      value.login_hero_video_url ||
      (existsSync(path.join(process.cwd(), "public", LOCAL_VIDEO_FILE)) ? `/${LOCAL_VIDEO_FILE}` : undefined),
    mapImageUrl: value.map_image_url || undefined,
  };
}
