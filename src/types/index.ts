// Core Domain Types for SketchCast Live Voting & Quizzing

export type ActiveTabType = 'quiz' | 'polls' | 'qa' | 'leaderboard' | 'rooms';

export interface Room {
  id: string;
  code: string; // Room passcode (e.g. "SKT-789")
  title: string;
  host_id: string;
  host_name: string;
  host_email?: string;
  admins?: string[]; // List of co-host / admin display names or emails
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
  aiDeepDive?: string;
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
  aiDeepDive?: string | null;
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
  aiConsensusNote?: string | null;
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
  aiTalkingPoints?: string[];
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

// --- Gamification & Power-Ups ---
export type PowerUpType = '50-50' | 'double-down' | 'streak-shield' | 'time-freeze';

export interface PowerUpInventory {
  '50-50': number;
  'double-down': number;
  'streak-shield': number;
  'time-freeze': number;
}

export type BadgeRarity = 'common' | 'rare' | 'epic' | 'legendary';

export interface AchievementBadge {
  id: string;
  name: string;
  icon: string;
  desc: string;
  rarity: BadgeRarity;
  unlockedAt?: number;
}

export type BadgeType =
  | 'speed_demon'
  | 'on_fire'
  | 'podium_champ'
  | 'democracy_hero'
  | 'flawless_architect'
  | 'keynote_influencer'
  | 'spotlight_star'
  | 'tactician';

export interface SpotlightRewardPerk {
  id: string;
  name: string;
  icon: string;
  description: string;
  color: string;
}

export interface SpotlightWinner {
  targetSessionId: string;
  targetName: string;
  spunBy: string;
  rewardPerk?: string;
  rewardIcon?: string;
  rewardDesc?: string;
  timestamp: number;
}

export interface ChampionSocialCardData {
  playerName: string;
  rank: number;
  score: number;
  correctQuizzes: number;
  totalQuizzes: number;
  pollsVoted: number;
  maxStreak: number;
  roomCode: string;
  roomTitle?: string;
  badges: { icon: string; name: string; desc: string; rarity?: BadgeRarity }[];
}
