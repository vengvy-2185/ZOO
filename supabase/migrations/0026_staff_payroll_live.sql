-- Staff: positions (what they may do + how they are paid), staff records with
-- a Staff ID used to sign in, attendance, pay adjustments and payslips.
-- Staff accounts are created only by an admin (server side, service role).

create table if not exists public.staff_positions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  name_km text,
  pay_type text not null default 'monthly' check (pay_type in ('monthly', 'daily', 'hourly')),
  rate numeric(10, 2) not null default 0 check (rate >= 0),
  -- 'tickets' = scanner, gate counter, check-in · 'animals' = animal care log · 'reports' = today's numbers
  permissions text[] not null default '{}',
  color text not null default '#2563EB',
  sort int not null default 0,
  created_at timestamptz not null default now()
);

create sequence if not exists public.staff_no_seq start 1;

create table if not exists public.staff_members (
  user_id uuid primary key references auth.users(id) on delete cascade,
  staff_no text not null unique,
  full_name text not null,
  full_name_km text,
  position_id uuid references public.staff_positions(id) on delete set null,
  phone text,
  hired_on date not null default ((now() at time zone 'Asia/Phnom_Penh')::date),
  allowance numeric(10, 2) not null default 0,
  status text not null default 'active' check (status in ('active', 'suspended', 'left')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.staff_attendance (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  clock_in timestamptz not null default now(),
  clock_out timestamptz,
  check (clock_out is null or clock_out > clock_in)
);
create index if not exists staff_attendance_user_in on public.staff_attendance (user_id, clock_in desc);
-- at most one open shift per person
create unique index if not exists staff_attendance_one_open on public.staff_attendance (user_id) where clock_out is null;

create table if not exists public.staff_pay_adjustments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  month date not null, -- first day of the month
  amount numeric(10, 2) not null, -- + bonus / - deduction
  note text not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.staff_payslips (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  month date not null,
  pay_type text not null,
  rate numeric(10, 2) not null,
  units numeric(10, 2) not null,
  base numeric(10, 2) not null,
  allowance numeric(10, 2) not null,
  adjustments numeric(10, 2) not null,
  gross numeric(10, 2) not null,
  paid_at timestamptz not null default now(),
  paid_by uuid references auth.users(id) on delete set null,
  unique (user_id, month)
);

create table if not exists public.animal_care_logs (
  id uuid primary key default gen_random_uuid(),
  animal_id uuid not null references public.animals(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  kind text not null check (kind in ('feeding', 'health', 'cleaning', 'enrichment', 'note')),
  note text not null,
  created_at timestamptz not null default now()
);
create index if not exists animal_care_logs_animal on public.animal_care_logs (animal_id, created_at desc);

-- Next Staff ID: GWZ-S-0001, GWZ-S-0002, ...
create or replace function public.next_staff_no()
returns text language sql security definer set search_path = public as $$
  select 'GWZ-S-' || lpad(nextval('staff_no_seq')::text, 4, '0');
$$;
revoke all on function public.next_staff_no() from public, anon, authenticated;
grant execute on function public.next_staff_no() to service_role;

-- RLS: admins manage everything; staff read their own records. Staff writes
-- (clock in/out, care notes) go through server actions that check the role.
alter table public.staff_positions enable row level security;
alter table public.staff_members enable row level security;
alter table public.staff_attendance enable row level security;
alter table public.staff_pay_adjustments enable row level security;
alter table public.staff_payslips enable row level security;
alter table public.animal_care_logs enable row level security;

drop policy if exists staff_positions_read on public.staff_positions;
create policy staff_positions_read on public.staff_positions for select using (auth.uid() is not null);
drop policy if exists staff_positions_admin on public.staff_positions;
create policy staff_positions_admin on public.staff_positions for all using (auth_role() = 'admin') with check (auth_role() = 'admin');

do $$
declare t text;
begin
  foreach t in array array['staff_members', 'staff_attendance', 'staff_pay_adjustments', 'staff_payslips'] loop
    execute format('drop policy if exists %1$s_own on public.%1$s', t);
    execute format('create policy %1$s_own on public.%1$s for select using (user_id = auth.uid() or auth_role() = ''admin'')', t);
    execute format('drop policy if exists %1$s_admin on public.%1$s', t);
    execute format('create policy %1$s_admin on public.%1$s for all using (auth_role() = ''admin'') with check (auth_role() = ''admin'')', t);
  end loop;
end $$;

drop policy if exists animal_care_logs_team on public.animal_care_logs;
create policy animal_care_logs_team on public.animal_care_logs for select using (auth_role() in ('admin', 'staff'));

-- Starter positions (edit them any time in Admin → Staff → Positions).
insert into public.staff_positions (name, name_km, pay_type, rate, permissions, color, sort)
select * from (values
  ('Manager', 'អ្នកគ្រប់គ្រង', 'monthly', 1000, array['tickets', 'animals', 'reports'], '#7C3AED', 1),
  ('Ticket & Gate', 'សំបុត្រ និងច្រកចូល', 'monthly', 350, array['tickets'], '#2563EB', 2),
  ('Animal Keeper', 'អ្នកថែសត្វ', 'monthly', 400, array['animals'], '#15803D', 3),
  ('Veterinarian', 'ពេទ្យសត្វ', 'monthly', 900, array['animals', 'reports'], '#0F766E', 4),
  ('Tour Guide', 'មគ្គុទ្ទេសក៍', 'daily', 20, array['tickets'], '#D97706', 5),
  ('Cleaner', 'អ្នកសម្អាត', 'daily', 12, array[]::text[], '#64748B', 6),
  ('Shop & Café', 'ហាង និងកាហ្វេ', 'hourly', 2.5, array[]::text[], '#DB2777', 7)
) v(name, name_km, pay_type, rate, permissions, color, sort)
where not exists (select 1 from public.staff_positions);

-- ── Live updates ──────────────────────────────────────────────────────
-- One tiny row per table, bumped whenever that table changes. Browsers
-- listen to this table over Supabase Realtime and refresh the page they are
-- on, so nobody has to press refresh. It carries no data, only "X changed".
create table if not exists public.live_updates (
  topic text primary key,
  at timestamptz not null default now()
);
alter table public.live_updates enable row level security;
drop policy if exists live_updates_read on public.live_updates;
create policy live_updates_read on public.live_updates for select using (true);

create or replace function public.touch_live_update()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into live_updates (topic, at) values (tg_table_name, now())
  on conflict (topic) do update set at = excluded.at;
  return null;
end $$;

do $$
declare t text;
begin
  foreach t in array array[
    'animals', 'animal_photos', 'species', 'animal_stories', 'news', 'events', 'reviews',
    'bookings', 'visitor_checkins', 'point_ledger', 'discount_codes', 'adoptions',
    'member_cards', 'member_card_issues', 'profiles', 'ticket_types',
    'staff_members', 'staff_positions', 'staff_attendance', 'staff_payslips', 'staff_pay_adjustments', 'animal_care_logs'
  ] loop
    if to_regclass('public.' || t) is not null then
      execute format('drop trigger if exists %1$s_live on public.%1$s', t);
      execute format('create trigger %1$s_live after insert or update or delete on public.%1$s for each statement execute function public.touch_live_update()', t);
    end if;
  end loop;
end $$;

do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'live_updates') then
    alter publication supabase_realtime add table public.live_updates;
  end if;
end $$;
