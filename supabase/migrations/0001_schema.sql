-- ============================================================================
-- GREEN WILD ZOO — CORE SCHEMA
-- Run this first in the Supabase SQL Editor (or `supabase db push`).
-- ============================================================================

create extension if not exists "uuid-ossp";
create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- ENUMS
-- ---------------------------------------------------------------------------
create type user_role as enum ('admin', 'staff', 'visitor');
create type animal_gender as enum ('male', 'female', 'unknown');
create type animal_status as enum ('active', 'off_display', 'transferred', 'deceased');
create type audio_language as enum ('km', 'en', 'zh');
create type audio_voice as enum ('male', 'female');
create type marker_type as enum ('animal', 'entrance', 'exit', 'restaurant', 'restroom', 'parking', 'first_aid', 'gift_shop', 'rest_area', 'photo_spot');
create type payment_status as enum ('pending', 'paid', 'failed', 'refunded');
create type booking_status as enum ('pending', 'confirmed', 'cancelled');

-- ---------------------------------------------------------------------------
-- PROFILES (extends auth.users)
-- ---------------------------------------------------------------------------
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role user_role not null default 'visitor',
  full_name text,
  avatar_url text,
  points integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- TAXONOMY
-- ---------------------------------------------------------------------------
create table animal_categories (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  khmer_name text,
  slug text not null unique,
  icon text,
  image_url text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table species (
  id uuid primary key default uuid_generate_v4(),
  category_id uuid not null references animal_categories(id) on delete restrict,
  common_name text not null,
  khmer_name text,
  scientific_name text,
  description text,
  habitat_description text,
  conservation_status text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- MAP HIERARCHY: zoo_maps -> zones -> habitats -> enclosures
-- ---------------------------------------------------------------------------
create table zoo_maps (
  id uuid primary key default uuid_generate_v4(),
  name text not null default 'Green Wild Zoo Map',
  image_url text,
  width_px integer,
  height_px integer,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table zoo_zones (
  id uuid primary key default uuid_generate_v4(),
  map_id uuid references zoo_maps(id) on delete set null,
  code text not null unique,           -- e.g. 'A'
  name text not null,
  khmer_name text,
  description text,
  color text default '#176B3A',
  image_url text,
  map_x numeric,                        -- percentage 0-100
  map_y numeric,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table habitats (
  id uuid primary key default uuid_generate_v4(),
  zone_id uuid not null references zoo_zones(id) on delete cascade,
  name text not null,
  khmer_name text,
  description text,
  map_x numeric,
  map_y numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table enclosures (
  id uuid primary key default uuid_generate_v4(),
  habitat_id uuid not null references habitats(id) on delete cascade,
  code text not null unique,            -- e.g. 'A-03'
  name text,
  description text,
  map_x numeric,
  map_y numeric,
  width numeric,
  height numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table facilities (
  id uuid primary key default uuid_generate_v4(),
  map_id uuid references zoo_maps(id) on delete set null,
  type marker_type not null,
  name text not null,
  khmer_name text,
  description text,
  map_x numeric not null,
  map_y numeric not null,
  icon text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Generic marker table for anything placed on the map (used by map editor UI)
create table map_markers (
  id uuid primary key default uuid_generate_v4(),
  map_id uuid not null references zoo_maps(id) on delete cascade,
  marker_type marker_type not null,
  ref_animal_id uuid,              -- fk added after animals table exists
  ref_facility_id uuid references facilities(id) on delete cascade,
  label text,
  map_x numeric not null,
  map_y numeric not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- ANIMALS
-- ---------------------------------------------------------------------------
create table animals (
  id uuid primary key default uuid_generate_v4(),
  animal_code text not null unique,        -- e.g. 'LION-A-001', used in QR + routes
  name text not null,
  khmer_name text,
  species_id uuid not null references species(id) on delete restrict,
  category_id uuid not null references animal_categories(id) on delete restrict,
  gender animal_gender not null default 'unknown',
  date_of_birth date,
  place_of_birth text,
  arrival_date date,
  biography text,
  personality text,
  favorite_food text,
  favorite_activities text,
  interesting_facts text,
  care_information text,
  status animal_status not null default 'active',
  main_image_url text,
  video_url text,
  show_birthday_publicly boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table map_markers
  add constraint map_markers_ref_animal_fk
  foreign key (ref_animal_id) references animals(id) on delete cascade;

create table animal_photos (
  id uuid primary key default uuid_generate_v4(),
  animal_id uuid not null references animals(id) on delete cascade,
  image_url text not null,
  caption text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

-- father / mother / sibling / child relationships between animals
create table animal_relationships (
  id uuid primary key default uuid_generate_v4(),
  animal_id uuid not null references animals(id) on delete cascade,
  related_animal_id uuid not null references animals(id) on delete cascade,
  relationship_type text not null check (relationship_type in ('father','mother','sibling','child')),
  created_at timestamptz not null default now(),
  unique (animal_id, related_animal_id, relationship_type)
);

-- current + historical location of every animal
create table animal_locations (
  id uuid primary key default uuid_generate_v4(),
  animal_id uuid not null references animals(id) on delete cascade,
  zone_id uuid references zoo_zones(id) on delete set null,
  habitat_id uuid references habitats(id) on delete set null,
  enclosure_id uuid references enclosures(id) on delete set null,
  map_x numeric,
  map_y numeric,
  is_current boolean not null default true,
  moved_by uuid references profiles(id),
  updated_at timestamptz not null default now()
);

-- Enforce "only one current location per animal" via partial unique index
create unique index animal_locations_one_current
  on animal_locations (animal_id)
  where is_current;

-- ---------------------------------------------------------------------------
-- STORYBOOK
-- ---------------------------------------------------------------------------
create table animal_stories (
  id uuid primary key default uuid_generate_v4(),
  animal_id uuid not null references animals(id) on delete cascade,
  title text not null,
  description text,
  cover_image_url text,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table story_pages (
  id uuid primary key default uuid_generate_v4(),
  story_id uuid not null references animal_stories(id) on delete cascade,
  page_number integer not null,
  title text,
  content text not null,
  image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (story_id, page_number)
);

-- ---------------------------------------------------------------------------
-- AUDIO GUIDES
-- ---------------------------------------------------------------------------
create table audio_guides (
  id uuid primary key default uuid_generate_v4(),
  animal_id uuid references animals(id) on delete cascade,
  story_page_id uuid references story_pages(id) on delete cascade,
  language audio_language not null,
  voice_type audio_voice not null default 'female',
  audio_url text,
  duration_seconds integer,
  transcript text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (animal_id is not null or story_page_id is not null)
);

-- ---------------------------------------------------------------------------
-- QR CODES
-- ---------------------------------------------------------------------------
create table animal_qr_codes (
  id uuid primary key default uuid_generate_v4(),
  animal_id uuid not null references animals(id) on delete cascade unique,
  qr_token text not null unique default encode(gen_random_bytes(12), 'hex'),
  qr_image_url text,
  scan_count integer not null default 0,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- TICKETING
-- ---------------------------------------------------------------------------
create table ticket_types (
  id uuid primary key default uuid_generate_v4(),
  name text not null,               -- Adult / Child / VIP / Group
  khmer_name text,
  description text,
  price_usd numeric(10,2) not null,
  min_age integer,
  max_age integer,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table bookings (
  id uuid primary key default uuid_generate_v4(),
  booking_code text not null unique default ('ZW-' || to_char(now(),'YYYY') || '-' || lpad(floor(random()*100000)::text,5,'0')),
  visitor_id uuid references profiles(id) on delete set null,
  visitor_name text,
  visitor_email text,
  visitor_phone text,
  visit_date date not null,
  status booking_status not null default 'pending',
  subtotal_usd numeric(10,2) not null default 0,
  discount_usd numeric(10,2) not null default 0,
  total_usd numeric(10,2) not null default 0,
  qr_token text not null unique default encode(gen_random_bytes(12), 'hex'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table booking_items (
  id uuid primary key default uuid_generate_v4(),
  booking_id uuid not null references bookings(id) on delete cascade,
  ticket_type_id uuid not null references ticket_types(id) on delete restrict,
  quantity integer not null check (quantity > 0),
  unit_price_usd numeric(10,2) not null,
  line_total_usd numeric(10,2) not null
);

create table payments (
  id uuid primary key default uuid_generate_v4(),
  booking_id uuid not null references bookings(id) on delete cascade,
  provider text not null default 'manual',   -- abstraction point for real payment provider
  provider_reference text,
  amount_usd numeric(10,2) not null,
  status payment_status not null default 'pending',
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

create table visitor_checkins (
  id uuid primary key default uuid_generate_v4(),
  booking_id uuid not null references bookings(id) on delete cascade,
  checked_in_by uuid references profiles(id),
  visitors_count integer not null default 1,
  checked_in_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- ANIMAL QUEST (gamification)
-- ---------------------------------------------------------------------------
create table quest_sessions (
  id uuid primary key default uuid_generate_v4(),
  visitor_id uuid references profiles(id) on delete cascade,
  device_token text,                 -- for anonymous/guest play without login
  points integer not null default 0,
  started_at timestamptz not null default now(),
  completed_at timestamptz
);

create table quest_discoveries (
  id uuid primary key default uuid_generate_v4(),
  session_id uuid not null references quest_sessions(id) on delete cascade,
  animal_id uuid not null references animals(id) on delete cascade,
  points_awarded integer not null default 10,
  discovered_at timestamptz not null default now(),
  unique (session_id, animal_id)
);

-- ---------------------------------------------------------------------------
-- AUDIT LOG
-- ---------------------------------------------------------------------------
create table audit_logs (
  id uuid primary key default uuid_generate_v4(),
  actor_id uuid references profiles(id),
  action text not null,
  entity_table text not null,
  entity_id uuid,
  metadata jsonb,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- SETTINGS (single-row key/value store for admin-configurable app settings)
-- ---------------------------------------------------------------------------
create table app_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- INDEXES
-- ---------------------------------------------------------------------------
create index idx_animals_code on animals (animal_code);
create index idx_animals_name on animals (name);
create index idx_animals_species on animals (species_id);
create index idx_animals_category on animals (category_id);
create index idx_animals_dob on animals (date_of_birth);
create index idx_animal_locations_animal on animal_locations (animal_id);
create index idx_animal_qr_token on animal_qr_codes (qr_token);
create index idx_bookings_code on bookings (booking_code);
create index idx_bookings_visit_date on bookings (visit_date);
create index idx_story_pages_story on story_pages (story_id);
create index idx_audio_guides_animal on audio_guides (animal_id);
create index idx_map_markers_map on map_markers (map_id);
