import { createClient, type User, type Session } from '@supabase/supabase-js';
import type { Question, LivePoll, LeaderboardEntry, QuizRoundState, Room, AttendeePresence } from '../types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://rkwrlyjdntwgvzgfxphv.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJrd3JseWpkbnR3Z3Z6Z2Z4cGh2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODczNzU5NzYsImV4cCI6MjEwMjk1MTk3Nn0.sqkO1wWH-g1RW6osbLaZN-1QXeKnTtfcgjxxcIL4q8k';

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  supabaseUrl !== 'https://your-project-id.supabase.co'
);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage: typeof window !== 'undefined' ? window.localStorage : undefined,
      },
      realtime: {
        params: {
          eventsPerSecond: 20,
        },
      },
    })
  : null;

// ================= AUTH HELPERS =================
export async function signUpWithEmail(email: string, password: string, displayName: string) {
  if (!supabase) return { user: null, session: null, error: new Error('Supabase not configured') };
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        display_name: displayName,
      },
    },
  });
  return { user: data.user, session: data.session, error };
}

export async function signInWithEmail(email: string, password: string) {
  if (!supabase) return { user: null, session: null, error: new Error('Supabase not configured') };
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  return { user: data.user, session: data.session, error };
}

export async function signInAnonymously(displayName?: string) {
  if (!supabase) return { user: null, session: null, error: new Error('Supabase not configured') };
  const { data, error } = await supabase.auth.signInAnonymously({
    options: {
      data: {
        display_name: displayName || 'Anonymous Techie',
      },
    },
  });
  return { user: data.user, session: data.session, error };
}

export async function resendVerificationEmail(email: string) {
  if (!supabase) return { error: new Error('Supabase not configured') };
  const { error } = await supabase.auth.resend({
    type: 'signup',
    email,
  });
  return { error };
}

export function isEmailVerified(user: User | null): boolean {
  if (!user) return false;
  // If registered via third-party OAuth, it is verified
  if (user.app_metadata?.provider && user.app_metadata.provider !== 'email') {
    return true;
  }
  // Check if email has been verified
  return Boolean(user.email_confirmed_at || user.confirmed_at);
}

export async function signOutUser() {
  if (!supabase) return { error: null };
  const { error } = await supabase.auth.signOut();
  return { error };
}

export async function getCurrentUser(): Promise<User | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getUser();
  return data.user;
}

export function onAuthChange(callback: (user: User | null, session: Session | null) => void) {
  if (!supabase) return () => {};
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session?.user || null, session);
  });
  return () => data.subscription.unsubscribe();
}

// ================= ROOMS MANAGEMENT & ISOLATION =================
export function isUserRoomAdmin(room: Room | null | undefined, user?: User | null, userName?: string): boolean {
  if (!room) return false;
  const cleanName = (userName || '').trim().toLowerCase();
  const cleanEmail = (user?.email || '').trim().toLowerCase();
  const userId = user?.id;

  // 1. Direct Owner / Creator Match (Strict ID & Email matching)
  if (userId && room.host_id && room.host_id === userId) return true;
  if (cleanEmail && room.host_email && room.host_email.trim().toLowerCase() === cleanEmail) return true;

  // Fallback for legacy room with no host_id/host_email configured
  if (!room.host_id && !room.host_email && cleanName && room.host_name && room.host_name.trim().toLowerCase() === cleanName) {
    return true;
  }

  // 2. Co-Admin match in room.admins array
  const admins = room.admins || [];
  if (admins.length > 0) {
    return admins.some((adminIdentifier) => {
      if (!adminIdentifier) return false;
      const cleanAdmin = adminIdentifier.trim().toLowerCase();
      if (userId && (adminIdentifier === userId || cleanAdmin === userId.toLowerCase())) return true;
      if (cleanEmail && cleanAdmin === cleanEmail) return true;
      if (cleanName && cleanAdmin === cleanName) return true;
      return false;
    });
  }

  return false;
}

export async function dbEnsureRoomExists(roomCode: string, user?: User | null, userName?: string): Promise<Room> {
  const targetKey = (roomCode || 'SKT-789').toUpperCase().trim();
  const allRooms = await dbFetchRooms();
  const existing = allRooms.find((r) => r.code.toUpperCase() === targetKey);
  if (existing) {
    return existing;
  }

  const hostEmail = user?.email || undefined;
  const hostId = user?.id || `host_${Date.now()}`;
  const hostName = userName || user?.user_metadata?.display_name || 'Host Admin';

  const newRoom: Room = {
    id: `room-${targetKey}`,
    code: targetKey,
    title: `Tech Arena // ${targetKey}`,
    host_id: hostId,
    host_name: hostName,
    host_email: hostEmail,
    admins: hostEmail ? [hostEmail, hostName] : [hostName],
    created_at: new Date().toISOString(),
  };

  await dbCreateRoom(newRoom);
  return newRoom;
}

