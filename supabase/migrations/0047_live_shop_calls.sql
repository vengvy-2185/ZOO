-- Calls to one person, live video from the zoo, and the souvenir shop.

-- ── Calls: also to one person (not only a whole room) ──────────────────
alter table public.staff_calls add column if not exists to_user uuid references auth.users(id) on delete cascade;

-- ── Live video ─────────────────────────────────────────────────────────
-- A staff member with the "media" permission films live from a phone; anyone
-- can watch on the website, count as a viewer, send hearts, and comment
-- (signed in). Video goes phone-to-phone; only the notes below are saved.
create table if not exists public.live_streams (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 120),
  place text check (char_length(place) <= 80),
  started_by uuid references auth.users(id) on delete set null,
  status text not null default 'live' check (status in ('live', 'ended')),
  started_at timestamptz not null default now(),
  alive_at timestamptz not null default now(),
  ended_at timestamptz,
  viewers_now integer not null default 0,
  peak_viewers integer not null default 0,
  likes integer not null default 0,
  comments integer not null default 0
);
create index if not exists live_streams_recent on public.live_streams (started_at desc);
alter table public.live_streams enable row level security;
drop policy if exists live_streams_read on public.live_streams;
create policy live_streams_read on public.live_streams for select using (true);

create table if not exists public.live_comments (
  id uuid primary key default gen_random_uuid(),
  stream_id uuid not null references public.live_streams(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  name text not null check (char_length(name) between 1 and 60),
  avatar text,
  staff boolean not null default false,
  body text not null check (char_length(body) between 1 and 300),
  hidden boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists live_comments_stream on public.live_comments (stream_id, created_at);
alter table public.live_comments enable row level security;
-- everyone watching may read the visible comments (they arrive live)
drop policy if exists live_comments_read on public.live_comments;
create policy live_comments_read on public.live_comments for select using (not hidden);

do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'live_comments') then
    alter publication supabase_realtime add table public.live_comments;
  end if;
end $$;

-- hearts / comments counted in one step (many people press at once)
create or replace function public.live_bump(p_stream uuid, p_likes integer, p_comments integer)
returns void language sql security definer set search_path = public as $$
  update live_streams set likes = likes + greatest(0, least(p_likes, 50)), comments = comments + greatest(0, least(p_comments, 1)) where id = p_stream;
$$;
revoke all on function public.live_bump(uuid, integer, integer) from public, anon, authenticated;

drop trigger if exists live_streams_live on public.live_streams;
create trigger live_streams_live after insert or delete or update of status on public.live_streams for each statement execute function public.touch_live_update();

-- ── Souvenir shop ──────────────────────────────────────────────────────
create table if not exists public.shop_products (
  id uuid primary key default gen_random_uuid(),
  sku text unique,
  name text not null check (char_length(name) between 1 and 80),
  name_km text,
  description text,
  category text not null default 'gifts',
  price_usd numeric(10, 2) not null check (price_usd >= 0),
  stock integer not null default 0,
  low_stock integer not null default 5,
  image_url text,
  active boolean not null default true,
  sort integer not null default 0,
  created_at timestamptz not null default now()
);
alter table public.shop_products enable row level security;
drop policy if exists shop_products_read on public.shop_products;
create policy shop_products_read on public.shop_products for select using (active);

-- a sale made at the shop by an admin or a staff seller
create table if not exists public.shop_sales (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  seller_id uuid references auth.users(id) on delete set null,
  total_usd numeric(10, 2) not null check (total_usd >= 0),
  method text not null check (method in ('cash', 'khqr')),
  status text not null default 'pending' check (status in ('pending', 'paid', 'cancelled')),
  -- cash: what the customer handed over
  cash_given numeric(12, 2),
  -- KHQR (the shop's own Bakong account): confirmed only by Bakong
  khqr text,
  md5 text,
  currency text,
  amount numeric(14, 2),
  expires_at timestamptz,
  last_checked_at timestamptz,
  provider_reference text,
  payer_account text,
  paid_at timestamptz,
  note text,
  created_at timestamptz not null default now()
);
create index if not exists shop_sales_day on public.shop_sales (created_at desc);
create index if not exists shop_sales_pending on public.shop_sales (md5) where status = 'pending';
alter table public.shop_sales enable row level security;

create table if not exists public.shop_sale_items (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references public.shop_sales(id) on delete cascade,
  product_id uuid references public.shop_products(id) on delete set null,
  name text not null,
  price_usd numeric(10, 2) not null,
  qty integer not null check (qty between 1 and 999)
);
create index if not exists shop_sale_items_sale on public.shop_sale_items (sale_id);
alter table public.shop_sale_items enable row level security;

-- paid: mark it once and take the items out of stock (in one step)
create or replace function public.shop_finish_sale(p_sale uuid, p_ref text, p_from text)
returns boolean language plpgsql security definer set search_path = public as $$
declare done boolean;
begin
  update shop_sales set status = 'paid', paid_at = now(), provider_reference = coalesce(p_ref, provider_reference), payer_account = coalesce(p_from, payer_account)
  where id = p_sale and status = 'pending'
  returning true into done;
  if not coalesce(done, false) then return false; end if;
  update shop_products p set stock = p.stock - i.qty
  from (select product_id, sum(qty)::int as qty from shop_sale_items where sale_id = p_sale group by product_id) i
  where p.id = i.product_id;
  return true;
end $$;
revoke all on function public.shop_finish_sale(uuid, text, text) from public, anon, authenticated;

do $$
declare t text;
begin
  foreach t in array array['shop_products', 'shop_sales'] loop
    execute format('drop trigger if exists %1$s_live on public.%1$s', t);
    execute format('create trigger %1$s_live after insert or delete or update on public.%1$s for each statement execute function public.touch_live_update()', t);
  end loop;
end $$;

insert into storage.buckets (id, name, public, file_size_limit)
values ('shop-images', 'shop-images', true, 5242880)
on conflict (id) do update set public = true;

-- ── Sample souvenirs (the admin can change or hide them) ───────────────
insert into public.shop_products (sku, name, name_km, description, category, price_usd, stock, image_url, sort) values
  ('PL-ELE', 'Elephant plush', 'តុក្កតាដំរី', 'Soft grey elephant, 30 cm. Kids'' favourite.', 'plush', 15.00, 24, '/shop/elephant.svg', 1),
  ('PL-TIG', 'Tiger plush', 'តុក្កតាខ្លា', 'Striped Indochinese tiger, 30 cm.', 'plush', 15.00, 18, '/shop/tiger.svg', 2),
  ('PL-MON', 'Monkey plush', 'តុក្កតាស្វា', 'Long-armed monkey that hugs your bag.', 'plush', 10.00, 30, '/shop/monkey.svg', 3),
  ('PL-PEN', 'Penguin plush', 'តុក្កតាភេនឃ្វីន', 'Little penguin, 20 cm.', 'plush', 9.00, 4, '/shop/penguin.svg', 4),
  ('AP-TSH', 'Zoo T-shirt', 'អាវយឺតសួនសត្វ', 'Cotton T-shirt with the Green Wild Zoo logo. S–XL.', 'apparel', 12.00, 40, '/shop/tshirt.svg', 5),
  ('AP-CAP', 'Safari cap', 'មួកសាហ្វារី', 'Green cap with an embroidered paw.', 'apparel', 8.00, 25, '/shop/cap.svg', 6),
  ('AP-KRA', 'Krama scarf', 'ក្រមាខ្មែរ', 'Traditional Khmer checked krama, hand-woven.', 'apparel', 5.00, 50, '/shop/krama.svg', 7),
  ('AC-KEY', 'Animal keychain', 'ខ្សែសោរូបសត្វ', 'Metal keychain — elephant, tiger or turtle.', 'accessories', 3.00, 120, '/shop/keychain.svg', 8),
  ('AC-MAG', 'Fridge magnet', 'មេដែកបិទទូទឹកកក', 'Colourful zoo magnet.', 'accessories', 2.50, 3, '/shop/magnet.svg', 9),
  ('AC-BAG', 'Tote bag', 'កាបូបក្រណាត់', 'Reusable canvas bag — say no to plastic!', 'accessories', 6.00, 35, '/shop/tote.svg', 10),
  ('HM-MUG', 'Zoo mug', 'កែវកាហ្វេសួនសត្វ', 'Ceramic mug, 350 ml.', 'home', 7.00, 20, '/shop/mug.svg', 11),
  ('HM-BOT', 'Water bottle', 'ដបទឹក', 'Steel bottle, keeps water cold for 12 h.', 'home', 9.00, 15, '/shop/bottle.svg', 12),
  ('ST-PST', 'Postcard set (6)', 'កាតប៉ុស្តាល់ (៦សន្លឹក)', 'Six photos of our animals.', 'stationery', 4.00, 60, '/shop/postcards.svg', 13),
  ('ST-NOT', 'Notebook', 'សៀវភៅកត់ត្រា', 'A5 notebook with a leaf cover.', 'stationery', 4.00, 45, '/shop/notebook.svg', 14),
  ('ST-STK', 'Sticker pack', 'ស្ទីគ័រសត្វ', '12 animal stickers.', 'stationery', 2.00, 80, '/shop/stickers.svg', 15),
  ('ST-PEN', 'Kids pencil set', 'ខ្មៅដៃកុមារ', '6 pencils with animal toppers.', 'stationery', 3.00, 40, '/shop/pencils.svg', 16)
on conflict (sku) do nothing;
