import "server-only";
import { getActiveAnimals, getTicketTypes, getZonesAndFacilities, getSettings, getReviews, getNews } from "@/lib/data/zoo";
import { todaysEvents, OPENING } from "@/lib/data/events";
import { getWeather } from "@/lib/data/conditions";
import { zooToday } from "@/lib/data/gate";
import { dayNumber } from "@/lib/data/invites";
import { ADOPTION_TIERS } from "@/lib/data/adoption";
import { dictionaries } from "@/lib/i18n/dictionaries";

// "Ask the Zoo": a fast assistant that answers from the zoo's own data
// (hours, prices, today's shows, weather, every animal, news, the FAQ) and
// handles friendly small talk. No outside AI service: answers are always
// about THIS zoo, cost nothing, and it politely declines anything else.
// It understands English and Khmer (and tolerates common Khmer spelling swaps).

type Lang = "en" | "km";
export type AssistantReply = {
  text: string;
  links?: { label: string; href: string }[];
  animal?: { code: string; name: string; species: string; image: string | null };
};

// Khmer consonants that sound alike and are often swapped when typing
// (e.g. "គូម៉ា" for "កូម៉ា"): compare text in a normalised form.
const SOUND_ALIKE: Record<string, string> = { "គ": "ក", "ឃ": "ខ", "ជ": "ច", "ឈ": "ឆ", "ទ": "ត", "ធ": "ថ", "ព": "ប", "ភ": "ផ", "ូ": "ុ" };
const norm = (s: string) => s.toLowerCase().replace(/[គឃជឈទធពភូ]/g, (c) => SOUND_ALIKE[c] ?? c);
const has = (q: string, words: string[]) => words.some((w) => q.includes(norm(w)));
const pick = <T,>(list: T[]) => list[Math.floor(Math.random() * list.length)];

