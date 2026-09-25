-- The attendance QR opens exactly at each session's start time (no early opening).
alter table public.staff_attendance_settings alter column open_before_minutes set default 0;
update public.staff_attendance_settings set open_before_minutes = 0;
