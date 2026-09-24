-- ============================================================================
-- GREEN WILD ZOO — STORAGE BUCKETS
-- ============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('animal-images', 'animal-images', true, 8388608, array['image/jpeg','image/png','image/webp']),
  ('animal-audio', 'animal-audio', true, 20971520, array['audio/mpeg','audio/mp4','audio/wav','audio/ogg']),
  ('animal-videos', 'animal-videos', true, 104857600, array['video/mp4','video/webm']),
  ('animal-stories', 'animal-stories', true, 8388608, array['image/jpeg','image/png','image/webp']),
  ('zoo-maps', 'zoo-maps', true, 15728640, array['image/jpeg','image/png','image/webp','image/svg+xml']),
  ('qr-codes', 'qr-codes', true, 2097152, array['image/png','image/svg+xml']),
  ('avatars', 'avatars', true, 2097152, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

-- Public read for all zoo media buckets (they are public marketing/reference assets)
create policy "public_read_animal_images" on storage.objects for select using (bucket_id = 'animal-images');
create policy "public_read_animal_audio" on storage.objects for select using (bucket_id = 'animal-audio');
create policy "public_read_animal_videos" on storage.objects for select using (bucket_id = 'animal-videos');
create policy "public_read_animal_stories" on storage.objects for select using (bucket_id = 'animal-stories');
create policy "public_read_zoo_maps" on storage.objects for select using (bucket_id = 'zoo-maps');
create policy "public_read_qr_codes" on storage.objects for select using (bucket_id = 'qr-codes');
create policy "public_read_avatars" on storage.objects for select using (bucket_id = 'avatars');

-- Only admins may write to zoo-content buckets
create policy "admin_write_animal_images" on storage.objects for insert
  with check (bucket_id = 'animal-images' and (select role from profiles where id = auth.uid()) = 'admin');
create policy "admin_update_animal_images" on storage.objects for update
  using (bucket_id = 'animal-images' and (select role from profiles where id = auth.uid()) = 'admin');
create policy "admin_delete_animal_images" on storage.objects for delete
  using (bucket_id = 'animal-images' and (select role from profiles where id = auth.uid()) = 'admin');

create policy "admin_write_animal_audio" on storage.objects for insert
  with check (bucket_id = 'animal-audio' and (select role from profiles where id = auth.uid()) = 'admin');
create policy "admin_update_animal_audio" on storage.objects for update
  using (bucket_id = 'animal-audio' and (select role from profiles where id = auth.uid()) = 'admin');
create policy "admin_delete_animal_audio" on storage.objects for delete
  using (bucket_id = 'animal-audio' and (select role from profiles where id = auth.uid()) = 'admin');

create policy "admin_write_animal_videos" on storage.objects for insert
  with check (bucket_id = 'animal-videos' and (select role from profiles where id = auth.uid()) = 'admin');

create policy "admin_write_animal_stories" on storage.objects for insert
  with check (bucket_id = 'animal-stories' and (select role from profiles where id = auth.uid()) = 'admin');

create policy "admin_write_zoo_maps" on storage.objects for insert
  with check (bucket_id = 'zoo-maps' and (select role from profiles where id = auth.uid()) = 'admin');

create policy "admin_write_qr_codes" on storage.objects for all
  using (bucket_id = 'qr-codes' and (select role from profiles where id = auth.uid()) = 'admin');

-- Avatars: users manage their own folder (path prefix = their user id)
create policy "user_write_own_avatar" on storage.objects for insert
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "user_update_own_avatar" on storage.objects for update
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
