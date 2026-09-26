-- Team chat shared by admins and staff, in channels (everyone, managers, each section).
create table if not exists public.staff_messages (
  id uuid primary key default gen_random_uuid(),
  channel text not null check (channel in ('all', 'managers', 'tickets', 'animals', 'cleaning', 'guide')),
  user_id uuid references auth.users(id) on delete set null,
  body text not null check (char_length(body) between 1 and 1000),
  created_at timestamptz not null default now()
);
create index if not exists staff_messages_channel on public.staff_messages (channel, created_at desc);
alter table public.staff_messages enable row level security;
drop policy if exists staff_messages_team on public.staff_messages;
create policy staff_messages_team on public.staff_messages for select using (auth_role() in ('admin', 'staff'));
drop trigger if exists staff_messages_live on public.staff_messages;
create trigger staff_messages_live after insert or update or delete on public.staff_messages for each statement execute function public.touch_live_update();
