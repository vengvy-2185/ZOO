-- A cover keeps both people on the schedule: the person who asked keeps their
-- box ("off · covered by …", with the shift they had), and the helper gets the
-- shift ("… · covering for …").
alter table public.staff_roster add column if not exists cover_user uuid references auth.users(id) on delete set null;
alter table public.staff_roster add column if not exists cover_shift text check (cover_shift in ('morning', 'afternoon', 'full'));

-- pay changes made by the system (e.g. a cover) point back to what caused them,
-- so they are added once and can be removed together
alter table public.staff_pay_adjustments add column if not exists ref text;
create index if not exists idx_pay_adjustments_ref on public.staff_pay_adjustments (ref);
