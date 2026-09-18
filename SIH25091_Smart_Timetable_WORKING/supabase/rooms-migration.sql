create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  room_number text not null unique,
  room_type text not null check (room_type in ('Classroom', 'Laboratory', 'Seminar Hall', 'Computer Lab', 'Other')),
  capacity integer not null check (capacity > 0),
  availability text not null default 'Available' check (availability in ('Available', 'Occupied', 'Unavailable')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.rooms enable row level security;

drop policy if exists "development access rooms" on public.rooms;
create policy "development access rooms"
  on public.rooms
  for all
  to anon, authenticated
  using (true)
  with check (true);
