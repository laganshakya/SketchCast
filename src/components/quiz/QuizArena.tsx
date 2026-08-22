import React from 'react';
import { Timer, CheckCircle, XCircle, Sparkles, HelpCircle, ArrowRight, Eye, Flame, Terminal } from 'lucide-react';
import type { QuizRoundState } from '../../types';

interface QuizArenaProps {
  quizState: QuizRoundState;
  timeRemaining: number;
  userStreak: number;
  onSelectOption: (optionId: string) => void;
  onRevealAnswer: () => void;
  onNextQuestion?: () => void;
  isHost: boolean;
}

export const QuizArena: React.FC<QuizArenaProps> = ({
  quizState,
  timeRemaining,
  userStreak,
  onSelectOption,
  onRevealAnswer,
  onNextQuestion,
  isHost,
}) => {
  const { question, isRevealed, userSelectedOption, isCorrect, pointsEarned, votesDistribution } = quizState;

  if (!question) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-retro-dots">
        <div className="w-16 h-16 bg-[#FFE600] text-black border-2 border-black brutal-shadow flex items-center justify-center mb-4 rotate-[-3deg]">
          <Sparkles className="w-8 h-8 stroke-black" />
        </div>
        <h3 className="text-2xl font-heavy text-white uppercase font-display tracking-tight mb-2">
          NO ACTIVE QUIZ ROUND
        </h3>
        <p className="text-xs font-mono text-slate-400 max-w-md bg-[#151822] p-3 border-2 border-black brutal-shadow-sm">
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

    if (isRevealed) {
      if (isAnswer) {
        return 'bg-[#00F59B] text-black border-2 border-black brutal-shadow-green font-bold ring-2 ring-[#00F59B]';
      }
      if (isSelected && !isAnswer) {
        return 'bg-[#FF2A6D] text-white border-2 border-black brutal-shadow-pink font-bold';
      }
      return 'bg-[#151822] text-slate-500 border-2 border-slate-800 opacity-60';
    }

    if (isSelected) {
      return 'bg-[#FFE600] text-black border-2 border-black brutal-shadow-yellow font-bold translate-x-[1px] translate-y-[1px]';
    }

    return 'bg-[#151822] hover:bg-[#1C202E] text-slate-200 hover:text-white border-2 border-black brutal-shadow hover:translate-x-[-1px] hover:translate-y-[-1px] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none';
  };

  const getOptionBadgeColor = (optionId: string) => {
    switch (optionId) {
      case 'A':
        return 'bg-[#FF6B35] text-black';
      case 'B':
        return 'bg-[#00F0FF] text-black';
      case 'C':
        return 'bg-[#9B5DE5] text-white';
      case 'D':
        return 'bg-[#FFE600] text-black';
      default:
        return 'bg-white text-black';
    }
  };

  const timerPercentage = Math.max(0, (timeRemaining / (quizState.totalSeconds || 25)) * 100);

  return (
    <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full p-3 sm:p-5 space-y-4 font-sans">
      {/* Retro Window Top Frame Bar */}
      <div className="bg-[#151822] border-2 border-black brutal-shadow-sm px-3.5 py-2 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="flex space-x-1.5">
            <div className="w-3 h-3 rounded-full bg-[#FF2A6D] border border-black" />
            <div className="w-3 h-3 rounded-full bg-[#FFE600] border border-black" />
            <div className="w-3 h-3 rounded-full bg-[#00F59B] border border-black" />
          </div>
          <span className="font-mono text-xs font-bold text-slate-400 flex items-center gap-1 pl-2">
            <Terminal className="w-3 h-3 text-[#FFE600]" />
            <span>SYS_ARENA // {question.category.toUpperCase().replace(/\s+/g, '_')}</span>
          </span>
        </div>

        <div className="flex items-center space-x-2 font-mono">
          {userStreak > 0 && (
            <div className="px-2 py-0.5 bg-[#FF6B35] text-black text-[11px] font-extrabold border border-black brutal-shadow-sm flex items-center gap-1">
              <Flame className="w-3 h-3 fill-black" />
              <span>{userStreak}X STREAK</span>
            </div>
          )}

          {/* Digital Countdown Timer */}
          <div
            className={`px-3 py-0.5 text-xs font-mono font-black border-2 border-black brutal-shadow-sm flex items-center gap-1.5 ${
              timeRemaining <= 5 && !isRevealed
                ? 'bg-[#FF2A6D] text-white animate-pulse'
                : 'bg-[#FFE600] text-black'
            }`}
          >
            <Timer className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>{isRevealed ? 'REVEALED' : `${timeRemaining} SEC`}</span>
          </div>
        </div>
      </div>

      {/* Progress Bar (Retro chunky blocks) */}
      {!isRevealed && (
        <div className="w-full h-2.5 bg-[#0E1017] border-2 border-black brutal-shadow-sm overflow-hidden p-0.5">
          <div
            className={`h-full transition-all duration-300 ease-linear ${
              timeRemaining <= 5 ? 'bg-[#FF2A6D]' : 'bg-[#FFE600]'
            }`}
            style={{ width: `${timerPercentage}%` }}
          />
        </div>
      )}

      {/* Question Prompt Card */}
      <div className="bg-[#181B26] p-5 sm:p-6 border-2 border-black brutal-shadow-lg relative overflow-hidden">
        {/* Corner Tag */}
        <div className="absolute top-0 right-0 bg-[#FFE600] text-black font-mono font-bold text-[10px] uppercase px-2.5 py-0.5 border-b-2 border-l-2 border-black">
          Q_PROMPT
        </div>

        <h2 className="text-lg sm:text-2xl font-heavy text-white uppercase font-display leading-tight tracking-tight mt-1">
          {question.question}
        </h2>
      </div>

      {/* 4 Neo-Brutalist Option Cards (A, B, C, D) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {question.options.map((option) => {
          const voteCount = votesDistribution[option.id] || 0;
          const votePct = totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0;
          const isSelected = userSelectedOption === option.id;
          const isAnswer = question.correctOptionId === option.id;

          return (
            <button
              key={option.id}
              onClick={() => onSelectOption(option.id)}
              disabled={isRevealed || userSelectedOption !== null}
              className={`p-4 text-left transition-all relative overflow-hidden flex flex-col justify-between min-h-[92px] ${getOptionButtonClass(
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

              <div className="flex items-start justify-between relative z-10 gap-3 mb-2">
                <div className="flex items-center space-x-3">
                  <span
                    className={`w-7 h-7 font-mono font-heavy text-xs flex items-center justify-center border-2 border-black brutal-shadow-sm flex-shrink-0 ${getOptionBadgeColor(
                      option.id
                    )}`}
                  >
                    {option.id}
                  </span>
                  <span className="text-sm font-bold leading-snug tracking-tight font-display">
                    {option.text}
                  </span>
                </div>

                {isRevealed && isAnswer && (
                  <CheckCircle className="w-5 h-5 text-black stroke-[3] flex-shrink-0" />
                )}
                {isRevealed && isSelected && !isAnswer && (
                  <XCircle className="w-5 h-5 text-white stroke-[3] flex-shrink-0" />
                )}
              </div>

              {/* Vote statistics */}
              {(isRevealed || isHost) && (
                <div className="flex justify-between items-center text-xs font-mono font-bold pt-1.5 border-t border-black/30 relative z-10">
                  <span>{voteCount} VOTES</span>
                  <span className="text-[13px]">{votePct}%</span>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Retro Result & Architecture Takeaway Card */}
      {isRevealed && (
        <div className="bg-[#FFFDF5] text-black p-5 border-2 border-black brutal-shadow-lg space-y-3 animate-fadeIn">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              {userSelectedOption ? (
                isCorrect ? (
                  <span className="px-3 py-1 bg-[#00F59B] text-black font-mono font-extrabold text-xs uppercase border-2 border-black brutal-shadow-sm flex items-center gap-1.5">
                    <CheckCircle className="w-4 h-4 stroke-[3]" />
                    <span>CORRECT! +{pointsEarned} PTS</span>
                  </span>
                ) : (
                  <span className="px-3 py-1 bg-[#FF2A6D] text-white font-mono font-extrabold text-xs uppercase border-2 border-black brutal-shadow-sm flex items-center gap-1.5">
                    <XCircle className="w-4 h-4 stroke-[3]" />
                    <span>INCORRECT ANSWER</span>
                  </span>
                )
              ) : (
                <span className="px-3 py-1 bg-[#FFE600] text-black font-mono font-extrabold text-xs uppercase border-2 border-black brutal-shadow-sm">
                  ANSWER REVEALED
                </span>
              )}
            </div>

            <div className="font-mono font-black text-xs uppercase bg-black text-white px-2.5 py-1 border border-black">
              CORRECT OPTION: [{question.correctOptionId}]
            </div>
          </div>

          <div className="p-3.5 bg-[#F4EFE0] border-2 border-black font-mono text-xs text-black leading-relaxed">
            <div className="flex items-center space-x-1.5 font-black uppercase text-[11px] mb-1 text-[#FF2A6D]">
              <HelpCircle className="w-4 h-4 stroke-[3]" />
              <span>ARCHITECTURAL TAKEAWAY & PROOF:</span>
            </div>
            <p className="font-medium text-slate-900">{question.explanation}</p>
          </div>
        </div>
      )}

      {/* Host Control Actions */}
      {isHost && (
        <div className="flex items-center justify-end space-x-3 pt-2">
          {!isRevealed ? (
            <button
              onClick={onRevealAnswer}
              className="px-4 py-2 bg-[#FFE600] hover:bg-[#FFF04D] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none text-black text-xs font-mono font-extrabold uppercase border-2 border-black brutal-shadow transition-all flex items-center space-x-1.5"
            >
              <Eye className="w-4 h-4" />
              <span>REVEAL CORRECT ANSWER</span>
            </button>
          ) : (
            onNextQuestion && (
              <button
                onClick={onNextQuestion}
                className="px-5 py-2.5 bg-[#00F59B] hover:bg-[#26F7A9] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none text-black text-xs font-mono font-extrabold uppercase border-2 border-black brutal-shadow-lg transition-all flex items-center space-x-2"
              >
                <span>NEXT QUESTION</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )
          )}
        </div>
      )}
    </div>
  );
};
