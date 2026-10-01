-- Each staff member's own secret code (PIN): asked when the app opens (can be
-- turned off) and always before pay amounts are shown. Stored only as a
-- salted hash; wrong tries lock it for a while. Server-only.

create table if not exists public.staff_pins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  pin_hash text not null,
  lock_on_open boolean not null default true,
  failed int not null default 0,
  locked_until timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.staff_pins enable row level security;
revoke all on public.staff_pins from anon, authenticated;