export async function dbFetchRooms(): Promise<Room[]> {
  let localRooms: Room[] = [];
  try {
    const stored = localStorage.getItem('sketchcast_local_rooms');
    if (stored) localRooms = JSON.parse(stored);
  } catch {
    // ignore
  }

  if (!supabase) return localRooms;
  try {
    const { data, error } = await supabase
      .from('rooms')
      .select('*')
      .order('created_at', { ascending: false });

    if (error || !data) return localRooms;
    return data.map((r: any) => {
      let admins = r.admins || [];
      if (!admins || admins.length === 0) {
        try {
          const localAdmins = localStorage.getItem(`sketchcast_room_admins_${r.code?.toUpperCase().trim()}`);
          if (localAdmins) admins = JSON.parse(localAdmins);
        } catch {
          // ignore
        }
      }
      return {
        ...r,
        admins,
      };
    }) as Room[];
  } catch {
    return localRooms;
  }
}

export async function dbFetchMyRooms(user?: User | null, userName?: string): Promise<Room[]> {
  const allRooms = await dbFetchRooms();
  return allRooms.filter((r) => isUserRoomAdmin(r, user, userName));
}

export async function dbCreateRoom(room: Room) {
  const targetKey = room.code.toUpperCase().trim();
  try {
    if (room.admins && room.admins.length > 0) {
      localStorage.setItem(`sketchcast_room_admins_${targetKey}`, JSON.stringify(room.admins));
    }
  } catch {
    // ignore
  }

  if (!supabase) return;
  try {
    await supabase.from('rooms').upsert({
      id: room.id,
      code: targetKey,
      title: room.title.trim(),
      host_id: room.host_id,
      host_name: room.host_name,
      host_email: room.host_email || null,
      admins: room.admins || [],
      created_at: room.created_at,
    });
  } catch {
    // fallback
  }
}

export async function dbUpdateRoomAdmins(roomCode: string, admins: string[]) {
  const targetKey = roomCode.toUpperCase().trim();
  try {
    localStorage.setItem(`sketchcast_room_admins_${targetKey}`, JSON.stringify(admins));
  } catch {
    // ignore
  }

  if (!supabase) return;
  try {
    await supabase.from('rooms').update({ admins }).or(`code.eq.${targetKey},id.eq.room-${targetKey}`);
  } catch {
    // fallback
  }
}

export async function dbDeleteRoom(roomId: string, roomCode: string) {
  if (!supabase) return;
  try {
    await supabase.from('rooms').delete().eq('id', roomId);
    await supabase.from('questions').delete().or(`room_id.eq.${roomId},room_id.eq.${roomCode}`);
    await supabase.from('polls').delete().or(`room_id.eq.${roomId},room_id.eq.${roomCode}`);
    await supabase.from('quiz_rounds').delete().or(`room_id.eq.${roomId},room_id.eq.${roomCode}`);
    await supabase.from('leaderboard').delete().or(`room_id.eq.${roomId},room_id.eq.${roomCode}`);
  } catch {
    // fallback
  }
}

// ================= QUIZ ROUNDS =================
export async function dbFetchActiveQuizRound(roomId: string): Promise<QuizRoundState | null> {
  if (!supabase) return null;
  try {
    const targetKey = roomId.toUpperCase().trim();
    const { data, error } = await supabase
      .from('quiz_rounds')
      .select('*')
      .or(`room_id.eq.${targetKey},room_id.eq.room-${targetKey}`)
      .order('created_at', { ascending: false })
      .limit(1);

    if (error || !data || data.length === 0) return null;
    const round = data[0];
    return {
      isActive: round.is_active,
      question: round.question_data,
      endTime: round.end_time ? Number(round.end_time) : null,
      totalSeconds: round.question_data?.timeLimitSeconds || 25,
      isRevealed: round.is_revealed,
      userSelectedOption: null,
      isCorrect: null,
      pointsEarned: 0,
      votesDistribution: round.votes_distribution || { A: 0, B: 0, C: 0, D: 0 },
    };
  } catch {
    return null;
  }
}

export async function dbSaveActiveQuizRound(state: QuizRoundState, roomId: string) {
  if (!supabase || !state.question) return;
  try {
    const roundId = state.question.id;
    const targetKey = roomId.toUpperCase().trim();
    await supabase.from('quiz_rounds').upsert({
      id: roundId,
      room_id: targetKey,
      question_data: state.question,
      is_active: state.isActive,
      is_revealed: state.isRevealed,
      end_time: state.endTime,
      votes_distribution: state.votesDistribution,
      created_at: new Date().toISOString(),
    });
  } catch {
    // fallback
  }
}

