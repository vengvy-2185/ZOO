-- Payday: the admin sets the day pay is handed out. On that day each
-- department scans its own QR code in the staff app to collect; whoever
-- can't come (or is on leave) asks the admin at least 4 days before.
-- Everything goes through the server (service role); no browser access.

create table if not exists public.staff_paydays (
  id uuid primary key default gen_random_uuid(),
  month date not null unique,                -- the pay month (first day)
  pay_date date not null,                    -- the day money is handed out
  start_time time,
  end_time time,
  place text,
  note text,
  status text not null default 'scheduled' check (status in ('scheduled', 'open', 'closed')),
  secret text not null default encode(gen_random_bytes(24), 'hex'), -- signs the QR codes
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  opened_at timestamptz,
  closed_at timestamptz
);

-- "I can't come on payday" / "I'm on leave that day": sent ≥ 4 days before
create table if not exists public.staff_payday_requests (
  id uuid primary key default gen_random_uuid(),
  payday_id uuid not null references public.staff_paydays(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('absent', 'leave')),
  method text not null default 'later' check (method in ('later', 'proxy', 'transfer')),
  pickup_date date,
  proxy_name text,
  reason text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  admin_note text,
  decided_by uuid references auth.users(id) on delete set null,
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  unique (payday_id, user_id)
);

-- the payslip now also says how and when the money was collected
alter table public.staff_payslips
  add column if not exists payday_id uuid references public.staff_paydays(id) on delete set null,
  add column if not exists detail jsonb,
  add column if not exists received_at timestamptz,
  add column if not exists received_via text check (received_via in ('scan', 'manual', 'transfer', 'proxy')),
  add column if not exists received_by uuid references auth.users(id) on delete set null;

alter table public.staff_paydays enable row level security;
alter table public.staff_payday_requests enable row level security;
revoke all on public.staff_paydays, public.staff_payday_requests from anon, authenticated;
