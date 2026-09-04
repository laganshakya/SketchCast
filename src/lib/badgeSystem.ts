import type { AchievementBadge, BadgeRarity } from '../types';

export interface UserBadgeStats {
  correctQuizzes: number;
  totalQuizzesAnswered?: number;
  streak: number;
  rank?: number;
  pollsVoted: number;
  fastestAnswerSeconds?: number;
  isTopInquirer?: boolean;
  hasUsedPowerUp?: boolean;
  isSpotlightWinner?: boolean;
}

export const ALL_ACHIEVEMENTS: AchievementBadge[] = [
  {
    id: 'speed_demon',
    name: 'Speed Demon',
    icon: '⚡',
    desc: 'Answered quiz in under 3 seconds',
    rarity: 'rare',
  },
  {
    id: 'sharpshooter',
    name: 'Sharpshooter',
    icon: '🎯',
    desc: 'Maintained 100% quiz accuracy',
    rarity: 'epic',
  },
  {
    id: 'top_inquirer',
    name: 'Top Inquirer',
    icon: '💬',
    desc: 'Q&A question reached top 3 upvotes',
    rarity: 'rare',
  },
  {
    id: 'on_fire',
    name: 'On Fire',
    icon: '🔥',
    desc: 'Maintained a 3x+ consecutive correct streak',
    rarity: 'epic',
  },
  {
    id: 'podium_apex',
    name: 'Podium Apex',
    icon: '👑',
    desc: 'Secured Rank #1 Gold on the live leaderboard',
    rarity: 'legendary',
  },
  {
    id: 'podium_champ',
    name: 'Podium Finish',
    icon: '🥈',
    desc: 'Finished in the Top 3 Keynote Podium',
    rarity: 'epic',
  },

  {
    id: 'democracy_hero',
    name: 'Democracy Hero',
    icon: '🗳️',
    desc: 'Participated in live audience decision polls',
    rarity: 'common',
  },
  {
    id: 'tactician',
    name: 'Tactician',
    icon: '🛡️',
    desc: 'Strategically deployed tactical quiz power-ups',
    rarity: 'rare',
  },
  {
    id: 'spotlight_star',
    name: 'Spotlight Star',
    icon: '🎰',
    desc: 'Chosen on the Host Keynote Spotlight Wheel',
    rarity: 'legendary',
  },
  {
    id: 'rising_architect',
    name: 'Rising Architect',
    icon: '🚀',
    desc: 'Active keynote session participant',
    rarity: 'common',
  },
];

export function calculateUserBadges(stats: UserBadgeStats): AchievementBadge[] {
  const earned: AchievementBadge[] = [];

  if (stats.rank === 1) {
    earned.push(ALL_ACHIEVEMENTS.find((b) => b.id === 'podium_apex')!);
  } else if (stats.rank && stats.rank <= 3) {
    earned.push(ALL_ACHIEVEMENTS.find((b) => b.id === 'podium_champ')!);
  }

  if (stats.streak >= 3) {
    earned.push(ALL_ACHIEVEMENTS.find((b) => b.id === 'on_fire')!);
  }

  // Speed Demon: Answered quiz in under 3 seconds or solved 3+ quizzes
  if ((stats.fastestAnswerSeconds && stats.fastestAnswerSeconds <= 3) || stats.correctQuizzes >= 3) {
    earned.push(ALL_ACHIEVEMENTS.find((b) => b.id === 'speed_demon')!);
  }

  // Sharpshooter: 100% quiz accuracy (min 2 quizzes)
  if (stats.totalQuizzesAnswered && stats.totalQuizzesAnswered >= 2 && stats.correctQuizzes === stats.totalQuizzesAnswered) {
    earned.push(ALL_ACHIEVEMENTS.find((b) => b.id === 'sharpshooter')!);
  }

  // Top Inquirer: Q&A question reached top 3 upvotes
  if (stats.isTopInquirer) {
    earned.push(ALL_ACHIEVEMENTS.find((b) => b.id === 'top_inquirer')!);
  }



  if (stats.pollsVoted >= 2) {
    earned.push(ALL_ACHIEVEMENTS.find((b) => b.id === 'democracy_hero')!);
  }

  if (stats.hasUsedPowerUp) {
    earned.push(ALL_ACHIEVEMENTS.find((b) => b.id === 'tactician')!);
  }

  if (stats.isSpotlightWinner) {
    earned.push(ALL_ACHIEVEMENTS.find((b) => b.id === 'spotlight_star')!);
  }

  if (earned.length === 0) {
    earned.push(ALL_ACHIEVEMENTS.find((b) => b.id === 'rising_architect')!);
  }

  return earned;
}

export function getRarityBadgeStyle(rarity: BadgeRarity): {
  bg: string;
  text: string;
  border: string;
  glow: string;
} {
  switch (rarity) {
    case 'legendary':
      return {
        bg: 'bg-neo-yellow',
        text: 'text-black',
        border: 'border-black',
        glow: 'shadow-[0_0_8px_rgba(255,230,0,0.6)]',
      };
    case 'epic':
      return {
        bg: 'bg-neo-pink',
        text: 'text-white',
        border: 'border-black',
        glow: 'shadow-[0_0_8px_rgba(255,42,109,0.6)]',
      };
    case 'rare':
      return {
        bg: 'bg-neo-cyan',
        text: 'text-black',
        border: 'border-black',
        glow: 'shadow-[0_0_8px_rgba(0,240,255,0.5)]',
      };
    case 'common':
    default:
      return {
        bg: 'bg-[#1E2333]',
        text: 'text-slate-200',
        border: 'border-slate-700',
        glow: '',
      };
  }
}
