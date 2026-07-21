-- Database Setup SQL for BunkSafe
-- You can run these commands in your Supabase SQL Editor to create the necessary tables and policies.

-- Drop existing tables to recreate with clean types
drop table if exists bunk_notes;
drop table if exists subjects;
drop table if exists profiles;

-- 1. Create Profiles Table (independent of auth.users to avoid email rate limits)
create table if not exists profiles (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  branch text not null,
  semester text not null,
  register_number text not null unique,
  password text not null,
  target_attendance integer not null default 75,
  avatar_url text,
  is_guest boolean not null default false,
  last_synced timestamp with time zone default timezone('utc'::text, now()) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security explicitly so Supabase is satisfied
alter table profiles enable row level security;

-- Create fully public RLS policies for profiles to work without Supabase Auth session limits
drop policy if exists "Allow public read of profiles" on profiles;
create policy "Allow public read of profiles" on profiles for select using (true);

drop policy if exists "Allow public insert of profiles" on profiles;
create policy "Allow public insert of profiles" on profiles for insert with check (true);

drop policy if exists "Allow public update of profiles" on profiles;
create policy "Allow public update of profiles" on profiles for update using (true);

drop policy if exists "Allow public delete of profiles" on profiles;
create policy "Allow public delete of profiles" on profiles for delete using (true);


-- 2. Create Subjects Table (referencing profiles)
create table if not exists subjects (
  id text primary key, -- Stores client-generated or unique subject ID
  user_id uuid references profiles(id) on delete cascade not null,
  code text,
  name text not null,
  hours_attended integer not null default 0,
  hours_conducted integer not null default 0,
  target_percentage integer not null default 75,
  category text check (category in ('core', 'elective', 'lab')),
  history jsonb not null default '[]'::jsonb, -- Stores hourly attendance history array
  last_updated timestamp with time zone default timezone('utc'::text, now()) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security for subjects
alter table subjects enable row level security;

-- Create fully public RLS policies for subjects
drop policy if exists "Allow public read of subjects" on subjects;
create policy "Allow public read of subjects" on subjects for select using (true);

drop policy if exists "Allow public insert of subjects" on subjects;
create policy "Allow public insert of subjects" on subjects for insert with check (true);

drop policy if exists "Allow public update of subjects" on subjects;
create policy "Allow public update of subjects" on subjects for update using (true);

drop policy if exists "Allow public delete of subjects" on subjects;
create policy "Allow public delete of subjects" on subjects for delete using (true);


-- 3. Create Bunk Notes Table (referencing profiles)
create table if not exists bunk_notes (
  id text primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  date text not null,
  subject_id text not null,
  subject_code text not null,
  subject_name text not null,
  hours_missed integer not null,
  reason text not null,
  details text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security for bunk_notes
alter table bunk_notes enable row level security;

-- Create fully public RLS policies for bunk_notes
drop policy if exists "Allow public read of bunk_notes" on bunk_notes;
create policy "Allow public read of bunk_notes" on bunk_notes for select using (true);

drop policy if exists "Allow public insert of bunk_notes" on bunk_notes;
create policy "Allow public insert of bunk_notes" on bunk_notes for insert with check (true);

drop policy if exists "Allow public update of bunk_notes" on bunk_notes;
create policy "Allow public update of bunk_notes" on bunk_notes for update using (true);

drop policy if exists "Allow public delete of bunk_notes" on bunk_notes;
create policy "Allow public delete of bunk_notes" on bunk_notes for delete using (true);
