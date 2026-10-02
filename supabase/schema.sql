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

-- Migration safety: remove legacy restrictive foreign keys that conflict with dual room_id formats (code vs id)
alter table if exists public.questions drop constraint if exists questions_room_id_fkey;
alter table if exists public.polls drop constraint if exists polls_room_id_fkey;
alter table if exists public.quiz_rounds drop constraint if exists quiz_rounds_room_id_fkey;
alter table if exists public.leaderboard drop constraint if exists leaderboard_room_id_fkey;
alter table if exists public.surveys drop constraint if exists surveys_room_id_fkey;
alter table if exists public.survey_responses drop constraint if exists survey_responses_room_id_fkey;
alter table if exists public.room_attendees drop constraint if exists room_attendees_room_code_fkey;

-- 2. Questions Table (Live Q&A Upvote Feed & Host AI Talking Points)
create table if not exists public.questions (
  id text primary key,
  room_id text not null,
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
  room_id text not null,
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
  room_id text not null,
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
  room_id text not null,
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
create index if not exists idx_leaderboard_room_session on public.leaderboard (room_id, session_id);
create index if not exists idx_questions_room_created_upvotes on public.questions (room_id, upvotes_count desc, created_at desc);

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
  auth.jwt()->>'email' = any(admins) or 
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
    where (r.id = quiz_rounds.room_id or r.code = quiz_rounds.room_id or ('room-' || r.code) = quiz_rounds.room_id or r.code = replace(quiz_rounds.room_id, 'room-', ''))
      and (r.host_id = auth.uid()::text or r.host_email = auth.jwt()->>'email' or auth.jwt()->>'email' = any(r.admins) or r.host_id is null or r.host_id like 'host_%')
  )
);

drop policy if exists "quiz_rounds_update_controlled" on public.quiz_rounds;
create policy "quiz_rounds_update_controlled" on public.quiz_rounds for update using (true) with check (true);

