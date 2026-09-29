-- Team chat like a real messenger: photos and files, location, replies,
-- reactions, "seen by", and voice / video calls.

-- Messages can carry files (photos, documents), a location or a call, and can
-- answer another message.
alter table public.staff_messages add column if not exists kind text not null default 'text';
alter table public.staff_messages add column if not exists files jsonb;
alter table public.staff_messages add column if not exists meta jsonb;
alter table public.staff_messages add column if not exists reply_to uuid references public.staff_messages(id) on delete set null;
alter table public.staff_messages drop constraint if exists staff_messages_kind_check;
alter table public.staff_messages add constraint staff_messages_kind_check check (kind in ('text', 'call', 'location'));
alter table public.staff_messages drop constraint if exists staff_messages_body_check;
alter table public.staff_messages add constraint staff_messages_body_check
  check ((body is not null and char_length(body) between 1 and 1000) or audio_url is not null or files is not null or kind <> 'text');

-- One reaction per person per message (like Messenger).
create table if not exists public.staff_message_reactions (
  message_id uuid not null references public.staff_messages(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  emoji text not null check (char_length(emoji) between 1 and 16),
  created_at timestamptz not null default now(),
  primary key (message_id, user_id)
);
alter table public.staff_message_reactions enable row level security;

-- Calls in a chat room. "alive_at" is bumped by the people in the call, so a
-- call nobody closed properly still ends by itself.
create table if not exists public.staff_calls (
  id uuid primary key default gen_random_uuid(),
  channel text not null check (channel in ('all', 'managers', 'tickets', 'animals', 'cleaning', 'guide')),
  started_by uuid references auth.users(id) on delete set null,
  video boolean not null default false,
  created_at timestamptz not null default now(),
  alive_at timestamptz not null default now(),
  ended_at timestamptz
);
create index if not exists staff_calls_open on public.staff_calls (channel, created_at desc) where ended_at is null;
alter table public.staff_calls enable row level security;

-- pages refresh by themselves when these change ("seen", reactions, calls)
do $$
declare t text;
begin
  foreach t in array array['staff_message_reactions', 'staff_calls', 'staff_chat_reads'] loop
    execute format('drop trigger if exists %1$s_live on public.%1$s', t);
    execute format('create trigger %1$s_live after insert or delete or update on public.%1$s for each statement execute function public.touch_live_update()', t);
  end loop;
end $$;
-- a heartbeat of a call is not news: only starting / ending a call refreshes pages
drop trigger if exists staff_calls_live on public.staff_calls;
create trigger staff_calls_live after insert or delete or update of ended_at on public.staff_calls for each statement execute function public.touch_live_update();

-- Photos and files sent in the chat (uploaded straight from the phone).
insert into storage.buckets (id, name, public, file_size_limit)
values ('staff-files', 'staff-files', true, 26214400)
on conflict (id) do update set public = true, file_size_limit = excluded.file_size_limit;
