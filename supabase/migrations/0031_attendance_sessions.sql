-- Morning / afternoon attendance by scanning a QR that changes every minute,
-- only from inside the zoo (location check), with rest days, holidays and
-- late / absence rules that feed the payroll.

create table if not exists public.staff_attendance_settings (
  id int primary key default 1 check (id = 1),
  morning_start time not null default '07:30',
  morning_end time not null default '11:30',
  afternoon_start time not null default '13:30',
  afternoon_end time not null default '17:30',
  grace_minutes int not null default 10 check (grace_minutes between 0 and 120),
  open_before_minutes int not null default 60 check (open_before_minutes between 0 and 240),
  rest_days int[] not null default '{}', -- 0 = Sunday … 6 = Saturday
  zoo_lat double precision,
  zoo_lng double precision,
  radius_m int not null default 300 check (radius_m between 30 and 5000),
  require_location boolean not null default true,
  late_fee numeric(10, 2) not null default 0,
  absence_fee numeric(10, 2) not null default 0,
  qr_secret text not null default encode(extensions.gen_random_bytes(24), 'hex'),
  updated_at timestamptz not null default now()
);
insert into public.staff_attendance_settings (id) values (1) on conflict do nothing;

create table if not exists public.staff_holidays (
  day date primary key,
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.staff_session_checks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  day date not null,
  session text not null check (session in ('morning', 'afternoon')),
  checked_at timestamptz not null default now(),
  late_minutes int not null default 0,
  lat double precision,
  lng double precision,
  distance_m int,
  method text not null default 'qr' check (method in ('qr', 'manual')),
  marked_by uuid references auth.users(id) on delete set null,
  unique (user_id, day, session)
);
create index if not exists staff_session_checks_day on public.staff_session_checks (day);

alter table public.staff_attendance_settings enable row level security;
alter table public.staff_holidays enable row level security;
alter table public.staff_session_checks enable row level security;
-- (the QR secret is only ever read with the service role; no public policy on settings)
drop policy if exists staff_holidays_team on public.staff_holidays;
create policy staff_holidays_team on public.staff_holidays for select using (auth_role() in ('admin', 'staff'));
drop policy if exists staff_session_checks_own on public.staff_session_checks;
create policy staff_session_checks_own on public.staff_session_checks for select using (user_id = auth.uid() or auth_role() = 'admin');

do $$
declare t text;
begin
  foreach t in array array['staff_attendance_settings', 'staff_holidays', 'staff_session_checks'] loop
    execute format('drop trigger if exists %1$s_live on public.%1$s', t);
    execute format('create trigger %1$s_live after insert or update or delete on public.%1$s for each statement execute function public.touch_live_update()', t);
  end loop;
end $$;
