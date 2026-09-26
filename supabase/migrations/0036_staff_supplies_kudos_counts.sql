-- Supplies: staff ask for what their section needs; managers/admins approve and deliver.
create table if not exists public.staff_supply_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  section text not null check (section in ('tickets', 'animals', 'cleaning', 'guide', 'general')),
  item text not null,
  quantity integer not null default 1 check (quantity between 1 and 9999),
  urgent boolean not null default false,
  note text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'delivered', 'rejected')),
  handled_by uuid references auth.users(id) on delete set null,
  handled_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists staff_supply_requests_status on public.staff_supply_requests (status, created_at desc);
alter table public.staff_supply_requests enable row level security;
drop policy if exists staff_supply_team on public.staff_supply_requests;
create policy staff_supply_team on public.staff_supply_requests for select using (auth_role() in ('admin', 'staff'));
drop trigger if exists staff_supply_live on public.staff_supply_requests;
create trigger staff_supply_live after insert or update or delete on public.staff_supply_requests for each statement execute function public.touch_live_update();

-- Thanks between colleagues, with a small badge.
create table if not exists public.staff_kudos (
  id uuid primary key default gen_random_uuid(),
  from_user uuid references auth.users(id) on delete cascade,
  to_user uuid not null references auth.users(id) on delete cascade,
  badge text not null check (badge in ('helpful', 'teamwork', 'fast', 'kind', 'star')),
  message text,
  created_at timestamptz not null default now()
);
create index if not exists staff_kudos_to on public.staff_kudos (to_user, created_at desc);
alter table public.staff_kudos enable row level security;
drop policy if exists staff_kudos_team on public.staff_kudos;
create policy staff_kudos_team on public.staff_kudos for select using (auth_role() in ('admin', 'staff'));
drop trigger if exists staff_kudos_live on public.staff_kudos;
create trigger staff_kudos_live after insert or update or delete on public.staff_kudos for each statement execute function public.touch_live_update();

-- Guides: how many visitors came to each show today.
create table if not exists public.staff_event_counts (
  day date not null,
  ref text not null,
  visitors integer not null check (visitors between 0 and 5000),
  user_id uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  primary key (day, ref)
);
alter table public.staff_event_counts enable row level security;
drop policy if exists staff_event_counts_team on public.staff_event_counts;
create policy staff_event_counts_team on public.staff_event_counts for select using (auth_role() in ('admin', 'staff'));
