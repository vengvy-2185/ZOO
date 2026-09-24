-- Discount codes set by admins (dates, usage limit, % or fixed amount),
-- plus the "scratch card" prize each paid booking can reveal once.

create table if not exists public.discount_codes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  name_km text,
  code text not null,
  kind text not null default 'percent' check (kind in ('percent', 'amount')),
  value numeric(10,2) not null check (value > 0),
  min_total_usd numeric(10,2) not null default 0,
  starts_on date,
  ends_on date,
  max_uses int check (max_uses is null or max_uses > 0),
  is_active boolean not null default true,
  source text not null default 'admin' check (source in ('admin', 'scratch')),
  created_at timestamptz not null default now()
);
create unique index if not exists discount_codes_code_upper on public.discount_codes (upper(code));

create table if not exists public.discount_redemptions (
  id uuid primary key default gen_random_uuid(),
  code_id uuid not null references public.discount_codes(id) on delete cascade,
  booking_id uuid not null unique references public.bookings(id) on delete cascade,
  amount_usd numeric(10,2) not null,
  created_at timestamptz not null default now()
);

alter table public.bookings add column if not exists scratch_code_id uuid references public.discount_codes(id) on delete set null;
alter table public.bookings add column if not exists scratched_at timestamptz;

alter table public.discount_codes enable row level security;
alter table public.discount_redemptions enable row level security;
drop policy if exists discount_codes_admin on public.discount_codes;
create policy discount_codes_admin on public.discount_codes for all using (auth_role() = 'admin') with check (auth_role() = 'admin');
drop policy if exists discount_redemptions_admin_read on public.discount_redemptions;
create policy discount_redemptions_admin_read on public.discount_redemptions for select using (auth_role() = 'admin');

-- A redemption counts once the booking is paid, or while its payment is
-- still fresh (30 min) — so abandoned checkouts don't use up a code.
create or replace function public.discount_uses(p_code_id uuid)
returns int language sql stable security definer set search_path = public as $$
  select count(*)::int
  from discount_redemptions r join bookings b on b.id = r.booking_id
  where r.code_id = p_code_id
    and (b.status = 'confirmed' or (b.status = 'pending' and b.created_at > now() - interval '30 minutes'));
$$;

-- Checks a code against a subtotal. Returns { ok, amount, code_id, name, name_km, reason }.
create or replace function public.check_discount(p_code text, p_subtotal numeric)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  c discount_codes;
  today date := (now() at time zone 'Asia/Phnom_Penh')::date;
  amt numeric;
begin
  select * into c from discount_codes where upper(code) = upper(trim(p_code));
  if not found or not c.is_active then return jsonb_build_object('ok', false, 'reason', 'invalid'); end if;
  if c.starts_on is not null and today < c.starts_on then return jsonb_build_object('ok', false, 'reason', 'not_started'); end if;
  if c.ends_on is not null and today > c.ends_on then return jsonb_build_object('ok', false, 'reason', 'expired'); end if;
  if p_subtotal < c.min_total_usd then return jsonb_build_object('ok', false, 'reason', 'min_total', 'min', c.min_total_usd); end if;
  if c.max_uses is not null and discount_uses(c.id) >= c.max_uses then return jsonb_build_object('ok', false, 'reason', 'used_up'); end if;
  amt := case when c.kind = 'percent' then round(p_subtotal * least(c.value, 100) / 100, 2) else least(c.value, p_subtotal) end;
  return jsonb_build_object('ok', true, 'amount', amt, 'code_id', c.id, 'name', c.name, 'name_km', c.name_km, 'kind', c.kind, 'value', c.value);
end $$;

-- Same checks, but locks the code row and records the redemption, so two
-- people can't both take the last use at the same moment.
create or replace function public.redeem_discount(p_code text, p_booking_id uuid, p_subtotal numeric)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  res jsonb;
begin
  perform 1 from discount_codes where upper(code) = upper(trim(p_code)) for update;
  res := check_discount(p_code, p_subtotal);
  if (res->>'ok')::boolean then
    insert into discount_redemptions (code_id, booking_id, amount_usd)
    values ((res->>'code_id')::uuid, p_booking_id, (res->>'amount')::numeric);
  end if;
  return res;
end $$;

revoke all on function public.discount_uses(uuid) from public, anon, authenticated;
revoke all on function public.check_discount(text, numeric) from public, anon, authenticated;
revoke all on function public.redeem_discount(text, uuid, numeric) from public, anon, authenticated;
grant execute on function public.discount_uses(uuid) to service_role, authenticated;
grant execute on function public.check_discount(text, numeric) to service_role;
grant execute on function public.redeem_discount(text, uuid, numeric) to service_role;

-- A welcome code so the feature can be tried straight away.
insert into public.discount_codes (name, name_km, code, kind, value, max_uses, ends_on)
select 'Welcome offer', 'ការផ្តល់ជូនស្វាគមន៍', 'WELCOME10', 'percent', 10, 100, ((now() at time zone 'Asia/Phnom_Penh')::date + 60)
where not exists (select 1 from public.discount_codes where upper(code) = 'WELCOME10');
