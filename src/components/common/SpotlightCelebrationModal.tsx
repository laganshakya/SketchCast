import React from 'react';
import { Trophy, X } from 'lucide-react';
import type { SpotlightWinner } from '../../types';

interface SpotlightCelebrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  winner: SpotlightWinner | null;
  isMe: boolean;
}

export const SpotlightCelebrationModal: React.FC<SpotlightCelebrationModalProps> = ({
  isOpen,
  onClose,
  winner,
  isMe,
}) => {
  if (!isOpen || !winner) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/90 backdrop-blur-md animate-fadeIn font-sans select-none">
      <div className="bg-neo-yellow text-black w-full max-w-md p-5 sm:p-7 border-4 border-black brutal-shadow-lg relative text-center">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-1.5 bg-black text-white hover:bg-neo-pink border-2 border-black cursor-pointer z-10"
          title="Close announcement"
        >
          <X className="w-4 h-4 stroke-3" />
        </button>

        {/* Big Trophy Icon */}
        <div className="w-16 h-16 sm:w-20 sm:h-20 bg-black text-neo-yellow border-4 border-black brutal-shadow mx-auto mb-4 flex items-center justify-center animate-bounce">
          <Trophy className="w-9 h-9 sm:w-12 sm:h-12 fill-neo-yellow" />
        </div>

        {/* Title */}
        <div className="space-y-1 mb-4">
          <div className="inline-block px-2.5 py-0.5 bg-black text-neo-mint font-mono text-[10px] sm:text-xs font-black uppercase border border-black">
            {isMe ? '🎉 YOU ARE IN THE SPOTLIGHT!' : '👑 STAGE SPOTLIGHT WINNER'}
          </div>
          <h2 className="text-xl sm:text-2xl font-heavy uppercase tracking-tight text-black wrap-break-word leading-tight">
            {winner.targetName} {isMe ? '(YOU!)' : ''}
          </h2>
        </div>

        {/* Perk Card */}
        {winner.rewardPerk && (
          <div className="p-3.5 bg-white border-3 border-black brutal-shadow-sm mb-5 text-left font-mono space-y-1">
            <div className="flex items-center space-x-2">
              <span className="text-2xl">{winner.rewardIcon || '🎁'}</span>
              <div>
                <div className="text-[10px] text-slate-500 font-bold uppercase">AWARDED STAGE REWARD:</div>
                <div className="text-xs sm:text-sm font-heavy text-black uppercase">
                  {winner.rewardPerk}
                </div>
              </div>
            </div>
            {winner.rewardDesc && (
              <p className="text-[11px] text-slate-700 font-medium pl-8">
                {winner.rewardDesc}
              </p>
            )}
          </div>
        )}

        <div className="text-xs font-mono text-slate-800 font-bold mb-4">
          Spun by host <span className="underline font-black">{winner.spunBy}</span> on the Live Keynote Wheel
        </div>

        {/* Dismiss Button */}
        <button
          type="button"
          onClick={onClose}
          className="w-full py-3 bg-black hover:bg-slate-900 text-white font-mono text-xs sm:text-sm font-black uppercase border-2 border-black brutal-shadow active:translate-x-px active:translate-y-px transition-all cursor-pointer"
        >
          {isMe ? 'CLAIM SPOTLIGHT & CONTINUE 🚀' : 'AWESOME! 👏'}
        </button>
      </div>
    </div>
  );
};
