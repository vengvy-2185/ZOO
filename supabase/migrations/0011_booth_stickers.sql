-- Animal stickers (transparent PNGs) for the Photo Booth, managed by admins.
create table if not exists public.booth_stickers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  khmer_name text,
  image_url text not null,
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.booth_stickers enable row level security;

drop policy if exists booth_stickers_public_read on public.booth_stickers;
create policy booth_stickers_public_read on public.booth_stickers
  for select using (is_active or auth_role() = 'admin');

drop policy if exists booth_stickers_admin_write on public.booth_stickers;
create policy booth_stickers_admin_write on public.booth_stickers
  for all using (auth_role() = 'admin') with check (auth_role() = 'admin');
