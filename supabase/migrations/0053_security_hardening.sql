-- Security hardening (found in a review):
--
-- 1) Anyone signed in could change their OWN profile's role (e.g. to
--    'admin') or points through the public API, because the "update own
--    profile" rule didn't limit which columns. Now only the server (or an
--    admin) can change role / points / referral code; people can still edit
--    their name and photo.
create or replace function public.guard_profile_fields()
returns trigger language plpgsql security definer set search_path = public as $$
-- (inside this function current_user is its owner, so the caller is read from
-- the request: the server's key, a direct database session without a request,
-- or a signed-in admin)
declare trusted boolean := coalesce(auth.role(), '') in ('service_role', '') or auth_role() = 'admin';
begin
  if tg_op = 'INSERT' then
    if not trusted then
      new.role := 'visitor';
      new.points := 0;
    end if;
  elsif not trusted and (new.role is distinct from old.role or new.points is distinct from old.points or new.referral_code is distinct from old.referral_code) then
    raise exception 'Not allowed to change role or points' using errcode = '42501';
  end if;
  return new;
end $$;
drop trigger if exists profiles_guard on public.profiles;
create trigger profiles_guard before insert or update on public.profiles for each row execute function public.guard_profile_fields();

-- 2) Bookings and their tickets are made only by the server (checkout checks
--    prices and payment). The old "a visitor may insert a booking" rules
--    would let someone write a booking — even a "confirmed" one — directly.
drop policy if exists bookings_visitor_insert on public.bookings;
drop policy if exists booking_items_insert on public.booking_items;

-- 3) Anonymous quest sessions could be changed by anyone.
drop policy if exists quest_sessions_owner_update on public.quest_sessions;
create policy quest_sessions_owner_update on public.quest_sessions for update using (visitor_id = auth.uid()) with check (visitor_id = auth.uid());

-- 4) Leftovers of removed features.
drop function if exists public.cleanup_expired_map_groups();
