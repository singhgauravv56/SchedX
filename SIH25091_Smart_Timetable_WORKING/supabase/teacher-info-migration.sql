create extension if not exists "pgcrypto";

create table if not exists public.teachers (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  specialization text not null,
  email text,
  department text not null default 'General',
  working_days_per_week integer not null default 5 check (working_days_per_week between 1 and 7),
  availability jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.teachers add column if not exists specialization text;
alter table public.teachers alter column specialization drop not null;
alter table public.teachers add column if not exists email text;
alter table public.teachers add column if not exists department text not null default 'General';
alter table public.teachers add column if not exists working_days_per_week integer not null default 5;
alter table public.teachers add column if not exists availability jsonb not null default '{}'::jsonb;
alter table public.teachers add column if not exists created_at timestamptz not null default now();

alter table public.teachers enable row level security;
drop policy if exists "development access teachers" on public.teachers;
create policy "development access teachers" on public.teachers
  for all to anon, authenticated using (true) with check (true);
