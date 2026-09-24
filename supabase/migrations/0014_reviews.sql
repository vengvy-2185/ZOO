-- Visitor reviews: one per signed-in visitor (editable), admins can hide any.
create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  avatar_url text,
  rating int not null check (rating between 1 and 5),
  comment text not null check (char_length(comment) between 3 and 500),
  is_visible boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.reviews enable row level security;

drop policy if exists reviews_public_read on public.reviews;
create policy reviews_public_read on public.reviews
  for select using (is_visible or user_id = auth.uid() or auth_role() = 'admin');

drop policy if exists reviews_owner_insert on public.reviews;
create policy reviews_owner_insert on public.reviews
  for insert with check (user_id = auth.uid() and is_visible);

-- Owners may edit their text/rating but not un-hide a review an admin hid.
drop policy if exists reviews_owner_update on public.reviews;
create policy reviews_owner_update on public.reviews
  for update using (user_id = auth.uid() and is_visible) with check (user_id = auth.uid() and is_visible);

drop policy if exists reviews_owner_delete on public.reviews;
create policy reviews_owner_delete on public.reviews
  for delete using (user_id = auth.uid());

drop policy if exists reviews_admin_all on public.reviews;
create policy reviews_admin_all on public.reviews
  for all using (auth_role() = 'admin') with check (auth_role() = 'admin');
