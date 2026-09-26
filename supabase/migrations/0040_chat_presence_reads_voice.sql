-- Who has the staff area open right now (a heartbeat every few seconds).
create table if not exists public.staff_presence (
  user_id uuid primary key references auth.users(id) on delete cascade,
  last_seen timestamptz not null default now(),
  path text
);
alter table public.staff_presence enable row level security;
drop policy if exists staff_presence_team on public.staff_presence;
create policy staff_presence_team on public.staff_presence for select using (auth_role() in ('admin', 'staff'));

-- When each person last read each chat channel (so read channels show no badge).
create table if not exists public.staff_chat_reads (
  user_id uuid not null references auth.users(id) on delete cascade,
  channel text not null,
  last_read_at timestamptz not null default now(),
  primary key (user_id, channel)
);
alter table public.staff_chat_reads enable row level security;

-- Voice messages.
alter table public.staff_messages add column if not exists audio_url text;
alter table public.staff_messages add column if not exists audio_secs integer;
alter table public.staff_messages drop constraint if exists staff_messages_body_check;
alter table public.staff_messages alter column body drop not null;
alter table public.staff_messages add constraint staff_messages_body_check check ((body is not null and char_length(body) between 1 and 1000) or audio_url is not null);
