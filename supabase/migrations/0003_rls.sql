-- ============================================================================
-- GREEN WILD ZOO — ROW LEVEL SECURITY
-- Principle: public/anon can READ active, public-facing content only.
-- Only 'admin' role can write zoo data. 'staff' can write check-ins only.
-- Visitors can manage only their own profile/bookings/quest sessions.
-- ============================================================================

-- Helper: current user's role (null if not authenticated / no profile row yet).
-- security definer so its own read of `profiles` skips RLS — the profiles
-- policies call auth_role() too, so without it they recurse forever
-- (see 0007_fix_auth_role_recursion.sql for projects created before this fix).
create or replace function auth_role()
returns user_role
language sql stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

alter table profiles enable row level security;
alter table animal_categories enable row level security;
alter table species enable row level security;
alter table zoo_maps enable row level security;
alter table zoo_zones enable row level security;
alter table habitats enable row level security;
alter table enclosures enable row level security;
alter table facilities enable row level security;
alter table map_markers enable row level security;
alter table animals enable row level security;
alter table animal_photos enable row level security;
alter table animal_relationships enable row level security;
alter table animal_locations enable row level security;
alter table animal_stories enable row level security;
alter table story_pages enable row level security;
alter table audio_guides enable row level security;
alter table animal_qr_codes enable row level security;
alter table ticket_types enable row level security;
alter table bookings enable row level security;
alter table booking_items enable row level security;
alter table payments enable row level security;
alter table visitor_checkins enable row level security;
alter table quest_sessions enable row level security;
alter table quest_discoveries enable row level security;
alter table audit_logs enable row level security;
alter table app_settings enable row level security;

-- ---------------------------------------------------------------------------
-- PROFILES
-- ---------------------------------------------------------------------------
create policy "profiles_select_own_or_admin" on profiles for select
  using (auth.uid() = id or auth_role() = 'admin');
create policy "profiles_update_own" on profiles for update
  using (auth.uid() = id) with check (auth.uid() = id);
create policy "profiles_insert_self" on profiles for insert
  with check (auth.uid() = id);
create policy "profiles_admin_all" on profiles for all
  using (auth_role() = 'admin') with check (auth_role() = 'admin');

-- ---------------------------------------------------------------------------
-- PUBLIC READ-ONLY ZOO CONTENT (categories, species, zones, habitats,
-- enclosures, facilities, maps, active animals, published stories, active audio)
-- ---------------------------------------------------------------------------
create policy "categories_public_read" on animal_categories for select using (is_active or auth_role() = 'admin');
create policy "categories_admin_write" on animal_categories for all using (auth_role() = 'admin') with check (auth_role() = 'admin');

create policy "species_public_read" on species for select using (true);
create policy "species_admin_write" on species for all using (auth_role() = 'admin') with check (auth_role() = 'admin');

create policy "maps_public_read" on zoo_maps for select using (is_active or auth_role() = 'admin');
create policy "maps_admin_write" on zoo_maps for all using (auth_role() = 'admin') with check (auth_role() = 'admin');

create policy "zones_public_read" on zoo_zones for select using (is_active or auth_role() = 'admin');
create policy "zones_admin_write" on zoo_zones for all using (auth_role() = 'admin') with check (auth_role() = 'admin');

create policy "habitats_public_read" on habitats for select using (true);
create policy "habitats_admin_write" on habitats for all using (auth_role() = 'admin') with check (auth_role() = 'admin');

create policy "enclosures_public_read" on enclosures for select using (true);
create policy "enclosures_admin_write" on enclosures for all using (auth_role() = 'admin') with check (auth_role() = 'admin');

create policy "facilities_public_read" on facilities for select using (is_active or auth_role() = 'admin');
create policy "facilities_admin_write" on facilities for all using (auth_role() = 'admin') with check (auth_role() = 'admin');

create policy "markers_public_read" on map_markers for select using (true);
create policy "markers_admin_write" on map_markers for all using (auth_role() = 'admin') with check (auth_role() = 'admin');

-- ---------------------------------------------------------------------------
-- ANIMALS + related content
-- ---------------------------------------------------------------------------
create policy "animals_public_read" on animals for select
  using (status = 'active' or auth_role() in ('admin','staff'));
create policy "animals_admin_write" on animals for all
  using (auth_role() = 'admin') with check (auth_role() = 'admin');

create policy "photos_public_read" on animal_photos for select using (true);
create policy "photos_admin_write" on animal_photos for all using (auth_role() = 'admin') with check (auth_role() = 'admin');

create policy "relationships_public_read" on animal_relationships for select using (true);
create policy "relationships_admin_write" on animal_relationships for all using (auth_role() = 'admin') with check (auth_role() = 'admin');

