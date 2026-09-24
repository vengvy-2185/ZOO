-- Visitors can see whether their own tickets have been used (for "My tickets").
drop policy if exists checkins_owner_read on public.visitor_checkins;
create policy checkins_owner_read on public.visitor_checkins
  for select using (
    exists (select 1 from public.bookings b where b.id = visitor_checkins.booking_id and b.visitor_id = auth.uid())
  );
