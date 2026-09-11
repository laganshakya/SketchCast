// Core Domain Types for SketchCast Live Voting & Quizzing

export type ActiveTabType = 'quiz' | 'polls' | 'qa' | 'leaderboard' | 'surveys' | 'rooms' | 'slides';

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
  score: number;
  correct_quizzes: number;
  polls_voted: number;
  streak: number;
  avatar_color: string;
  fastest_answer_seconds?: number;
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
  perkId?: string;
  rewardPerk?: string;
  rewardIcon?: string;
  rewardDesc?: string;
  bonusPoints?: number;
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
  score: number;
  rank: number;
  totalAttendees: number;
  badges: AchievementBadge[];
  issuedAt: string;
  verificationUrl: string;
}

// --- Interactive Slide & Presentation Deck Types ---
export type SlideCanvasTheme =
  | 'dark'
  | 'neo-card'
  | 'retro-grid'
  | 'retro-dots'
  | 'neo-cream'
  | 'neo-yellow'
  | 'neo-cyan'
  | 'neo-mint'
  | 'neo-pink';

export type SlideLayoutType =
  | 'single'
  | 'split-2'
  | 'grid-3'
  | 'asymmetric-left'
  | 'asymmetric-right';

export type SlideTransitionType =
  | 'none'
  | 'fade'
  | 'slide-horizontal'
  | 'slide-vertical'
  | 'zoom'
  | 'flip'
  | 'arcade-pop'
  | 'cyber-glitch'
  | 'bounce';

export type ElementAnimationType =
  | 'none'
  | 'fade-in'
  | 'slide-up'
  | 'slide-down'
  | 'zoom-in'
  | 'pop-in'
  | 'bounce';

export type AnimationPresetBundle =
  | 'neo-arcade'
  | 'cyber-glitch'
  | 'smooth-executive'
  | 'bouncy-retro'
  | 'clean-minimal'
  | 'custom';

export type SlideBlockType =
  | 'heading'
  | 'text'
  | 'image'
  | 'code'
  | 'stat'
  | 'quote'
  | 'quiz'
  | 'poll'
  | 'badge'
  | 'button';

export interface SlideBlock {
  id: string;
  type: SlideBlockType;
  // Positioning & Layout within slide
  column?: number; // 0, 1, 2 for multi-column layouts
  align?: 'left' | 'center' | 'right';
  offsetX?: number; // horizontal pixel offset for free positioning
  offsetY?: number; // vertical pixel offset for free positioning
  cardStyle?: 'none' | 'transparent' | 'card-dark' | 'card-cream' | 'card-yellow' | 'card-pink' | 'card-cyan' | 'card-mint';
  // Animations
  animation?: ElementAnimationType;
  animationDelay?: number;
  // Type-specific data
  text?: string;
  level?: 1 | 2 | 3;
  bullets?: string[];
  headingText?: string;
  headingLevel?: 'display' | 'h1' | 'h2' | 'h3';
  headingColor?: string;
  bodyText?: string;
  imageUrl?: string;
  imageCaption?: string;
  imageFit?: 'cover' | 'contain' | 'auto';
  codeSnippet?: string;
  codeLanguage?: string;
  codeExplanation?: string;
  statValue?: string;
  statLabel?: string;
  statTrend?: string;
  quoteText?: string;
  quoteAuthor?: string;
  quoteRole?: string;
  quizQuestion?: string;
  quizOptions?: string[];
  quizCorrectIndex?: number;
  quizExplanation?: string;
  quizTimeLimitSeconds?: number;
  pollQuestion?: string;
  pollOptions?: string[];
  badgeText?: string;
  badgeColor?: string;
  buttonLabel?: string;
  buttonUrl?: string;
}

export type SlideType =
  | 'title'
  | 'content'
  | 'code'
  | 'stat'
  | 'quote'
  | 'interactive_quiz'
  | 'interactive_poll'
  | 'custom';

export interface Slide {
  id: string;
  type: SlideType;
  title: string;
  subtitle?: string;
  badge?: string;
  // Canvas Theme & Layout
  canvasTheme?: SlideCanvasTheme;
  layout?: SlideLayoutType;
  verticalAlign?: 'top' | 'center' | 'bottom';
  horizontalAlign?: 'left' | 'center' | 'right' | 'stretch';
  // Modular & Freeform Custom Blocks
  blocks?: SlideBlock[];
  // Content & Bullets (for presets)
  bullets?: string[];
  markdown?: string;
  // Code Snippet Slide
  codeSnippet?: string;
  codeLanguage?: string;
  codeExplanation?: string;
  // Stat Slide
  statValue?: string;
  statLabel?: string;
  statTrend?: string;
  // Quote Slide
  quoteText?: string;
  quoteAuthor?: string;
  quoteRole?: string;
  // Embedded Interactivity
  embeddedQuizQuestionId?: string;
  embeddedPollId?: string;
  // Inline Interactive Quiz
  quizQuestion?: string;
  quizOptions?: string[];
  quizCorrectIndex?: number;
  quizExplanation?: string;
  quizTimeLimitSeconds?: number;
  // Inline Interactive Poll
  pollQuestion?: string;
  pollOptions?: string[];
  // Media, Images & URLs
  imageUrl?: string;
  imageCaption?: string;
  imagePosition?: 'right' | 'left' | 'top' | 'background';
  linkUrl?: string;
  linkLabel?: string;
  // Presenter Notes
  speakerNotes?: string;
  durationSeconds?: number;
  backgroundColor?: string;
  // Animations & Transitions
  transition?: SlideTransitionType;
  elementAnimation?: ElementAnimationType;
  animationDuration?: number; // duration in seconds (e.g. 0.4)
  animationDelay?: number; // stagger delay in seconds (e.g. 0.08)
  animationPreset?: AnimationPresetBundle;
}

export interface SlideDeck {
  id: string;
  title: string;
  subtitle?: string;
  description?: string;
  category: string;
  authorName: string;
  slides: Slide[];
  currentSlideIndex: number;
  isPresenting: boolean;
  theme: 'neo-brutalist' | 'arcade' | 'cyber' | 'minimal';
  defaultTransition?: SlideTransitionType;
  defaultElementAnimation?: ElementAnimationType;
  defaultAnimationPreset?: AnimationPresetBundle;
  createdAt: string;
  updatedAt: string;
}

export interface SlideReactionBurst {
  id: string;
  emoji: string;
  senderSessionId: string;
  senderName: string;
  xOffset: number; // 10 to 90 % horizontal
  timestamp: number;
}

