-- ==============================================================================
-- SketchCast: PostgreSQL & Supabase Database Schema
-- Real-Time Interactive Live Voting, Tech Quizzing, and Q&A Arena
-- ==============================================================================

-- 1. Rooms Table with Creator Ownership & Multi-Admin Permissions
create table if not exists public.rooms (
  id text primary key,
  code text unique not null,
  title text not null,
  host_id text,
  host_name text,
  host_email text,
  admins text[] default array[]::text[],
  created_at timestamptz default now()
);

-- Migration safety for existing installations
alter table if exists public.rooms add column if not exists host_email text;
alter table if exists public.rooms add column if not exists admins text[] default array[]::text[];

-- 2. Questions Table (Live Q&A Upvote Feed)
create table if not exists public.questions (
  id text primary key,
  room_id text references public.rooms(id) on delete cascade,
  author_name text not null,
  author_session_id text not null,
  content text not null,
  upvotes_count int default 0,
  status text default 'pending', -- 'pending' | 'spotlight' | 'answered' | 'dismissed'
  created_at timestamptz default now()
);

-- 3. Polls Table (Live Community Polls)
create table if not exists public.polls (
  id text primary key,
  room_id text references public.rooms(id) on delete cascade,
  question text not null,
  options jsonb not null default '[]'::jsonb,
  total_votes int default 0,
  author_name text not null,
  created_at timestamptz default now()
);

-- 4. Quiz Rounds Table (Realtime Quizzing State)
create table if not exists public.quiz_rounds (
  id text primary key,
  room_id text references public.rooms(id) on delete cascade,
  question_data jsonb not null,
  is_active boolean default true,
  is_revealed boolean default false,
  end_time bigint,
  votes_distribution jsonb default '{"A":0,"B":0,"C":0,"D":0}'::jsonb,
  created_at timestamptz default now()
);

-- 5. Leaderboard Table (Arcade High Scores & Player Rankings)
create table if not exists public.leaderboard (
  session_id text primary key,
  room_id text references public.rooms(id) on delete cascade,
  name text not null,
  score int default 0,
  correct_quizzes int default 0,
  polls_voted int default 0,
  streak int default 0,
  avatar_color text default '#FFE600',
  updated_at timestamptz default now()
);

-- ==============================================================================
-- Row Level Security (RLS) & Policies
-- ==============================================================================

alter table public.rooms enable row level security;
alter table public.questions enable row level security;
alter table public.polls enable row level security;
alter table public.quiz_rounds enable row level security;
alter table public.leaderboard enable row level security;

-- Rooms Policies
create policy "Allow public read access to rooms" on public.rooms for select using (true);
create policy "Allow public insert/update to rooms" on public.rooms for all using (true);

-- Questions Policies
create policy "Allow public read access to questions" on public.questions for select using (true);
create policy "Allow public insert/update to questions" on public.questions for all using (true);

-- Polls Policies
create policy "Allow public read access to polls" on public.polls for select using (true);
create policy "Allow public insert/update to polls" on public.polls for all using (true);

-- Quiz Rounds Policies
create policy "Allow public read access to quiz_rounds" on public.quiz_rounds for select using (true);
create policy "Allow public insert/update to quiz_rounds" on public.quiz_rounds for all using (true);

-- Leaderboard Policies
create policy "Allow public read access to leaderboard" on public.leaderboard for select using (true);
create policy "Allow public insert/update to leaderboard" on public.leaderboard for all using (true);

-- ==============================================================================
-- Default Seed Data & Storage Bucket
-- ==============================================================================

-- Initial Default Demo Room
insert into public.rooms (id, code, title, host_id, host_name, host_email, admins)
values ('room-demo-101', 'SKT-789', 'NextGen Tech Arena — Live Voting & Quizzing', 'host-root-1', 'Alex Chen (Host)', 'host@sketchcast.live', array['Alex Chen (Host)', 'host@sketchcast.live'])
on conflict (id) do update set title = excluded.title;

-- Public Storage Bucket for Asset Uploads
insert into storage.buckets (id, name, public)
values ('sketchcast-assets', 'sketchcast-assets', true)
on conflict (id) do nothing;

create policy "Public Access to sketchcast-assets" on storage.objects for select using (bucket_id = 'sketchcast-assets');
create policy "Public Upload to sketchcast-assets" on storage.objects for insert with check (bucket_id = 'sketchcast-assets');