const WORDS = {
  creator: ["who made", "who created", "who built", "who developed", "developer", "creator", "made this", "built this", "website owner", "អ្នកណាបង្កើត", "នរណាបង្កើត", "អ្នកបង្កើត", "បង្កើតដោយ", "អ្នកណាធ្វើ", "អ្នកសរសេរ", "អ្នកអភិវឌ្ឍ", "ម្ចាស់វេបសាយ", "ម្ចាស់គេហទំព័រ"],
  whoAreYou: ["who are you", "what are you", "your name", "are you a bot", "are you human", "are you real", "អ្នកជានរណា", "អ្នកជាអ្វី", "អ្នកឈ្មោះអ្វី", "ឈ្មោះអ្វី", "ជាមនុស្សទេ", "ជារ៉ូបូត"],
  love: ["girlfriend", "boyfriend", "single", "marry", "love you", "crush", "date me", "សង្សារ", "ស្រឡាញ់អ្នក", "រៀបការ", "លីវ", "ប្តីប្រពន្ធ", "មានគូ", "ស្រឡាញ់ខ្ញុំ"],
  joke: ["joke", "funny", "make me laugh", "something fun", "កំប្លែង", "លេងសើច", "សើច", "រឿងលេង"],
  howAreYou: ["how are you", "how r u", "how's it going", "how are u", "សុខសប្បាយ", "សុខទេ", "ធ្វើអ្វីហ្នឹង", "ធ្វើអីហ្នឹង"],
  weather: ["weather", "rain", "hot", "sunny", "temperature", "umbrella", "អាកាសធាតុ", "ភ្លៀង", "ក្តៅ", "សីតុណ្ហភាព", "ឆ័ត្រ"],
  hours: ["open", "close", "hour", "what time", "opening", "ម៉ោង", "បើក", "បិទ"],
  payment: ["khqr", "aba", "acleda", "wing", "bakong", "credit card", "cash", "how to pay", "payment", "ធនាគារ", "ការបង់ប្រាក់", "បង់ប្រាក់យ៉ាង", "បង់ដោយ", "សាច់ប្រាក់"],
  price: ["price", "ticket", "cost", "how much", "fee", "buy", "book", "តម្លៃ", "សំបុត្រ", "ប៉ុន្មាន", "លុយ", "ទិញ", "កក់"],
  discount: ["discount", "promo", "coupon", "voucher", "cheaper", "scratch", "បញ្ចុះ", "ប្រូម៉ូសិន", "កូដ", "កាតកោស"],
  events: ["feed", "show", "event", "schedule", "talk", "what's on", "whats on", "happening", "ចំណី", "កម្មវិធី", "សម្តែង", "ព្រឹត្តិការណ៍", "កាលវិភាគ"],
  myTickets: ["my ticket", "lost ticket", "find my ticket", "where is my ticket", "show qr", "សំបុត្ររបស់ខ្ញុំ", "បាត់សំបុត្រ", "រកសំបុត្រ"],
  account: ["login", "log in", "sign in", "sign up", "register", "account", "profile", "password", "change my name", "change name", "avatar", "គណនី", "ចូលគណនី", "ចុះឈ្មោះ", "ពាក្យសម្ងាត់", "ប្តូរឈ្មោះ", "ប្តូររូប", "ប្រវត្តិរូប"],
  adopt: ["adopt", "sponsor", "donate", "support an animal", "ឧបត្ថម្ភ", "បរិច្ចាគ", "ជួយសត្វ"],
  booth: ["photo booth", "selfie", "take a photo", "take photo", "picture with", "ថតរូប", "សែលហ្វី", "រូបថតជាមួយ"],
  games: ["quiz", "game", "games", "for kids", "children", "kids", "which animal am i", "ល្បែង", "ហ្គេម", "សម្រាប់កុមារ", "ក្មេង", "កូនតូច"],
  food: ["food", "eat", "restaurant", "cafe", "coffee", "hungry", "drink", "snack", "អាហារ", "ញ៉ាំ", "ឃ្លាន", "ហាងកាហ្វេ", "ភេសជ្ជៈ", "ភោជនីយដ្ឋាន"],
  toilet: ["toilet", "restroom", "bathroom", "wc", "washroom", "បង្គន់", "បន្ទប់ទឹក"],
  parking: ["parking", "park my", "car park", "motorbike", "ចំណត", "ចតរថយន្ត", "ចតម៉ូតូ"],
  contact: ["phone", "contact", "call", "email", "telephone", "number", "ទូរស័ព្ទ", "ទំនាក់ទំនង", "លេខទូរស័ព្ទ", "អ៊ីមែល"],
  address: ["address", "how to get", "get there", "directions to the zoo", "where is the zoo", "location of the zoo", "អាសយដ្ឋាន", "ធ្វើដំណើរទៅ", "សួនសត្វនៅឯណា", "សួនសត្វនៅណា", "ទៅដល់"],
  where: ["where", "map", "find", "location", "direction", "នៅឯណា", "នៅណា", "ផែនទី", "ទីតាំង", "ផ្លូវ", "កន្លែងណា"],
  news: ["news", "latest", "what's new", "whats new", "ព័ត៌មាន", "ដំណឹង"],
  reviews: ["review", "rating", "stars", "good zoo", "is it good", "មតិ", "ផ្កាយ", "ល្អទេ"],
  recommend: ["recommend", "suggest", "what should i see", "must see", "best animal", "favourite animal", "favorite animal", "ណែនាំ", "គួរមើល", "គួរទៅមើល", "ល្អមើលជាងគេ"],
  fact: ["fun fact", "interesting", "did you know", "tell me something", "teach me", "ការពិត", "គួរឱ្យចាប់អារម្មណ៍", "គួរឲ្យចាប់អារម្មណ៍", "ដឹងទេ", "ចំណេះដឹង"],
  count: ["how many animals", "number of animals", "how many species", "សត្វប៉ុន្មាន", "ប៉ុន្មានក្បាល", "ចំនួនសត្វ"],
  animals: ["which animals", "what animals", "list of animals", "all animals", "animals do you have", "សត្វអ្វីខ្លះ", "សត្វណាខ្លះ", "មានសត្វ"],
  language: ["english", "khmer language", "change language", "language", "ភាសា", "អង់គ្លេស", "ភាសាខ្មែរ"],
  bye: ["bye", "goodbye", "see you", "good night", "លាហើយ", "លាសិន", "ជួបគ្នា", "រាត្រីសួស្តី"],
  hello: ["hello", "hi ", " hi", "hey", "good morning", "good afternoon", "good evening", "សួស្តី", "ជម្រាបសួរ", "សួរស្តី"],
  thanks: ["thank", "thanks", "thx", "អរគុណ", "អគុណ"],
};

// Everyday words people use for each kind of animal (matched against the
// English species name), e.g. "តោ" for the lion even though the species is "សិង្ហ".
const ALIASES: [string, string[]][] = [
  ["lion", ["lion", "តោ", "សិង្ហ"]],
  ["tiger", ["tiger", "ខ្លាស", "ខ្លាធំ"]],
  ["elephant", ["elephant", "ដំរី"]],
  ["giraffe", ["giraffe", "ហ្សីរ៉ាហ្វ", "ហ្ស៊ីរ៉ាហ្វ"]],
  ["panda", ["panda", "ផេនដា"]],
  ["macaw", ["macaw", "parrot", "សេក"]],
  ["shark", ["shark", "ឆ្លាម"]],
  ["flamingo", ["flamingo", "ក្រៀល"]],
  ["peacock", ["peacock", "ក្ងោក"]],
  ["crocodile", ["crocodile", "croc", "ក្រពើ"]],
];

