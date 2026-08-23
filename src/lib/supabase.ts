import { createClient, type User, type Session } from '@supabase/supabase-js';
import type { Question, LivePoll, LeaderboardEntry, QuizRoundState, Room } from '../types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://rkwrlyjdntwgvzgfxphv.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJrd3JseWpkbnR3Z3Z6Z2Z4cGh2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODczNzU5NzYsImV4cCI6MjEwMjk1MTk3Nn0.sqkO1wWH-g1RW6osbLaZN-1QXeKnTtfcgjxxcIL4q8k';

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  supabaseUrl !== 'https://your-project-id.supabase.co'
);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
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
export function isUserRoomAdmin(room: Room, user?: User | null, userName?: string): boolean {
  if (!room) return false;
  const cleanName = (userName || '').trim().toLowerCase();
  const cleanEmail = (user?.email || '').trim().toLowerCase();
  const userId = user?.id;

  // 1. Direct creator / owner match (User ID, Email, or Display Name)
  if (userId && room.host_id === userId) return true;
  if (cleanEmail && room.host_email && room.host_email.trim().toLowerCase() === cleanEmail) return true;
  if (cleanName && room.host_name && room.host_name.trim().toLowerCase() === cleanName) return true;

  // 2. Co-admin membership in room.admins array
  const admins = room.admins || [];
  if (admins.length > 0) {
    return admins.some((adminIdentifier) => {
      const cleanAdmin = (adminIdentifier || '').trim().toLowerCase();
      if (userId && (adminIdentifier === userId || cleanAdmin === userId.toLowerCase())) return true;
      if (cleanEmail && cleanAdmin === cleanEmail) return true;
      if (cleanName && cleanAdmin === cleanName) return true;
      return false;
    });
  }

  return false;
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
    return data as LeaderboardEntry[];
  } catch {
    return [];
  }
}

export async function dbUpsertLeaderboardEntry(entry: LeaderboardEntry, roomId: string) {
  if (!supabase) return;
  try {
    const targetKey = roomId.toUpperCase().trim();
    await supabase.from('leaderboard').upsert({
      session_id: entry.session_id,
      room_id: targetKey,
      name: entry.name,
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

// ================= STORAGE BUCKET HELPERS =================
export async function uploadAsset(file: File, path?: string): Promise<string | null> {
  if (!supabase) return null;
  try {
    const filePath = path || `uploads/${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
    const { error } = await supabase.storage
      .from('sketchcast-assets')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true,
      });

    if (error) return null;

    const { data } = supabase.storage
      .from('sketchcast-assets')
      .getPublicUrl(filePath);

    return data.publicUrl;
  } catch {
    return null;
  }
}
