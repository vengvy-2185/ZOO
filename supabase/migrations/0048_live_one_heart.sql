-- One heart per viewer per live (signed-in: their account; guests: their device).
create table if not exists public.live_likes (
  stream_id uuid not null references public.live_streams(id) on delete cascade,
  liker text not null check (char_length(liker) between 3 and 80),
  created_at timestamptz not null default now(),
  primary key (stream_id, liker)
);
alter table public.live_likes enable row level security;

-- the count on the stream is the number of hearts (kept in step in one place)
create or replace function public.live_like(p_stream uuid, p_liker text)
returns boolean language plpgsql security definer set search_path = public as $$
declare added int;
begin
  insert into live_likes (stream_id, liker) values (p_stream, p_liker) on conflict do nothing;
  get diagnostics added = row_count;
  if added > 0 then
    update live_streams set likes = likes + 1 where id = p_stream;
  end if;
  return added > 0;
end $$;
revoke all on function public.live_like(uuid, text) from public, anon, authenticated;