export async function dbUpdateQuizRoundReveal(roundId: string) {
  if (!supabase) return;
  try {
    await supabase
      .from('quiz_rounds')
      .update({ is_revealed: true })
      .eq('id', roundId);
  } catch {
    // fallback
  }
}

export async function dbUpdateQuizVotes(roundId: string, votesDistribution: Record<string, number>) {
  if (!supabase) return;
  try {
    await supabase
      .from('quiz_rounds')
      .update({ votes_distribution: votesDistribution })
      .eq('id', roundId);
  } catch {
    // fallback
  }
}

export async function dbIncrementQuizVote(roundId: string, optionId: string): Promise<Record<string, number> | null> {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase.rpc('increment_quiz_vote', {
      p_round_id: roundId,
      p_option_id: optionId,
    });
    if (error || !data) return null;
    return data as Record<string, number>;
  } catch {
    return null;
  }
}

// ================= QUESTIONS =================
export async function dbFetchQuestions(roomId: string): Promise<Question[]> {
  if (!supabase) return [];
  try {
    const targetKey = roomId.toUpperCase().trim();
    const { data, error } = await supabase
      .from('questions')
      .select('*')
      .or(`room_id.eq.${targetKey},room_id.eq.room-${targetKey}`)
      .order('created_at', { ascending: false });

    if (error || !data) return [];
    return data.map((q: any) => ({
      id: q.id,
      room_id: q.room_id,
      author_name: q.author_name,
      author_session_id: q.author_session_id,
      content: q.content,
      upvotes_count: q.upvotes_count,
      status: q.status,
      created_at: q.created_at,
      aiTalkingPoints: q.ai_talking_points || q.aiTalkingPoints || undefined,
    })) as Question[];
  } catch {
    return [];
  }
}

export async function dbInsertQuestion(question: Question) {
  if (!supabase) return;
  try {
    const payload: any = {
      id: question.id,
      room_id: question.room_id.toUpperCase().trim(),
      author_name: question.author_name,
      author_session_id: question.author_session_id,
      content: question.content,
      upvotes_count: question.upvotes_count,
      status: question.status,
      created_at: question.created_at,
    };
    if (question.aiTalkingPoints) {
      payload.ai_talking_points = question.aiTalkingPoints;
    }
    await supabase.from('questions').insert(payload);
  } catch {
    // fallback to local
  }
}

export async function dbUpdateQuestionUpvotes(questionId: string, count: number) {
  if (!supabase) return;
  try {
    await supabase.from('questions').update({ upvotes_count: count }).eq('id', questionId);
  } catch {
    // ignore
  }
}

export async function dbUpdateQuestionStatus(questionId: string, status: string) {
  if (!supabase) return;
  try {
    await supabase.from('questions').update({ status }).eq('id', questionId);
  } catch {
    // ignore
  }
}

export async function dbUpdateQuestionTalkingPoints(questionId: string, points: string[]) {
  if (!supabase) return;
  try {
    await supabase.from('questions').update({ ai_talking_points: points }).eq('id', questionId);
  } catch {
    // ignore
  }
}

// ================= POLLS =================
export async function dbFetchPolls(roomId: string): Promise<LivePoll[]> {
  if (!supabase) return [];
  try {
    const targetKey = roomId.toUpperCase().trim();
    const { data, error } = await supabase
      .from('polls')
      .select('*')
      .or(`room_id.eq.${targetKey},room_id.eq.room-${targetKey}`)
      .order('created_at', { ascending: false });

    if (error || !data) return [];
    return data.map((d) => ({
      id: d.id,
      room_id: d.room_id,
      question: d.question,
      options: d.options,
      totalVotes: d.total_votes,
      author_name: d.author_name,
      created_at: d.created_at,
      aiConsensusNote: d.ai_consensus_note || d.aiConsensusNote || undefined,
    }));
  } catch {
    return [];
  }
}

export async function dbInsertPoll(poll: LivePoll) {
  if (!supabase) return;
  try {
    const payload: any = {
      id: poll.id,
      room_id: poll.room_id.toUpperCase().trim(),
      question: poll.question,
      options: poll.options,
      total_votes: poll.totalVotes,
      author_name: poll.author_name,
      created_at: poll.created_at,
    };
    if (poll.aiConsensusNote) {
      payload.ai_consensus_note = poll.aiConsensusNote;
    }
    await supabase.from('polls').insert(payload);
  } catch {
    // fallback
  }
}

export async function dbUpdatePoll(poll: LivePoll) {
  if (!supabase) return;
  try {
    const payload: any = {
      options: poll.options,
      total_votes: poll.totalVotes,
    };
    if (poll.aiConsensusNote) {
      payload.ai_consensus_note = poll.aiConsensusNote;
    }
    await supabase
      .from('polls')
      .update(payload)
      .eq('id', poll.id);
  } catch {
    // fallback
  }
}

