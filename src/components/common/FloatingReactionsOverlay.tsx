import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Smile, ChevronDown } from 'lucide-react';
import type { AudienceReaction } from '../../types';
import { RealtimeChannelManager } from '../../lib/realtime/channelManager';
import { playPopSound, playClickSound } from '../../lib/soundFx';

interface ReactionDef {
  emoji: string;
  label: string;
}

const REACTION_LIST: ReactionDef[] = [
  { emoji: '🔥', label: 'Fire' },
  { emoji: '👏', label: 'Applause' },
  { emoji: '💡', label: 'Brilliant' },
  { emoji: '🤯', label: 'Mind Blown' },
  { emoji: '❤️', label: 'Love' },
  { emoji: '🚀', label: 'Rocket' },
];

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
  const [isBarExpanded, setIsBarExpanded] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth >= 640 : false
  );
  const [isOnCooldown, setIsOnCooldown] = useState(false);
  const lastSendTimeRef = useRef<number>(0);
  const seenReactionIdsRef = useRef<Set<string>>(new Set());

  // Spawn particle locally and cleanup after animation with strict de-duplication
  const addParticle = useCallback((reaction: AudienceReaction) => {
    if (!reaction || !reaction.id) return;

    // Strict deduplication: ignore if this exact reaction ID was already processed
    if (seenReactionIdsRef.current.has(reaction.id)) {
      return;
    }
    seenReactionIdsRef.current.add(reaction.id);

    // Auto-clean ID cache after 4 seconds
    setTimeout(() => {
      seenReactionIdsRef.current.delete(reaction.id);
    }, 4000);

    const drift = (Math.random() - 0.5) * 70;
    const newParticle: Particle = { ...reaction, drift };

    // Cap concurrent particles at 20 to maintain silky 60 FPS
    setParticles((prev) => {
      if (prev.some((p) => p.id === reaction.id)) {
        return prev;
      }
      return [...prev.slice(-19), newParticle];
    });

    setTimeout(() => {
      setParticles((prev) => prev.filter((p) => p.id !== reaction.id));
    }, 2400);
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

      // 250ms anti-spam cooldown for responsive, tactile feel
      if (now - lastSendTimeRef.current < 250) {
        return;
      }
      lastSendTimeRef.current = now;
      setIsOnCooldown(true);
      setTimeout(() => {
        setIsOnCooldown(false);
      }, 250);

      playPopSound();
      const id = `react_${now}_${Math.random().toString(36).substring(2, 7)}`;
      // Keep x coordinate between 25% and 80% to avoid extreme edge clipping
      const x = 25 + Math.random() * 55;

      const reaction: AudienceReaction = {
        id,
        emoji,
        x,
        senderName: userName || 'Anonymous',
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
          {particles.map((p) => {
            const isMe =
              userName &&
              p.senderName &&
              p.senderName.trim().toLowerCase() === userName.trim().toLowerCase();

            return (
              <motion.div
                key={p.id}
                initial={{
                  opacity: 0,
                  scale: 0.35,
                  x: `${p.x}vw`,
                  y: '82vh',
                }}
                animate={{
                  opacity: [0, 1, 1, 0.9, 0],
                  scale: [0.35, 1.35, 1.15, 1.0, 0.85],
                  x: [
                    `${p.x}vw`,
                    `${p.x + p.drift * 0.04}vw`,
                    `${p.x + p.drift * 0.08}vw`,
                    `${p.x + p.drift * 0.12}vw`,
                  ],
                  y: ['82vh', '60vh', '38vh', '18vh'],
                  rotate: [0, p.drift > 0 ? 10 : -10, p.drift > 0 ? -6 : 6, 0],
                }}
                exit={{ opacity: 0, scale: 0.6 }}
                transition={{
                  duration: 2.3,
                  ease: [0.22, 1, 0.36, 1],
                  times: [0, 0.15, 0.5, 0.8, 1],
                }}
                style={{
                  willChange: 'transform, opacity',
                  transform: 'translateZ(0)',
                }}
                className="absolute flex flex-col items-center select-none pointer-events-none drop-shadow-[0_8px_20px_rgba(0,0,0,0.6)]"
              >
                {/* Sender Name Pill */}
                {p.senderName && (
                  <div
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-sans font-medium mb-1.5 whitespace-nowrap shadow-md backdrop-blur-md flex items-center gap-1.5 transition-all ${
                      isMe
                        ? 'bg-blue-600/30 text-blue-200 border border-blue-400/40 ring-1 ring-blue-500/20'
                        : 'bg-[#0E0E12]/85 text-zinc-300 border border-white/[0.12]'
                    }`}
                  >
                    <span>{p.senderName}</span>
                    {isMe && (
                      <span className="px-1 py-0.2 bg-blue-500 text-white rounded text-[8px] font-mono font-bold uppercase tracking-wider">
                        YOU
                      </span>
                    )}
                  </div>
                )}
                {/* Floating Emoji */}
                <span className="text-3xl sm:text-4xl select-none filter drop-shadow-[0_4px_12px_rgba(0,0,0,0.4)]">
                  {p.emoji}
                </span>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* 2. Sleek Glassmorphic Reaction Bar */}
      <div className="fixed bottom-[calc(4.75rem+env(safe-area-inset-bottom,0px))] md:bottom-6 right-2.5 sm:right-6 z-30 select-none max-w-[calc(100vw-20px)]">
        <motion.div
          layout
          transition={{ type: 'spring', damping: 28, stiffness: 350 }}
          className="bg-[#0E0E12]/85 backdrop-blur-xl border border-white/[0.08] shadow-[0_8px_32px_rgba(0,0,0,0.5),0_0_20px_rgba(59,130,246,0.08)] rounded-full p-1 sm:p-1.5 flex items-center transition-colors hover:border-white/[0.14]"
        >
          {/* Reaction Toggle Capsule */}
          <motion.button
            type="button"
            whileTap={{ scale: 0.96 }}
            onClick={() => {
              playClickSound();
              setIsBarExpanded(!isBarExpanded);
            }}
            className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full text-zinc-300 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer group"
            title={isBarExpanded ? 'Collapse reactions' : 'Expand reactions'}
          >
            <div className="w-5 h-5 rounded-full bg-blue-500/10 border border-blue-500/25 text-blue-400 flex items-center justify-center shrink-0 group-hover:bg-blue-500/20 group-hover:border-blue-500/35 transition-colors shadow-sm">
              <Smile className="w-3.5 h-3.5" />
            </div>
            <span className="font-sans font-semibold text-xs tracking-wide text-zinc-200">
              Reactions
            </span>
            <motion.div
              animate={{ rotate: isBarExpanded ? 0 : 180 }}
              transition={{ duration: 0.2 }}
              className="text-zinc-500 group-hover:text-zinc-300"
            >
              <ChevronDown className="w-3.5 h-3.5" />
            </motion.div>
          </motion.button>

          {/* Animated Emoji Tray */}
          <AnimatePresence initial={false}>
            {isBarExpanded && (
              <motion.div
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 'auto', opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={{ duration: 0.22, ease: 'easeOut' }}
                className="flex items-center overflow-hidden"
              >
                {/* Hairline Divider */}
                <div className="h-4 w-px bg-white/[0.1] mx-1 sm:mx-1.5 shrink-0" />

                {/* Emoji Action Buttons */}
                <div className="flex items-center space-x-0.5 sm:space-x-1 pr-1">
                  {REACTION_LIST.map(({ emoji, label }) => (
                    <div key={emoji} className="relative group/emoji">
                      <motion.button
                        type="button"
                        whileHover={isOnCooldown ? {} : { scale: 1.25, y: -2 }}
                        whileTap={isOnCooldown ? {} : { scale: 0.85 }}
                        onClick={() => handleSendReaction(emoji)}
                        disabled={isOnCooldown}
                        className={`w-8 h-8 sm:w-8.5 sm:h-8.5 rounded-full flex items-center justify-center text-lg sm:text-xl transition-all cursor-pointer ${
                          isOnCooldown
                            ? 'opacity-40 cursor-not-allowed scale-95'
                            : 'hover:bg-white/[0.08] active:scale-90 hover:shadow-[0_0_12px_rgba(255,255,255,0.15)]'
                        }`}
                        title={label}
                      >
                        {emoji}
                      </motion.button>

                      {/* Tooltip on Hover */}
                      <div className="opacity-0 group-hover/emoji:opacity-100 pointer-events-none transition-all duration-150 transform translate-y-1 group-hover/emoji:translate-y-0 absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-md bg-[#18181D] border border-white/[0.1] text-[10px] font-sans font-medium text-zinc-200 whitespace-nowrap shadow-xl z-50">
                        {label}
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </>
  );
};
