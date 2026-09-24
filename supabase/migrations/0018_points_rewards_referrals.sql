-- Points you can spend on discount codes, and "invite a friend" referrals.
--
-- Balance = 10 per different animal found in the Animal Quest (each animal
-- counts once per person, however many times or devices it is scanned)
--         + 100 once every animal has been found
--         + everything in point_ledger (ticket purchases, referrals, bonuses,
--           and minus what was spent on rewards).
-- Only the server (service role) writes points; visitors can read their own.

create table if not exists public.point_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  delta int not null,
  reason text not null check (reason in ('purchase', 'referral', 'welcome', 'milestone', 'redeem', 'admin')),
  ref text not null,
  created_at timestamptz not null default now(),
  unique (user_id, reason, ref)
);
create index if not exists point_ledger_user on public.point_ledger (user_id, created_at desc);
alter table public.point_ledger enable row level security;
drop policy if exists point_ledger_own on public.point_ledger;
create policy point_ledger_own on public.point_ledger for select using (user_id = auth.uid() or auth_role() = 'admin');

-- Each person's invite code, and who invited them.
alter table public.profiles add column if not exists referral_code text unique default upper(encode(gen_random_bytes(4), 'hex'));
update public.profiles set referral_code = upper(encode(gen_random_bytes(4), 'hex')) where referral_code is null;
alter table public.bookings add column if not exists referral_code text;

-- One credit per friend (per buyer) per referrer, only for paid bookings.
create table if not exists public.referral_credits (
  id uuid primary key default gen_random_uuid(),
  referrer_id uuid not null references auth.users(id) on delete cascade,
  booking_id uuid not null unique references public.bookings(id) on delete cascade,
  buyer_key text not null,
  created_at timestamptz not null default now(),
  unique (referrer_id, buyer_key)
);
alter table public.referral_credits enable row level security;
drop policy if exists referral_credits_own on public.referral_credits;
create policy referral_credits_own on public.referral_credits for select using (referrer_id = auth.uid() or auth_role() = 'admin');

-- Reward codes belong to the person who bought them with points.
alter table public.discount_codes add column if not exists owner_id uuid references auth.users(id) on delete set null;
alter table public.discount_codes drop constraint if exists discount_codes_source_check;
alter table public.discount_codes add constraint discount_codes_source_check check (source in ('admin', 'scratch', 'points'));

create or replace function public.quest_points(p_user uuid)
returns int language sql stable security definer set search_path = public as $$
  with found as (
    select count(distinct d.animal_id) n
    from quest_discoveries d join quest_sessions s on s.id = d.session_id
    join animals a on a.id = d.animal_id and a.status = 'active'
    where s.visitor_id = p_user
  ), total as (select count(*) n from animals where status = 'active')
  select (found.n * 10 + case when total.n > 0 and found.n >= total.n then 100 else 0 end)::int
  from found, total;
$$;

create or replace function public.points_balance(p_user uuid)
returns int language sql stable security definer set search_path = public as $$
  select (quest_points(p_user) + coalesce((select sum(delta) from point_ledger where user_id = p_user), 0))::int;
$$;

-- Swap points for a single-use discount code. The catalogue lives here, so
-- nobody can change a price from the browser.
create or replace function public.redeem_points(p_user uuid, p_reward text)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare
  v_cost int; v_kind text; v_value numeric; v_name text; v_name_km text;
  v_balance int; v_code text; v_ends date := ((now() at time zone 'Asia/Phnom_Penh')::date + 30);
begin
  select cost, kind, value, name, name_km into v_cost, v_kind, v_value, v_name, v_name_km from (values
    ('p5', 100, 'percent', 5::numeric, '5% off tickets', 'បញ្ចុះតម្លៃ 5%'),
    ('p10', 200, 'percent', 10::numeric, '10% off tickets', 'បញ្ចុះតម្លៃ 10%'),
    ('usd2', 250, 'amount', 2::numeric, '$2 off tickets', 'បញ្ចុះ $2'),
    ('p20', 450, 'percent', 20::numeric, '20% off tickets', 'បញ្ចុះតម្លៃ 20%')
  ) as r(key, cost, kind, value, name, name_km) where key = p_reward;
  if v_cost is null then return jsonb_build_object('ok', false, 'reason', 'unknown'); end if;

  -- one redemption at a time per person
  perform pg_advisory_xact_lock(hashtext('points:' || p_user::text));
  v_balance := points_balance(p_user);
  if v_balance < v_cost then return jsonb_build_object('ok', false, 'reason', 'not_enough', 'balance', v_balance); end if;

  loop
    v_code := 'PTS-' || upper(encode(gen_random_bytes(3), 'hex'));
    exit when not exists (select 1 from discount_codes where upper(code) = v_code);
  end loop;
  insert into discount_codes (name, name_km, code, kind, value, max_uses, ends_on, source, owner_id)
  values (v_name, v_name_km, v_code, v_kind, v_value, 1, v_ends, 'points', p_user);
  insert into point_ledger (user_id, delta, reason, ref) values (p_user, -v_cost, 'redeem', v_code);
  return jsonb_build_object('ok', true, 'code', v_code, 'balance', v_balance - v_cost, 'ends_on', v_ends);
end $$;

revoke all on function public.quest_points(uuid) from public, anon, authenticated;
revoke all on function public.points_balance(uuid) from public, anon, authenticated;
revoke all on function public.redeem_points(uuid, text) from public, anon, authenticated;
grant execute on function public.quest_points(uuid) to service_role;
grant execute on function public.points_balance(uuid) to service_role;
grant execute on function public.redeem_points(uuid, text) to service_role;
