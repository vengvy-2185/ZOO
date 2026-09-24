import { unstable_cache } from "next/cache";
import { createPublicClient } from "@/lib/supabase/public";

// Cached, shared reads of the public zoo data. Each round trip to Supabase
// can take a second or more on a slow connection, so pages read from this
// cache instead: Supabase is queried at most once a minute per query, and
// every admin save calls revalidateTag(ZOO_TAG) so edits appear immediately.
//
// Every query goes through must(): a failed request THROWS instead of
// returning an empty list. unstable_cache never stores a thrown result, so a
// network blip keeps serving the last good data rather than caching
// "nothing" for a minute (which made the whole site look empty).
export const ZOO_TAG = "zoo-data";
const opts = { revalidate: 60, tags: [ZOO_TAG] };

type Res<T> = { data: T; error: { message: string } | null; count?: number | null };
async function must<T>(query: PromiseLike<Res<T>>): Promise<Res<T>> {
  const res = await query;
  if (res.error) throw new Error(`Supabase: ${res.error.message}`);
  return res;
}

export const getCategories = unstable_cache(
  async () => {
    const { data } = await must(createPublicClient().from("animal_categories").select("*").eq("is_active", true).order("sort_order"));
    return data ?? [];
  },
  ["categories"],
  opts
);

export const getActiveAnimals = unstable_cache(
  async () => {
    const { data } = await must(
      createPublicClient()
        .from("animals")
        .select("*, species:species_id(*), category:category_id(*), animal_locations(map_x, map_y, is_current)")
        .eq("status", "active")
        .order("name")
    );
    return data ?? [];
  },
  ["active-animals"],
  opts
);

export const getSpeciesCount = unstable_cache(
  async () => {
    const { count } = await must(createPublicClient().from("species").select("*", { count: "exact", head: true }));
    return count ?? 0;
  },
  ["species-count"],
  opts
);

export const getZonesAndFacilities = unstable_cache(
  async () => {
    const db = createPublicClient();
    const [{ data: zones }, { data: facilities }, { data: cal }] = await Promise.all([
      must(db.from("zoo_zones").select("*").eq("is_active", true).order("code")),
      must(db.from("facilities").select("*").eq("is_active", true)),
      must(db.from("app_settings").select("value").eq("key", "map_calibration").maybeSingle()),
    ]);
    return { zones: zones ?? [], facilities: facilities ?? [], calibration: ((cal as any)?.value ?? null) as any };
  },
  ["zones-facilities"],
  opts
);

export const getTicketTypes = unstable_cache(
  async () => {
    const { data } = await must(createPublicClient().from("ticket_types").select("*").eq("is_active", true).order("sort_order"));
    return data ?? [];
  },
  ["ticket-types"],
  opts
);

export const getSettings = unstable_cache(
  async () => {
    const { data } = await must(createPublicClient().from("app_settings").select("key, value").in("key", ["branding", "zoo_profile"]));
    const byKey = Object.fromEntries((data ?? []).map((r) => [r.key, r.value]));
    return { branding: (byKey.branding ?? {}) as Record<string, any>, zooProfile: (byKey.zoo_profile ?? {}) as Record<string, any> };
  },
  ["settings"],
  opts
);

/** Everything the animal profile page needs, in one cached bundle. */
export const getAnimalProfile = unstable_cache(
  async (animalCode: string) => {
    const db = createPublicClient();
    const { data: animal } = await must(
      db.from("animals").select("*, species:species_id(*), category:category_id(*)").eq("animal_code", animalCode).maybeSingle()
    );
    if (!animal) return null;

    const [{ data: photos }, { data: family }, { data: location }, { data: story }, { data: place }] = await Promise.all([
      must(db.from("animal_photos").select("*").eq("animal_id", animal.id).order("sort_order")),
      must(db.rpc("get_animal_family", { p_animal_id: animal.id })),
      must(db.rpc("get_current_animal_location", { p_animal_id: animal.id })),
      must(db.from("animal_stories").select("id").eq("animal_id", animal.id).eq("is_published", true).maybeSingle()),
      must(
        db
          .from("animal_locations")
          .select("map_x, map_y, zone:zone_id(name, khmer_name), habitat:habitat_id(name, khmer_name), enclosure:enclosure_id(code)")
          .eq("animal_id", animal.id)
          .eq("is_current", true)
          .maybeSingle()
      ),
    ]);
    return {
      animal,
      photos: photos ?? [],
      family: (family ?? []) as any[],
      location: ((location as any[] | null)?.[0] ?? null) as any,
      hasStory: !!story,
      place: place as any,
    };
  },
  ["animal-profile"],
  opts
);

export const getStory = unstable_cache(
  async (animalCode: string) => {
    const db = createPublicClient();
    const { data: animal } = await must(db.from("animals").select("id, name, khmer_name, main_image_url").eq("animal_code", animalCode).maybeSingle());
    if (!animal) return null;
    const { data: story } = await must(db.from("animal_stories").select("*").eq("animal_id", animal.id).eq("is_published", true).maybeSingle());
    if (!story) return { animal, story: null, pages: [] };
    const { data: pages } = await must(db.from("story_pages").select("*").eq("story_id", story.id).order("page_number"));
    return { animal, story, pages: pages ?? [] };
  },
  ["story"],
  opts
);

export const getAudio = unstable_cache(
  async (animalCode: string) => {
    const db = createPublicClient();
    const { data: animal } = await must(
      db.from("animals").select("id, animal_code, name, khmer_name, biography, biography_km").eq("animal_code", animalCode).maybeSingle()
    );
    if (!animal) return null;
    const { data: guides } = await must(db.from("audio_guides").select("*").eq("animal_id", animal.id).eq("is_active", true));
    return { animal, guides: guides ?? [] };
  },
  ["audio"],
  opts
);

/** Transparent animal cut-outs for the Photo Booth. */
export const getBoothStickers = unstable_cache(
  async () => {
    const { data } = await must(
      createPublicClient().from("booth_stickers").select("id, name, khmer_name, image_url").eq("is_active", true).order("sort_order").order("name")
    );
    return (data ?? []) as { id: string; name: string; khmer_name: string | null; image_url: string }[];
  },
  ["booth-stickers"],
  opts
);

export type Review = { id: string; name: string; avatar_url: string | null; rating: number; comment: string; created_at: string };

/** Visible visitor reviews, newest first, plus the rating summary. */
export const getReviews = unstable_cache(
  async () => {
    const { data } = await must(
      createPublicClient()
        .from("reviews")
        .select("id, name, avatar_url, rating, comment, created_at")
        .eq("is_visible", true)
        .order("created_at", { ascending: false })
        .limit(200)
    );
    const reviews = (data ?? []) as Review[];
    const counts = [5, 4, 3, 2, 1].map((star) => ({ star, count: reviews.filter((r) => r.rating === star).length }));
    const average = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;
    return { reviews, counts, average, total: reviews.length };
  },
  ["reviews"],
  opts
);

export type NewsPost = {
  id: string;
  title: string;
  title_km: string | null;
  summary: string | null;
  summary_km: string | null;
  body: string | null;
  body_km: string | null;
  image_url: string | null;
  published_at: string;
};

/** Published news, newest first. */
export const getNews = unstable_cache(
  async () => {
    const { data } = await must(
      createPublicClient()
        .from("news_posts")
        .select("id, title, title_km, summary, summary_km, body, body_km, image_url, published_at")
        .eq("is_published", true)
        .lte("published_at", new Date().toISOString())
        .order("published_at", { ascending: false })
        .limit(50)
    );
    return (data ?? []) as NewsPost[];
  },
  ["news"],
  opts
);
