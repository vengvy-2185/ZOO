import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { zooToday } from "@/lib/data/gate";

// Public, read-only totals for the presentation site (zoo-presentation).
// Only counts and public animal names/photos: no names of visitors or
// staff, no phone numbers, no money. Cached for a minute.

const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET, OPTIONS" };

const load = unstable_cache(
  async () => {
    const db = createServiceRoleClient();
    const count = async (table: string, f?: (q: any) => any) => {
      let q: any = db.from(table).select("*", { count: "exact", head: true });
      if (f) q = f(q);
      const { count: n } = await q;
      return n ?? 0;
    };
    const today = zooToday();
    const from = zooToday(-6);

    const [animals, species, categories, zones, enclosures, ticketTypes, bookings, paidBookings, checkins, discoveries, adoptions, news, staff, reviewRows, gateRows, bookingRows, animalRows] =
      await Promise.all([
        count("animals", (q) => q.eq("status", "active")),
        count("species"),
        count("animal_categories"),
        count("zoo_zones"),
        count("enclosures"),
        count("ticket_types"),
        count("bookings"),
        count("bookings", (q) => q.eq("status", "confirmed")),
        count("visitor_checkins"),
        count("quest_discoveries"),
        count("adoptions"),
        count("news_posts", (q) => q.eq("is_published", true)),
        count("staff_members", (q) => q.eq("status", "active")),
        db.from("reviews").select("rating").eq("is_visible", true),
        db.from("gate_entries").select("entry_date, count").gte("entry_date", from).lte("entry_date", today),
        db.from("bookings").select("created_at").gte("created_at", `${from}T00:00:00+07:00`),
        db
          .from("animals")
          .select("animal_code, name, khmer_name, main_image_url, species(common_name, khmer_name)")
          .eq("status", "active")
          .not("main_image_url", "is", null)
          .order("created_at", { ascending: false })
          .limit(12),
      ]);

    const ratings = ((reviewRows.data ?? []) as { rating: number }[]).map((r) => r.rating);
    const days: { date: string; visitors: number; bookings: number }[] = [];
    for (let i = 6; i >= 0; i--) days.push({ date: zooToday(-i), visitors: 0, bookings: 0 });
    for (const g of (gateRows.data ?? []) as { entry_date: string; count: number }[]) {
      const d = days.find((x) => x.date === g.entry_date);
      if (d) d.visitors += g.count;
    }
    for (const b of (bookingRows.data ?? []) as { created_at: string }[]) {
      const local = new Date(new Date(b.created_at).getTime() + 7 * 3600_000).toISOString().slice(0, 10);
      const d = days.find((x) => x.date === local);
      if (d) d.bookings += 1;
    }

    return {
      updatedAt: new Date().toISOString(),
      today,
      totals: { animals, species, categories, zones, enclosures, ticketTypes, bookings, paidBookings, checkins, discoveries, adoptions, news, staff },
      reviews: { count: ratings.length, average: ratings.length ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10 : null },
      visitorsToday: days[6].visitors,
      week: days,
      animals: ((animalRows.data ?? []) as any[]).map((a) => ({
        code: a.animal_code,
        name: a.name,
        nameKm: a.khmer_name,
        image: a.main_image_url,
        species: a.species?.common_name ?? null,
        speciesKm: a.species?.khmer_name ?? null,
      })),
    };
  },
  ["public-stats"],
  { revalidate: 60 }
);

export async function GET() {
  try {
    return NextResponse.json(await load(), { headers: CORS });
  } catch {
    return NextResponse.json({ error: "unavailable" }, { status: 503, headers: CORS });
  }
}

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}
