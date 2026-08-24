import React from 'react';
import {
  Timer,
  CheckCircle,
  XCircle,
  Sparkles,
  HelpCircle,
  ArrowRight,
  Eye,
  Trophy,
  Flame,
  Clock,
  Shield,
} from 'lucide-react';
import type { QuizRoundState, PowerUpType, PowerUpInventory } from '../../types';
import { QuizPowerUpsBar } from './QuizPowerUpsBar';

interface QuizArenaProps {
  quizState: QuizRoundState;
  timeRemaining: number;
  userStreak: number;
  onSelectOption: (optionId: string) => void;
  onRevealAnswer: () => void;
  onNextQuestion?: () => void;
  hasNextQuestion?: boolean;
  onViewScores?: () => void;
  isHost: boolean;
  powerUpInventory?: PowerUpInventory;
  activePowerUp?: PowerUpType | null;
  eliminatedOptionIds?: string[];
  onActivatePowerUp?: (type: PowerUpType) => void;
}

export const QuizArena: React.FC<QuizArenaProps> = ({
  quizState,
  timeRemaining,
  userStreak,
  onSelectOption,
  onRevealAnswer,
  onNextQuestion,
  hasNextQuestion = false,
  onViewScores,
  isHost,
  powerUpInventory,
  activePowerUp = null,
  eliminatedOptionIds = [],
  onActivatePowerUp,
}) => {
  const { question, isRevealed, userSelectedOption, isCorrect, pointsEarned, votesDistribution } = quizState;

  if (!question) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-retro-dots">
        <div className="w-16 h-16 bg-neo-yellow text-black border-2 border-black brutal-shadow flex items-center justify-center mb-4 -rotate-3">
          <Sparkles className="w-8 h-8 stroke-black" />
        </div>
        <h3 className="text-2xl font-heavy text-white uppercase tracking-tight mb-2">
          NO ACTIVE QUIZ ROUND
        </h3>
        <p className="text-xs font-mono text-slate-400 max-w-md bg-neo-card p-3 border-2 border-black brutal-shadow-sm">
          {isHost
            ? '> Launch a technical question from the host control panel to start live round.'
            : '> Stand by. The host is queuing the next architecture challenge...'}
        </p>
      </div>
    );
  }

  const totalVotes = Object.values(votesDistribution).reduce((a, b) => a + b, 0);

  const getOptionButtonClass = (optionId: string) => {
    const isSelected = userSelectedOption === optionId;
    const isAnswer = question.correctOptionId === optionId;
    const isEliminated = eliminatedOptionIds.includes(optionId);

    if (isRevealed) {
      if (isAnswer) {
        return 'bg-neo-mint text-black border-2 border-black brutal-shadow-green font-bold ring-2 ring-[#00F59B]';
      }
      if (isSelected && !isAnswer) {
        return 'bg-neo-pink text-white border-2 border-black brutal-shadow-pink font-bold';
      }
      return 'bg-neo-card text-slate-500 border-2 border-slate-800 opacity-60';
    }

    if (isEliminated) {
      return 'bg-black/40 text-slate-600 border-2 border-red-900/40 opacity-40 cursor-not-allowed line-through';
    }

    if (isSelected) {
      return 'bg-neo-yellow text-black border-2 border-black brutal-shadow-yellow font-bold translate-x-px translate-y-px';
    }

    return 'bg-neo-card hover:bg-[#1C202E] text-slate-200 hover:text-white border-2 border-black brutal-shadow hover:-translate-x-px hover:-translate-y-px active:translate-x-0.5 active:translate-y-0.5 active:shadow-none';
  };

  const getOptionBadgeColor = (optionId: string) => {
    if (eliminatedOptionIds.includes(optionId)) {
      return 'bg-slate-800 text-slate-600 border-slate-700';
    }
    switch (optionId) {
      case 'A':
        return 'bg-neo-orange text-black';
      case 'B':
        return 'bg-neo-cyan text-black';
      case 'C':
        return 'bg-neo-purple text-white';
      case 'D':
        return 'bg-neo-yellow text-black';
      default:
        return 'bg-white text-black';
    }
  };

  const timerPercentage = Math.max(0, (timeRemaining / (quizState.totalSeconds || 25)) * 100);

  return (
    <div className={`flex-1 flex flex-col max-w-4xl mx-auto w-full p-3 sm:p-5 pb-24 sm:pb-28 md:pb-6 space-y-4 font-sans ${
      activePowerUp === 'double-down'
        ? 'ring-4 ring-neo-orange/80 rounded-sm'
        : activePowerUp === 'streak-shield'
        ? 'ring-4 ring-neo-purple/80 rounded-sm'
        : activePowerUp === 'time-freeze'
        ? 'ring-4 ring-neo-mint/80 rounded-sm'
        : ''
    }`}>
      {/* Retro Window Top Frame Bar */}
      <div className="bg-neo-card border-2 border-black brutal-shadow-sm px-2.5 sm:px-3.5 py-1.5 sm:py-2 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center space-x-2 min-w-0">
          <div className="flex space-x-1.5 shrink-0">
            <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-neo-pink border border-black" />
            <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-neo-yellow border border-black" />
            <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-neo-mint border border-black" />
          </div>
          <span className="font-mono text-[11px] sm:text-xs font-bold text-slate-400 flex items-center gap-1 pl-1 sm:pl-2 truncate">
            <span className="text-neo-yellow">SYS_ARENA //</span>
            <span className="truncate">{question.category.toUpperCase().replace(/\s+/g, '_')}</span>
          </span>
        </div>

        <div className="flex items-center space-x-1.5 sm:space-x-2 font-mono shrink-0 flex-wrap">
          {/* Active Power-Up Buff Badge */}
          {activePowerUp === 'double-down' && (
            <div className="px-1.5 sm:px-2 py-0.5 bg-neo-orange text-black text-[10px] sm:text-[11px] font-black border border-black brutal-shadow-sm flex items-center gap-1 animate-pulse">
              <Flame className="w-3 h-3 fill-black" />
              <span>2X DOUBLE ACTIVE!</span>
            </div>
          )}
          {activePowerUp === 'streak-shield' && (
            <div className="px-1.5 sm:px-2 py-0.5 bg-neo-purple text-white text-[10px] sm:text-[11px] font-black border border-black brutal-shadow-sm flex items-center gap-1">
              <Shield className="w-3 h-3" />
              <span>SHIELD ACTIVE</span>
            </div>
          )}
          {activePowerUp === 'time-freeze' && (
            <div className="px-1.5 sm:px-2 py-0.5 bg-neo-mint text-black text-[10px] sm:text-[11px] font-black border border-black brutal-shadow-sm flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>FROZEN +5S</span>
            </div>
          )}

          {userStreak > 0 && (
            <div className="px-1.5 sm:px-2 py-0.5 bg-neo-yellow text-black text-[10px] sm:text-[11px] font-extrabold border border-black brutal-shadow-sm flex items-center gap-1">
              <Flame className="w-3 h-3 fill-black" />
              <span>{userStreak}X STREAK</span>
            </div>
          )}

          {/* Digital Countdown Timer */}
          <div
            className={`px-2 sm:px-3 py-0.5 text-[11px] sm:text-xs font-mono font-black border-2 border-black brutal-shadow-sm flex items-center gap-1 sm:gap-1.5 ${
              timeRemaining <= 5 && !isRevealed
                ? 'bg-neo-pink text-white animate-pulse'
                : 'bg-neo-yellow text-black'
            }`}
          >
            <Timer className="w-3 h-3 sm:w-3.5 sm:h-3.5 stroke-[2.5]" />
            <span>{isRevealed ? 'REVEALED' : `${timeRemaining} SEC`}</span>
          </div>
        </div>
      </div>

      {/* Progress Bar (Retro chunky blocks) */}
      {!isRevealed && (
        <div className="w-full h-2 sm:h-2.5 bg-neo-card-darker border-2 border-black brutal-shadow-sm overflow-hidden p-0.5">
          <div
            className={`h-full transition-all duration-300 ease-linear ${
              timeRemaining <= 5 ? 'bg-neo-pink' : 'bg-neo-yellow'
            }`}
            style={{ width: `${timerPercentage}%` }}
          />
        </div>
      )}

      {/* Question Prompt Card */}
      <div className="bg-[#181B26] p-4 sm:p-5 md:p-6 border-2 border-black brutal-shadow-lg relative overflow-hidden">
        {/* Corner Tag */}
        <div className="absolute top-0 right-0 bg-neo-yellow text-black font-mono font-bold text-[9px] sm:text-[10px] uppercase px-2 sm:px-2.5 py-0.5 border-b-2 border-l-2 border-black">
          Q_PROMPT
        </div>

        <h2 className="text-base sm:text-xl md:text-2xl font-heavy text-white uppercase leading-snug sm:leading-tight tracking-tight mt-1">
          {question.question}
        </h2>
      </div>

      {/* 4 Neo-Brutalist Option Cards (A, B, C, D) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
        {question.options.map((option) => {
          const voteCount = votesDistribution[option.id] || 0;
          const votePct = totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0;
          const isSelected = userSelectedOption === option.id;
          const isAnswer = question.correctOptionId === option.id;
          const isEliminated = eliminatedOptionIds.includes(option.id);

          return (
            <button
              key={option.id}
              onClick={() => onSelectOption(option.id)}
              disabled={isRevealed || userSelectedOption !== null || isEliminated}
              className={`p-3.5 sm:p-4 text-left transition-all relative overflow-hidden flex flex-col justify-between min-h-19 sm:min-h-24 ${
                isEliminated ? 'cursor-not-allowed' : 'cursor-pointer active:translate-x-px active:translate-y-px'
              } ${getOptionButtonClass(
                option.id
              )}`}
            >
              {/* Fill bar for vote counts */}
              {(isRevealed || isHost) && (
                <div
                  className={`absolute inset-y-0 left-0 transition-all duration-500 opacity-20 ${
                    isAnswer ? 'bg-black' : 'bg-white'
                  }`}
                  style={{ width: `${votePct}%` }}
                />
              )}

              <div className="flex items-start justify-between relative z-10 gap-2.5 mb-1.5 sm:mb-2">
                <div className="flex items-center space-x-2.5 sm:space-x-3">
                  <span
                    className={`w-6 h-6 sm:w-7 sm:h-7 font-mono text-xs flex items-center justify-center border-2 border-black brutal-shadow-sm shrink-0 font-bold ${getOptionBadgeColor(
                      option.id
                    )}`}
                  >
                    {option.id}
                  </span>
                  <span className={`text-xs sm:text-sm font-bold leading-snug tracking-tight font-display ${
                    isEliminated ? 'line-through text-slate-500' : ''
                  }`}>
                    {option.text}
                  </span>
                </div>

                {isEliminated && (
                  <span className="px-1.5 py-0.5 bg-red-950 text-red-400 border border-red-800 font-mono text-[9px] font-black uppercase shrink-0">
                    PRUNED
                  </span>
                )}
                {isRevealed && isAnswer && (
                  <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-black stroke-3 shrink-0" />
                )}
                {isRevealed && isSelected && !isAnswer && (
                  <XCircle className="w-4 h-4 sm:w-5 sm:h-5 text-white stroke-3 shrink-0" />
                )}
              </div>

              {/* Vote statistics */}
              {(isRevealed || isHost) && (
                <div className="flex justify-between items-center text-[11px] sm:text-xs font-mono font-bold pt-1.5 border-t border-black/30 relative z-10">
                  <span>{voteCount} VOTES</span>
                  <span className="text-xs sm:text-[13px]">{votePct}%</span>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Tactical Quiz Power-Ups Dock (Attendees only) */}
      {!isHost && powerUpInventory && onActivatePowerUp && (
        <QuizPowerUpsBar
          inventory={powerUpInventory}
          activePowerUp={activePowerUp}
          onActivate={onActivatePowerUp}
          disabled={!quizState.isActive || quizState.isRevealed || userSelectedOption !== null}
          userStreak={userStreak}
        />
      )}

      {/* Retro Result & Architecture Takeaway Card */}
      {isRevealed && (
        <div className="bg-neo-cream text-black p-4 sm:p-5 border-2 border-black brutal-shadow-lg space-y-3 animate-fadeIn">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              {userSelectedOption ? (
                isCorrect ? (
                  <span className="px-2.5 sm:px-3 py-1 bg-neo-mint text-black font-mono font-extrabold text-[11px] sm:text-xs uppercase border-2 border-black brutal-shadow-sm flex items-center gap-1.5">
                    <CheckCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-3" />
                    <span>CORRECT! +{pointsEarned} PTS</span>
                  </span>
                ) : (
                  <span className="px-2.5 sm:px-3 py-1 bg-neo-pink text-white font-mono font-extrabold text-[11px] sm:text-xs uppercase border-2 border-black brutal-shadow-sm flex items-center gap-1.5">
                    <XCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-3" />
                    <span>INCORRECT ANSWER</span>
                  </span>
                )
              ) : (
                <span className="px-2.5 sm:px-3 py-1 bg-neo-yellow text-black font-mono font-extrabold text-[11px] sm:text-xs uppercase border-2 border-black brutal-shadow-sm">
                  ANSWER REVEALED
                </span>
              )}
            </div>

            <div className="font-mono font-black text-[11px] sm:text-xs uppercase bg-black text-white px-2 sm:px-2.5 py-1 border border-black">
              CORRECT OPTION: [{question.correctOptionId}]
            </div>
          </div>

          {/* Standard Explanation */}
          <div className="p-3 sm:p-3.5 bg-[#F4EFE0] border-2 border-black font-mono text-xs text-black leading-relaxed">
            <div className="flex items-center space-x-1.5 font-black uppercase text-[10px] sm:text-[11px] mb-1 text-neo-pink">
              <HelpCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-3" />
              <span>ARCHITECTURAL TAKEAWAY:</span>
            </div>
            <p className="font-medium text-slate-900 text-xs sm:text-sm">{question.explanation}</p>
          </div>
        </div>
      )}

      {/* Host Control Actions */}
      {isHost && (
        <div className="flex items-center justify-end flex-wrap gap-2 pt-2">
          {!isRevealed ? (
            <button
              onClick={onRevealAnswer}
              className="w-full sm:w-auto px-4 py-2 bg-neo-yellow hover:bg-[#FFF04D] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none text-black text-xs font-mono font-extrabold uppercase border-2 border-black brutal-shadow transition-all flex items-center justify-center space-x-1.5 cursor-pointer"
            >
              <Eye className="w-4 h-4" />
              <span>REVEAL CORRECT ANSWER</span>
            </button>
          ) : hasNextQuestion && onNextQuestion ? (
            <button
              onClick={onNextQuestion}
              className="w-full sm:w-auto px-5 py-2.5 bg-neo-mint hover:bg-[#26F7A9] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none text-black text-xs font-mono font-extrabold uppercase border-2 border-black brutal-shadow-lg transition-all flex items-center justify-center space-x-2 cursor-pointer"
            >
              <span>NEXT QUESTION</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <div className="flex items-center space-x-2 flex-wrap w-full sm:w-auto justify-end">
              <span className="px-3 py-2 bg-[#1C2030] text-neo-mint border-2 border-black font-mono text-xs font-black uppercase flex items-center space-x-1.5 brutal-shadow-sm">
                <CheckCircle className="w-4 h-4 text-neo-mint stroke-3" />
                <span>QUIZ COMPLETED</span>
              </span>
              {onViewScores && (
                <button
                  onClick={onViewScores}
                  className="px-4 py-2 bg-neo-yellow hover:bg-[#FFF04D] text-black text-xs font-mono font-black uppercase border-2 border-black brutal-shadow transition-all flex items-center space-x-1.5 cursor-pointer"
                >
                  <Trophy className="w-4 h-4" />
                  <span>VIEW LEADERBOARD</span>
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
