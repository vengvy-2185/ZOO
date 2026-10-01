-- Private chats (room "dm:<a>:<b>"): only those two people can read the
-- messages, reactions and "seen" marks — not other staff, not the admin.

drop policy if exists staff_messages_team on public.staff_messages;
create policy staff_messages_team on public.staff_messages for select using (
  auth_role() in ('admin', 'staff')
  and (channel not like 'dm:%' or position(auth.uid()::text in channel) > 0)
);

drop policy if exists staff_message_reactions_team on public.staff_message_reactions;
create policy staff_message_reactions_team on public.staff_message_reactions for select using (
  auth_role() in ('admin', 'staff')
  and exists (select 1 from public.staff_messages m where m.id = message_id)
);

drop policy if exists staff_chat_reads_team on public.staff_chat_reads;
create policy staff_chat_reads_team on public.staff_chat_reads for select using (
  auth_role() in ('admin', 'staff')
  and (channel not like 'dm:%' or position(auth.uid()::text in channel) > 0)
);

-- the room may now also be a private chat "dm:<id>:<id>"
alter table public.staff_messages drop constraint if exists staff_messages_channel_check;
alter table public.staff_messages add constraint staff_messages_channel_check check (
  channel in ('all', 'managers', 'tickets', 'animals', 'cleaning', 'guide')
  or channel ~ '^dm:[0-9a-f-]{36}:[0-9a-f-]{36}$'
);
alter table public.staff_calls drop constraint if exists staff_calls_channel_check;
alter table public.staff_calls add constraint staff_calls_channel_check check (
  channel in ('all', 'managers', 'tickets', 'animals', 'cleaning', 'guide')
  or channel ~ '^dm:[0-9a-f-]{36}:[0-9a-f-]{36}$'
);
