import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { unstable_cache } from "next/cache";
import { z } from "zod/v4";
import { getActiveAnimals, getTicketTypes, getZonesAndFacilities, getSettings } from "@/lib/data/zoo";
import { ZOO_EVENTS, OPENING } from "@/lib/data/events";
import { ADOPTION_TIERS } from "@/lib/data/adoption";
import { getWeather } from "@/lib/data/conditions";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { getPrivateSetting, type AiSettings } from "@/lib/server/private-settings";
import type { AssistantReply } from "@/lib/server/assistant";

// "Ask the Zoo" with a real AI (Claude). It answers any question, but for
// anything about the zoo it may only use the facts below, read from our own
// database, so it never makes up a price, an hour or an animal. When no key
// is set (or the AI can't answer), the keyword assistant answers instead.

const MODEL = "claude-opus-5-5";

/** Pages the AI may link to (plus /animals/<code>). */
const PAGES: Record<string, string> = {
  "/": "Home",
  "/animals": "All animals",
  "/map": "Zoo map",
  "/tickets": "Buy tickets",
  "/my-tickets": "My tickets (QR to show at the gate)",
  "/events": "Today's shows and events",
  "/quest": "Animal Quest (find animals, earn points)",
  "/rewards": "Points and rewards",
  "/visit": "Plan your visit (hours, how to get here)",
  "/planner": "Visit planner",
  "/calendar": "Khmer calendar and holidays",
  "/adopt": "Adopt an animal",
  "/conservation": "Protecting endangered animals",
  "/news": "News",
  "/reviews": "Visitor reviews",
  "/faq": "Questions and answers",
  "/contact": "Contact us",
  "/careers": "Jobs at the zoo",
  "/account": "My account",
  "/easy": "Easy Visit (large text)",
};

const Reply = z.object({
  text: z.string(),
  links: z.array(z.object({ label: z.string(), href: z.string() })),
  animal_code: z.string().nullable(),
});

const one = (s: unknown, n = 180) => String(s ?? "").replace(/\s+/g, " ").trim().slice(0, n);

