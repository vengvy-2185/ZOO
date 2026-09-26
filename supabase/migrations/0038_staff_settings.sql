-- One row of numbers and lists the admin can change for the staff area
-- (emergency phones, limits, sounds, supply quick picks…). Read and written
-- by the server with the service role only.
create table if not exists public.staff_settings (
  id integer primary key default 1 check (id = 1),
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
insert into public.staff_settings (id) values (1) on conflict do nothing;
alter table public.staff_settings enable row level security;
drop trigger if exists staff_settings_live on public.staff_settings;
create trigger staff_settings_live after insert or update or delete on public.staff_settings for each statement execute function public.touch_live_update();
