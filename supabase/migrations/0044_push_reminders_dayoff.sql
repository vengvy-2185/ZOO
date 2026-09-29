-- 1. Phone notifications (Web Push): one row per phone / browser that said yes.
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  last_ok timestamptz
);
create index if not exists idx_push_user on public.push_subscriptions (user_id);
alter table public.push_subscriptions enable row level security;

-- 2. Shift reminders already sent (so each goes out once).
create table if not exists public.reminder_log (
  user_id uuid not null references auth.users(id) on delete cascade,
  day date not null,
  kind text not null, -- 'eve' (the evening before) · 'morning' / 'afternoon' (30 min before)
  sent_at timestamptz not null default now(),
  primary key (user_id, day, kind)
);
alter table public.reminder_log enable row level security;

-- 3. Swapping days off with a colleague.
alter table public.staff_shift_requests drop constraint if exists staff_shift_requests_kind_check;
alter table public.staff_shift_requests add constraint staff_shift_requests_kind_check check (kind in ('cover', 'swap', 'dayoff'));

-- 4. The activity log is read by admins through the server only.
create index if not exists idx_audit_created on public.audit_logs (created_at desc);
