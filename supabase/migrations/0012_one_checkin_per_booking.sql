-- A ticket can only be used once: a second scan must not create another check-in.
create unique index if not exists visitor_checkins_one_per_booking on public.visitor_checkins (booking_id);
