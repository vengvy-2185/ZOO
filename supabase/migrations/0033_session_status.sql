-- A half day can be set by a manager to present, leave or absent (tap a box on the attendance list).
alter table public.staff_session_checks add column if not exists status text not null default 'present';
alter table public.staff_session_checks drop constraint if exists staff_session_checks_status_check;
alter table public.staff_session_checks add constraint staff_session_checks_status_check check (status in ('present', 'leave', 'absent'));
