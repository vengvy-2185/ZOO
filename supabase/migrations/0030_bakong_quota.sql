-- The Bakong Open API allows a limited number of checks per day (100 on the
-- free token). Keep count, space checks out per QR, and check many QRs in
-- one request, so payments are still confirmed on busy days.
alter table public.payments add column if not exists last_checked_at timestamptz;
alter table public.adoptions add column if not exists last_checked_at timestamptz;

create table if not exists public.bakong_usage (
  day date primary key,
  calls int not null default 0,
  limited boolean not null default false, -- Bakong said "limit exceeded" today
  last_call timestamptz
);
alter table public.bakong_usage enable row level security;
drop policy if exists bakong_usage_admin on public.bakong_usage;
create policy bakong_usage_admin on public.bakong_usage for select using (auth_role() = 'admin');

-- Take one API call from today's budget. Returns the call number (1 = first
-- call today) or 0 when the budget is spent / Bakong already said no.
create or replace function public.bakong_take_call(p_cap int)
returns int language plpgsql security definer set search_path = public as $$
declare
  v_day date := (now() at time zone 'Asia/Phnom_Penh')::date;
  v_calls int;
begin
  insert into bakong_usage (day) values (v_day) on conflict (day) do nothing;
  update bakong_usage set calls = calls + 1, last_call = now()
    where day = v_day and not limited and calls < p_cap
    returning calls into v_calls;
  return coalesce(v_calls, 0);
end $$;

create or replace function public.bakong_mark_limited()
returns void language sql security definer set search_path = public as $$
  update bakong_usage set limited = true where day = (now() at time zone 'Asia/Phnom_Penh')::date;
$$;

revoke all on function public.bakong_take_call(int) from public, anon, authenticated;
revoke all on function public.bakong_mark_limited() from public, anon, authenticated;
grant execute on function public.bakong_take_call(int) to service_role;
grant execute on function public.bakong_mark_limited() to service_role;

-- Today's limit was already hit before this existed.
insert into public.bakong_usage (day, calls, limited) values ((now() at time zone 'Asia/Phnom_Penh')::date, 100, true)
on conflict (day) do update set limited = true, calls = greatest(bakong_usage.calls, 100);
