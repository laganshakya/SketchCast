import React, { useEffect } from 'react';
import { Trophy, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import type { SpotlightWinner } from '../../types';
import { playSuccessFanfare, playClickSound } from '../../lib/soundFx';

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
  useEffect(() => {
    if (isOpen && winner) {
      playSuccessFanfare();
    }
  }, [isOpen, winner]);

  return (
    <AnimatePresence>
      {isOpen && winner && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/90 backdrop-blur-md font-sans select-none"
        >
          <motion.div
            initial={{ scale: 0.8, rotate: -2, y: 20, opacity: 0 }}
            animate={{ scale: 1, rotate: 0, y: 0, opacity: 1 }}
            exit={{ scale: 0.8, rotate: 2, y: 20, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 450, damping: 25 }}
            className="bg-neo-yellow text-black w-full max-w-md p-5 sm:p-7 border-4 border-black brutal-shadow-lg relative text-center"
          >
            {/* Close Button */}
            <motion.button
              whileHover={{ scale: 1.15 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => {
                playClickSound();
                onClose();
              }}
              className="absolute top-3 right-3 p-1.5 bg-black text-white hover:bg-neo-pink border-2 border-black cursor-pointer z-10"
              title="Close announcement"
            >
              <X className="w-4 h-4 stroke-3" />
            </motion.button>

            {/* Big Trophy Icon */}
            <motion.div
              animate={{ y: [0, -8, 0] }}
              transition={{ repeat: Infinity, duration: 1.6, ease: 'easeInOut' }}
              className="w-16 h-16 sm:w-20 sm:h-20 bg-black text-neo-yellow border-4 border-black brutal-shadow mx-auto mb-4 flex items-center justify-center"
            >
              <Trophy className="w-9 h-9 sm:w-12 sm:h-12 fill-neo-yellow" />
            </motion.div>

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
            <motion.button
              type="button"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => {
                playClickSound();
                onClose();
              }}
              className="w-full py-3 bg-black hover:bg-slate-900 text-white font-mono text-xs sm:text-sm font-black uppercase border-2 border-black brutal-shadow transition-all cursor-pointer"
            >
              {isMe ? 'CLAIM SPOTLIGHT & CONTINUE 🚀' : 'AWESOME! 👏'}
            </motion.button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