/** Everything the AI knows about the zoo, from the database (refreshed every 10 minutes). */
const knowledge = unstable_cache(
  async () => {
    const [animals, tickets, places, settings, jobs] = await Promise.all([
      getActiveAnimals().catch(() => [] as any[]),
      getTicketTypes().catch(() => [] as any[]),
      getZonesAndFacilities().catch(() => ({ zones: [] as any[], facilities: [] as any[] })),
      getSettings().catch(() => ({ zooProfile: {}, siteContact: {} }) as any),
      createServiceRoleClient().from("hr_jobs").select("title, title_km, salary, openings").eq("open", true).then((r) => r.data ?? [], () => []),
    ]);
    const list = animals as any[];
    const byCategory = new Map<string, number>();
    for (const a of list) {
      const c = a.category?.name ?? "Other";
      byCategory.set(c, (byCategory.get(c) ?? 0) + 1);
    }
    const species = new Set(list.map((a) => a.species?.common_name).filter(Boolean));
    const iucn = new Map<string, number>();
    for (const a of list) if (a.species?.conservation_status) iucn.set(a.species.conservation_status, (iucn.get(a.species.conservation_status) ?? 0) + 1);
    const p = settings.zooProfile ?? {};
    const c = settings.siteContact ?? {};
    const zoneName = new Map(((places as any).zones ?? []).map((z: any) => [z.id, `${z.name}${z.khmer_name ? ` (${z.khmer_name})` : ""}`]));

    return [
      "## The zoo",
      `Name: ${p.zoo_name || "Green Wild Zoo"}${p.tagline ? ` - ${p.tagline}` : ""}`,
      `Opening hours: every day ${p.open_time || OPENING.open} to ${p.close_time || OPENING.close} (Cambodia time).`,
      p.address || p.address_km ? `Address: ${p.address ?? ""}${p.address_km ? ` / ${p.address_km}` : ""}` : "",
      p.phone || c.phone ? `Phone: ${p.phone || c.phone}` : "",
      c.email ? `Email: ${c.email}` : "",
      c.facebook ? `Facebook: ${c.facebook}` : "",
      "",
      "## Tickets (prices in US dollars)",
      ...(tickets as any[]).map((t) => `- ${t.name}${t.name_km ? ` (${t.name_km})` : ""}: ${Number(t.price_usd) === 0 ? "free" : `$${Number(t.price_usd)}`}${t.description ? ` - ${one(t.description, 140)}` : ""}`),
      "Payment: Bakong KHQR (works with every Cambodian banking app: ABA, ACLEDA, Wing and others). Scan the QR on the payment page; the ticket is confirmed the moment the money arrives. You can also pay at the ticket counter.",
      "Bought tickets are in My Tickets (/my-tickets); show the QR code at the entrance. Discount codes are typed on the checkout page; after paying, visitors get a lucky scratch card with a discount for the next visit.",
      "",
      "## Points and rewards",
      "Points come from the Animal Quest (10 per animal found, plus 100 for finding all of them), buying tickets while signed in (1 point per $1) and inviting friends (50 points when a friend buys tickets with your link, with extra bonuses at 3, 5 and 10 friends). Points are swapped for discount codes on the Points & Rewards page.",
      "",
      "## Adopt an animal (yearly support)",
      `Tiers: Friend $${ADOPTION_TIERS.friend}, Guardian $${ADOPTION_TIERS.guardian}, Hero $${ADOPTION_TIERS.hero}. See /adopt.`,
      "",
      "## Daily shows (every day, Cambodia time)",
      ...ZOO_EVENTS.map((e) => `- ${e.start} (${e.minutes} min): ${e.title} (${e.title_km}) at ${e.place} (${e.place_km})${e.days === "daily" ? "" : " - weekends only"}`),
      "",
      "## Numbers (already counted - use these, do not count yourself)",
      `Animals living at the zoo: ${list.length}. Different species: ${species.size}.`,
      `By group: ${[...byCategory].map(([k, v]) => `${k} ${v}`).join(", ")}.`,
      iucn.size ? `By conservation status: ${[...iucn].map(([k, v]) => `${k} ${v}`).join(", ")}.` : "",
      "",
      "## Every animal (code | name | Khmer name | species | Khmer species | group | sex | born | diet | status | about)",
      ...list.map((a) =>
        [
          a.animal_code,
          a.name,
          a.khmer_name ?? "",
          a.species?.common_name ?? "",
          a.species?.khmer_name ?? "",
          a.category?.name ?? "",
          a.sex ?? "",
          a.birth_date ?? a.date_of_birth ?? "",
          one(a.species?.diet ?? a.diet ?? "", 60),
          a.species?.conservation_status ?? "",
          one(a.interesting_facts || a.biography || "", 200),
        ].join(" | ")
      ),
      "",
      "## Zones and places",
      ...((places as any).zones ?? []).map((z: any) => `- Zone ${z.code}: ${z.name}${z.khmer_name ? ` (${z.khmer_name})` : ""}`),
      ...((places as any).facilities ?? []).map((f: any) => `- ${f.type}: ${f.name}${f.khmer_name ? ` (${f.khmer_name})` : ""}${f.zone_id && zoneName.get(f.zone_id) ? ` in ${zoneName.get(f.zone_id)}` : ""}`),
      "",
      "## Jobs open now",
      ...((jobs as any[]).length ? (jobs as any[]).map((j) => `- ${j.title}${j.title_km ? ` (${j.title_km})` : ""}${j.salary ? `, ${j.salary}` : ""}`) : ["None right now."]),
      "",
      "## This website",
      "Created by Mr. Veng Vy (វ៉េង វី). It works in Khmer and English (tap EN or ខ្មែរ at the top). Sign in with Google, Facebook or email; the account page shows tickets, payment history and quest points. Messages to the zoo: Contact Us page.",
      "",
      "## Pages you may link to",
      ...Object.entries(PAGES).map(([href, label]) => `- ${href}: ${label}`),
      "- /animals/<code>: one animal's page (use the code from the list above)",
    ]
      .filter((l) => l !== null && l !== undefined)
      .join("\n");
  },
  ["ai-knowledge-v1"],
  { revalidate: 600, tags: ["animals", "settings", "tickets"] }
);

const RULES = `You are the friendly robot assistant of Green Wild Zoo in Cambodia, chatting with visitors on the zoo's website.

How to answer:
- Reply in the language the visitor uses (Khmer or English). When the site language is Khmer, answer in natural, polite Khmer.
- Keep it short and warm: 1 to 4 sentences, plain text, no headings, no markdown, no emoji spam.
- About the zoo (hours, prices, shows, animals, places, numbers, rules, this website): use ONLY the facts in "Zoo facts" below. Never invent or estimate a price, time, name, number or animal. If a fact is not there, say you are not sure and suggest the Contact Us page or the phone number.
- For counts, use the numbers given in "Numbers" exactly.
- Any other question (general knowledge, animals in the wild, science, everyday help, small talk): answer helpfully and correctly like a general assistant. If you are not certain, say so instead of guessing. Do not help with anything harmful.
- Never claim an animal lives at this zoo unless it is in the animal list.

Output fields:
- text: your answer.
- links: 0 to 3 helpful links, only to pages listed under "Pages you may link to" (or /animals/<code> for an animal in the list). label is short, in the visitor's language.
- animal_code: the code of the one zoo animal the answer is mainly about, else null.`;

