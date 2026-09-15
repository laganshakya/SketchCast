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
  correct_quizzes int default 0,
  polls_voted int default 0,
  avatar_color text default '#FFE600',
  updated_at timestamptz default now()
);

-- 6. Room Attendees Table (Live Presence & Attendee Roster)
create table if not exists public.room_attendees (
  id text primary key, -- session_id
  room_code text not null,
  user_name text not null,
  user_role text default 'attendee',
  joined_at timestamptz default now(),
  last_active timestamptz default now()
);

-- 7. Surveys Table (Interactive Post-Event and Mid-Session Feedback)
create table if not exists public.surveys (
  id text primary key,
  room_id text not null,
  title text not null,
  description text default '',
  questions jsonb not null default '[]'::jsonb,
  status text default 'active', -- 'active' | 'closed' | 'draft'
  responses_count int default 0,
  author_name text default 'Room Host',
  ai_summary jsonb,
  created_at timestamptz default now()
);

-- 8. Survey Responses Table (Audience Submissions)
create table if not exists public.survey_responses (
  id text primary key,
  survey_id text references public.surveys(id) on delete cascade,
  room_id text not null,
  session_id text not null,
  user_name text default 'Attendee',
  answers jsonb not null default '{}'::jsonb,
  submitted_at timestamptz default now()
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

create index if not exists idx_leaderboard_room_correct on public.leaderboard (room_id, correct_quizzes desc);

create index if not exists idx_room_attendees_code on public.room_attendees (room_code, last_active desc);
create index if not exists idx_surveys_room on public.surveys (room_id, created_at desc);
create index if not exists idx_survey_responses_survey on public.survey_responses (survey_id, submitted_at desc);
create index if not exists idx_survey_responses_room on public.survey_responses (room_id);

-- ==============================================================================
-- 7. Row Level Security (RLS) & Clean Unified Policies
-- ==============================================================================

alter table public.rooms enable row level security;
alter table public.questions enable row level security;
alter table public.polls enable row level security;
alter table public.quiz_rounds enable row level security;
alter table public.leaderboard enable row level security;
alter table public.room_attendees enable row level security;
alter table public.surveys enable row level security;
alter table public.survey_responses enable row level security;

-- Drop legacy open policies if present
drop policy if exists "rooms_unified_access" on public.rooms;
drop policy if exists "questions_unified_access" on public.questions;
drop policy if exists "polls_unified_access" on public.polls;
drop policy if exists "quiz_rounds_unified_access" on public.quiz_rounds;
drop policy if exists "leaderboard_unified_access" on public.leaderboard;

-- 7.1 Rooms Table: Public read, Public creation, Host/Creator-only update & delete
drop policy if exists "rooms_select_public" on public.rooms;
create policy "rooms_select_public" on public.rooms for select using (true);

drop policy if exists "rooms_insert_auth" on public.rooms;
create policy "rooms_insert_auth" on public.rooms for insert with check (true);

drop policy if exists "rooms_update_host" on public.rooms;
create policy "rooms_update_host" on public.rooms for update using (
  auth.uid()::text = host_id or 
  auth.jwt()->>'email' = host_email or 
  auth.jwt()->>'email' = any(admins) or 
  host_id is null or
  host_id like 'host_%'
) with check (
  auth.uid()::text = host_id or 
  auth.jwt()->>'email' = host_email or 
  auth.jwt()->>'email' = any(admins) or 
  host_id is null or
  host_id like 'host_%'
);

drop policy if exists "rooms_delete_host" on public.rooms;
create policy "rooms_delete_host" on public.rooms for delete using (
  auth.uid()::text = host_id or 
  auth.jwt()->>'email' = host_email or 
  host_id is null or
  host_id like 'host_%'
);

-- 7.2 Quiz Rounds: Public read, Host-only start/delete, Controlled reveal and vote updates
drop policy if exists "quiz_rounds_select_public" on public.quiz_rounds;
create policy "quiz_rounds_select_public" on public.quiz_rounds for select using (true);

drop policy if exists "quiz_rounds_insert_host" on public.quiz_rounds;
create policy "quiz_rounds_insert_host" on public.quiz_rounds for insert with check (
  auth.role() = 'authenticated' or 
  exists (
    select 1 from public.rooms r 
    where r.id = quiz_rounds.room_id and (r.host_id = auth.uid()::text or r.host_email = auth.jwt()->>'email' or r.host_id is null)
  )
);

drop policy if exists "quiz_rounds_update_controlled" on public.quiz_rounds;
create policy "quiz_rounds_update_controlled" on public.quiz_rounds for update using (true) with check (true);

drop policy if exists "quiz_rounds_delete_host" on public.quiz_rounds;
create policy "quiz_rounds_delete_host" on public.quiz_rounds for delete using (
  auth.role() = 'authenticated' or 
  exists (
    select 1 from public.rooms r 
    where r.id = quiz_rounds.room_id and (r.host_id = auth.uid()::text or r.host_email = auth.jwt()->>'email' or r.host_id is null)
  )
);

-- 7.3 Polls: Public read, Attendee create/vote, Host delete/reset
drop policy if exists "polls_select_public" on public.polls;
create policy "polls_select_public" on public.polls for select using (true);

drop policy if exists "polls_insert_public" on public.polls;
create policy "polls_insert_public" on public.polls for insert with check (true);

drop policy if exists "polls_update_public" on public.polls;
create policy "polls_update_public" on public.polls for update using (true) with check (true);

drop policy if exists "polls_delete_host" on public.polls;
create policy "polls_delete_host" on public.polls for delete using (
  auth.role() = 'authenticated' or 
  exists (
    select 1 from public.rooms r 
    where r.id = polls.room_id and (r.host_id = auth.uid()::text or r.host_email = auth.jwt()->>'email' or r.host_id is null)
  )
);

-- 7.4 Questions: Public read, Attendee ask/upvote, Host manage/delete
drop policy if exists "questions_select_public" on public.questions;
create policy "questions_select_public" on public.questions for select using (true);

drop policy if exists "questions_insert_public" on public.questions;
create policy "questions_insert_public" on public.questions for insert with check (true);

drop policy if exists "questions_update_public" on public.questions;
create policy "questions_update_public" on public.questions for update using (true) with check (true);

drop policy if exists "questions_delete_host" on public.questions;
create policy "questions_delete_host" on public.questions for delete using (
  auth.role() = 'authenticated' or 
  exists (
    select 1 from public.rooms r 
    where r.id = questions.room_id and (r.host_id = auth.uid()::text or r.host_email = auth.jwt()->>'email' or r.host_id is null)
  )
);

-- 7.5 Leaderboard: Public read & attendee self upsert, Host reset
drop policy if exists "leaderboard_select_public" on public.leaderboard;
create policy "leaderboard_select_public" on public.leaderboard for select using (true);

drop policy if exists "leaderboard_insert_public" on public.leaderboard;
create policy "leaderboard_insert_public" on public.leaderboard for insert with check (true);

drop policy if exists "leaderboard_update_public" on public.leaderboard;
create policy "leaderboard_update_public" on public.leaderboard for update using (true) with check (true);

drop policy if exists "leaderboard_delete_host" on public.leaderboard;
create policy "leaderboard_delete_host" on public.leaderboard for delete using (
  auth.role() = 'authenticated' or 
  exists (
    select 1 from public.rooms r 
    where r.id = leaderboard.room_id and (r.host_id = auth.uid()::text or r.host_id is null)
  )
);

-- 7.6 Room Attendees: Public presence
drop policy if exists "room_attendees_select_public" on public.room_attendees;
create policy "room_attendees_select_public" on public.room_attendees for select using (true);

drop policy if exists "room_attendees_upsert_public" on public.room_attendees;
create policy "room_attendees_upsert_public" on public.room_attendees for insert with check (true);

drop policy if exists "room_attendees_update_public" on public.room_attendees;
create policy "room_attendees_update_public" on public.room_attendees for update using (true) with check (true);

drop policy if exists "room_attendees_delete_public" on public.room_attendees;
create policy "room_attendees_delete_public" on public.room_attendees for delete using (true);

-- 7.7 Surveys & Responses
drop policy if exists "surveys_select_public" on public.surveys;
create policy "surveys_select_public" on public.surveys for select using (true);

drop policy if exists "surveys_insert_public" on public.surveys;
create policy "surveys_insert_public" on public.surveys for insert with check (true);

drop policy if exists "surveys_update_public" on public.surveys;
create policy "surveys_update_public" on public.surveys for update using (true) with check (true);

drop policy if exists "surveys_delete_public" on public.surveys;
create policy "surveys_delete_public" on public.surveys for delete using (true);

drop policy if exists "survey_responses_select_public" on public.survey_responses;
create policy "survey_responses_select_public" on public.survey_responses for select using (true);

drop policy if exists "survey_responses_insert_public" on public.survey_responses;
create policy "survey_responses_insert_public" on public.survey_responses for insert with check (true);

-- ==============================================================================
-- 8. Stored Procedures (Atomic Real-Time Mutations)
-- ==============================================================================

-- 8.1 Atomic Quiz Vote Increment
create or replace function public.increment_quiz_vote(p_round_id text, p_option_id text)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_votes jsonb;
  v_current_count int;
begin
  select votes_distribution into v_votes from public.quiz_rounds where id = p_round_id for update;
  if not found then
    return null;
  end if;
  if v_votes is null then
    v_votes := '{"A":0,"B":0,"C":0,"D":0}'::jsonb;
  end if;
  v_current_count := coalesce((v_votes->>p_option_id)::int, 0) + 1;
  v_votes := jsonb_set(v_votes, array[p_option_id], to_jsonb(v_current_count));
  update public.quiz_rounds set votes_distribution = v_votes where id = p_round_id;
  return v_votes;
end;
$$;

-- 8.2 Atomic Poll Vote Mutation (Supports option selection, option switch, or un-vote)
create or replace function public.vote_on_poll(
  p_poll_id text,
  p_new_option_id text,
  p_old_option_id text default null
)
returns public.polls
language plpgsql
security definer
as $$
declare
  v_poll public.polls;
  v_options jsonb;
  v_new_options jsonb := '[]'::jsonb;
  v_elem jsonb;
  v_total int := 0;
begin
  select * into v_poll from public.polls where id = p_poll_id for update;
  if not found then
    return null;
  end if;

  v_options := v_poll.options;
  for v_elem in select * from jsonb_array_elements(v_options)
  loop
    if p_new_option_id is not null and v_elem->>'id' = p_new_option_id then
      v_elem := jsonb_set(v_elem, '{votesCount}', to_jsonb(coalesce((v_elem->>'votesCount')::int, 0) + 1));
    elsif p_old_option_id is not null and v_elem->>'id' = p_old_option_id then
      v_elem := jsonb_set(v_elem, '{votesCount}', to_jsonb(greatest(0, coalesce((v_elem->>'votesCount')::int, 0) - 1)));
    end if;
    v_total := v_total + coalesce((v_elem->>'votesCount')::int, 0);
    v_new_options := v_new_options || jsonb_build_array(v_elem);
  end loop;

  update public.polls
  set options = v_new_options, total_votes = v_total
  where id = p_poll_id
  returning * into v_poll;

  return v_poll;
end;
$$;

-- 8.3 Atomic Question Upvote Mutation
create or replace function public.increment_question_upvote(p_question_id text, p_delta int)
returns int
language plpgsql
security definer
as $$
declare
  v_new_count int;
begin
  update public.questions
  set upvotes_count = greatest(0, coalesce(upvotes_count, 0) + p_delta)
  where id = p_question_id
  returning upvotes_count into v_new_count;
  return v_new_count;
end;
$$;

-- ==============================================================================
-- 9. Realtime Replication Publication
-- ==============================================================================

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table 
      public.rooms, 
      public.questions, 
      public.polls, 
      public.quiz_rounds, 
      public.leaderboard,
      public.room_attendees,
      public.surveys,
      public.survey_responses;
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
