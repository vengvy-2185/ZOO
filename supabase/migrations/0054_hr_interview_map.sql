-- Where the interview is, on a map: the link HR pastes (Google Maps) and,
-- when it has them, the exact coordinates (sent as a Telegram location pin).
alter table public.hr_applicants
  add column if not exists interview_map text,
  add column if not exists interview_lat double precision,
  add column if not exists interview_lng double precision;
