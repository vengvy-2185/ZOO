-- Staff self-service: leave requests (approved by an admin) and a notice
-- board admins post to. Staff read/write through server actions that check
-- the session; RLS below is the second lock.

create table if not exists public.staff_leave_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null default 'annual' check (kind in ('annual', 'sick', 'personal', 'other')),
  start_date date not null,
  end_date date not null,
  reason text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'cancelled')),
  admin_note text,
  decided_by uuid references auth.users(id) on delete set null,
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  check (end_date >= start_date)
);
create index if not exists staff_leave_user on public.staff_leave_requests (user_id, start_date desc);

create table if not exists public.staff_announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  pinned boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.staff_leave_requests enable row level security;
alter table public.staff_announcements enable row level security;

drop policy if exists staff_leave_own on public.staff_leave_requests;
create policy staff_leave_own on public.staff_leave_requests for select using (user_id = auth.uid() or auth_role() = 'admin');
drop policy if exists staff_leave_admin on public.staff_leave_requests;
create policy staff_leave_admin on public.staff_leave_requests for all using (auth_role() = 'admin') with check (auth_role() = 'admin');

drop policy if exists staff_notices_team on public.staff_announcements;
create policy staff_notices_team on public.staff_announcements for select using (auth_role() in ('admin', 'staff'));
drop policy if exists staff_notices_admin on public.staff_announcements;
create policy staff_notices_admin on public.staff_announcements for all using (auth_role() = 'admin') with check (auth_role() = 'admin');

-- live page updates (see 0026)
drop trigger if exists staff_leave_requests_live on public.staff_leave_requests;
create trigger staff_leave_requests_live after insert or update or delete on public.staff_leave_requests for each statement execute function public.touch_live_update();
drop trigger if exists staff_announcements_live on public.staff_announcements;
create trigger staff_announcements_live after insert or update or delete on public.staff_announcements for each statement execute function public.touch_live_update();
