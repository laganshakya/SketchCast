-- ==============================================================================
-- SketchCast: PostgreSQL & Supabase Database Schema
-- Real-Time Interactive Live Voting, Tech Quizzing, and Q&A Arena
-- Fully Optimized for Low Latency, Realtime Replication & Multi-Admin Permissions
-- ==============================================================================

-- 1. Rooms Table with Creator Ownership, Multi-Admin, AI Settings & Session Reports
create table if not exists public.rooms (
  id text primary key,
  code text unique not null,
  title text not null,
  host_id text,
  host_name text,
  host_email text,
  admins text[] default array[]::text[],
  ai_settings jsonb default '{}'::jsonb,
  session_report text,
  last_active_at timestamptz default now(),
  created_at timestamptz default now()
);

-- Migration safety for existing installations
alter table if exists public.rooms add column if not exists host_email text;
alter table if exists public.rooms add column if not exists admins text[] default array[]::text[];
alter table if exists public.rooms add column if not exists ai_settings jsonb default '{}'::jsonb;
alter table if exists public.rooms add column if not exists session_report text;
alter table if exists public.rooms add column if not exists last_active_at timestamptz default now();

-- 2. Questions Table (Live Q&A Upvote Feed & Host AI Talking Points)
create table if not exists public.questions (
  id text primary key,
  room_id text references public.rooms(id) on delete cascade,
  author_name text not null,
  author_session_id text not null,
  content text not null,
  upvotes_count int default 0,
  status text default 'pending', -- 'pending' | 'spotlight' | 'answered' | 'dismissed'
  ai_talking_points jsonb default '[]'::jsonb,
  created_at timestamptz default now()
);

-- Migration safety for questions
alter table if exists public.questions add column if not exists ai_talking_points jsonb default '[]'::jsonb;

-- 3. Polls Table (Live Community Polls & AI Consensus Note)
create table if not exists public.polls (
  id text primary key,
  room_id text references public.rooms(id) on delete cascade,
  question text not null,
  options jsonb not null default '[]'::jsonb,
  total_votes int default 0,
  author_name text not null,
  ai_consensus_note text,
  created_at timestamptz default now()
);

-- Migration safety for polls
alter table if exists public.polls add column if not exists ai_consensus_note text;

-- 4. Quiz Rounds Table (Realtime Quizzing State & Category)
create table if not exists public.quiz_rounds (
  id text primary key,
  room_id text references public.rooms(id) on delete cascade,
  question_data jsonb not null,
  category text,
  quiz_type text default 'standard',
  is_active boolean default true,
  is_revealed boolean default false,
  end_time bigint,
  votes_distribution jsonb default '{"A":0,"B":0,"C":0,"D":0}'::jsonb,
  created_at timestamptz default now()
);

-- Migration safety for quiz rounds
alter table if exists public.quiz_rounds add column if not exists category text;
alter table if exists public.quiz_rounds add column if not exists quiz_type text default 'standard';

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
-- 6. Performance Indexes
-- ==============================================================================

create index if not exists idx_rooms_code on public.rooms (code);
create index if not exists idx_rooms_host_id on public.rooms (host_id);
create index if not exists idx_rooms_host_email on public.rooms (host_email);

create index if not exists idx_questions_room_created on public.questions (room_id, created_at desc);
create index if not exists idx_questions_room_upvotes on public.questions (room_id, upvotes_count desc);
create index if not exists idx_questions_room_status on public.questions (room_id, status);

create index if not exists idx_polls_room_created on public.polls (room_id, created_at desc);

create index if not exists idx_quiz_rounds_room_created on public.quiz_rounds (room_id, created_at desc);
create index if not exists idx_quiz_rounds_room_active on public.quiz_rounds (room_id, is_active);

create index if not exists idx_leaderboard_room_score on public.leaderboard (room_id, score desc);

-- ==============================================================================
-- 7. Row Level Security (RLS) & Clean Unified Policies
-- ==============================================================================

alter table public.rooms enable row level security;
alter table public.questions enable row level security;
alter table public.polls enable row level security;
alter table public.quiz_rounds enable row level security;
alter table public.leaderboard enable row level security;

-- Single optimized unified policies per table (eliminates redundant policy evaluations)
create policy "rooms_unified_access" on public.rooms for all using (true) with check (true);
create policy "questions_unified_access" on public.questions for all using (true) with check (true);
create policy "polls_unified_access" on public.polls for all using (true) with check (true);
create policy "quiz_rounds_unified_access" on public.quiz_rounds for all using (true) with check (true);
create policy "leaderboard_unified_access" on public.leaderboard for all using (true) with check (true);

-- ==============================================================================
-- 8. Realtime Replication Publication
-- ==============================================================================

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.rooms, public.questions, public.polls, public.quiz_rounds, public.leaderboard;
  end if;
exception
  when duplicate_object then null;
  when others then null;
end $$;

-- ==============================================================================
-- 9. Default Seed Data & Public Storage Bucket
-- ==============================================================================

-- Initial Default Demo Room
insert into public.rooms (id, code, title, host_id, host_name, host_email, admins)
values ('room-demo-101', 'SKT-789', 'NextGen Tech Arena — Live Voting & Quizzing', 'host-root-1', 'Alex Chen (Host)', 'host@sketchcast.live', array['Alex Chen (Host)', 'host@sketchcast.live'])
on conflict (id) do update set title = excluded.title;

-- Public Storage Bucket for Asset Uploads
insert into storage.buckets (id, name, public)
values ('sketchcast-assets', 'sketchcast-assets', true)
on conflict (id) do nothing;

create policy "sketchcast_storage_read" on storage.objects for select using (bucket_id = 'sketchcast-assets');
create policy "sketchcast_storage_insert" on storage.objects for insert with check (bucket_id = 'sketchcast-assets');
create policy "sketchcast_storage_update" on storage.objects for update using (bucket_id = 'sketchcast-assets') with check (bucket_id = 'sketchcast-assets');
create policy "sketchcast_storage_delete" on storage.objects for delete using (bucket_id = 'sketchcast-assets');
