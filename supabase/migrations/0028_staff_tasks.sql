-- Daily task ticks for staff tools: cleaning checklist (zones/facilities)
-- and the guide's programme (events done). One tick per thing per day.
create table if not exists public.staff_task_checks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  kind text not null check (kind in ('cleaning', 'event')),
  ref text not null,
  check_date date not null default ((now() at time zone 'Asia/Phnom_Penh')::date),
  created_at timestamptz not null default now(),
  unique (kind, ref, check_date)
);
alter table public.staff_task_checks enable row level security;
drop policy if exists staff_task_checks_team on public.staff_task_checks;
create policy staff_task_checks_team on public.staff_task_checks for select using (auth_role() in ('admin', 'staff'));

drop trigger if exists staff_task_checks_live on public.staff_task_checks;
create trigger staff_task_checks_live after insert or update or delete on public.staff_task_checks for each statement execute function public.touch_live_update();

-- New permissions for the starter positions: guides get the day's programme,
-- cleaners the cleaning checklist, managers everything.
update public.staff_positions set permissions = array(select distinct unnest(permissions || array['guide'])) where name = 'Tour Guide';
update public.staff_positions set permissions = array(select distinct unnest(permissions || array['cleaning'])) where name = 'Cleaner';
update public.staff_positions set permissions = array(select distinct unnest(permissions || array['guide', 'cleaning'])) where name = 'Manager';
