-- "Pay at the counter when I arrive": the booking stays pending (a ticket is
-- only confirmed when Bakong reports a transfer, now made at the counter),
-- and points held for it stay held until the visit day has passed.
alter table public.bookings add column if not exists pay_later boolean not null default false;

create or replace function public.points_balance(p_user uuid)
returns int language sql stable security definer set search_path = public as $$
  select (quest_points(p_user) + coalesce((
    select sum(l.delta) from point_ledger l
    where l.user_id = p_user
      and not (
        l.reason = 'checkout' and exists (
          select 1 from bookings b
          where b.id::text = l.ref
            and (
              b.status = 'cancelled'
              or (b.status = 'pending' and not b.pay_later and b.created_at < now() - interval '2 hours')
              or (b.status = 'pending' and b.pay_later and b.visit_date < (now() at time zone 'Asia/Phnom_Penh')::date)
            )
        )
      )
  ), 0))::int;
$$;
