import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Smile, ChevronUp, ChevronDown } from 'lucide-react';
import type { AudienceReaction } from '../../types';
import { RealtimeChannelManager } from '../../lib/realtime/channelManager';
import { playPopSound } from '../../lib/soundFx';

const REACTION_EMOJIS = ['🔥', '👏', '💡', '🤯', '❤️', '🚀'];

interface FloatingReactionsOverlayProps {
  channelManager: RealtimeChannelManager | null;
  userName: string;
}

interface Particle extends AudienceReaction {
  drift: number;
}

export const FloatingReactionsOverlay: React.FC<FloatingReactionsOverlayProps> = ({
  channelManager,
  userName,
}) => {
  const [particles, setParticles] = useState<Particle[]>([]);
  const [isBarExpanded, setIsBarExpanded] = useState(true);
  const [isOnCooldown, setIsOnCooldown] = useState(false);
  const lastSendTimeRef = useRef<number>(0);
  const seenReactionIdsRef = useRef<Set<string>>(new Set());

  // Spawn particle locally and cleanup after animation with strict de-duplication
  const addParticle = useCallback((reaction: AudienceReaction) => {
    if (!reaction || !reaction.id) return;

    // Strict deduplication: ignore if this exact reaction ID was already processed
    // (Prevents duplicate spawns from optimistic UI + emitLocal + Supabase self-broadcast)
    if (seenReactionIdsRef.current.has(reaction.id)) {
      return;
    }
    seenReactionIdsRef.current.add(reaction.id);

    // Auto-clean ID after 4 seconds
    setTimeout(() => {
      seenReactionIdsRef.current.delete(reaction.id);
    }, 4000);

    const drift = (Math.random() - 0.5) * 60;
    const newParticle: Particle = { ...reaction, drift };

    // Cap concurrent particles at 16 to maintain 60 FPS under high traffic
    setParticles((prev) => {
      if (prev.some((p) => p.id === reaction.id)) {
        return prev;
      }
      return [...prev.slice(-15), newParticle];
    });

    setTimeout(() => {
      setParticles((prev) => prev.filter((p) => p.id !== reaction.id));
    }, 2200);
  }, []);

  // Listen for broadcast reactions from other attendees & host
  useEffect(() => {
    if (!channelManager) return;

    const unReaction = channelManager.on('audience_reaction', (reaction) => {
      addParticle(reaction);
    });

    return () => {
      unReaction();
    };
  }, [channelManager, addParticle]);

  const handleSendReaction = useCallback(
    (emoji: string) => {
      const now = Date.now();

      // 400ms anti-spam cooldown: ignore clicks fired too rapidly
      if (now - lastSendTimeRef.current < 400) {
        return;
      }
      lastSendTimeRef.current = now;
      setIsOnCooldown(true);
      setTimeout(() => {
        setIsOnCooldown(false);
      }, 400);

      playPopSound();
      const id = `react_${now}_${Math.random().toString(36).substring(2, 6)}`;
      // Spread horizontal position between 30% and 85%
      const x = 30 + Math.random() * 55;

      const reaction: AudienceReaction = {
        id,
        emoji,
        x,
        senderName: userName,
        timestamp: now,
      };

      addParticle(reaction);

      if (channelManager) {
        channelManager.broadcast('audience_reaction', reaction);
      }
    },
    [userName, channelManager, addParticle]
  );

  return (
    <>
      {/* 1. Floating Animated Particles Stage */}
      <div className="fixed inset-0 pointer-events-none z-40 overflow-hidden">
        <AnimatePresence>
          {particles.map((p) => (
            <motion.div
              key={p.id}
              initial={{
                opacity: 0,
                scale: 0.5,
                x: `${p.x}vw`,
                y: '85vh',
              }}
              animate={{
                opacity: [0, 1, 1, 0],
                scale: [0.5, 1.3, 1.1, 0.9],
                x: [`${p.x}vw`, `${p.x + p.drift * 0.05}vw`, `${p.x + p.drift * 0.1}vw`],
                y: ['85vh', '60vh', '35vh', '15vh'],
                rotate: [0, p.drift > 0 ? 12 : -12, p.drift > 0 ? -8 : 8, 0],
              }}
              exit={{ opacity: 0 }}
              transition={{
                duration: 2.0,
                ease: 'easeOut',
                times: [0, 0.15, 0.7, 1],
              }}
              style={{
                willChange: 'transform, opacity',
                transform: 'translateZ(0)',
              }}
              className="absolute flex flex-col items-center select-none pointer-events-none"
            >
              {p.senderName && (
                <span className="text-[9px] font-mono font-black uppercase px-1.5 py-0.2 bg-black text-neo-yellow border border-black brutal-shadow-sm mb-0.5 whitespace-nowrap opacity-90">
                  {p.senderName}
                </span>
              )}
              <span className="text-3xl sm:text-4xl select-none">{p.emoji}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* 2. Docked Reaction Bar (Floating above Mobile Bottom Navigation) */}
      <div className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom,0px))] md:bottom-6 right-3 sm:right-6 z-30 font-mono select-none max-w-[calc(100vw-24px)]">
        <div className="bg-neo-cream border-2 sm:border-3 border-black brutal-shadow flex items-center p-1 transition-all">
          <button
            type="button"
            onClick={() => setIsBarExpanded(!isBarExpanded)}
            className="p-1 sm:p-1.5 text-black hover:bg-neo-yellow transition-colors cursor-pointer flex items-center gap-1 text-[10px] sm:text-[11px] font-black uppercase"
            title={isBarExpanded ? 'Collapse reactions' : 'Expand reactions'}
          >
            <Smile className="w-4 h-4 text-black stroke-[2.5]" />
            <span className="hidden sm:inline">REACTIONS</span>
            {isBarExpanded ? (
              <ChevronDown className="w-3.5 h-3.5 stroke-[2.5]" />
            ) : (
              <ChevronUp className="w-3.5 h-3.5 stroke-[2.5]" />
            )}
          </button>

          <AnimatePresence>
            {isBarExpanded && (
              <motion.div
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 'auto', opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                className="flex items-center space-x-1 pl-1 border-l-2 border-black overflow-hidden"
              >
                {REACTION_EMOJIS.map((emoji) => (
                  <motion.button
                    key={emoji}
                    whileHover={isOnCooldown ? {} : { scale: 1.25, y: -2 }}
                    whileTap={isOnCooldown ? {} : { scale: 0.85 }}
                    onClick={() => handleSendReaction(emoji)}
                    disabled={isOnCooldown}
                    className={`w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center text-lg sm:text-xl rounded transition-all select-none ${
                      isOnCooldown
                        ? 'opacity-40 cursor-not-allowed scale-90'
                        : 'hover:bg-white cursor-pointer active:scale-90'
                    }`}
                    title={isOnCooldown ? 'Cooldown active...' : `Send ${emoji} reaction to the room`}
                  >
                    {emoji}
                  </motion.button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </>
  );
};
