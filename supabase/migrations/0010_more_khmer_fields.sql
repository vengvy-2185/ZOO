-- Khmer versions for every remaining editable text field, so the admin
-- "Manage" editor can offer EN/KM inputs everywhere.
alter table public.zoo_zones    add column if not exists description_km text;
alter table public.habitats     add column if not exists description_km text;
alter table public.enclosures   add column if not exists khmer_name text,
                                add column if not exists description_km text;
alter table public.ticket_types add column if not exists description_km text;
alter table public.facilities   add column if not exists description_km text;