/** The AI's answer, or null when it isn't set up / can't answer (the keyword assistant then answers). */
export async function aiAnswer(question: string, lang: "en" | "km", history: { from: "me" | "bot"; text: string }[]): Promise<AssistantReply | null> {
  const s = await getPrivateSetting<AiSettings>("ai").catch(() => ({}) as AiSettings);
  const apiKey = s.api_key || process.env.ANTHROPIC_API_KEY;
  if (!apiKey || s.enabled === false) return null;
  try {
    return await askClaude(apiKey, question, lang, history);
  } catch (e) {
    if (e instanceof Anthropic.AuthenticationError) console.warn("ai assistant: the API key was refused");
    else if (e instanceof Anthropic.RateLimitError) console.warn("ai assistant: rate limited");
    else if (e instanceof Anthropic.APIError) console.warn(`ai assistant: API error ${e.status}`);
    else console.warn("ai assistant:", e);
    return null;
  }
}

/** One answer from Claude (throws on API errors; null when it declines). */
async function askClaude(apiKey: string, question: string, lang: "en" | "km", history: { from: "me" | "bot"; text: string }[]): Promise<AssistantReply | null> {
  {
    const [facts, weather] = await Promise.all([knowledge(), getWeather().catch(() => null)]);
    const now = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Phnom_Penh", dateStyle: "full", timeStyle: "short" }).format(new Date());
    // earlier turns (the visitor's and ours), oldest first, starting with the visitor
    const turns: Anthropic.Beta.BetaMessageParam[] = [];
    for (const h of history.slice(-8)) {
      const role = h.from === "me" ? "user" : "assistant";
      if (!turns.length && role === "assistant") continue;
      const last = turns[turns.length - 1];
      if (last && last.role === role) last.content = `${last.content}\n${h.text}`;
      else turns.push({ role, content: h.text.slice(0, 1000) });
    }
    if (turns.length && turns[turns.length - 1].role === "user") turns.pop();
    turns.push({ role: "user", content: question });

    const client = new Anthropic({ apiKey, timeout: 45_000, maxRetries: 1 });
    const res = await client.beta.messages.parse({
      model: MODEL,
      max_tokens: 4000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "low", format: betaZodOutputFormat(Reply) },
      system: [
        // stable (cached): the rules and the zoo facts
        { type: "text", text: `${RULES}\n\n# Zoo facts\n${facts}`, cache_control: { type: "ephemeral" } },
        // changes every request: after the cached part
        { type: "text", text: `Right now in Cambodia: ${now}.${weather ? ` Weather at the zoo now: ${weather.temp}°C (feels ${weather.feels}°C), today ${weather.min}-${weather.max}°C, chance of rain ${weather.rain}%.` : ""} Site language: ${lang === "km" ? "Khmer" : "English"}.` },
      ],
      messages: turns,
    });
    if (res.stop_reason === "refusal" || !res.parsed_output) return null;
    const out = res.parsed_output;
    const animals = (await getActiveAnimals().catch(() => [])) as any[];
    const km = lang === "km";
    const a = out.animal_code ? animals.find((x) => x.animal_code === out.animal_code) : null;
    const okHref = (h: string) => h in PAGES || (/^\/animals\/[A-Za-z0-9-]+$/.test(h) && animals.some((x) => `/animals/${x.animal_code}` === h));
    return {
      text: out.text.trim(),
      links: out.links.filter((l) => okHref(l.href)).slice(0, 3).map((l) => ({ label: l.label.slice(0, 40), href: l.href })),
      ...(a ? { animal: { code: a.animal_code, name: (km && a.khmer_name) || a.name, species: (km && a.species?.khmer_name) || a.species?.common_name || "", image: a.main_image_url } } : {}),
    };
  }
}

/** Admin "test": the same path the website uses, with a real zoo question. */
export async function testAi(apiKey: string) {
  try {
    const r = await askClaude(apiKey, "សួនសត្វមានសត្វសរុបប៉ុន្មានក្បាល?", "km", []);
    return r ? { ok: true, answer: r.text } : { ok: false, error: "no answer (declined)" };
  } catch (e) {
    return { ok: false, error: e instanceof Anthropic.APIError ? `${e.status}: ${e.message}` : String(e) };
  }
}
