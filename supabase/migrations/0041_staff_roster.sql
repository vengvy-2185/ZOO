-- Weekly / monthly work schedule: one row per person per day.
create table if not exists public.staff_roster (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  day date not null,
  shift text not null check (shift in ('morning', 'afternoon', 'full', 'off')),
  note text,
  created_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  unique (user_id, day)
);
create index if not exists staff_roster_day on public.staff_roster (day);

-- Asking someone to take a shift (cover) or to trade shifts (swap).
create table if not exists public.staff_shift_requests (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('cover', 'swap')),
  roster_id uuid not null references public.staff_roster(id) on delete cascade,
  from_user uuid not null references auth.users(id) on delete cascade,
  -- swap: the colleague's shift offered in exchange
  swap_roster_id uuid references public.staff_roster(id) on delete cascade,
  reason text,
  status text not null default 'open' check (status in ('open', 'accepted', 'approved', 'rejected', 'cancelled')),
  taken_by uuid references auth.users(id) on delete set null,
  decided_by uuid references auth.users(id) on delete set null,
  decided_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists staff_shift_requests_status on public.staff_shift_requests (status, created_at desc);

do $$
declare t text;
begin
  foreach t in array array['staff_roster', 'staff_shift_requests'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists %I on public.%I', t || '_team', t);
    execute format('create policy %I on public.%I for select using (auth_role() in (''admin'', ''staff''))', t || '_team', t);
    execute format('drop trigger if exists %I on public.%I', t || '_live', t);
    execute format('create trigger %I after insert or update or delete on public.%I for each statement execute function public.touch_live_update()', t || '_live', t);
  end loop;
end $$;