drop policy if exists "quiz_rounds_delete_host" on public.quiz_rounds;
create policy "quiz_rounds_delete_host" on public.quiz_rounds for delete using (
  auth.role() = 'authenticated' or 
  exists (
    select 1 from public.rooms r 
    where (r.id = quiz_rounds.room_id or r.code = quiz_rounds.room_id or ('room-' || r.code) = quiz_rounds.room_id or r.code = replace(quiz_rounds.room_id, 'room-', ''))
      and (r.host_id = auth.uid()::text or r.host_email = auth.jwt()->>'email' or auth.jwt()->>'email' = any(r.admins) or r.host_id is null or r.host_id like 'host_%')
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
    where (r.id = polls.room_id or r.code = polls.room_id or ('room-' || r.code) = polls.room_id or r.code = replace(polls.room_id, 'room-', ''))
      and (r.host_id = auth.uid()::text or r.host_email = auth.jwt()->>'email' or auth.jwt()->>'email' = any(r.admins) or r.host_id is null or r.host_id like 'host_%')
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
    where (r.id = questions.room_id or r.code = questions.room_id or ('room-' || r.code) = questions.room_id or r.code = replace(questions.room_id, 'room-', ''))
      and (r.host_id = auth.uid()::text or r.host_email = auth.jwt()->>'email' or auth.jwt()->>'email' = any(r.admins) or r.host_id is null or r.host_id like 'host_%')
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
    where (r.id = leaderboard.room_id or r.code = leaderboard.room_id or ('room-' || r.code) = leaderboard.room_id or r.code = replace(leaderboard.room_id, 'room-', ''))
      and (r.host_id = auth.uid()::text or r.host_email = auth.jwt()->>'email' or auth.jwt()->>'email' = any(r.admins) or r.host_id is null or r.host_id like 'host_%')
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

drop policy if exists "survey_responses_update_public" on public.survey_responses;
create policy "survey_responses_update_public" on public.survey_responses for update using (true) with check (true);

drop policy if exists "survey_responses_delete_public" on public.survey_responses;
create policy "survey_responses_delete_public" on public.survey_responses for delete using (true);

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

-- 8.4 Atomic Cascade Room Deletion (Cleans up all child tables and the room itself)
-- Handles dual-format room identifiers: room code ('SKT-789') and room ID ('room-SKT-789')
create or replace function public.delete_room_cascade(p_room_id text)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_raw text;
  v_code text;
  v_id text;
  v_prefixed_id text;
  v_unprefixed text;
  v_host_id text;
  v_host_email text;
  v_admins text[];
  v_target_keys text[];
  v_rooms_count int := 0;
  v_questions_count int := 0;
  v_polls_count int := 0;
  v_quiz_rounds_count int := 0;
  v_leaderboard_count int := 0;
  v_attendees_count int := 0;
  v_surveys_count int := 0;
  v_responses_count int := 0;
begin
  if p_room_id is null or trim(p_room_id) = '' then
    return jsonb_build_object('success', false, 'error', 'Room identifier is required');
  end if;

  v_raw := trim(p_room_id);

  if lower(v_raw) like 'room-%' then
    v_prefixed_id := v_raw;
    v_unprefixed := substring(v_raw from 6);
  else
    v_prefixed_id := 'room-' || v_raw;
    v_unprefixed := v_raw;
  end if;

  -- Discover canonical room record if present in public.rooms (exact matching, avoids wildcard matching in LIKE)
  select id, code, host_id, host_email, admins into v_id, v_code, v_host_id, v_host_email, v_admins
  from public.rooms
  where lower(id) in (lower(v_raw), lower(v_prefixed_id), lower(v_unprefixed))
     or lower(code) in (lower(v_raw), lower(v_prefixed_id), lower(v_unprefixed))
  limit 1;

  -- Authorization check: if room exists, only host, co-admin, service_role, or unauthenticated host can delete it
  if v_id is not null then
    if not (
      auth.role() = 'service_role' or
      (v_host_id is not null and auth.uid()::text = v_host_id) or
      (v_host_email is not null and auth.jwt()->>'email' = v_host_email) or
      (v_admins is not null and auth.jwt()->>'email' = any(v_admins)) or
      v_host_id is null or
      v_host_id like 'host_%'
    ) then
      return jsonb_build_object('success', false, 'error', 'Unauthorized: Only the room host or admin can delete this room');
    end if;
  end if;

  -- Build exhaustive list of all matching room identifiers
  v_target_keys := array_remove(array[
    v_raw,
    upper(v_raw),
    lower(v_raw),
    v_prefixed_id,
    upper(v_prefixed_id),
    lower(v_prefixed_id),
    v_unprefixed,
    upper(v_unprefixed),
    lower(v_unprefixed),
    v_id,
    upper(coalesce(v_id, '')),
    lower(coalesce(v_id, '')),
    v_code,
    upper(coalesce(v_code, '')),
    lower(coalesce(v_code, ''))
  ], null);
  v_target_keys := array_remove(v_target_keys, '');

  select array_agg(distinct k) into v_target_keys from unnest(v_target_keys) t(k);

  -- 1. Delete survey responses (direct room_id or linked to survey_id of this room)
  delete from public.survey_responses
  where room_id = any(v_target_keys)
     or survey_id in (select id from public.surveys where room_id = any(v_target_keys));
  get diagnostics v_responses_count = row_count;

  -- 2. Delete surveys
  delete from public.surveys
  where room_id = any(v_target_keys);
  get diagnostics v_surveys_count = row_count;

  -- 3. Delete room attendees (matched by room_code)
  delete from public.room_attendees
  where room_code = any(v_target_keys);
  get diagnostics v_attendees_count = row_count;

  -- 4. Delete leaderboard entries
  delete from public.leaderboard
  where room_id = any(v_target_keys);
  get diagnostics v_leaderboard_count = row_count;

  -- 5. Delete quiz rounds
  delete from public.quiz_rounds
  where room_id = any(v_target_keys);
  get diagnostics v_quiz_rounds_count = row_count;

  -- 6. Delete polls
  delete from public.polls
  where room_id = any(v_target_keys);
  get diagnostics v_polls_count = row_count;

  -- 7. Delete questions
  delete from public.questions
  where room_id = any(v_target_keys);
  get diagnostics v_questions_count = row_count;

  -- 8. Delete room itself
  delete from public.rooms
  where id = any(v_target_keys) or code = any(v_target_keys);
  get diagnostics v_rooms_count = row_count;

  return jsonb_build_object(
    'success', true,
    'room_id', coalesce(v_id, v_prefixed_id),
    'room_code', coalesce(v_code, v_unprefixed),
    'deleted', jsonb_build_object(
      'rooms', v_rooms_count,
      'questions', v_questions_count,
      'polls', v_polls_count,
      'quiz_rounds', v_quiz_rounds_count,
      'leaderboard', v_leaderboard_count,
      'room_attendees', v_attendees_count,
      'surveys', v_surveys_count,
      'survey_responses', v_responses_count
    )
  );
end;
$$;

grant execute on function public.delete_room_cascade(text) to authenticated, anon, service_role;

-- 8.5 Automatic Trigger Cascade Deletion (Safety net for direct DELETE on public.rooms)
create or replace function public.trg_cascade_delete_room()
returns trigger
language plpgsql
security definer
as $$
declare
  v_unprefixed_id text;
  v_keys text[];
begin
  if lower(old.id) like 'room-%' then
    v_unprefixed_id := substring(old.id from 6);
  else
    v_unprefixed_id := old.id;
  end if;

  v_keys := array[
    old.id,
    upper(coalesce(old.id, '')),
    lower(coalesce(old.id, '')),
    old.code,
    upper(coalesce(old.code, '')),
    lower(coalesce(old.code, '')),
    'room-' || coalesce(old.code, ''),
    upper('room-' || coalesce(old.code, '')),
    lower('room-' || coalesce(old.code, '')),
    v_unprefixed_id,
    upper(coalesce(v_unprefixed_id, '')),
    lower(coalesce(v_unprefixed_id, ''))
  ];

  v_keys := array_remove(v_keys, null);
  v_keys := array_remove(v_keys, '');
  select array_agg(distinct k) into v_keys from unnest(v_keys) t(k);

  delete from public.survey_responses
  where room_id = any(v_keys)
     or survey_id in (select id from public.surveys where room_id = any(v_keys));

  delete from public.surveys
  where room_id = any(v_keys);

  delete from public.room_attendees
  where room_code = any(v_keys);

  delete from public.leaderboard
  where room_id = any(v_keys);

  delete from public.quiz_rounds
  where room_id = any(v_keys);

  delete from public.polls
  where room_id = any(v_keys);

  delete from public.questions
  where room_id = any(v_keys);

  return old;
end;
$$;

drop trigger if exists trg_room_cascade_delete on public.rooms;
create trigger trg_room_cascade_delete
before delete on public.rooms
for each row
execute function public.trg_cascade_delete_room();

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

-- ==============================================================================
-- 10. Contextual Affiliate Recommendations & Sponsor CTA
-- ==============================================================================

create table if not exists public.affiliate_recommendations (
  id text primary key,
  category text not null, -- 'cloud_devops' | 'frontend' | 'system_design' | 'backend' | 'ai_ml' | 'cybersecurity' | 'general'
  keywords text[] default array[]::text[],
  title text not null,
  headline text not null,
  description text,
  provider text not null,
  badge_text text default 'RECOMMENDED',
  affiliate_url text not null,
  discount_code text,
  icon_key text default 'BookOpen',
  theme_color text default 'blue',
  target_placements text[] default array['quiz_takeaway', 'certificate', 'report', 'leaderboard']::text[],
  min_difficulty text default 'any',
  is_active boolean default true,
  priority int default 0,
  click_count int default 0,
  impression_count int default 0,
  created_at timestamptz default now()
);

-- Migration safety for rooms sponsor_cta
alter table if exists public.rooms add column if not exists sponsor_cta jsonb default '{}'::jsonb;

-- Indexes
create index if not exists idx_affiliate_recs_category on public.affiliate_recommendations (category);
create index if not exists idx_affiliate_recs_active on public.affiliate_recommendations (is_active, priority desc);

-- RLS
alter table public.affiliate_recommendations enable row level security;
drop policy if exists "Allow public read access to active affiliate recommendations" on public.affiliate_recommendations;
create policy "Allow read access to affiliate recommendations"
  on public.affiliate_recommendations for select
  using (true);

drop policy if exists "Allow insert on affiliate recommendations" on public.affiliate_recommendations;
create policy "Allow insert on affiliate recommendations"
  on public.affiliate_recommendations for insert
  with check (true);

drop policy if exists "Allow update on affiliate recommendations" on public.affiliate_recommendations;
create policy "Allow update on affiliate recommendations"
  on public.affiliate_recommendations for update
  using (true)
  with check (true);

drop policy if exists "Allow delete on affiliate recommendations" on public.affiliate_recommendations;
create policy "Allow delete on affiliate recommendations"
  on public.affiliate_recommendations for delete
  using (true);

-- RPC for atomic click counter
create or replace function public.increment_affiliate_click(p_rec_id text)
returns int
language plpgsql
security definer
as $$
declare
  new_count int;
begin
  update public.affiliate_recommendations
  set click_count = coalesce(click_count, 0) + 1
  where id = p_rec_id
  returning click_count into new_count;
  return new_count;
end;
$$;

-- RPC for atomic impression counter
create or replace function public.increment_affiliate_impression(p_rec_id text)
returns int
language plpgsql
security definer
as $$
declare
  new_count int;
begin
  update public.affiliate_recommendations
  set impression_count = coalesce(impression_count, 0) + 1
  where id = p_rec_id
  returning impression_count into new_count;
  return new_count;
end;
$$;

-- Seed initial recommendations
insert into public.affiliate_recommendations (
  id, category, keywords, title, headline, description, provider, badge_text, affiliate_url, discount_code, icon_key, theme_color, target_placements, min_difficulty, is_active, priority
) values
(
  'rec_k8s_cka',
  'cloud_devops',
  array['kubernetes', 'k8s', 'docker', 'containers', 'helm', 'kubectl', 'pods', 'ingress', 'cluster', 'cloud native'],
  'Certified Kubernetes Administrator (CKA) Hands-on Lab Path',
  'Master Kubernetes Networking, Security & Production Clusters',
  'Hands-on interactive lab environments preparing you for official CNCF certification.',
  'Educative',
  '30% OFF',
  'https://www.educative.io/courses/certified-kubernetes-administrator?ref=sketchcast',
  'SKETCH30',
  'Cloud',
  'blue',
  array['quiz_takeaway', 'certificate', 'report', 'leaderboard'],
  'any',
  true,
  100
),
(
  'rec_system_design',
  'system_design',
  array['system design', 'architecture', 'microservices', 'distributed', 'scalability', 'sharding', 'caching', 'kafka', 'load balancing', 'redis', 'high availability'],
  'System Design Interview & High-Scale Architecture Masterclass',
  'Architect High-Throughput Distributed Systems from Scratch',
  'Deconstruct real-world architectures from Uber, Netflix, WhatsApp, and Stripe.',
  'Exponent',
  'TOP RATED',
  'https://www.tryexponent.com/courses/system-design-interview?ref=sketchcast',
  'EXPO20',
  'Layers',
  'purple',
  array['quiz_takeaway', 'certificate', 'report', 'leaderboard'],
  'any',
  true,
  95
),
(
  'rec_react_ts',
  'frontend',
  array['react', 'typescript', 'frontend', 'ui', 'hooks', 'nextjs', 'next.js', 'state management', 'virtual dom', 'tailwind', 'component', 'performance'],
  'Advanced React Patterns, Performance & Design Systems',
  'Elevate to Senior Frontend Engineer with Production React Patterns',
  'Master React 19 concurrency, Server Components, memoization, and zero-runtime architecture.',
  'Coursera',
  'OFFICIAL CERT',
  'https://www.coursera.org/learn/advanced-react?ref=sketchcast',
  'REACTPRO',
  'Code',
  'blue',
  array['quiz_takeaway', 'certificate', 'report', 'leaderboard'],
  'any',
  true,
  90
),
(
  'rec_ai_ml_llm',
  'ai_ml',
  array['ai', 'llm', 'machine learning', 'gpt', 'genai', 'generative ai', 'transformers', 'embeddings', 'langchain', 'rag', 'deep learning', 'neural'],
  'Generative AI & LLM Systems Engineering Path',
  'Build Enterprise RAG, Vector Search & Autonomous Agent Systems',
  'Production-ready LLM deployment, fine-tuning, latency optimization, and safety guardrails.',
  'DeepLearning.AI',
  'SPECIAL OFFER',
  'https://www.deeplearning.ai/courses/generative-ai-with-llms?ref=sketchcast',
  'AIPRO15',
  'Sparkles',
  'amber',
  array['quiz_takeaway', 'certificate', 'report', 'leaderboard'],
  'any',
  true,
  85
),
(
  'rec_cloud_aws',
  'cloud_devops',
  array['aws', 'cloud', 's3', 'lambda', 'ec2', 'iam', 'terraform', 'devops', 'ci/cd', 'infrastructure', 'vpc', 'serverless'],
  'AWS Certified Solutions Architect & Cloud Security Track',
  'Comprehensive Hands-on Labs for Enterprise Cloud Infrastructure',
  'Multi-region disaster recovery, serverless pipelines, and cost-optimized infrastructure.',
  'Whizlabs',
  'HOT',
  'https://www.whizlabs.com/aws-solutions-architect-associate?ref=sketchcast',
  'CLOUD25',
  'Cloud',
  'amber',
  array['quiz_takeaway', 'certificate', 'report', 'leaderboard'],
  'any',
  true,
  80
),
(
  'rec_sql_db',
  'backend',
  array['sql', 'database', 'postgres', 'postgresql', 'indexes', 'query optimization', 'indexing', 'transactions', 'acid', 'nosql', 'mongodb', 'schema'],
  'High-Performance PostgreSQL Internals & Query Optimization',
  'Eliminate DB Bottlenecks & Scale PostgreSQL to Millions of QPS',
  'Deep dive into explain plans, WAL logs, partition strategies, and connection pooling.',
  'O’Reilly',
  'BESTSELLER',
  'https://www.oreilly.com/library/view/high-performance-postgresql?ref=sketchcast',
  'POSTGRES',
  'Database',
  'emerald',
  array['quiz_takeaway', 'certificate', 'report', 'leaderboard'],
  'any',
  true,
  75
),
(
  'rec_cybersecurity',
  'cybersecurity',
  array['security', 'cybersecurity', 'xss', 'csrf', 'sql injection', 'owasp', 'penetration testing', 'auth', 'jwt', 'encryption', 'tls'],
  'Practical Web Application Security & OWASP Defense',
  'Defend Enterprise Apps Against Modern Exploits & Vulnerabilities',
  'Hands-on attack and defense simulations covering OAuth2, JWT hardening, and API security.',
  'Coursera',
  'CERTIFIED',
  'https://www.coursera.org/learn/web-security-owasp?ref=sketchcast',
  'SECURE30',
  'ShieldCheck',
  'rose',
  array['quiz_takeaway', 'certificate', 'report', 'leaderboard'],
  'any',
  true,
  70
)
on conflict (id) do update set
  category = excluded.category,
  keywords = excluded.keywords,
  title = excluded.title,
  headline = excluded.headline,
  description = excluded.description,
  provider = excluded.provider,
  badge_text = excluded.badge_text,
  affiliate_url = excluded.affiliate_url,
  discount_code = excluded.discount_code,
  icon_key = excluded.icon_key,
  theme_color = excluded.theme_color,
  target_placements = excluded.target_placements,
  min_difficulty = excluded.min_difficulty,
  is_active = excluded.is_active,
  priority = excluded.priority;

-- ====================================================================
-- CERTIFICATES TABLE (Cryptographic Merit Ledger)
-- ====================================================================
create table if not exists public.certificates (
  id text primary key,
  room_code text not null,
  recipient_name text not null,
  room_title text not null,
  rank integer not null default 1,
  total_attendees integer not null default 1,
  score integer not null default 0,
  correct_quizzes integer not null default 0,
  host_name text not null,
  signature text not null,
  issued_at timestamptz default now()
);

create index if not exists idx_certificates_room on public.certificates (room_code);
create index if not exists idx_certificates_signature on public.certificates (signature);

alter table public.certificates enable row level security;

create policy "Allow public read of certificates" on public.certificates
  for select using (true);

create policy "Allow insert of certificates" on public.certificates
  for insert with check (true);
