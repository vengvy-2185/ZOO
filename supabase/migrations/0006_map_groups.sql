-- ============================================================================
-- GREEN WILD ZOO — MAP GROUPS ("Meet Up" / Friends on the Map)
-- Lets a small group of visitors (friends/family) drop a pin on the zoo map
-- and see each other move live, so nobody gets separated. No account
-- required — anyone with the join code can participate, like a game lobby.
-- ============================================================================

create table map_groups (
  id uuid primary key default uuid_generate_v4(),
  join_code text not null unique,   -- short human-typeable code, e.g. "7F3K9Q"
  name text,
  created_at timestamptz not null default now(),
  -- groups are cleaned up after being idle; see cleanup note below
  expires_at timestamptz not null default (now() + interval '12 hours')
);

create table map_group_members (
  id uuid primary key default uuid_generate_v4(),
  group_id uuid not null references map_groups(id) on delete cascade,
  device_token text not null,         -- identifies this browser/device, not a person
  display_name text not null,
  avatar_color text not null default '#176B3A',
  avatar_emoji text not null default '🙂',
  map_x numeric,                       -- null until they share a location
  map_y numeric,
  is_sharing boolean not null default true,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (group_id, device_token)
);

create index idx_map_group_members_group on map_group_members (group_id);
create index idx_map_groups_join_code on map_groups (join_code);

alter table map_groups enable row level security;
alter table map_group_members enable row level security;

-- Membership rows are readable by anyone with the anon key — needed because
-- Supabase Realtime's postgres_changes delivery is gated by this SELECT
-- policy, and there's no session/auth concept for an anonymous "Meet Up"
-- group to scope it further. In practice this means someone could query
-- this table directly and see every active group's members (display name,
-- emoji, approximate position), not just their own group's — acceptable
-- for a lighthearted, no-PII, auto-expiring (12h) prototype feature, but
-- if you need real confidentiality, switch to Supabase's Realtime
-- Authorization (per-topic access tokens) or Broadcast instead of
-- postgres_changes, and drop this public policy.
-- All WRITES go through the service-role API routes in src/app/api/map-groups/*,
-- which validate the join_code server-side, so no client-side insert/update/
-- delete policy is defined here — the default-deny keeps direct table writes
-- from the browser's anon key impossible. The initial member list is also
-- fetched through an API route (not a direct client select) to keep casual
-- table browsing from being the easiest way to see other groups' data.
create policy "map_group_members_public_read" on map_group_members for select using (true);

-- Enable Supabase Realtime (Postgres logical replication) for this table so
-- the browser can subscribe to live position updates without polling.
alter publication supabase_realtime add table map_group_members;

-- The group row itself (which contains the join_code) is NOT publicly
-- selectable — joining requires posting the code to /api/map-groups/join,
-- which looks it up with the service role. This stops someone from listing
-- every active group's code straight out of the database.
-- (No select policy is added here, so RLS default-denies all client reads.)

-- Best-effort cleanup of old groups — call this periodically (e.g. from a
-- Supabase Edge Function on a cron schedule, or an admin action) since
-- Supabase doesn't run scheduled SQL on its own.
create or replace function cleanup_expired_map_groups()
returns void
language sql
security definer
set search_path = public
as $$
  delete from map_groups where expires_at < now();
$$;
