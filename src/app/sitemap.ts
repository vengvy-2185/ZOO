import type { MetadataRoute } from "next";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { CANONICAL_URL } from "@/lib/site";

const SITE = CANONICAL_URL;

export const revalidate = 3600;

// the public pages, the home page first and most important
const PAGES: [string, number, MetadataRoute.Sitemap[number]["changeFrequency"]][] = [
  ["", 1, "daily"],
  ["/animals", 0.9, "weekly"],
  ["/tickets", 0.9, "weekly"],
  ["/visit", 0.8, "monthly"],
  ["/map", 0.8, "monthly"],
  ["/events", 0.7, "weekly"],
  ["/news", 0.7, "weekly"],
  ["/calendar", 0.6, "monthly"],
  ["/adopt", 0.6, "monthly"],
  ["/careers", 0.6, "weekly"],
  ["/quest", 0.5, "monthly"],
  ["/rewards", 0.5, "monthly"],
  ["/planner", 0.5, "monthly"],
  ["/conservation", 0.5, "monthly"],
  ["/discover", 0.5, "monthly"],
  ["/reviews", 0.5, "weekly"],
  ["/faq", 0.5, "monthly"],
  ["/contact", 0.4, "yearly"],
  ["/easy", 0.4, "yearly"],
];

/** sitemap.xml: every public page, every animal and every news story. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const out: MetadataRoute.Sitemap = PAGES.map(([p, priority, changeFrequency]) => ({ url: `${SITE}${p}`, lastModified: now, changeFrequency, priority }));
  try {
    const db = createServiceRoleClient();
    const [{ data: animals }, { data: news }] = await Promise.all([
      db.from("animals").select("animal_code, updated_at").eq("status", "active"),
      db.from("news_posts").select("id, published_at").eq("is_published", true),
    ]);
    for (const a of animals ?? []) out.push({ url: `${SITE}/animals/${a.animal_code}`, lastModified: new Date(a.updated_at), changeFrequency: "monthly", priority: 0.6 });
    for (const n of news ?? []) out.push({ url: `${SITE}/news/${n.id}`, lastModified: new Date(n.published_at), changeFrequency: "yearly", priority: 0.4 });
  } catch {
    /* the list of pages is enough if the database can't be reached */
  }
  return out;
}