const JOKES: { en: string; km: string }[] = [
  { en: "Why don't elephants use computers? They're afraid of the mouse!", km: "ហេតុអ្វីដំរីមិនប្រើកុំព្យូទ័រ? ព្រោះវាខ្លាចកណ្តុរ (mouse)!" },
  { en: "What do you call a lion who tells jokes? A roar of laughter!", km: "ហៅសិង្ហដែលចូលចិត្តនិយាយកំប្លែងថាអ្វី? សិង្ហគ្រហឹមសើច!" },
  { en: "Why are giraffes so slow to apologise? It takes them a long time to swallow their pride.", km: "ហេតុអ្វីហ្សីរ៉ាហ្វសុំទោសយឺត? ព្រោះកវែងពេក ពាក្យសុំទោសចុះមកយូរណាស់!" },
  { en: "What do you call a crocodile in a vest? An investigator!", km: "ក្រពើពាក់អាវ vest ហៅថាអ្វី? អ្នកស៊ើបអង្កេត (investigator)!" },
  { en: "Why do parrots talk so much? They never pay a phone bill!", km: "ហេតុអ្វីសេកចេះនិយាយច្រើន? ព្រោះវាមិនដែលបង់ថ្លៃទូរស័ព្ទ!" },
  { en: "What's a tiger's favourite day? Feeding day, of course!", km: "ខ្លាចូលចិត្តថ្ងៃណាជាងគេ? ថ្ងៃដែលមានការផ្តល់ចំណី!" },
];

/** Character-trigram similarity: works for English words and for Khmer (no spaces). */
function similarity(a: string, b: string) {
  const grams = (s: string) => {
    const t = s.replace(/[\s?.!,។៖]+/g, " ").trim();
    const set = new Set<string>();
    for (let i = 0; i < t.length - 2; i++) set.add(t.slice(i, i + 3));
    return set;
  };
  const A = grams(a);
  const B = grams(b);
  if (!A.size || !B.size) return 0;
  let common = 0;
  A.forEach((g) => B.has(g) && common++);
  return common / Math.min(A.size, B.size);
}

