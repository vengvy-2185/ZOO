-- Absences only count from the day QR attendance started (not for days before the system existed).
alter table public.staff_attendance_settings add column if not exists tracking_from date not null default ((now() at time zone 'Asia/Phnom_Penh')::date);
