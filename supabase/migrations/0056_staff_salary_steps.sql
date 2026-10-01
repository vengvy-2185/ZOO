-- A person's own salary over time: the starting pay (e.g. probation) and
-- each raise from a given day. With no steps, the position's rate is used.
-- Set by an admin or HR; read and written only by the server.

create table if not exists public.staff_salary_steps (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  effective_from date not null,
  amount numeric(10, 2) not null check (amount >= 0),
  note text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (user_id, effective_from)
);
create index if not exists staff_salary_steps_user on public.staff_salary_steps (user_id, effective_from);

alter table public.staff_salary_steps enable row level security;
revoke all on public.staff_salary_steps from anon, authenticated;
