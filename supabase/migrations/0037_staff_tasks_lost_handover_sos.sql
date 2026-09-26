-- Tasks a manager gives to one person or a whole section.
create table if not exists public.staff_tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  note text,
  assigned_to uuid references auth.users(id) on delete cascade,
  section text check (section in ('tickets', 'animals', 'cleaning', 'guide', 'reports')),
  priority text not null default 'normal' check (priority in ('low', 'normal', 'high')),
  due_at timestamptz,
  status text not null default 'open' check (status in ('open', 'done')),
  created_by uuid references auth.users(id) on delete set null,
  done_by uuid references auth.users(id) on delete set null,
  done_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists staff_tasks_open on public.staff_tasks (status, due_at);

-- Things visitors lost that staff found.
create table if not exists public.lost_found (
  id uuid primary key default gen_random_uuid(),
  item text not null,
  place text not null,
  description text,
  category text not null default 'other' check (category in ('phone', 'bag', 'wallet', 'keys', 'clothes', 'child', 'other')),
  found_by uuid references auth.users(id) on delete set null,
  status text not null default 'held' check (status in ('held', 'returned')),
  owner_name text,
  owner_contact text,
  returned_by uuid references auth.users(id) on delete set null,
  returned_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists lost_found_status on public.lost_found (status, created_at desc);

-- End-of-shift notes for whoever works next in the same section.
create table if not exists public.staff_handover (
  id uuid primary key default gen_random_uuid(),
  section text not null check (section in ('tickets', 'animals', 'cleaning', 'guide', 'general')),
  note text not null,
  user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists staff_handover_section on public.staff_handover (section, created_at desc);

-- SOS: an emergency that managers see at once on every staff page.
create table if not exists public.staff_alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  kind text not null check (kind in ('medical', 'animal', 'security', 'fire', 'child', 'other')),
  place text,
  note text,
  lat double precision,
  lng double precision,
  status text not null default 'open' check (status in ('open', 'resolved')),
  resolved_by uuid references auth.users(id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists staff_alerts_open on public.staff_alerts (status, created_at desc);

do $$
declare t text;
begin
  foreach t in array array['staff_tasks', 'lost_found', 'staff_handover', 'staff_alerts'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists %I on public.%I', t || '_team', t);
    execute format('create policy %I on public.%I for select using (auth_role() in (''admin'', ''staff''))', t || '_team', t);
    execute format('drop trigger if exists %I on public.%I', t || '_live', t);
    execute format('create trigger %I after insert or update or delete on public.%I for each statement execute function public.touch_live_update()', t || '_live', t);
  end loop;
end $$;
