import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import {
  X,
  Sparkles,
  Trophy,
  Volume2,
  VolumeX,
  RotateCw,
  UserCheck,
  Users,
  Flame,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import type { AttendeePresence, SpotlightWinner, SpotlightRewardPerk, LeaderboardEntry, Room } from '../../types';
import { playClickTick, playFanfare, isSoundFxMuted, toggleMuteSoundFx, playClickSound, playPopSound } from '../../lib/soundFx';
import { isUserRoomAdmin } from '../../lib/supabase';

interface SpotlightRouletteModalProps {
  isOpen: boolean;
  onClose: () => void;
  attendees: AttendeePresence[];
  leaderboard?: LeaderboardEntry[];
  currentUserName: string;
  room?: Room;
  onSelectWinner?: (winner: SpotlightWinner) => void;
}

const STAGE_PERKS: SpotlightRewardPerk[] = [
  {
    id: 'stage-mic',
    name: 'Stage Mic',
    icon: '🎙️',
    description: 'Unmute & ask live',
    color: '#00F0FF',
  },
  {
    id: 'vip-swag',
    name: 'VIP Swag',
    icon: '🎁',
    description: 'Swag pack prize',
    color: '#FFE600',
  },
  {
    id: 'bonus-points',
    name: '+500 PTS Boost',
    icon: '⚡',
    description: '+500 leaderboard pts',
    color: '#00F59B',
  },
  {
    id: 'honorary-cohost',
    name: 'Co-Host Badge',
    icon: '👑',
    description: 'Spotlight & co-host',
    color: '#FF2A6D',
  },
];

const SLICE_COLORS = [
  '#FFE600', // Yellow
  '#00F59B', // Mint
  '#00F0FF', // Cyan
  '#FF2A6D', // Pink
  '#9B5DE5', // Purple
  '#FF8833', // Orange
  '#FFFFFF', // White
  '#FFD166', // Gold
];

export const SpotlightRouletteModal: React.FC<SpotlightRouletteModalProps> = ({
  isOpen,
  onClose,
  attendees,
  leaderboard = [],
  currentUserName,
  room,
  onSelectWinner,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const [selectedWinner, setSelectedWinner] = useState<AttendeePresence | null>(null);
  const [selectedPerk, setSelectedPerk] = useState<SpotlightRewardPerk>(STAGE_PERKS[0]);
  const [filterMode, setFilterMode] = useState<'all' | 'top5'>('all');
  const [recentWinners, setRecentWinners] = useState<string[]>([]);
  const [muted, setMuted] = useState(isSoundFxMuted());

  // Check if an attendee is the host, co-admin, or admin (excluded from wheel)
  const isExemptStaff = useCallback(
    (att: AttendeePresence) => {
      // 1. Explicit host presence role
      if (att.role === 'host') return true;

      // 2. Matches the active host name running the session
      if (currentUserName && att.name.trim().toLowerCase() === currentUserName.trim().toLowerCase()) {
        return true;
      }

      // 3. Matches room creator / host_name
      if (room?.host_name && att.name.trim().toLowerCase() === room.host_name.trim().toLowerCase()) {
        return true;
      }

      // 4. Matches co-admin list stored in room.admins
      if (
        room?.admins &&
        room.admins.some((adminName) => adminName.trim().toLowerCase() === att.name.trim().toLowerCase())
      ) {
        return true;
      }

      // 5. Supabase room admin checker (checks host email, ID, and admins)
      if (room && isUserRoomAdmin(room, null, att.name)) {
        return true;
      }

      return false;
    },
    [room, currentUserName]
  );

  // Audience roster strictly excluding hosts, admins, and co-admins
  const eligibleAttendees = useMemo(() => {
    return attendees.filter((a) => !isExemptStaff(a));
  }, [attendees, isExemptStaff]);

  // Dynamic attendee roster based on filter mode
  const roster = useMemo(() => {
    let list = eligibleAttendees;
    if (filterMode === 'top5' && leaderboard.length > 0) {
      const topIds = new Set(leaderboard.slice(0, 5).map((e) => e.session_id));
      list = eligibleAttendees.filter((a) => topIds.has(a.session_id));
    }
    // If not enough users in top5, fallback to full eligible audience
    if (list.length < 2) {
      list = eligibleAttendees;
    }
    // Only if there are zero eligible audience members in the room (e.g. host testing alone),
    // supply demo audience members for previewing the wheel
    if (list.length === 0) {
      return [
        { session_id: 'mock-1', name: 'Alex Chen', role: 'attendee' as const, joined_at: 0, last_active: 0 },
        { session_id: 'mock-2', name: 'Jordan Dev', role: 'attendee' as const, joined_at: 0, last_active: 0 },
        { session_id: 'mock-3', name: 'Taylor Code', role: 'attendee' as const, joined_at: 0, last_active: 0 },
      ];
    }
    return list;
  }, [eligibleAttendees, filterMode, leaderboard]);

  const angleRef = useRef<number>(0);
  const velocityRef = useRef<number>(0);
  const animFrameRef = useRef<number | null>(null);
  const lastSliceRef = useRef<number>(-1);

  // Draw the wheel on canvas
  const drawWheel = useCallback(
    (currentAngle: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const numSlices = roster.length;
      const arcSize = (2 * Math.PI) / numSlices;
      const radius = canvas.width / 2;
      const centerX = radius;
      const centerY = radius;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Outer LED ring dots
      const numDots = 24;
      for (let d = 0; d < numDots; d++) {
        const dotAngle = (d * 2 * Math.PI) / numDots;
        const dotX = centerX + (radius - 5) * Math.cos(dotAngle);
        const dotY = centerY + (radius - 5) * Math.sin(dotAngle);
        ctx.beginPath();
        ctx.arc(dotX, dotY, 3, 0, 2 * Math.PI);
        ctx.fillStyle = (d + Math.floor(currentAngle * 5)) % 2 === 0 ? '#FFE600' : '#00F0FF';
        ctx.fill();
      }

      // Slices
      for (let i = 0; i < numSlices; i++) {
        const sliceAngle = currentAngle + i * arcSize;
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, radius - 14, sliceAngle, sliceAngle + arcSize);
        ctx.closePath();

        // Slice background
        ctx.fillStyle = SLICE_COLORS[i % SLICE_COLORS.length];
        ctx.fill();
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = '#000000';
        ctx.stroke();

        // Text label
        ctx.save();
        if (numSlices === 1) {
          ctx.textAlign = 'center';
          ctx.fillStyle = '#000000';
          ctx.font = '900 12px "JetBrains Mono", monospace';
          const nameStr = roster[i].name || 'ATTENDEE';
          const shortName = nameStr.length > 12 ? nameStr.slice(0, 10) + '..' : nameStr;
          ctx.fillText(shortName.toUpperCase(), centerX, centerY - 46);
        } else {
          ctx.translate(centerX, centerY);
          ctx.rotate(sliceAngle + arcSize / 2);
          ctx.textAlign = 'right';
          ctx.fillStyle = '#000000';
          ctx.font = numSlices > 8 ? 'bold 9px "JetBrains Mono", monospace' : 'bold 10px "JetBrains Mono", monospace';
          const maxChars = numSlices > 8 ? 8 : 11;
          const nameStr = roster[i].name || 'ATTENDEE';
          const label = nameStr.length > maxChars ? nameStr.slice(0, maxChars - 2) + '..' : nameStr;
          ctx.fillText(label.toUpperCase(), radius - 24, 3.5);
        }
        ctx.restore();
      }

      // Inner Outer border
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius - 14, 0, 2 * Math.PI);
      ctx.lineWidth = 5;
      ctx.strokeStyle = '#000000';
      ctx.stroke();

      // Center Hub Pin
      ctx.beginPath();
      ctx.arc(centerX, centerY, 26, 0, 2 * Math.PI);
      ctx.fillStyle = '#141724';
      ctx.fill();
      ctx.lineWidth = 4;
      ctx.strokeStyle = '#FFE600';
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(centerX, centerY, 10, 0, 2 * Math.PI);
      ctx.fillStyle = '#FFE600';
      ctx.fill();

      // Top Indicator Arrow (Pointer pointing down at angle 3*PI/2)
      ctx.beginPath();
      ctx.moveTo(centerX - 13, 2);
      ctx.lineTo(centerX + 13, 2);
      ctx.lineTo(centerX, 26);
      ctx.closePath();
      ctx.fillStyle = '#FF2A6D';
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#000000';
      ctx.stroke();
    },
    [roster]
  );

  // Initial draw
  useEffect(() => {
    if (isOpen) {
      drawWheel(angleRef.current);
    }
  }, [isOpen, drawWheel]);

  // Spin animation loop
  const spin = () => {
    if (isSpinning || roster.length === 0) return;
    setIsSpinning(true);
    setSelectedWinner(null);

    // Initial angular velocity: 0.38 to 0.60 rad/frame
    velocityRef.current = 0.42 + Math.random() * 0.22;
    const friction = 0.985 + Math.random() * 0.005; // Decay

    const animate = () => {
      angleRef.current += velocityRef.current;
      velocityRef.current *= friction;

      const numSlices = roster.length;
      const arcSize = (2 * Math.PI) / numSlices;
      const normalizedAngle = (2 * Math.PI - (angleRef.current % (2 * Math.PI)) + (3 * Math.PI) / 2) % (2 * Math.PI);
      const currentSliceIdx = Math.floor(normalizedAngle / arcSize) % numSlices;

      // Play tick on boundary crossing
      if (currentSliceIdx !== lastSliceRef.current) {
        lastSliceRef.current = currentSliceIdx;
        playClickTick(1.0 + velocityRef.current * 2.2);
      }

      drawWheel(angleRef.current);

      if (velocityRef.current > 0.002) {
        animFrameRef.current = requestAnimationFrame(animate);
      } else {
        // Spin complete
        setIsSpinning(false);
        const winner = roster[currentSliceIdx];
        setSelectedWinner(winner);
        setRecentWinners((prev) => [winner.name, ...prev.slice(0, 4)]);
        playFanfare();

        try {
          confetti({
            particleCount: 160,
            spread: 100,
            origin: { y: 0.5 },
            colors: ['#FFE600', '#FF2A6D', '#00F0FF', '#00F59B', '#9B5DE5'],
          });
        } catch {
          // ignore
        }

        if (onSelectWinner && winner) {
          onSelectWinner({
            targetSessionId: winner.session_id,
            targetName: winner.name,
            spunBy: currentUserName,
            perkId: selectedPerk.id,
            rewardPerk: selectedPerk.name,
            rewardIcon: selectedPerk.icon,
            rewardDesc: selectedPerk.description,
            timestamp: Date.now(),
          });
        }
      }
    };

    animFrameRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, []);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-sm font-sans"
        >
          <motion.div
            initial={{ scale: 0.9, y: 15, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.9, y: 15, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 28 }}
            className="bg-neo-cream text-black w-full max-w-xl p-4 sm:p-6 border-4 border-black brutal-shadow-lg relative font-sans max-h-[95vh] overflow-y-auto"
          >
            {/* Close Button */}
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => {
                playClickSound();
                onClose();
              }}
              className="absolute top-3 right-3 sm:top-4 sm:right-4 p-1 sm:p-1.5 bg-black text-white hover:bg-neo-pink transition-colors border-2 border-black cursor-pointer z-10"
              title="Close modal"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5 stroke-3" />
            </motion.button>

            {/* Modal Header */}
            <div className="flex items-start space-x-2.5 sm:space-x-3 mb-3.5 sm:mb-4 pr-8 sm:pr-10">
              <div className="w-9 h-9 sm:w-10 sm:h-10 bg-neo-yellow text-black border-2 border-black brutal-shadow-sm flex items-center justify-center font-heavy shrink-0">
                <Trophy className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2.5]" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="text-base sm:text-lg font-heavy uppercase tracking-tight text-black leading-tight">
                    KEYNOTE SPOTLIGHT ROULETTE 2.0
                  </h3>
                  <span className="px-1.5 py-0.2 bg-black text-neo-yellow font-mono text-[9px] font-black uppercase border border-black">
                    HOST STAGE
                  </span>
                </div>
                <p className="text-[11px] sm:text-xs font-mono text-slate-700 mt-0.5">
                  Spin the stage wheel to grant live keynote perks, mic privileges, or swag to an attendee!
                </p>
              </div>
            </div>

            {/* Filter Roster Mode Tabs */}
            <div className="flex items-center justify-between gap-2 mb-3 bg-[#11131E] p-1 border-2 border-black font-mono text-xs">
              <div className="flex items-center space-x-1">
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    playClickSound();
                    setFilterMode('all');
                  }}
                  className={`px-2.5 py-1 text-[11px] font-black uppercase transition-all cursor-pointer ${
                    filterMode === 'all'
                      ? 'bg-neo-yellow text-black border border-black font-black'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Users className="w-3 h-3 inline mr-1" /> AUDIENCE ({eligibleAttendees.length})
                </motion.button>
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    playClickSound();
                    setFilterMode('top5');
                  }}
                  className={`px-2.5 py-1 text-[11px] font-black uppercase transition-all cursor-pointer ${
                    filterMode === 'top5'
                      ? 'bg-neo-cyan text-black border border-black font-black'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Flame className="w-3 h-3 inline mr-1" /> TOP 5 CONTENDERS
                </motion.button>
              </div>

              <div className="flex items-center space-x-2 pr-1">
                <span className="hidden sm:inline-block px-1.5 py-0.5 bg-black text-neo-mint border border-black text-[9px] font-black uppercase">
                  HOST & ADMINS EXCLUDED
                </span>
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.15 }}
                  whileTap={{ scale: 0.88 }}
                  onClick={() => setMuted(toggleMuteSoundFx())}
                  className="p-1 text-slate-400 hover:text-neo-yellow cursor-pointer"
                  title={muted ? 'Unmute SFX' : 'Mute SFX'}
                >
                  {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </motion.button>
              </div>
            </div>

            {/* Wheel Canvas Area */}
            <div className="flex flex-col items-center justify-center p-3 bg-[#121522] border-2 border-black brutal-shadow-sm relative overflow-hidden mb-3.5">
              <canvas
                ref={canvasRef}
                width={340}
                height={340}
                className="w-64 h-64 sm:w-72 sm:h-72 drop-shadow-[0_6px_16px_rgba(0,0,0,0.8)]"
              />

              <div className="absolute bottom-2 left-2 px-2 py-0.5 bg-black/80 text-neo-mint border border-black font-mono text-[10px] font-bold uppercase flex items-center gap-1">
                <UserCheck className="w-3 h-3" />
                <span>{roster.length} AUDIENCE SLICES (NO HOST/ADMINS)</span>
              </div>
            </div>

            {/* Stage Perk / Reward Selector */}
            <div className="mb-3.5">
              <label className="block text-[11px] font-mono font-black uppercase text-black mb-1.5">
                🎁 ACTIVE KEYNOTE STAGE PERK / REWARD:
              </label>
              <div className="grid grid-cols-2 gap-1.5 font-mono text-xs">
                {STAGE_PERKS.map((perk) => {
                  const isSelected = selectedPerk.id === perk.id;
                  return (
                    <motion.button
                      key={perk.id}
                      type="button"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => {
                        playPopSound();
                        setSelectedPerk(perk);
                      }}
                      className={`p-2 border-2 border-black text-left flex items-start space-x-1.5 transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-black text-white brutal-shadow-sm -translate-x-px -translate-y-px'
                          : 'bg-white hover:bg-slate-100 text-black'
                      }`}
                    >
                      <span className="text-base shrink-0">{perk.icon}</span>
                      <div className="min-w-0">
                        <div className="font-heavy text-[11px] uppercase truncate">{perk.name}</div>
                        <div className={`text-[9px] truncate ${isSelected ? 'text-slate-300' : 'text-slate-600'}`}>
                          {perk.description}
                        </div>
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            </div>

            {/* Recent Winners History */}
            {recentWinners.length > 0 && (
              <div className="mb-3 p-2 bg-[#1A1D2C] border border-black text-slate-300 font-mono text-[10px]">
                <span className="font-black uppercase text-neo-yellow mr-1">RECENT STAGE WINNERS:</span>
                <span className="text-slate-200">{recentWinners.join(', ')}</span>
              </div>
            )}

            {/* Winner Announcement Banner */}
            {selectedWinner && (
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="p-3.5 bg-neo-mint text-black border-2 border-black brutal-shadow-sm mb-3.5 space-y-1 font-mono text-center"
              >
                <div className="flex items-center justify-center space-x-1.5 text-xs font-black uppercase text-black">
                  <Sparkles className="w-4 h-4 stroke-[2.5]" />
                  <span>STAGE SPOTLIGHT WINNER SELECTED!</span>
                </div>
                <div className="text-base sm:text-lg font-heavy text-black uppercase tracking-tight break-all">
                  👑 {selectedWinner.name}
                </div>
                <div className="inline-flex items-center space-x-1 px-2 py-0.5 bg-black text-neo-yellow text-[10px] font-black uppercase border border-black mt-1">
                  <span>{selectedPerk.icon} AWARDED: {selectedPerk.name}</span>
                </div>
              </motion.div>
            )}

            {/* Action Controls */}
            <div className="flex flex-col-reverse xs:flex-row justify-end gap-2 pt-1 font-mono">
              <motion.button
                type="button"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => {
                  playClickSound();
                  onClose();
                }}
                className="w-full xs:w-auto px-4 py-2 text-xs font-bold uppercase border-2 border-black bg-slate-200 hover:bg-slate-300 text-black cursor-pointer text-center"
              >
                CLOSE
              </motion.button>
              <motion.button
                type="button"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.96 }}
                onClick={spin}
                disabled={isSpinning || roster.length === 0}
                className="w-full xs:w-auto px-6 py-2.5 bg-neo-yellow hover:bg-[#FFF04D] disabled:bg-slate-300 disabled:text-slate-500 text-black text-xs font-black uppercase border-2 border-black brutal-shadow flex items-center justify-center space-x-2 cursor-pointer transition-all"
              >
                <RotateCw className={`w-4 h-4 ${isSpinning ? 'animate-spin' : ''}`} />
                <span>{isSpinning ? 'SPINNING ROULETTE...' : '🎰 SPIN THE WHEEL!'}</span>
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
