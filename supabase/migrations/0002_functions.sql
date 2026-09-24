-- ============================================================================
-- GREEN WILD ZOO — DATABASE FUNCTIONS
-- ============================================================================

-- Age is NEVER stored; always derived from date_of_birth.
create or replace function calculate_animal_age(p_dob date)
returns text
language sql
stable
as $$
  select case
    when p_dob is null then null
    when age(p_dob) < interval '1 year' then
      extract(month from age(p_dob))::int || ' months'
    else
      extract(year from age(p_dob))::int || ' years'
  end;
$$;

-- Days until next birthday (0 = today)
create or replace function days_until_next_birthday(p_dob date)
returns integer
language sql
stable
as $$
  select case when p_dob is null then null else
    (
      case
        when (make_date(extract(year from current_date)::int, extract(month from p_dob)::int, extract(day from p_dob)::int)) >= current_date
          then (make_date(extract(year from current_date)::int, extract(month from p_dob)::int, extract(day from p_dob)::int)) - current_date
        else (make_date(extract(year from current_date)::int + 1, extract(month from p_dob)::int, extract(day from p_dob)::int)) - current_date
      end
    )::int
  end;
$$;

-- Current location for one animal, joined up the hierarchy
create or replace function get_current_animal_location(p_animal_id uuid)
returns table (
  zone_id uuid, zone_code text, zone_name text,
  habitat_id uuid, habitat_name text,
  enclosure_id uuid, enclosure_code text,
  map_x numeric, map_y numeric, updated_at timestamptz
)
language sql
stable
as $$
  select z.id, z.code, z.name, h.id, h.name, e.id, e.code, al.map_x, al.map_y, al.updated_at
  from animal_locations al
  left join zoo_zones z on z.id = al.zone_id
  left join habitats h on h.id = al.habitat_id
  left join enclosures e on e.id = al.enclosure_id
  where al.animal_id = p_animal_id and al.is_current
  limit 1;
$$;

-- Family: father, mother, siblings, children for one animal
create or replace function get_animal_family(p_animal_id uuid)
returns table (relationship_type text, related_animal_id uuid, related_name text, related_code text, related_image text)
language sql
stable
as $$
  select r.relationship_type, a.id, a.name, a.animal_code, a.main_image_url
  from animal_relationships r
  join animals a on a.id = r.related_animal_id
  where r.animal_id = p_animal_id
  order by r.relationship_type;
$$;

-- Upcoming birthdays within N days (default 30), for admin + public "today's birthdays"
create or replace function get_upcoming_birthdays(p_days integer default 30)
returns table (animal_id uuid, name text, animal_code text, date_of_birth date, days_away integer, main_image_url text)
language sql
stable
as $$
  select a.id, a.name, a.animal_code, a.date_of_birth,
         days_until_next_birthday(a.date_of_birth), a.main_image_url
  from animals a
  where a.date_of_birth is not null
    and a.status = 'active'
    and a.show_birthday_publicly = true
    and days_until_next_birthday(a.date_of_birth) <= p_days
  order by days_until_next_birthday(a.date_of_birth) asc;
$$;

-- Recalculate a booking's subtotal/discount/total from its line items
create or replace function calculate_booking_total(p_booking_id uuid, p_discount_usd numeric default 0)
returns numeric
language plpgsql
security definer
set search_path = public
as $$
declare
  v_subtotal numeric;
begin
  select coalesce(sum(line_total_usd), 0) into v_subtotal
  from booking_items where booking_id = p_booking_id;

  update bookings
  set subtotal_usd = v_subtotal,
      discount_usd = p_discount_usd,
      total_usd = greatest(v_subtotal - p_discount_usd, 0),
      updated_at = now()
  where id = p_booking_id;

  return v_subtotal - p_discount_usd;
end;
$$;

-- Validate a ticket QR token: returns booking info + whether already checked in
create or replace function check_ticket_validity(p_qr_token text)
returns table (
  booking_id uuid, booking_code text, visit_date date, status booking_status,
  total_usd numeric, is_checked_in boolean, visitors_count integer
)
language sql
stable
as $$
  select b.id, b.booking_code, b.visit_date, b.status, b.total_usd,
         exists(select 1 from visitor_checkins c where c.booking_id = b.id) as is_checked_in,
         coalesce((select sum(quantity) from booking_items bi where bi.booking_id = b.id), 0)::int
  from bookings b
  where b.qr_token = p_qr_token;
$$;

-- Award quest points for discovering an animal; no-ops (no duplicate points) if already discovered
create or replace function add_quest_discovery(p_session_id uuid, p_animal_id uuid, p_points integer default 10)
returns table (awarded boolean, total_points integer)
language plpgsql
as $$
declare
  v_awarded boolean := false;
  v_total integer;
begin
  insert into quest_discoveries (session_id, animal_id, points_awarded)
  values (p_session_id, p_animal_id, p_points)
  on conflict (session_id, animal_id) do nothing;

  if found then
    v_awarded := true;
    update quest_sessions set points = points + p_points where id = p_session_id;
  end if;

  select points into v_total from quest_sessions where id = p_session_id;
  return query select v_awarded, v_total;
end;
$$;

-- Atomically bump an animal's QR scan counter (called by the /scan/[code] route)
create or replace function increment_qr_scan(p_animal_id uuid)
returns void
language sql
as $$
  update animal_qr_codes set scan_count = scan_count + 1 where animal_id = p_animal_id;
$$;

-- Keep updated_at fresh automatically
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare t text;
begin
  for t in select unnest(array[
    'profiles','animal_categories','species','animals','zoo_maps','zoo_zones','habitats',
    'enclosures','animal_stories','story_pages','audio_guides','ticket_types','bookings','map_markers'
  ])
  loop
    execute format('create trigger trg_set_updated_at before update on %I for each row execute function set_updated_at();', t);
  end loop;
end $$;

-- When a new "current" location is inserted, unset the previous current row.
create or replace function enforce_single_current_location()
returns trigger language plpgsql as $$
begin
  if new.is_current then
    update animal_locations
    set is_current = false
    where animal_id = new.animal_id and id <> new.id and is_current;
  end if;
  return new;
end;
$$;

create trigger trg_single_current_location
  before insert or update on animal_locations
  for each row execute function enforce_single_current_location();

-- Auto-create a QR code row whenever a new animal is inserted
create or replace function create_animal_qr()
returns trigger language plpgsql as $$
begin
  insert into animal_qr_codes (animal_id) values (new.id)
  on conflict (animal_id) do nothing;
  return new;
end;
$$;

create trigger trg_create_animal_qr
  after insert on animals
  for each row execute function create_animal_qr();
