-- How many people a job needs. Once that many have passed (or been hired),
-- the job closes by itself and disappears from the careers page.
alter table public.hr_jobs
  add column if not exists openings int check (openings is null or openings between 1 and 999),
  add column if not exists filled_at timestamptz;
