-- Asking a past applicant (not selected / withdrew) to come for a new job.
-- They answer in the bot; "yes" starts a new application with the same CV,
-- linked to the old one.

alter table public.hr_applicants
  add column if not exists previous_id uuid references public.hr_applicants(id) on delete set null;

create table if not exists public.hr_invites (
  id uuid primary key default gen_random_uuid(),
  applicant_id uuid not null references public.hr_applicants(id) on delete cascade,
  job_id uuid not null references public.hr_jobs(id) on delete cascade,
  note text,
  status text not null default 'sent' check (status in ('sent', 'accepted', 'declined', 'added')),
  new_applicant_id uuid references public.hr_applicants(id) on delete set null,
  telegram boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  answered_at timestamptz
);
create index if not exists hr_invites_applicant on public.hr_invites (applicant_id, created_at desc);

alter table public.hr_invites enable row level security;
revoke all on public.hr_invites from anon, authenticated;
