import type { LucideIcon } from "lucide-react";
import { Dna, MapPinned, Trees, Fence, Ticket, Store, BookOpen, FileText, Headphones, Sticker, Star, Newspaper, TicketPercent } from "lucide-react";

/**
 * Config for the generic admin "Manage" editor (/admin/manage/[entity]).
 * Only tables listed here can be edited through it — the entity key in the
 * URL is looked up in this allowlist, never used as a table name directly.
 */

type L = { en: string; km: string };

export type FieldDef = {
  name: string;
  label: L;
  type: "text" | "textarea" | "number" | "bool" | "select" | "ref" | "image" | "color" | "date" | "code";
  /** Khmer column paired with this field (rendered as an EN/KM pair). */
  km?: string;
  required?: boolean;
  options?: string[];
  /** Friendly labels for select options (value → EN/KM). */
  optionLabels?: Record<string, L>;
  ref?: { table: string; label: string; labelKm?: string; order?: string };
  /** Storage folder for image uploads. */
  folder?: string;
  /** Image links are copied into our own Storage (needed for canvas use). */
  mirror?: boolean;
  /** Preview on a checkerboard — for transparent PNGs. */
  transparent?: boolean;
  hint?: L;
  wide?: boolean;
};

export type EntityDef = {
  table: string;
  title: L;
  subtitle: L;
  icon: LucideIcon;
  order: { column: string; ascending?: boolean };
  /** Column shown as the row title (and its Khmer twin). */
  titleField: string;
  titleKm?: string;
  image?: string;
  /** Extra columns shown in the list. */
  columns: { name: string; label: L; ref?: string }[];
  fields: FieldDef[];
  /** Filter the list by a parent id passed as ?parent= (e.g. story pages of one story). */
  parent?: { column: string; entity: string };
  /** Rows are created elsewhere (e.g. by visitors) — hide "Add new". */
  noCreate?: boolean;
  /** A custom overview page to return to after saving (instead of the generic list). */
  listHref?: string;
};

const MARKER_TYPES = ["entrance", "exit", "restaurant", "restroom", "parking", "first_aid", "gift_shop", "rest_area", "photo_spot"];
const IUCN = ["Least Concern", "Near Threatened", "Vulnerable", "Endangered", "Critically Endangered", "Extinct in the Wild", "Data Deficient"];

const name: FieldDef = { name: "name", km: "khmer_name", label: { en: "Name", km: "ឈ្មោះ" }, type: "text", required: true };
const desc: FieldDef = { name: "description", km: "description_km", label: { en: "Description", km: "ការពិពណ៌នា" }, type: "textarea", wide: true };
const mapXY: FieldDef[] = [
  { name: "map_x", label: { en: "Map X (%)", km: "ផែនទី X (%)" }, type: "number", hint: { en: "0–100, left → right", km: "0–100 ពីឆ្វេងទៅស្តាំ" } },
  { name: "map_y", label: { en: "Map Y (%)", km: "ផែនទី Y (%)" }, type: "number", hint: { en: "0–100, top → bottom", km: "0–100 ពីលើទៅក្រោម" } },
];
const active: FieldDef = { name: "is_active", label: { en: "Visible to visitors", km: "បង្ហាញជូនភ្ញៀវ" }, type: "bool" };