export async function dbDeletePoll(pollId: string) {
  if (!supabase) return;
  try {
    await supabase.from('polls').delete().eq('id', pollId);
  } catch {
    // fallback
  }
}

// ================= LEADERBOARD =================
export async function dbFetchLeaderboard(roomId: string): Promise<LeaderboardEntry[]> {
  if (!supabase) return [];
  try {
    const targetKey = roomId.toUpperCase().trim();
    const { data, error } = await supabase
      .from('leaderboard')
      .select('*')
      .or(`room_id.eq.${targetKey},room_id.eq.room-${targetKey}`)
      .order('score', { ascending: false });

    if (error || !data) return [];

    // Deduplicate any rows by lowercase user name per room
    const seen = new Set<string>();
    const deduplicated: LeaderboardEntry[] = [];
    data.forEach((row: any) => {
      const nameKey = (row.name || '').trim().toLowerCase();
      if (nameKey && !seen.has(nameKey)) {
        seen.add(nameKey);
        deduplicated.push({
          session_id: row.session_id,
          name: row.name,
          score: row.score || 0,
          correct_quizzes: row.correct_quizzes || 0,
          polls_voted: row.polls_voted || 0,
          streak: row.streak || 0,
          avatar_color: row.avatar_color || '#FF2A6D',
        });
      }
    });

    return deduplicated;
  } catch {
    return [];
  }
}

export async function dbUpsertLeaderboardEntry(entry: LeaderboardEntry, roomId: string) {
  if (!supabase) return;
  try {
    const targetKey = roomId.toUpperCase().trim();
    const cleanName = entry.name.trim();

    // Check if an existing row with this name exists in this room
    const { data: existingRows } = await supabase
      .from('leaderboard')
      .select('session_id')
      .eq('room_id', targetKey)
      .ilike('name', cleanName)
      .limit(1);

    const targetSessionId = (existingRows && existingRows.length > 0)
      ? existingRows[0].session_id
      : entry.session_id;

    await supabase.from('leaderboard').upsert({
      session_id: targetSessionId,
      room_id: targetKey,
      name: cleanName,
      score: entry.score,
      correct_quizzes: entry.correct_quizzes,
      polls_voted: entry.polls_voted,
      streak: entry.streak,
      avatar_color: entry.avatar_color,
      updated_at: new Date().toISOString(),
    });
  } catch {
    // fallback
  }
}

// ================= LIVE ROOM ATTENDEES PRESENCE =================
export async function dbUpsertAttendeePresence(
  roomCode: string,
  sessionId: string,
  userName: string,
  userRole: 'host' | 'attendee' = 'attendee'
) {
  if (!supabase) return;
  try {
    const code = roomCode.toUpperCase().trim();
    await supabase.from('room_attendees').upsert({
      id: sessionId,
      room_code: code,
      user_name: userName,
      user_role: userRole,
      last_active: new Date().toISOString(),
    });
  } catch {
    // silent catch
  }
}

export async function dbFetchActiveRoomAttendees(
  roomCode: string,
  thresholdSeconds: number = 20
): Promise<AttendeePresence[]> {
  if (!supabase) return [];
  try {
    const code = roomCode.toUpperCase().trim();
    const cutoffTime = new Date(Date.now() - thresholdSeconds * 1000).toISOString();

    const { data, error } = await supabase
      .from('room_attendees')
      .select('*')
      .eq('room_code', code)
      .gte('last_active', cutoffTime)
      .order('last_active', { ascending: false });

    if (error || !data) return [];

    return data.map((row: any) => ({
      session_id: row.id,
      name: row.user_name || 'Attendee',
      role: row.user_role || 'attendee',
      joined_at: row.joined_at ? new Date(row.joined_at).getTime() : Date.now(),
      last_active: row.last_active ? new Date(row.last_active).getTime() : Date.now(),
    }));
  } catch {
    return [];
  }
}

export async function dbRemoveAttendeePresence(sessionId: string) {
  if (!supabase) return;
  try {
    await supabase.from('room_attendees').delete().eq('id', sessionId);
  } catch {
    // silent catch
  }
}

export async function dbCleanupStaleAttendees(roomCode?: string) {
  if (!supabase) return;
  try {
    const cutoffTime = new Date(Date.now() - 3 * 60 * 1000).toISOString(); // 3 minutes
    let query = supabase.from('room_attendees').delete().lt('last_active', cutoffTime);
    if (roomCode) {
      query = query.eq('room_code', roomCode.toUpperCase().trim());
    }
    await query;
  } catch {
    // silent catch
  }
}
