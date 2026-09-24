-- ============================================================================
-- GREEN WILD ZOO — AUTH TRIGGER
-- Every Supabase Auth user (email/password OR Google OAuth) automatically
-- gets a `profiles` row with role='visitor'. Admin/staff access is granted
-- ONLY by manually updating that row's role afterward (see README) — signing
-- in with Google never grants elevated access by itself.
-- ============================================================================

create or replace function handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, role, full_name, avatar_url)
  values (
    new.id,
    'visitor',
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger trg_handle_new_auth_user
  after insert on auth.users
  for each row execute function handle_new_auth_user();
