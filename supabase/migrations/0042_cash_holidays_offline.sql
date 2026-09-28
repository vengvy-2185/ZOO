-- 1. Daily cash close: each gate person counts the cash at the end of the
--    day; the server works out what it should be from their gate counts.
create table if not exists public.staff_cash_closes (
  id uuid primary key default gen_random_uuid(),
  day date not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  visitors integer not null default 0,
  breakdown jsonb not null default '[]'::jsonb, -- [{category, count, price}]
  expected_usd numeric(10, 2) not null default 0,
  counted_usd numeric(10, 2) not null default 0,
  counted_khr numeric(14, 0) not null default 0,
  usd_to_khr numeric(10, 2) not null default 4100,
  total_usd numeric(10, 2) not null default 0,  -- counted_usd + counted_khr / rate
  diff_usd numeric(10, 2) not null default 0,   -- total - expected (minus = short)
  note text,
  status text not null default 'submitted' check (status in ('submitted', 'approved', 'flagged')),
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  review_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (day, user_id)
);
create index if not exists idx_cash_closes_day on public.staff_cash_closes (day desc);
alter table public.staff_cash_closes enable row level security;
-- read and written by the server (service role) after its own checks
drop trigger if exists staff_cash_closes_live on public.staff_cash_closes;
create trigger staff_cash_closes_live after insert or update or delete on public.staff_cash_closes for each statement execute function public.touch_live_update();

-- 2. Public holidays become days off by themselves; a manager can turn one
--    into a working day, which is remembered here so it is not added back.
create table if not exists public.staff_holiday_skips (
  day date primary key,
  name text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
alter table public.staff_holiday_skips enable row level security;
drop policy if exists staff_holiday_skips_team on public.staff_holiday_skips;
create policy staff_holiday_skips_team on public.staff_holiday_skips for select using (auth_role() in ('admin', 'staff'));

-- 3. Work done without internet is sent later; each piece carries its own id,
--    so sending it twice never counts it twice.
create table if not exists public.offline_ops (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null,
  result jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_offline_ops_created on public.offline_ops (created_at);
alter table public.offline_ops enable row level security;

-- 4. Simple rate limit for the public endpoints (per key per time window).
create table if not exists public.rate_limits (
  key text not null,
  window_start timestamptz not null,
  hits integer not null default 0,
  primary key (key, window_start)
);
alter table public.rate_limits enable row level security;

create or replace function public.hit_rate_limit(p_key text, p_limit integer, p_window_seconds integer)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  w timestamptz := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  n integer;
begin
  insert into rate_limits (key, window_start, hits) values (p_key, w, 1)
  on conflict (key, window_start) do update set hits = rate_limits.hits + 1
  returning hits into n;
  -- tidy up now and then
  if random() < 0.01 then
    delete from rate_limits where window_start < now() - interval '1 day';
  end if;
  return n <= p_limit;
end;
$$;
revoke all on function public.hit_rate_limit(text, integer, integer) from public, anon, authenticated;

-- a resubmitted close keeps the first count, so managers see any change
alter table public.staff_cash_closes add column if not exists first_total_usd numeric(10, 2);
alter table public.staff_cash_closes add column if not exists edits integer not null default 0;
