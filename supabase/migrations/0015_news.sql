-- Zoo news posts (new arrivals, events, conservation stories), written by admins in EN/KM.
create table if not exists public.news_posts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  title_km text,
  summary text,
  summary_km text,
  body text,
  body_km text,
  image_url text,
  is_published boolean not null default true,
  published_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.news_posts enable row level security;

drop policy if exists news_public_read on public.news_posts;
create policy news_public_read on public.news_posts
  for select using ((is_published and published_at <= now()) or auth_role() = 'admin');

drop policy if exists news_admin_write on public.news_posts;
create policy news_admin_write on public.news_posts
  for all using (auth_role() = 'admin') with check (auth_role() = 'admin');

-- Two starter posts so the page isn't empty (edit or delete them in Admin → News).
insert into public.news_posts (title, title_km, summary, summary_km, body, body_km, image_url, published_at)
select * from (values
  (
    'Meet Tiko, our playful red panda',
    'ស្គាល់ទីកូ ផេនដាក្រហមដ៏គួរឲ្យស្រឡាញ់',
    'Tiko has settled into his new treetop home and loves an afternoon nap in the sun.',
    'ទីកូបានស៊ាំនឹងផ្ទះថ្មីលើដើមឈើ ហើយចូលចិត្តដេកលក់ក្រោមពន្លឺថ្ងៃពេលរសៀល។',
    'Our keepers say Tiko is most active early in the morning, when he climbs, explores and snacks on fresh bamboo. Visit the Wild Cats and Mammals zone before 10 AM for the best chance to see him on the move.',
    'អ្នកថែរក្សាសត្វប្រាប់ថា ទីកូសកម្មបំផុតនៅពេលព្រឹកព្រលឹម ពេលវាឡើងដើមឈើ រុករក និងស៊ីឫស្សីស្រស់។ សូមមកទស្សនាតំបន់សត្វថនិកសត្វ មុនម៉ោង 10 ព្រឹក ដើម្បីមានឱកាសឃើញវាសកម្មបំផុត។',
    '/animals/tiko-1.jpg',
    now() - interval '2 days'
  ),
  (
    'New: take a photo with the animals',
    'ថ្មី៖ ថតរូបជាមួយសត្វ',
    'Our new Photo Booth lets you add real animal stickers to your selfie and save a framed memory.',
    'ផ្ទាំងថតរូបថ្មីរបស់យើង អនុញ្ញាតឲ្យអ្នកបន្ថែមស្ទីគ័រសត្វពិតៗលើរូបសែលហ្វី ហើយរក្សាទុកជាអនុស្សាវរីយ៍ដ៏ស្អាត។',
    'Open the Photo Booth from the menu, take a selfie or pick a photo, choose a frame and drag your favourite animals onto the picture. When you are happy with it, save it to your phone or share it with friends and family.',
    'បើកផ្ទាំងថតរូបពីម៉ឺនុយ ថតសែលហ្វី ឬជ្រើសរូបថត ជ្រើសស៊ុម ហើយអូសសត្វដែលអ្នកចូលចិត្តដាក់លើរូប។ ពេលពេញចិត្តហើយ រក្សាទុកក្នុងទូរស័ព្ទ ឬចែករំលែកជាមួយមិត្តភក្តិ និងគ្រួសារ។',
    '/animals/nala-1.jpg',
    now() - interval '1 day'
  )
) as v(title, title_km, summary, summary_km, body, body_km, image_url, published_at)
where not exists (select 1 from public.news_posts);
