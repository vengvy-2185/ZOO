-- ============================================================================
-- Bakong KHQR payments, private (secret) settings, gate visitor counter,
-- and "Adopt an Animal".
-- ============================================================================

-- ---------------------------------------------------------------------------
-- PRIVATE SETTINGS — secrets such as the Bakong API token and the text-to-
-- speech key. Unlike app_settings there is NO public read: only admins can
-- read/write it through RLS, and the server reads it with the service role.
-- ---------------------------------------------------------------------------
create table if not exists private_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table private_settings enable row level security;
drop policy if exists "private_settings_admin_all" on private_settings;
create policy "private_settings_admin_all" on private_settings for all
  using (auth_role() = 'admin') with check (auth_role() = 'admin');

-- ---------------------------------------------------------------------------
-- KHQR details on each payment attempt
-- ---------------------------------------------------------------------------
alter table payments
  add column if not exists khqr text,
  add column if not exists md5 text,
  add column if not exists currency text not null default 'USD',
  add column if not exists expires_at timestamptz,
  add column if not exists payer_account text;
create index if not exists idx_payments_md5 on payments (md5);

-- ---------------------------------------------------------------------------
-- GATE ENTRIES — people counted at the entrance (walk-ins tapped by staff,
-- plus scanned tickets), by visitor category, per day (Cambodia time).
-- ---------------------------------------------------------------------------
create table if not exists gate_entries (
  id uuid primary key default uuid_generate_v4(),
  entry_date date not null default (now() at time zone 'Asia/Phnom_Penh')::date,
  category text not null check (category in ('adult', 'child', 'senior', 'student', 'foreigner')),
  count integer not null default 1 check (count between -50 and 500),
  source text not null default 'gate' check (source in ('gate', 'ticket')),
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);
create index if not exists idx_gate_entries_date on gate_entries (entry_date);
alter table gate_entries enable row level security;
drop policy if exists "gate_entries_staff_all" on gate_entries;
create policy "gate_entries_staff_all" on gate_entries for all
  using (auth_role() in ('admin', 'staff')) with check (auth_role() in ('admin', 'staff'));

-- ---------------------------------------------------------------------------
-- ADOPTIONS — symbolic "adopt an animal" support, paid by KHQR.
-- Created and updated only by server routes (service role); admins can read.
-- ---------------------------------------------------------------------------
create table if not exists adoptions (
  id uuid primary key default uuid_generate_v4(),
  code text not null unique default ('AD-' || to_char(now(), 'YYYY') || '-' || lpad(floor(random() * 100000)::text, 5, '0')),
  access_key text not null unique default encode(gen_random_bytes(12), 'hex'),
  animal_id uuid not null references animals(id) on delete cascade,
  adopter_name text not null,
  adopter_email text,
  message text,
  tier text not null check (tier in ('friend', 'guardian', 'hero')),
  amount_usd numeric(10, 2) not null,
  status payment_status not null default 'pending',
  khqr text,
  md5 text,
  expires_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz not null default now()
);
alter table adoptions enable row level security;
drop policy if exists "adoptions_admin_read" on adoptions;
create policy "adoptions_admin_read" on adoptions for select using (auth_role() = 'admin');