export async function answer(question: string, lang: Lang): Promise<AssistantReply> {
  const km = lang === "km";
  const L = (en: string, kh: string) => (km ? kh : en);
  const t = dictionaries[lang];
  const q = ` ${norm(question.trim())} `;
  const money = (n: number) => (n === 0 ? t.common.free : `$${n.toFixed(2).replace(/\.00$/, "")}`);
  const animals = (await getActiveAnimals().catch(() => [])) as any[];
  const nameOf = (a: any) => (km && a.khmer_name) || a.name;
  const speciesOf = (a: any) => (km && a.species?.khmer_name) || a.species?.common_name || "";
  const firstSentence = (s: string) => s.split(/(?<=[.!?។])\s+/)[0];
  const animalCard = (a: any) => ({ code: a.animal_code, name: nameOf(a), species: speciesOf(a), image: a.main_image_url });

  // ── Small talk and questions about the website itself ──
  if (has(q, WORDS.creator)) {
    return {
      text: L(
        "The Green Wild Zoo website was created by Mr. Veng Vy (វ៉េង វី). He built it so every visitor can explore, learn and plan a wonderful day at the zoo.",
        "គេហទំព័រ Green Wild Zoo ត្រូវបានបង្កើតឡើងដោយលោក វ៉េង វី (Veng Vy)។ លោកបានបង្កើតវា ដើម្បីឲ្យភ្ញៀវគ្រប់រូបអាចរុករក រៀនសូត្រ និងរៀបចំថ្ងៃដ៏រីករាយនៅសួនសត្វ។"
      ),
    };
  }
  if (has(q, WORDS.whoAreYou)) {
    return { text: L("I'm the Green Wild Zoo assistant. I know our animals, tickets, shows and everything on this website, and I'm happy to help you any time, day or night.", "ខ្ញុំជាជំនួយការរបស់ Green Wild Zoo។ ខ្ញុំស្គាល់សត្វ សំបុត្រ កម្មវិធី និងអ្វីៗទាំងអស់នៅលើគេហទំព័រនេះ ហើយរីករាយជួយអ្នកគ្រប់ពេល ទាំងថ្ងៃ ទាំងយប់។") };
  }
  if (has(q, WORDS.love)) {
    return {
      text: pick([
        L("Ha ha! My heart already belongs to the animals. Koma the lion keeps asking me out, but I'm too busy answering questions!", "ហាហា! បេះដូងខ្ញុំជារបស់សត្វៗទាំងអស់ហើយ។ សិង្ហកូម៉ាចេះតែសុំណាត់ខ្ញុំ តែខ្ញុំរវល់ឆ្លើយសំណួរពេក!"),
        L("I'm single and happily married to this zoo! But I can help you plan a perfect date here. Sunset walks are very romantic.", "ខ្ញុំនៅលីវ ហើយរៀបការជាមួយសួនសត្វនេះរួចហើយ! តែខ្ញុំអាចជួយរៀបចំការណាត់ជួបដ៏ល្អនៅទីនេះ។ ការដើរលេងពេលថ្ងៃលិចរ៉ូមែនទិកណាស់។"),
      ]),
      links: [{ label: L("Plan your day", "រៀបចំថ្ងៃទស្សនា"), href: "/planner" }],
    };
  }
  if (has(q, WORDS.joke)) {
    const j = pick(JOKES);
    return { text: `${km ? j.km : j.en} ${L("Want another one? Just ask!", "ចង់បានមួយទៀតទេ? សួរមកបាន!")}` };
  }
  if (has(q, WORDS.howAreYou)) {
    return { text: pick([L("I'm doing great, thank you! The animals are happy today too. How can I help with your visit?", "ខ្ញុំសុខសប្បាយណាស់ អរគុណ! សត្វៗក៏រីករាយដែរថ្ងៃនេះ។ តើខ្ញុំអាចជួយអ្វីសម្រាប់ការមកលេងរបស់អ្នក?"), L("Wonderful, thanks for asking! The giraffes say hello. What would you like to know?", "ល្អណាស់ អរគុណដែលបានសួរ! ហ្សីរ៉ាហ្វផ្ញើការជម្រាបសួរមក។ តើអ្នកចង់ដឹងអំពីអ្វី?")]) };
  }

  // ── A specific animal (by name, Khmer name, species or everyday word) ──
  const byName = animals.find((a) =>
    [a.name, a.khmer_name, a.species?.common_name, String(a.species?.khmer_name ?? "").replace(/^សត្វ/, "")]
      .filter(Boolean)
      .some((n: string) => {
        const low = norm(String(n));
        return q.includes(low) || (low.includes(" ") && q.includes(` ${low.split(" ").pop()} `));
      })
  );
  const alias = byName ? null : ALIASES.find(([, words]) => words.some((w) => q.includes(norm(w))));
  const animal = byName ?? (alias ? animals.find((a) => String(a.species?.common_name ?? "").toLowerCase().includes(alias[0])) : undefined);
  if (animal && !has(q, WORDS.price) && !has(q, WORDS.adopt)) {
    const name = nameOf(animal);
    const species = speciesOf(animal);
    const fact = firstSentence((km && animal.interesting_facts_km) || animal.interesting_facts || (km && animal.biography_km) || animal.biography || "");
    const event = todaysEvents().find((e) => e.animalCode === animal.animal_code && e.status !== "done");
    let text = L(`${name} is our ${species}. ${fact}`, `${name} គឺជា${species}របស់យើង។ ${fact}`);
    if (has(q, WORDS.where)) {
      const letter = String(animal.animal_code).match(/-([A-Z])-/)?.[1];
      const { zones } = await getZonesAndFacilities().catch(() => ({ zones: [] as any[] }));
      const z = (zones as any[]).find((x) => x.code === letter);
      const zoneName = z ? (km && z.khmer_name) || z.name : letter;
      if (zoneName) text = L(`${name} lives in ${zoneName}. Tap "Show on the map" for directions.`, `${name} រស់នៅ${zoneName}។ ចុច «មើលលើផែនទី» ដើម្បីឃើញផ្លូវទៅ។`);
    }
    if (event) text += L(` Today there is "${event.title}" at ${event.start}.`, ` ថ្ងៃនេះមាន «${event.title_km}» នៅម៉ោង ${event.start}។`);
    return {
      text,
      animal: animalCard(animal),
      links: [
        { label: L(`Meet ${name}`, `ស្គាល់ ${name}`), href: `/animals/${animal.animal_code}` },
        { label: L("Show on the map", "មើលលើផែនទី"), href: `/animals/${animal.animal_code}/map` },
        { label: L("Listen", "ស្តាប់"), href: `/animals/${animal.animal_code}/audio` },
      ],
    };
  }

  // ── Visit information ──
  if (has(q, WORDS.count)) {
    return { text: L(`We have ${animals.length} amazing residents right now, from lions and elephants to parrots and sharks.`, `ឥឡូវនេះយើងមានសត្វដ៏អស្ចារ្យ ${animals.length} ក្បាល ចាប់ពីសិង្ហ ដំរី រហូតដល់សេក និងត្រីឆ្លាម។`), links: [{ label: L("See them all", "មើលទាំងអស់"), href: "/animals" }] };
  }
  if (has(q, WORDS.weather)) {
    const w = await getWeather();
    if (!w) return { text: L("Sorry, I can't get the weather right now.", "សុំទោស ខ្ញុំមិនអាចទាញយកអាកាសធាតុបានឥឡូវនេះទេ។") };
    return {
      text: L(
        `It's ${w.temp}°C now (feels like ${w.feels}°C). Today: low ${w.min}°, high ${w.max}°, ${w.rain}% chance of rain.${w.rain >= 60 ? " Bring an umbrella!" : ""}`,
        `ឥឡូវ ${w.temp}°C (មានអារម្មណ៍ដូច ${w.feels}°C)។ ថ្ងៃនេះទាប ${w.min}° ខ្ពស់ ${w.max}° ហើយឱកាសភ្លៀង ${w.rain}%។${w.rain >= 60 ? " សូមយកឆ័ត្រមកជាមួយ។" : ""}`
      ),
    };
  }
  if (has(q, WORDS.hours)) {
    return { text: L(`We are open every day from ${OPENING.open} to ${OPENING.close}. Last entry is at 17:00.`, `យើងបើករៀងរាល់ថ្ងៃ ចាប់ពីម៉ោង ${OPENING.open} ដល់ ${OPENING.close}។ ការចូលចុងក្រោយគឺម៉ោង 17:00។`), links: [{ label: L("Plan your visit", "រៀបចំការទស្សនា"), href: "/visit" }] };
  }
  if (has(q, WORDS.payment)) {
    return {
      text: L("We accept Bakong KHQR, which works with every Cambodian banking app (ABA, ACLEDA, Wing and more). Scan the QR on the payment page and your ticket is confirmed the moment the money arrives. You can also pay at the ticket counter.", "យើងទទួលការបង់ប្រាក់តាម Bakong KHQR ដែលប្រើបានជាមួយកម្មវិធីធនាគារទាំងអស់នៅកម្ពុជា (ABA, ACLEDA, Wing ។ល។)។ ស្កេន QR នៅទំព័របង់ប្រាក់ ហើយសំបុត្ររបស់អ្នកនឹងត្រូវបានបញ្ជាក់ភ្លាមៗពេលប្រាក់ចូល។ អ្នកក៏អាចបង់នៅបញ្ជរលក់សំបុត្របានដែរ។"),
      links: [{ label: L("Buy tickets", "ទិញសំបុត្រ"), href: "/tickets" }],
    };
  }
  if (has(q, WORDS.myTickets)) {
    return { text: L("All tickets you bought on this phone (or with your account) are in My Tickets. Show the QR code there at the entrance.", "សំបុត្រទាំងអស់ដែលអ្នកបានទិញលើទូរស័ព្ទនេះ (ឬក្នុងគណនី) មាននៅក្នុង «សំបុត្ររបស់ខ្ញុំ»។ បង្ហាញកូដ QR នៅទីនោះ នៅច្រកចូល។"), links: [{ label: L("My tickets", "សំបុត្ររបស់ខ្ញុំ"), href: "/my-tickets" }] };
  }
  if (has(q, WORDS.discount)) {
    return {
      text: L("Type your discount code on the checkout page. After paying, you also get a lucky scratch card with a discount for your next visit!", "វាយកូដបញ្ចុះតម្លៃនៅទំព័របង់ប្រាក់។ ក្រោយបង់ប្រាក់ អ្នកក៏ទទួលបានកាតកោសសំណាង សម្រាប់ការបញ្ចុះតម្លៃលើកក្រោយផងដែរ!"),
      links: [{ label: L("Buy tickets", "ទិញសំបុត្រ"), href: "/tickets" }],
    };
  }
  if (has(q, WORDS.price)) {
    const types = (await getTicketTypes().catch(() => [])) as any[];
    const list = types.map((tt) => `${(km && tt.khmer_name) || tt.name} ${money(Number(tt.price_usd))}`).join(", ");
    // "tomorrow" / "today" → open the ticket page with that date already chosen
    const date = has(q, ["tomorrow", "ថ្ងៃស្អែក", "ស្អែក"]) ? zooToday(1) : has(q, ["today", "ថ្ងៃនេះ"]) ? zooToday() : null;
    return {
      text: L(`Ticket prices: ${list}. Buy online and pay with Bakong KHQR in a minute.`, `តម្លៃសំបុត្រ៖ ${list}។ ទិញតាមអនឡាញ ហើយបង់តាម Bakong KHQR បានក្នុងមួយនាទី។`),
      links: [{ label: L("Buy tickets", "ទិញសំបុត្រ"), href: date ? `/tickets?date=${date}` : "/tickets" }],
    };
  }
  if (has(q, WORDS.events)) {
    const upcoming = todaysEvents().filter((e) => e.status !== "done").slice(0, 3);
    if (!upcoming.length) return { text: L("Today's shows have finished. Tomorrow starts at 09:00 with Elephant Bath Time.", "កម្មវិធីថ្ងៃនេះបានបញ្ចប់ហើយ។ ថ្ងៃស្អែកចាប់ផ្តើមម៉ោង 09:00 ជាមួយពេលងូតទឹករបស់ដំរី។"), links: [{ label: L("Schedule", "កាលវិភាគ"), href: "/events" }] };
    const list = upcoming.map((e) => `${e.start} ${km ? e.title_km : e.title}`).join(", ");
    return { text: L(`Coming up: ${list}.`, `កម្មវិធីបន្ទាប់៖ ${list}។`), links: [{ label: L("Full schedule", "កាលវិភាគពេញ"), href: "/events" }] };
  }
  if (has(q, WORDS.account)) {
    return {
      text: L("Sign in with Google, Facebook or email. On your account page, tap your photo or name to change them. You'll also see your tickets, payment history and quest points there.", "ចូលគណនីតាម Google, Facebook ឬអ៊ីមែល។ នៅទំព័រគណនី ចុចលើរូប ឬឈ្មោះរបស់អ្នក ដើម្បីប្តូរ។ អ្នកក៏នឹងឃើញសំបុត្រ ប្រវត្តិការបង់ប្រាក់ និងពិន្ទុបេសកកម្មនៅទីនោះដែរ។"),
      links: [{ label: L("My account", "គណនីរបស់ខ្ញុំ"), href: "/account" }],
    };
  }
  if (has(q, WORDS.adopt)) {
    return {
      text: L(
        `You can adopt an animal symbolically: Friend $${ADOPTION_TIERS.friend}, Guardian $${ADOPTION_TIERS.guardian} or Hero $${ADOPTION_TIERS.hero}. Your support pays for food and care, and you get a personal certificate.`,
        `អ្នកអាចឧបត្ថម្ភសត្វជានិមិត្តរូប៖ មិត្ត $${ADOPTION_TIERS.friend}, អាណាព្យាបាល $${ADOPTION_TIERS.guardian} ឬវីរបុរស $${ADOPTION_TIERS.hero}។ ការគាំទ្ររបស់អ្នកជួយចំណាយលើអាហារ និងការថែទាំ ហើយអ្នកនឹងទទួលបានវិញ្ញាបនបត្រផ្ទាល់ខ្លួន។`
      ),
      links: [{ label: L("Adopt an animal", "ឧបត្ថម្ភសត្វ"), href: animal ? `/adopt?animal=${animal.animal_code}` : "/adopt" }],
    };
  }
  if (has(q, WORDS.booth)) {
    return { text: L("Try our Photo Booth! Take a selfie, add real animal stickers and a jungle frame, then save or share it.", "សាកផ្ទាំងថតរូបរបស់យើង! ថតសែលហ្វី បន្ថែមស្ទីគ័រសត្វពិតៗ និងស៊ុមព្រៃ រួចរក្សាទុក ឬចែករំលែក។"), links: [{ label: L("Photo booth", "ថតរូបជាមួយសត្វ"), href: "/photo-booth" }] };
  }
  if (has(q, WORDS.games)) {
    return {
      text: L("Kids love these: the Animal Quest (scan QR signs and collect points), the Quiz, Which Animal Are You?, and You vs Animals.", "ក្មេងៗចូលចិត្តណាស់៖ បេសកកម្មសត្វ (ស្កេនផ្លាក QR ប្រមូលពិន្ទុ) ល្បែងសំណួរ តើអ្នកជាសត្វអ្វី? និងប្រៀបធៀបខ្លួនអ្នកនឹងសត្វ។"),
      links: [
        { label: L("Animal Quest", "បេសកកម្ម"), href: "/quest" },
        { label: L("Quiz", "ល្បែងសំណួរ"), href: "/quiz" },
        { label: L("Which animal are you?", "តើអ្នកជាសត្វអ្វី?"), href: "/match" },
      ],
    };
  }
  if (has(q, WORDS.food) || has(q, WORDS.toilet) || has(q, WORDS.parking)) {
    const { facilities } = await getZonesAndFacilities().catch(() => ({ facilities: [] as any[] }));
    const type = has(q, WORDS.toilet) ? "restroom" : has(q, WORDS.parking) ? "parking" : "restaurant";
    const places = (facilities as any[]).filter((f) => f.type === type).map((f) => (km && f.khmer_name) || f.name);
    const what = { restaurant: L("Places to eat and drink", "កន្លែងញ៉ាំ និងផឹក"), restroom: L("Restrooms", "បង្គន់"), parking: L("Parking", "ចំណត") }[type];
    // Named places (e.g. "Savanna Restaurant") are listed; generic ones are just counted.
    const named = [...new Set(places)].filter((n) => !/^(restroom|toilet|parking|បង្គន់|ចំណត)$/i.test(String(n).trim()));
    return {
      text: named.length
        ? L(`${what}: ${named.join(", ")}. You'll find them all on the map.`, `${what}៖ ${named.join(", ")}។ អ្នកអាចរកឃើញទាំងអស់នៅលើផែនទី។`)
        : places.length
          ? L(`There are ${places.length} ${what.toLowerCase()} in the park, all marked on the map.`, `មាន${what} ${places.length} កន្លែងនៅក្នុងសួន ហើយមានសម្គាល់ទាំងអស់នៅលើផែនទី។`)
          : L(`${what} are marked on the zoo map.`, `${what} មានសម្គាល់នៅលើផែនទីសួនសត្វ។`),
      links: [{ label: L("Zoo map", "ផែនទី"), href: "/map" }],
    };
  }
  if (has(q, WORDS.contact) || has(q, WORDS.address)) {
    const { zooProfile } = await getSettings().catch(() => ({ zooProfile: {} as Record<string, any> }));
    const phone = zooProfile.phone || "+855 00 000 000";
    const address = (km && zooProfile.address_km) || zooProfile.address || L("Phnom Penh, Cambodia", "រាជធានីភ្នំពេញ ប្រទេសកម្ពុជា");
    return { text: L(`We're in ${address}. Call us on ${phone}. We're happy to help!`, `យើងស្ថិតនៅ ${address}។ ទូរស័ព្ទមកយើងតាមលេខ ${phone}។ យើងរីករាយជួយអ្នក!`), links: [{ label: L("Plan your visit", "រៀបចំការទស្សនា"), href: "/visit" }] };
  }
  if (has(q, WORDS.news)) {
    const news = await getNews().catch(() => []);
    if (!news.length) return { text: L("No news yet, check back soon!", "មិនទាន់មានព័ត៌មាននៅឡើយ សូមត្រឡប់មកមើលម្តងទៀត!") };
    const n = news[0];
    return { text: L(`Latest: ${n.title}. ${n.summary ?? ""}`, `ថ្មីៗនេះ៖ ${n.title_km || n.title}។ ${n.summary_km || n.summary || ""}`), links: [{ label: L("Read the news", "អានព័ត៌មាន"), href: `/news/${n.id}` }] };
  }
  if (has(q, WORDS.reviews)) {
    const r = await getReviews().catch(() => null);
    return {
      text: r && r.total ? L(`Visitors rate us ${r.average.toFixed(1)} out of 5 from ${r.total} reviews. Come and see why!`, `ភ្ញៀវវាយតម្លៃយើង ${r.average.toFixed(1)} លើ 5 ពីមតិ ${r.total}។ មកមើលផ្ទាល់ថាហេតុអ្វី!`) : L("Be the first to leave a review after your visit!", "ក្រោយការមកលេង សូមក្លាយជាអ្នកដំបូងដែលផ្តល់មតិ!"),
      links: [{ label: L("Reviews", "មតិភ្ញៀវ"), href: "/reviews" }],
    };
  }
  if (has(q, WORDS.recommend) || has(q, WORDS.fact)) {
    const withPhoto = animals.filter((a) => a.main_image_url);
    const a = has(q, WORDS.recommend) ? withPhoto[dayNumber(zooToday()) % Math.max(1, withPhoto.length)] : pick(withPhoto);
    if (!a) return { text: L("Every animal here is special!", "សត្វគ្រប់ក្បាលនៅទីនេះពិសេសណាស់!") };
    const fact = firstSentence((km && a.interesting_facts_km) || a.interesting_facts || "");
    return {
      text: has(q, WORDS.recommend)
        ? L(`Today I recommend ${nameOf(a)}, our ${speciesOf(a)}. ${fact} Want a full route? Try Plan My Day.`, `ថ្ងៃនេះខ្ញុំណែនាំ ${nameOf(a)} ${speciesOf(a)}របស់យើង។ ${fact} ចង់បានផ្លូវដើរពេញលេញទេ? សាក «រៀបចំថ្ងៃទស្សនា»។`)
        : L(`Did you know? ${fact}`, `តើអ្នកដឹងទេ? ${fact}`),
      animal: animalCard(a),
      links: [{ label: L("Plan my day", "រៀបចំថ្ងៃទស្សនា"), href: "/planner" }],
    };
  }
  if (has(q, WORDS.animals)) {
    const names = animals.slice(0, 10).map(nameOf).join(", ");
    return { text: L(`Our residents include: ${names}. Ask me about any of them!`, `សត្វរបស់យើងមាន៖ ${names}។ សួរខ្ញុំអំពីសត្វណាមួយបាន!`), links: [{ label: L("All animals", "សត្វទាំងអស់"), href: "/animals" }] };
  }
  if (has(q, WORDS.where)) {
    return { text: L("Open the zoo map to find animals, restrooms, food and more.", "បើកផែនទីសួនសត្វ ដើម្បីរកសត្វ បង្គន់ ហាងអាហារ និងកន្លែងផ្សេងៗ។"), links: [{ label: L("Zoo map", "ផែនទី"), href: "/map" }] };
  }
  if (has(q, WORDS.language)) {
    return { text: L("This website speaks Khmer and English. Tap EN or ខ្មែរ at the top of the page to switch.", "គេហទំព័រនេះមានភាសាខ្មែរ និងអង់គ្លេស។ ចុច EN ឬ ខ្មែរ នៅផ្នែកខាងលើ ដើម្បីប្តូរ។") };
  }
  if (has(q, WORDS.bye)) return { text: L("Goodbye! Have a wonderful day, and come visit us soon.", "លាហើយ! សូមឲ្យអ្នកមានថ្ងៃដ៏រីករាយ ហើយមកលេងយើងឆាប់ៗណា។") };
  if (has(q, WORDS.thanks)) return { text: L("You're very welcome! Anything else I can help with?", "មិនអីទេ រីករាយដែលបានជួយ! មានអ្វីផ្សេងទៀតដែលខ្ញុំអាចជួយបានទេ?") };
  if (has(q, WORDS.hello)) {
    return {
      text: pick([
        L("Hello! Welcome to Green Wild Zoo. Ask me about opening hours, tickets, today's shows or any animal.", "សួស្តី! សូមស្វាគមន៍មកកាន់ Green Wild Zoo។ សួរខ្ញុំអំពីម៉ោងបើក សំបុត្រ កម្មវិធីថ្ងៃនេះ ឬសត្វណាមួយបាន។"),
        L("Hi there! The animals and I are ready to help. What would you like to know?", "សួស្តី! ខ្ញុំ និងសត្វៗត្រៀមជួយអ្នកហើយ។ តើអ្នកចង់ដឹងអំពីអ្វី?"),
      ]),
    };
  }

  // ── Closest FAQ answer ──
  const faq = t.faq.items.map((it) => ({ it, score: similarity(q, norm(it.q)) })).sort((a, b) => b.score - a.score)[0];
  if (faq && faq.score >= 0.34) return { text: faq.it.a, links: [{ label: L("More questions", "សំណួរផ្សេងទៀត"), href: "/faq" }] };

  // ── Outside what this website covers: say so kindly, and offer what we can do ──
  return {
    text: L(
      "I can only help with things about Green Wild Zoo, so I'd better not guess about that. Try asking about opening hours, tickets, today's shows, the weather, our animals or how to use this website.",
      "ខ្ញុំអាចជួយបានតែរឿងទាក់ទងនឹង Green Wild Zoo ប៉ុណ្ណោះ ដូច្នេះខ្ញុំមិនហ៊ានទាយរឿងនោះទេ។ សាកសួរអំពីម៉ោងបើក សំបុត្រ កម្មវិធីថ្ងៃនេះ អាកាសធាតុ សត្វរបស់យើង ឬរបៀបប្រើគេហទំព័រនេះ។"
    ),
    links: [{ label: L("Questions", "សំណួរញឹកញាប់"), href: "/faq" }],
  };
}
