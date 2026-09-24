-- 1) Spend points at checkout.
--    Points are held against the booking ('checkout' entry). If the booking is
--    cancelled, or still unpaid after 2 hours, the hold no longer counts, so
--    the points come back by themselves.
alter table public.point_ledger drop constraint if exists point_ledger_reason_check;
alter table public.point_ledger add constraint point_ledger_reason_check
  check (reason in ('purchase', 'referral', 'welcome', 'milestone', 'redeem', 'admin', 'checkout'));

create or replace function public.points_balance(p_user uuid)
returns int language sql stable security definer set search_path = public as $$
  select (quest_points(p_user) + coalesce((
    select sum(l.delta) from point_ledger l
    where l.user_id = p_user
      and not (
        l.reason = 'checkout' and exists (
          select 1 from bookings b
          where b.id::text = l.ref
            and (b.status = 'cancelled' or (b.status = 'pending' and b.created_at < now() - interval '2 hours'))
        )
      )
  ), 0))::int;
$$;

create or replace function public.spend_points_for_booking(p_user uuid, p_booking uuid, p_points int)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  if p_points <= 0 then return true; end if;
  perform pg_advisory_xact_lock(hashtext('points:' || p_user::text));
  if points_balance(p_user) < p_points then return false; end if;
  insert into point_ledger (user_id, delta, reason, ref) values (p_user, -p_points, 'checkout', p_booking::text)
  on conflict (user_id, reason, ref) do nothing;
  return true;
end $$;

revoke all on function public.spend_points_for_booking(uuid, uuid, int) from public, anon, authenticated;
grant execute on function public.spend_points_for_booking(uuid, uuid, int) to service_role;

-- 2) Printed member / staff ID cards: when a card was printed and handed over.
create table if not exists public.member_cards (
  user_id uuid primary key references auth.users(id) on delete cascade,
  card_type text not null,
  status text not null default 'printed' check (status in ('printed', 'collected')),
  updated_at timestamptz not null default now()
);
alter table public.member_cards enable row level security;
drop policy if exists member_cards_own on public.member_cards;
create policy member_cards_own on public.member_cards for select using (user_id = auth.uid() or auth_role() = 'admin');
