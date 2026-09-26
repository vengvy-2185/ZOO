-- How many times a year each staff member may ask for leave (set by the admin).
alter table public.staff_members add column if not exists leave_quota integer not null default 12;
alter table public.staff_members drop constraint if exists staff_members_leave_quota_check;
alter table public.staff_members add constraint staff_members_leave_quota_check check (leave_quota between 0 and 365);
