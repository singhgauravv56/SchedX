create extension if not exists "pgcrypto";

create table if not exists public.teachers (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  specialization text,
  email text,
  department text not null default 'General',
  working_days_per_week integer not null default 5 check (working_days_per_week between 1 and 7),
  availability jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.subjects (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  code text,
  department text,
  semester integer,
  room_type text not null default 'Classroom' check (room_type in ('Classroom', 'Laboratory')),
  created_at timestamptz not null default now()
);

create table if not exists public.classes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  department text,
  semester integer,
  section text not null default 'A',
  student_count integer not null check (student_count > 0),
  created_at timestamptz not null default now(),
  unique (name, section)
);

create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  room_number text not null unique,
  capacity integer not null check (capacity > 0),
  room_type text not null check (room_type in ('Classroom', 'Laboratory', 'Seminar Hall', 'Computer Lab', 'Other')),
  availability text not null default 'Available' check (availability in ('Available', 'Occupied', 'Unavailable')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.rooms add column if not exists availability text not null default 'Available';
alter table public.rooms add column if not exists updated_at timestamptz not null default now();
alter table public.rooms drop constraint if exists rooms_room_type_check;
alter table public.rooms add constraint rooms_room_type_check check (room_type in ('Classroom', 'Laboratory', 'Seminar Hall', 'Computer Lab', 'Other'));
alter table public.rooms drop constraint if exists rooms_availability_check;
alter table public.rooms add constraint rooms_availability_check check (availability in ('Available', 'Occupied', 'Unavailable'));

create table if not exists public.timetable (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  teacher_id uuid not null references public.teachers(id) on delete restrict,
  subject_id uuid not null references public.subjects(id) on delete restrict,
  room_id uuid not null references public.rooms(id) on delete restrict,
  day text not null,
  start_time time not null,
  end_time time not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (day, start_time, teacher_id),
  unique (day, start_time, class_id),
  unique (day, start_time, room_id)
);

create table if not exists public.timetable_error_reports (
  id uuid primary key default gen_random_uuid(),
  operation text not null,
  route text,
  error_code text,
  error_message text not null,
  request_summary jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists timetable_class_id_idx on public.timetable(class_id);
create index if not exists timetable_teacher_id_idx on public.timetable(teacher_id);
create index if not exists timetable_subject_id_idx on public.timetable(subject_id);
create index if not exists timetable_room_id_idx on public.timetable(room_id);
create index if not exists timetable_day_idx on public.timetable(day);
create index if not exists timetable_error_reports_created_at_idx on public.timetable_error_reports(created_at desc);

alter table public.teachers enable row level security;
alter table public.subjects enable row level security;
alter table public.classes enable row level security;
alter table public.rooms enable row level security;
alter table public.timetable enable row level security;
alter table public.timetable_error_reports enable row level security;

drop policy if exists "development access teachers" on public.teachers;
drop policy if exists "development access subjects" on public.subjects;
drop policy if exists "development access classes" on public.classes;
drop policy if exists "development access rooms" on public.rooms;
drop policy if exists "development access timetable" on public.timetable;
drop policy if exists "development access timetable error reports" on public.timetable_error_reports;

create policy "development access teachers" on public.teachers for all to anon, authenticated using (true) with check (true);
create policy "development access subjects" on public.subjects for all to anon, authenticated using (true) with check (true);
create policy "development access classes" on public.classes for all to anon, authenticated using (true) with check (true);
create policy "development access rooms" on public.rooms for all to anon, authenticated using (true) with check (true);
create policy "development access timetable" on public.timetable for all to anon, authenticated using (true) with check (true);
create policy "development access timetable error reports" on public.timetable_error_reports for all to anon, authenticated using (true) with check (true);
