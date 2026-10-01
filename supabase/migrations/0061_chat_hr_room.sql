-- A chat room for the HR team ("hr"): HR staff and admins.
alter table public.staff_messages drop constraint if exists staff_messages_channel_check;
alter table public.staff_messages add constraint staff_messages_channel_check check (
  channel in ('all', 'managers', 'tickets', 'animals', 'cleaning', 'guide', 'hr')
  or channel ~ '^dm:[0-9a-f-]{36}:[0-9a-f-]{36}$'
);
alter table public.staff_calls drop constraint if exists staff_calls_channel_check;
alter table public.staff_calls add constraint staff_calls_channel_check check (
  channel in ('all', 'managers', 'tickets', 'animals', 'cleaning', 'guide', 'hr')
  or channel ~ '^dm:[0-9a-f-]{36}:[0-9a-f-]{36}$'
);
