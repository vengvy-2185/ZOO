-- "Report a problem": any staff member can report something broken, dirty,
-- unsafe or an animal that needs help; managers/admins follow it up.
create table if not exists public.staff_issues (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  category text not null check (category in ('repair', 'cleaning', 'animal', 'safety', 'visitor', 'other')),
  urgent boolean not null default false,
  place text not null,
  note text not null,
  photo_url text,
  status text not null default 'open' check (status in ('open', 'in_progress', 'done')),
  handled_by uuid references auth.users(id) on delete set null,
  handled_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists staff_issues_status on public.staff_issues (status, created_at desc);
alter table public.staff_issues enable row level security;
drop policy if exists staff_issues_team on public.staff_issues;
create policy staff_issues_team on public.staff_issues for select using (auth_role() in ('admin', 'staff'));

drop trigger if exists staff_issues_live on public.staff_issues;
create trigger staff_issues_live after insert or update or delete on public.staff_issues for each statement execute function public.touch_live_update();
