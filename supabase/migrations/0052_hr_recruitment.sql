-- Hiring new staff: open jobs, applications with a CV, the HR team's work
-- on each one (interview, result, notes, messages), and the applicant's
-- Telegram chat with the recruitment bot. Only the server (service role)
-- reads or writes these tables; CVs are in a private bucket.

create table if not exists public.hr_jobs (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]{2,60}$'),
  title text not null check (char_length(title) between 2 and 120),
  title_km text,
  department text,
  description text,
  description_km text,
  requirements text,
  requirements_km text,
  salary text,
  job_type text not null default 'full-time' check (job_type in ('full-time', 'part-time', 'intern', 'volunteer')),
  position_id uuid references public.staff_positions(id) on delete set null,
  open boolean not null default true,
  closes_on date,
  sort integer not null default 0,
  created_at timestamptz not null default now()
);
alter table public.hr_jobs enable row level security;

create table if not exists public.hr_applicants (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  token uuid not null unique default gen_random_uuid(),
  job_id uuid references public.hr_jobs(id) on delete set null,
  full_name text not null check (char_length(full_name) between 2 and 100),
  full_name_km text,
  gender text check (gender in ('male', 'female', 'other')),
  birth_date date,
  phone text not null check (char_length(phone) between 6 and 30),
  email text,
  address text,
  education text,
  experience text,
  languages text,
  skills text,
  expected_salary text,
  available_from date,
  about text,
  cv_path text,
  cv_name text,
  photo_path text,
  status text not null default 'new' check (status in ('new', 'screening', 'interview', 'offer', 'hired', 'rejected', 'withdrawn')),
  interview_at timestamptz,
  interview_place text,
  interview_note text,
  result_note text,
  rating integer check (rating between 1 and 5),
  hr_note text,
  tg_chat_id bigint,
  tg_username text,
  tg_lang text not null default 'km',
  tg_state text,
  staff_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists hr_applicants_recent on public.hr_applicants (created_at desc);
create index if not exists hr_applicants_status on public.hr_applicants (status);
create index if not exists hr_applicants_tg on public.hr_applicants (tg_chat_id);
alter table public.hr_applicants enable row level security;

-- questions from the applicant (through the bot) and the HR team's answers
create table if not exists public.hr_messages (
  id uuid primary key default gen_random_uuid(),
  applicant_id uuid not null references public.hr_applicants(id) on delete cascade,
  from_hr boolean not null default false,
  author_id uuid references auth.users(id) on delete set null,
  body text not null check (char_length(body) between 1 and 2000),
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists hr_messages_applicant on public.hr_messages (applicant_id, created_at);
alter table public.hr_messages enable row level security;

-- what happened to an application (the timeline HR sees)
create table if not exists public.hr_events (
  id uuid primary key default gen_random_uuid(),
  applicant_id uuid not null references public.hr_applicants(id) on delete cascade,
  author_id uuid references auth.users(id) on delete set null,
  kind text not null,
  note text,
  created_at timestamptz not null default now()
);
create index if not exists hr_events_applicant on public.hr_events (applicant_id, created_at);
alter table public.hr_events enable row level security;

create sequence if not exists public.hr_applicant_seq start 1;
create or replace function public.next_hr_code()
returns text language sql security definer set search_path = public as $$
  select 'HR-' || lpad(nextval('hr_applicant_seq')::text, 4, '0');
$$;
revoke all on function public.next_hr_code() from public, anon, authenticated;

do $$
declare t text;
begin
  foreach t in array array['hr_jobs', 'hr_applicants', 'hr_messages'] loop
    execute format('drop trigger if exists %1$s_live on public.%1$s', t);
    execute format('create trigger %1$s_live after insert or delete or update on public.%1$s for each statement execute function public.touch_live_update()', t);
  end loop;
end $$;

-- CVs and photos of applicants: private (HR opens them with a short-lived link)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('hr-files', 'hr-files', false, 10485760, array['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

-- sample openings (HR can change or close them)
insert into public.hr_jobs (slug, title, title_km, department, description, description_km, requirements, requirements_km, salary, job_type, sort)
values
  ('animal-keeper', 'Animal keeper', 'អ្នកថែទាំសត្វ', 'ថែទាំសត្វ · Animal care', 'Feed and care for our animals, clean enclosures and watch their health every day.', 'ផ្តល់ចំណី និងថែទាំសត្វ សម្អាតទ្រុង និងតាមដានសុខភាពសត្វរៀងរាល់ថ្ងៃ។', 'Loves animals, healthy, can work weekends. Experience is a plus.', 'ស្រឡាញ់សត្វ មានសុខភាពល្អ អាចធ្វើការថ្ងៃសៅរ៍-អាទិត្យ។ មានបទពិសោធន៍កាន់តែល្អ។', '$250 – $350', 'full-time', 1),
  ('ticket-gate', 'Ticket & gate staff', 'បុគ្គលិកលក់សំបុត្រ និងច្រកចូល', 'សេវាភ្ញៀវ · Visitors', 'Welcome visitors, sell and scan tickets, answer questions at the entrance.', 'ស្វាគមន៍ភ្ញៀវ លក់ និងស្កេនសំបុត្រ ឆ្លើយសំណួរភ្ញៀវនៅច្រកចូល។', 'Friendly, basic English, can use a phone app.', 'រួសរាយ ចេះភាសាអង់គ្លេសបន្តិច ចេះប្រើកម្មវិធីទូរស័ព្ទ។', '$220 – $300', 'full-time', 2),
  ('tour-guide', 'Tour guide', 'មគ្គុទ្ទេសក៍', 'សេវាភ្ញៀវ · Visitors', 'Lead groups and schools around the zoo and tell the stories of our animals.', 'នាំក្រុមភ្ញៀវ និងសិស្សទស្សនាសួនសត្វ និងរៀបរាប់រឿងរ៉ាវសត្វរបស់យើង។', 'Good Khmer and English, enjoys speaking to groups.', 'ចេះភាសាខ្មែរ និងអង់គ្លេសល្អ ចូលចិត្តនិយាយជាមួយក្រុម។', '$250 – $380', 'full-time', 3),
  ('cleaner', 'Cleaner', 'បុគ្គលិកអនាម័យ', 'ប្រតិបត្តិការ · Operations', 'Keep paths, toilets and picnic areas clean and tidy.', 'រក្សាផ្លូវដើរ បង្គន់ និងកន្លែងសម្រាកឲ្យស្អាត។', 'Hard-working and on time.', 'ឧស្សាហ៍ និងទៀងពេល។', '$200 – $250', 'full-time', 4)
on conflict (slug) do nothing;
