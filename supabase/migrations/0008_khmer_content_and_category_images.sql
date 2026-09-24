-- ============================================================================
-- Khmer (km) versions of all visitor-facing text + category photos.
-- Convention: every `<field>_km` column is the Khmer translation of `<field>`.
-- The app shows the Khmer column when the visitor picks ខ្មែរ and falls back
-- to the English column when a translation hasn't been written yet.
-- ============================================================================

alter table animal_categories
  add column if not exists image_url text,
  add column if not exists description text,
  add column if not exists description_km text;

alter table species
  add column if not exists description_km text,
  add column if not exists habitat_description_km text,
  add column if not exists conservation_status_km text;

alter table animals
  add column if not exists place_of_birth_km text,
  add column if not exists biography_km text,
  add column if not exists personality_km text,
  add column if not exists favorite_food_km text,
  add column if not exists favorite_activities_km text,
  add column if not exists interesting_facts_km text,
  add column if not exists care_information_km text;

alter table story_pages
  add column if not exists title_km text,
  add column if not exists content_km text;

alter table animal_stories
  add column if not exists title_km text,
  add column if not exists description_km text;

alter table animal_photos
  add column if not exists caption_km text;
