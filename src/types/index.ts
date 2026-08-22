// Core Domain Types for SketchCast Live Voting & Quizzing

export type ActiveTabType = 'quiz' | 'polls' | 'qa' | 'leaderboard' | 'rooms';

export interface Room {
  id: string;
  code: string; // Room passcode (e.g. "SKT-789")
  title: string;
  host_id: string;
  host_name: string;
  created_at: string;
}

// --- Quiz Types ---
export interface QuizOption {
  id: string; // 'A', 'B', 'C', 'D'
  text: string;
}

export interface QuizQuestion {
  id: string;
  category: string;
  question: string;
  options: QuizOption[];
  correctOptionId: string; // 'A', 'B', 'C', 'D'
  explanation: string;
  timeLimitSeconds: number;
}

export interface QuizPack {
  id: string;
  name: string;
  icon: string;
  description: string;
  questions: QuizQuestion[];
}

export interface QuizRoundState {
  isActive: boolean;
  question: QuizQuestion | null;
  endTime: number | null;
  totalSeconds: number;
  isRevealed: boolean;
  userSelectedOption: string | null;
  isCorrect: boolean | null;
  pointsEarned: number;
  votesDistribution: Record<string, number>; // { 'A': 12, 'B': 4, ... }
  updatedAt?: number;
}

// --- Live Poll Types ---
export interface PollOption {
  id: string;
  text: string;
  votesCount: number;
}

export interface LivePoll {
  id: string;
  room_id: string;
  question: string;
  options: PollOption[];
  totalVotes: number;
  author_name: string;
  created_at: string;
  userVotedOptionId?: string | null;
}

// --- Q&A Types ---
export type QuestionStatus = 'pending' | 'spotlight' | 'answered' | 'dismissed';

export interface Question {
  id: string;
  room_id: string;
  author_name: string;
  author_session_id: string;
  content: string;
  upvotes_count: number;
  status: QuestionStatus;
  created_at: string;
  is_upvoted_by_me?: boolean;
}

// --- Leaderboard & Presence ---
export interface LeaderboardEntry {
  session_id: string;
  name: string;
  score: number;
  correct_quizzes: number;
  polls_voted: number;
  streak: number;
  avatar_color: string;
}

export interface AttendeePresence {
  session_id: string;
  name: string;
  role: 'host' | 'attendee';
  joined_at: number;
  last_active: number;
}