export const ENTITIES = {
  species: {
    table: "species",
    title: { en: "Species", km: "ពូជសត្វ" },
    subtitle: { en: "Scientific info shared by every animal of the same kind.", km: "ព័ត៌មានវិទ្យាសាស្ត្ររបស់សត្វប្រភេទដូចគ្នា។" },
    icon: Dna,
    order: { column: "common_name" },
    titleField: "common_name",
    titleKm: "khmer_name",
    columns: [
      { name: "scientific_name", label: { en: "Scientific name", km: "ឈ្មោះវិទ្យាសាស្ត្រ" } },
      { name: "conservation_status", label: { en: "IUCN", km: "IUCN" } },
    ],
    fields: [
      { name: "common_name", km: "khmer_name", label: { en: "Common name", km: "ឈ្មោះទូទៅ" }, type: "text", required: true },
      { name: "scientific_name", label: { en: "Scientific name", km: "ឈ្មោះវិទ្យាសាស្ត្រ" }, type: "text" },
      { name: "category_id", label: { en: "Category", km: "ប្រភេទ" }, type: "ref", required: true, ref: { table: "animal_categories", label: "name", labelKm: "khmer_name", order: "sort_order" } },
      { name: "conservation_status", label: { en: "Conservation status", km: "ស្ថានភាពអភិរក្ស" }, type: "select", options: IUCN },
      { name: "conservation_status_km", label: { en: "Conservation status (Khmer)", km: "ស្ថានភាពអភិរក្ស (ខ្មែរ)" }, type: "text" },
      { ...desc },
      { name: "habitat_description", km: "habitat_description_km", label: { en: "Natural habitat", km: "ទីជម្រកធម្មជាតិ" }, type: "textarea", wide: true },
    ],
  },
  zones: {
    table: "zoo_zones",
    title: { en: "Zones", km: "តំបន់" },
    subtitle: { en: "Big areas of the park shown on the map.", km: "តំបន់ធំៗនៃសួនដែលបង្ហាញលើផែនទី។" },
    icon: MapPinned,
    order: { column: "code" },
    titleField: "name",
    titleKm: "khmer_name",
    image: "image_url",
    columns: [
      { name: "code", label: { en: "Code", km: "កូដ" } },
      { name: "color", label: { en: "Colour", km: "ពណ៌" } },
    ],
    fields: [
      name,
      { name: "code", label: { en: "Code", km: "កូដ" }, type: "text", required: true, hint: { en: "Short unique code, e.g. Z-SAV", km: "កូដខ្លីមិនជាន់គ្នា ឧ. Z-SAV" } },
      { name: "color", label: { en: "Colour", km: "ពណ៌" }, type: "color" },
      ...mapXY,
      { name: "image_url", label: { en: "Photo", km: "រូបថត" }, type: "image", folder: "zones", wide: true },
      desc,
      active,
    ],
  },
  habitats: {
    table: "habitats",
    title: { en: "Habitats", km: "ទីជម្រក" },
    subtitle: { en: "Themed areas inside each zone.", km: "ផ្នែកតាមប្រធានបទនៅក្នុងតំបន់នីមួយៗ។" },
    icon: Trees,
    order: { column: "name" },
    titleField: "name",
    titleKm: "khmer_name",
    columns: [{ name: "zone_id", label: { en: "Zone", km: "តំបន់" }, ref: "zones" }],
    fields: [
      name,
      { name: "zone_id", label: { en: "Zone", km: "តំបន់" }, type: "ref", required: true, ref: { table: "zoo_zones", label: "name", labelKm: "khmer_name", order: "code" } },
      ...mapXY,
      desc,
    ],
  },
  enclosures: {
    table: "enclosures",
    title: { en: "Enclosures", km: "ទ្រុង" },
    subtitle: { en: "Individual enclosures where animals live.", km: "ទ្រុងនីមួយៗដែលសត្វរស់នៅ។" },
    icon: Fence,
    order: { column: "code" },
    titleField: "name",
    titleKm: "khmer_name",
    columns: [
      { name: "code", label: { en: "Code", km: "កូដ" } },
      { name: "habitat_id", label: { en: "Habitat", km: "ទីជម្រក" }, ref: "habitats" },
    ],
    fields: [
      { name: "name", km: "khmer_name", label: { en: "Name", km: "ឈ្មោះ" }, type: "text" },
      { name: "code", label: { en: "Code", km: "កូដ" }, type: "text", required: true },
      { name: "habitat_id", label: { en: "Habitat", km: "ទីជម្រក" }, type: "ref", required: true, ref: { table: "habitats", label: "name", labelKm: "khmer_name", order: "name" } },
      ...mapXY,
      { name: "width", label: { en: "Width (%)", km: "ទទឹង (%)" }, type: "number" },
      { name: "height", label: { en: "Height (%)", km: "កម្ពស់ (%)" }, type: "number" },
      desc,
    ],
  },
  tickets: {
    table: "ticket_types",
    title: { en: "Ticket types", km: "ប្រភេទសំបុត្រ" },
    subtitle: { en: "Prices and age ranges shown at checkout.", km: "តម្លៃ និងអាយុដែលបង្ហាញពេលទិញសំបុត្រ។" },
    icon: Ticket,
    order: { column: "sort_order" },
    titleField: "name",
    titleKm: "khmer_name",
    columns: [
      { name: "price_usd", label: { en: "Price (USD)", km: "តម្លៃ (USD)" } },
      { name: "is_active", label: { en: "On sale", km: "កំពុងលក់" } },
    ],
    fields: [
      name,
      { name: "price_usd", label: { en: "Price (USD)", km: "តម្លៃ (USD)" }, type: "number", required: true },
      { name: "sort_order", label: { en: "Order", km: "លំដាប់" }, type: "number" },
      { name: "min_age", label: { en: "Min age", km: "អាយុតិចបំផុត" }, type: "number" },
      { name: "max_age", label: { en: "Max age", km: "អាយុច្រើនបំផុត" }, type: "number" },
      desc,
      { ...active, label: { en: "On sale", km: "កំពុងលក់" } },
    ],
  },
  facilities: {
    table: "facilities",
    title: { en: "Facilities", km: "សេវាកម្ម" },
    subtitle: { en: "Restrooms, cafés, first aid and other map points.", km: "បង្គន់ ហាងកាហ្វេ ជំនួយបឋម និងចំណុចផ្សេងៗលើផែនទី។" },
    icon: Store,
    order: { column: "name" },
    titleField: "name",
    titleKm: "khmer_name",
    columns: [{ name: "type", label: { en: "Type", km: "ប្រភេទ" } }],
    fields: [
      name,
      { name: "type", label: { en: "Type", km: "ប្រភេទ" }, type: "select", required: true, options: MARKER_TYPES },
      { ...mapXY[0], required: true },
      { ...mapXY[1], required: true },
      desc,
      active,
    ],
  },
  stories: {
    table: "animal_stories",
    title: { en: "Stories", km: "រឿងនិទាន" },
    subtitle: { en: "Picture-book stories about the animals.", km: "រឿងរូបភាពអំពីសត្វ។" },
    icon: BookOpen,
    order: { column: "created_at", ascending: false },
    titleField: "title",
    titleKm: "title_km",
    image: "cover_image_url",
    columns: [
      { name: "animal_id", label: { en: "Animal", km: "សត្វ" }, ref: "animals" },
      { name: "is_published", label: { en: "Published", km: "បានផ្សាយ" } },
    ],
    fields: [
      { name: "title", km: "title_km", label: { en: "Title", km: "ចំណងជើង" }, type: "text", required: true },
      { name: "animal_id", label: { en: "Animal", km: "សត្វ" }, type: "ref", required: true, ref: { table: "animals", label: "name", labelKm: "khmer_name", order: "name" } },
      { name: "cover_image_url", label: { en: "Cover picture", km: "រូបក្រប" }, type: "image", folder: "stories", wide: true },
      desc,
      { name: "is_published", label: { en: "Published", km: "បានផ្សាយ" }, type: "bool" },
    ],
  },
  story_pages: {
    table: "story_pages",
    title: { en: "Story pages", km: "ទំព័ររឿង" },
    subtitle: { en: "Each page of a story: picture and text.", km: "ទំព័រនីមួយៗនៃរឿង៖ រូបភាព និងអត្ថបទ។" },
    icon: FileText,
    order: { column: "page_number" },
    titleField: "title",
    titleKm: "title_km",
    image: "image_url",
    parent: { column: "story_id", entity: "stories" },
    columns: [
      { name: "page_number", label: { en: "Page", km: "ទំព័រ" } },
      { name: "story_id", label: { en: "Story", km: "រឿង" }, ref: "stories" },
    ],
    fields: [
      { name: "story_id", label: { en: "Story", km: "រឿង" }, type: "ref", required: true, ref: { table: "animal_stories", label: "title", labelKm: "title_km", order: "title" } },
      { name: "page_number", label: { en: "Page number", km: "លេខទំព័រ" }, type: "number", required: true },
      { name: "title", km: "title_km", label: { en: "Title", km: "ចំណងជើង" }, type: "text" },
      { name: "image_url", label: { en: "Picture", km: "រូបភាព" }, type: "image", folder: "stories", wide: true },
      { name: "content", km: "content_km", label: { en: "Text", km: "អត្ថបទ" }, type: "textarea", required: true, wide: true },
    ],
  },
  audio: {
    table: "audio_guides",
    title: { en: "Audio guides", km: "មគ្គុទ្ទេសក៍សំឡេង" },
    subtitle: { en: "The script read aloud on each animal's Listen page.", km: "អត្ថបទដែលអានឮនៅទំព័រស្តាប់របស់សត្វនីមួយៗ។" },
    icon: Headphones,
    order: { column: "created_at", ascending: false },
    titleField: "language",
    columns: [
      { name: "animal_id", label: { en: "Animal", km: "សត្វ" }, ref: "animals" },
      { name: "voice_type", label: { en: "Voice", km: "សំឡេង" } },
    ],
    fields: [
      { name: "animal_id", label: { en: "Animal", km: "សត្វ" }, type: "ref", required: true, ref: { table: "animals", label: "name", labelKm: "khmer_name", order: "name" } },
      { name: "language", label: { en: "Language", km: "ភាសា" }, type: "select", required: true, options: ["km", "en", "zh"] },
      { name: "voice_type", label: { en: "Voice", km: "សំឡេង" }, type: "select", options: ["female", "male"] },
      { name: "transcript", label: { en: "Script (read aloud)", km: "អត្ថបទសម្រាប់អាន" }, type: "textarea", wide: true, hint: { en: "Changing the script clears the saved recording so a fresh one is generated.", km: "ពេលកែអត្ថបទ សំឡេងចាស់នឹងត្រូវលុប ហើយបង្កើតថ្មី។" } },
      { name: "audio_url", label: { en: "Audio file URL (optional)", km: "តំណឯកសារសំឡេង (មិនចាំបាច់)" }, type: "text", wide: true },
      active,
    ],
  },
  stickers: {
    table: "booth_stickers",
    title: { en: "Photo booth stickers", km: "ស្ទីគ័រថតរូប" },
    subtitle: { en: "Real animal cut-outs (transparent PNG) visitors can drag onto their photos.", km: "រូបសត្វពិត (PNG គ្មានផ្ទៃខាងក្រោយ) ដែលភ្ញៀវអាចអូសដាក់លើរូបថត។" },
    icon: Sticker,
    order: { column: "sort_order" },
    titleField: "name",
    titleKm: "khmer_name",
    image: "image_url",
    columns: [
      { name: "sort_order", label: { en: "Order", km: "លំដាប់" } },
      { name: "is_active", label: { en: "Visible", km: "បង្ហាញ" } },
    ],
    fields: [
      name,
      {
        name: "image_url",
        label: { en: "Sticker image (PNG without background)", km: "រូបស្ទីគ័រ (PNG គ្មានផ្ទៃខាងក្រោយ)" },
        type: "image",
        folder: "stickers",
        required: true,
        mirror: true,
        transparent: true,
        wide: true,
        hint: { en: "Upload a file or paste an image link — links are copied to our storage automatically.", km: "ផ្ទុករូបឡើង ឬបិទភ្ជាប់តំណរូប — តំណនឹងត្រូវចម្លងទុកក្នុងប្រព័ន្ធដោយស្វ័យប្រវត្តិ។" },
      },
      { name: "sort_order", label: { en: "Order", km: "លំដាប់" }, type: "number" },
      active,
    ],
  },
  reviews: {
    table: "reviews",
    noCreate: true,
    title: { en: "Visitor reviews", km: "មតិភ្ញៀវ" },
    subtitle: { en: "Hide a review to remove it from the website (the visitor can't show it again).", km: "លាក់មតិដើម្បីដកវាចេញពីគេហទំព័រ (ភ្ញៀវមិនអាចបង្ហាញវាវិញបានទេ)។" },
    icon: Star,
    order: { column: "created_at", ascending: false },
    titleField: "name",
    image: "avatar_url",
    columns: [
      { name: "rating", label: { en: "Stars", km: "ផ្កាយ" } },
      { name: "comment", label: { en: "Comment", km: "មតិ" } },
      { name: "is_visible", label: { en: "Visible", km: "បង្ហាញ" } },
    ],
    fields: [
      { name: "name", label: { en: "Name", km: "ឈ្មោះ" }, type: "text", required: true },
      { name: "rating", label: { en: "Stars (1–5)", km: "ផ្កាយ (1–5)" }, type: "number", required: true },
      { name: "comment", label: { en: "Comment", km: "មតិ" }, type: "textarea", required: true, wide: true },
      { name: "is_visible", label: { en: "Show on the website", km: "បង្ហាញលើគេហទំព័រ" }, type: "bool" },
    ],
  },
  news: {
    table: "news_posts",
    title: { en: "News", km: "ព័ត៌មាន" },
    subtitle: { en: "Stories for visitors: new arrivals, events and conservation news.", km: "ព័ត៌មានសម្រាប់ភ្ញៀវ៖ សត្វថ្មី ព្រឹត្តិការណ៍ និងការអភិរក្ស។" },
    icon: Newspaper,
    order: { column: "published_at", ascending: false },
    titleField: "title",
    titleKm: "title_km",
    image: "image_url",
    columns: [{ name: "is_published", label: { en: "Published", km: "បានផ្សាយ" } }],
    fields: [
      { name: "title", km: "title_km", label: { en: "Headline", km: "ចំណងជើង" }, type: "text", required: true },
      { name: "image_url", label: { en: "Photo", km: "រូបថត" }, type: "image", folder: "news", wide: true },
      { name: "summary", km: "summary_km", label: { en: "Short summary", km: "សេចក្តីសង្ខេប" }, type: "textarea", wide: true },
      { name: "body", km: "body_km", label: { en: "Full story", km: "អត្ថបទពេញ" }, type: "textarea", wide: true },
      { name: "is_published", label: { en: "Show on the website", km: "បង្ហាញលើគេហទំព័រ" }, type: "bool" },
    ],
  },
  discounts: {
    table: "discount_codes",
    listHref: "/admin/discounts",
    title: { en: "Discount codes", km: "កូដបញ្ចុះតម្លៃ" },
    subtitle: { en: "Codes visitors type at checkout. Set the dates, the value and how many people may use each one.", km: "កូដដែលភ្ញៀវវាយនៅពេលទិញសំបុត្រ។ កំណត់ថ្ងៃ តម្លៃបញ្ចុះ និងចំនួនមនុស្សដែលអាចប្រើ។" },
    icon: TicketPercent,
    order: { column: "created_at", ascending: false },
    titleField: "name",
    titleKm: "name_km",
    columns: [
      { name: "code", label: { en: "Code", km: "កូដ" } },
      { name: "value", label: { en: "Value", km: "តម្លៃ" } },
      { name: "is_active", label: { en: "Active", km: "សកម្ម" } },
    ],
    fields: [
      { name: "name", km: "name_km", label: { en: "Discount name", km: "ឈ្មោះការបញ្ចុះតម្លៃ" }, type: "text", required: true },
      {
        name: "code",
        label: { en: "Code", km: "កូដ" },
        type: "code",
        hint: { en: "Press Generate for a random code, or type your own (e.g. KHMERNEWYEAR). Leave empty to create one automatically.", km: "ចុច «បង្កើតកូដ» ដើម្បីទទួលបានកូដចៃដន្យ ឬវាយកូដផ្ទាល់ខ្លួន (ឧទាហរណ៍ KHMERNEWYEAR)។ ទុកទទេ ប្រព័ន្ធនឹងបង្កើតឲ្យដោយស្វ័យប្រវត្តិ។" },
      },
      {
        name: "kind",
        label: { en: "Type", km: "ប្រភេទ" },
        type: "select",
        required: true,
        options: ["percent", "amount"],
        optionLabels: { percent: { en: "Percent off (%)", km: "បញ្ចុះជាភាគរយ (%)" }, amount: { en: "Fixed amount off (USD)", km: "បញ្ចុះជាទឹកប្រាក់ (USD)" } },
      },
      { name: "value", label: { en: "Value (% or $)", km: "តម្លៃបញ្ចុះ (% ឬ $)" }, type: "number", required: true },
      { name: "starts_on", label: { en: "Starts on", km: "ចាប់ផ្តើមថ្ងៃ" }, type: "date", hint: { en: "Empty = from today", km: "ទុកទទេ = ចាប់ពីថ្ងៃនេះ" } },
      { name: "ends_on", label: { en: "Ends on", km: "ផុតកំណត់ថ្ងៃ" }, type: "date", hint: { en: "Empty = no end date", km: "ទុកទទេ = គ្មានថ្ងៃផុតកំណត់" } },
      { name: "max_uses", label: { en: "How many people can use it", km: "ចំនួនមនុស្សអាចប្រើ" }, type: "number", hint: { en: "Empty = unlimited", km: "ទុកទទេ = មិនកំណត់" } },
      { name: "min_total_usd", label: { en: "Minimum total (USD)", km: "ទិញសរុបយ៉ាងតិច (USD)" }, type: "number" },
      { name: "is_active", label: { en: "Active", km: "សកម្ម" }, type: "bool" },
    ],
  },
} satisfies Record<string, EntityDef>;

export type EntityKey = keyof typeof ENTITIES;

export function getEntity(key: string): EntityDef | null {
  return Object.prototype.hasOwnProperty.call(ENTITIES, key) ? (ENTITIES as Record<string, EntityDef>)[key] : null;
}

/** For ref columns in lists: entity key → how to label its rows. */
export const REF_LABELS: Record<string, { table: string; label: string; labelKm?: string }> = {
  zones: { table: "zoo_zones", label: "name", labelKm: "khmer_name" },
  habitats: { table: "habitats", label: "name", labelKm: "khmer_name" },
  stories: { table: "animal_stories", label: "title", labelKm: "title_km" },
  animals: { table: "animals", label: "name", labelKm: "khmer_name" },
};
