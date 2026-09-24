-- ============================================================================
-- FIX: infinite recursion in auth_role()
-- ----------------------------------------------------------------------------
-- auth_role() reads `profiles`, and the `profiles` RLS policies themselves
-- call auth_role() — so any policy that reached auth_role() (e.g. reading
-- `animals`) recursed until Postgres gave up with
-- "stack depth limit exceeded". Running the function as its owner
-- (security definer) makes its own read of `profiles` bypass RLS, which
-- breaks the loop. It only ever returns the *caller's own* role, so this
-- exposes nothing new. search_path is pinned, as required for any
-- security definer function.
-- ============================================================================

create or replace function auth_role()
returns user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

revoke all on function auth_role() from public;
grant execute on function auth_role() to anon, authenticated;
