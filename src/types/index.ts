// Core Domain Types for SketchCast Live Voting & Quizzing

export type ActiveTabType = 'quiz' | 'polls' | 'qa' | 'leaderboard' | 'surveys' | 'rooms' | 'ai-settings' | 'session-report';

export interface Room {
  id: string;
  code: string; // Room passcode (e.g. "SKT-789")
  title: string;
  host_id: string;
  host_name: string;
  host_email?: string;
  admins?: string[]; // List of co-host / admin display names or emails
  ai_model?: string; // Active or preferred AI model for the room
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
  aiCluster?: string;
}

export interface QuestionCluster {
  themeName: string;
  emoji: string;
  color: string;
  questionIds: string[];
}

// --- Leaderboard & Presence ---
export interface LeaderboardEntry {
  session_id: string;
  name: string;
  correct_quizzes: number;
  polls_voted?: number;
  avatar_color: string;
}

export interface AttendeePresence {
  session_id: string;
  name: string;
  role: 'host' | 'attendee';
  joined_at: number;
  last_active: number;
}

export interface ChampionSocialCardData {
  playerName: string;
  rank: number;
  score: number;
  correctQuizzes: number;
  totalQuizzes: number;
  pollsVoted: number;
  roomCode: string;
  roomTitle?: string;
  hostName?: string;
  totalAttendees?: number;
}

// --- Survey Types ---
export type SurveyQuestionType = 'rating' | 'choice' | 'text';

export interface SurveyQuestion {
  id: string;
  type: SurveyQuestionType;
  title: string;
  options?: string[]; // For 'choice' questions
  required?: boolean;
  maxRating?: number; // Defaults to 5 for 'rating' questions
}

export interface SurveyAISummary {
  sentiment: 'positive' | 'neutral' | 'mixed' | 'negative';
  score: number; // 0 - 100
  takeaways: string[];
  keyQuotes: string[];
  generatedAt: number;
}

export interface Survey {
  id: string;
  room_id: string;
  title: string;
  description: string;
  questions: SurveyQuestion[];
  status: 'draft' | 'active' | 'closed';
  created_at: string;
  responses_count: number;
  author_name: string;
  aiSummary?: SurveyAISummary | null;
}

export interface SurveyResponse {
  id: string;
  survey_id: string;
  room_id: string;
  session_id: string;
  attendee_name: string;
  answers: Record<string, any>; // questionId -> rating (number) | choice (string) | text (string)
  submitted_at: number;
}

// --- Audience Floating Reaction Types ---
export interface AudienceReaction {
  id: string;
  emoji: string;
  x: number; // 0 to 100 percentage horizontally
  senderName?: string;
  timestamp: number;
}

// --- Masterclass Certificate of Completion ---
export interface MasterclassCertificate {
  certificateId: string;
  recipientName: string;
  roomTitle: string;
  roomCode: string;
  rank: number;
  totalAttendees: number;
  issuedAt: string;
  verificationUrl: string;
}

