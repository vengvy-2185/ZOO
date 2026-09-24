// Domain types mirroring the Supabase schema (see supabase/migrations).
// Kept hand-written and readable; for full generated column-level types,
// run `supabase gen types typescript` into src/types/database.ts.

export type UserRole = "admin" | "staff" | "visitor";
export type AnimalGender = "male" | "female" | "unknown";
export type AnimalStatus = "active" | "off_display" | "transferred" | "deceased";
export type AudioLanguage = "km" | "en" | "zh";
export type AudioVoice = "male" | "female";
export type MarkerType =
  | "animal" | "entrance" | "exit" | "restaurant" | "restroom"
  | "parking" | "first_aid" | "gift_shop" | "rest_area" | "photo_spot";
export type PaymentStatus = "pending" | "paid" | "failed" | "refunded";
export type BookingStatus = "pending" | "confirmed" | "cancelled";

export interface Profile {
  id: string;
  role: UserRole;
  full_name: string | null;
  avatar_url: string | null;
  points: number;
}

export interface AnimalCategory {
  id: string;
  name: string;
  khmer_name: string | null;
  slug: string;
  icon: string | null;
  image_url: string | null;
  sort_order: number;
  is_active: boolean;
}

export interface Species {
  id: string;
  category_id: string;
  common_name: string;
  khmer_name: string | null;
  scientific_name: string | null;
  description: string | null;
  habitat_description: string | null;
  conservation_status: string | null;
}

export interface ZooZone {
  id: string;
  code: string;
  name: string;
  khmer_name: string | null;
  color: string | null;
  map_x: number | null;
  map_y: number | null;
  is_active: boolean;
}

export interface Habitat {
  id: string;
  zone_id: string;
  name: string;
  khmer_name: string | null;
  map_x: number | null;
  map_y: number | null;
}

export interface Enclosure {
  id: string;
  habitat_id: string;
  code: string;
  name: string | null;
  map_x: number | null;
  map_y: number | null;
}

export interface Facility {
  id: string;
  type: MarkerType;
  name: string;
  khmer_name: string | null;
  map_x: number;
  map_y: number;
  icon: string | null;
  is_active: boolean;
}

export interface Animal {
  id: string;
  animal_code: string;
  name: string;
  khmer_name: string | null;
  species_id: string;
  category_id: string;
  gender: AnimalGender;
  date_of_birth: string | null; // ISO date
  place_of_birth: string | null;
  arrival_date: string | null;
  biography: string | null;
  personality: string | null;
  favorite_food: string | null;
  favorite_activities: string | null;
  interesting_facts: string | null;
  care_information: string | null;
  status: AnimalStatus;
  main_image_url: string | null;
  video_url: string | null;
  show_birthday_publicly: boolean;
  // joined convenience fields (populated by queries, not raw columns)
  species?: Species;
  category?: AnimalCategory;
}

export interface AnimalPhoto {
  id: string;
  animal_id: string;
  image_url: string;
  caption: string | null;
  sort_order: number;
}

export interface AnimalRelationship {
  relationship_type: "father" | "mother" | "sibling" | "child";
  related_animal_id: string;
  related_name: string;
  related_code: string;
  related_image: string | null;
}

export interface AnimalCurrentLocation {
  zone_id: string | null;
  zone_code: string | null;
  zone_name: string | null;
  habitat_id: string | null;
  habitat_name: string | null;
  enclosure_id: string | null;
  enclosure_code: string | null;
  map_x: number | null;
  map_y: number | null;
  updated_at: string | null;
}

export interface AnimalStory {
  id: string;
  animal_id: string;
  title: string;
  description: string | null;
  cover_image_url: string | null;
  is_published: boolean;
}

export interface StoryPage {
  id: string;
  story_id: string;
  page_number: number;
  title: string | null;
  content: string;
  image_url: string | null;
}

export interface AudioGuide {
  id: string;
  animal_id: string | null;
  story_page_id: string | null;
  language: AudioLanguage;
  voice_type: AudioVoice;
  audio_url: string | null;
  duration_seconds: number | null;
  transcript: string | null;
  is_active: boolean;
}

export interface TicketType {
  id: string;
  name: string;
  khmer_name: string | null;
  description: string | null;
  price_usd: number;
  min_age: number | null;
  max_age: number | null;
  is_active: boolean;
}

export interface BookingItemInput {
  ticket_type_id: string;
  quantity: number;
  unit_price_usd: number;
}

export interface Booking {
  id: string;
  booking_code: string;
  visitor_id: string | null;
  visitor_name: string | null;
  visitor_email: string | null;
  visit_date: string;
  status: BookingStatus;
  subtotal_usd: number;
  discount_usd: number;
  total_usd: number;
  qr_token: string;
}

export interface QuestSession {
  id: string;
  visitor_id: string | null;
  device_token: string | null;
  points: number;
  completed_at: string | null;
}
