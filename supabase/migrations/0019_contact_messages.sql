-- Messages visitors send from the "Contact us" page. Written by the server
-- (service role) after validation; only admins can read or update them.
create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 60),
  contact text not null check (char_length(contact) between 3 and 80),
  topic text not null default 'other',
  message text not null check (char_length(message) between 5 and 1000),
  handled boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists contact_messages_created on public.contact_messages (created_at desc);
alter table public.contact_messages enable row level security;
drop policy if exists contact_messages_admin on public.contact_messages;
create policy contact_messages_admin on public.contact_messages for all using (auth_role() = 'admin') with check (auth_role() = 'admin');