create policy "locations_public_read" on animal_locations for select using (true);
create policy "locations_admin_write" on animal_locations for all using (auth_role() = 'admin') with check (auth_role() = 'admin');

create policy "stories_public_read" on animal_stories for select
  using (is_published or auth_role() = 'admin');
create policy "stories_admin_write" on animal_stories for all
  using (auth_role() = 'admin') with check (auth_role() = 'admin');

create policy "story_pages_public_read" on story_pages for select
  using (exists (select 1 from animal_stories s where s.id = story_id and (s.is_published or auth_role() = 'admin')));
create policy "story_pages_admin_write" on story_pages for all
  using (auth_role() = 'admin') with check (auth_role() = 'admin');

create policy "audio_public_read" on audio_guides for select
  using (is_active or auth_role() = 'admin');
create policy "audio_admin_write" on audio_guides for all
  using (auth_role() = 'admin') with check (auth_role() = 'admin');

-- QR codes: token lookups happen via a server-side route using the service
-- role, so public select is restricted to admin only; scanning is validated
-- server-side, never by letting the browser query this table directly.
create policy "qr_admin_read" on animal_qr_codes for select using (auth_role() in ('admin','staff'));
create policy "qr_admin_write" on animal_qr_codes for all using (auth_role() = 'admin') with check (auth_role() = 'admin');

-- ---------------------------------------------------------------------------
-- TICKETING
-- ---------------------------------------------------------------------------
create policy "ticket_types_public_read" on ticket_types for select using (is_active or auth_role() = 'admin');
create policy "ticket_types_admin_write" on ticket_types for all using (auth_role() = 'admin') with check (auth_role() = 'admin');

create policy "bookings_owner_or_staff_read" on bookings for select
  using (visitor_id = auth.uid() or auth_role() in ('admin','staff'));
create policy "bookings_visitor_insert" on bookings for insert
  with check (visitor_id = auth.uid() or visitor_id is null);
create policy "bookings_admin_update" on bookings for update
  using (auth_role() = 'admin') with check (auth_role() = 'admin');

create policy "booking_items_owner_or_staff_read" on booking_items for select
  using (exists (select 1 from bookings b where b.id = booking_id and (b.visitor_id = auth.uid() or auth_role() in ('admin','staff'))));
create policy "booking_items_insert" on booking_items for insert
  with check (exists (select 1 from bookings b where b.id = booking_id and (b.visitor_id = auth.uid() or b.visitor_id is null)));
create policy "booking_items_admin_write" on booking_items for all
  using (auth_role() = 'admin') with check (auth_role() = 'admin');

create policy "payments_owner_or_staff_read" on payments for select
  using (exists (select 1 from bookings b where b.id = booking_id and (b.visitor_id = auth.uid() or auth_role() in ('admin','staff'))));
create policy "payments_admin_write" on payments for all
  using (auth_role() = 'admin') with check (auth_role() = 'admin');

create policy "checkins_staff_admin_all" on visitor_checkins for all
  using (auth_role() in ('admin','staff')) with check (auth_role() in ('admin','staff'));

-- ---------------------------------------------------------------------------
-- QUEST
-- ---------------------------------------------------------------------------
create policy "quest_sessions_owner_read" on quest_sessions for select
  using (visitor_id = auth.uid() or visitor_id is null or auth_role() = 'admin');
create policy "quest_sessions_owner_write" on quest_sessions for insert
  with check (visitor_id = auth.uid() or visitor_id is null);
create policy "quest_sessions_owner_update" on quest_sessions for update
  using (visitor_id = auth.uid() or visitor_id is null);

create policy "quest_discoveries_owner_read" on quest_discoveries for select
  using (exists (select 1 from quest_sessions s where s.id = session_id and (s.visitor_id = auth.uid() or s.visitor_id is null or auth_role() = 'admin')));
create policy "quest_discoveries_insert" on quest_discoveries for insert
  with check (exists (select 1 from quest_sessions s where s.id = session_id and (s.visitor_id = auth.uid() or s.visitor_id is null)));

-- ---------------------------------------------------------------------------
-- AUDIT LOG + SETTINGS — admin only
-- ---------------------------------------------------------------------------
create policy "audit_admin_read" on audit_logs for select using (auth_role() = 'admin');
create policy "audit_admin_insert" on audit_logs for insert with check (auth_role() in ('admin','staff'));

create policy "settings_public_read" on app_settings for select using (true);
create policy "settings_admin_write" on app_settings for all using (auth_role() = 'admin') with check (auth_role() = 'admin');
