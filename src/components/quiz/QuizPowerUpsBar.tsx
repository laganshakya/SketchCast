import React from 'react';
import { Scissors, Flame, Shield, Clock, Zap } from 'lucide-react';
import { motion } from 'motion/react';
import type { PowerUpType, PowerUpInventory } from '../../types';
import { playPowerUpSound } from '../../lib/soundFx';

interface QuizPowerUpsBarProps {
  inventory: PowerUpInventory;
  activePowerUp: PowerUpType | null;
  onActivate: (type: PowerUpType) => void;
  disabled: boolean;
  userStreak: number;
}

export const QuizPowerUpsBar: React.FC<QuizPowerUpsBarProps> = ({
  inventory,
  activePowerUp,
  onActivate,
  disabled,
}) => {
  const powerUps: Array<{
    id: PowerUpType;
    label: string;
    icon: React.ReactNode;
    description: string;
    colorBg: string;
    colorBorder: string;
    activeBorder: string;
    activeText: string;
  }> = [
    {
      id: '50-50',
      label: '50 / 50',
      icon: <Scissors className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.5]" />,
      description: 'Prunes 2 incorrect options',
      colorBg: 'bg-neo-cyan text-black',
      colorBorder: 'border-black hover:bg-[#33F3FF]',
      activeBorder: 'ring-2 ring-neo-cyan border-black',
      activeText: 'PRUNED!',
    },
    {
      id: 'double-down',
      label: '2X DOUBLE',
      icon: <Flame className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-current stroke-2" />,
      description: '2x Points if correct (-50 if wrong)',
      colorBg: 'bg-neo-orange text-black',
      colorBorder: 'border-black hover:bg-[#FF8833]',
      activeBorder: 'ring-2 ring-neo-orange border-black animate-pulse',
      activeText: '2X ACTIVE!',
    },
    {
      id: 'streak-shield',
      label: 'SHIELD',
      icon: <Shield className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-2" />,
      description: 'Preserves streak on wrong answer',
      colorBg: 'bg-neo-purple text-white',
      colorBorder: 'border-black hover:bg-[#B07AF5]',
      activeBorder: 'ring-2 ring-neo-purple border-black',
      activeText: 'SHIELDED!',
    },
    {
      id: 'time-freeze',
      label: 'TIME +5S',
      icon: <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.5]" />,
      description: 'Freezes countdown for 5 seconds',
      colorBg: 'bg-neo-mint text-black',
      colorBorder: 'border-black hover:bg-[#26F7A9]',
      activeBorder: 'ring-2 ring-neo-mint border-black',
      activeText: 'FROZEN +5S',
    },
  ];

  return (
    <div className="bg-[#151824] border-2 border-black brutal-shadow-sm p-2 sm:p-2.5 space-y-1.5 font-mono">
      <div className="flex items-center justify-between px-0.5">
        <div className="flex items-center space-x-1.5 text-[10px] sm:text-[11px] font-black text-neo-yellow uppercase tracking-wider">
          <Zap className="w-3 h-3 text-neo-yellow fill-neo-yellow" />
          <span>TACTICAL QUIZ POWER-UPS</span>
        </div>
        <span className="text-[9px] text-slate-400 font-bold uppercase hidden xs:inline">
          Single-use per session
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-2">
        {powerUps.map((p) => {
          const count = inventory[p.id] || 0;
          const isActive = activePowerUp === p.id;
          const isUsable = count > 0 && !disabled && !isActive;

          return (
            <motion.button
              key={p.id}
              type="button"
              whileHover={isUsable ? { scale: 1.03, y: -1 } : {}}
              whileTap={isUsable ? { scale: 0.96, y: 1 } : {}}
              onClick={() => {
                if (isUsable) {
                  playPowerUpSound();
                  onActivate(p.id);
                }
              }}
              disabled={!isUsable}
              title={`${p.label}: ${p.description}`}
              className={`p-1.5 sm:p-2 border-2 transition-all flex flex-col items-start justify-between min-h-13.5 sm:min-h-15 text-left relative overflow-hidden group ${
                isActive
                  ? `${p.colorBg} ${p.activeBorder} brutal-shadow-sm scale-[1.02]`
                  : count > 0 && !disabled
                  ? 'bg-[#1C2030] hover:bg-[#22283A] text-slate-200 border-black cursor-pointer'
                  : 'bg-black/40 text-slate-600 border-slate-800 opacity-60 cursor-not-allowed'
              }`}
            >
              {/* Header inside powerup button */}
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center space-x-1">
                  <span className={isActive ? 'text-current' : count > 0 && !disabled ? 'text-neo-yellow' : 'text-slate-600'}>
                    {p.icon}
                  </span>
                  <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-tight">
                    {p.label}
                  </span>
                </div>
                <span
                  className={`text-[8px] sm:text-[9px] font-black px-1 py-0.2 border ${
                    isActive
                      ? 'bg-black text-white border-black animate-pulse'
                      : count > 0
                      ? 'bg-neo-yellow text-black border-black'
                      : 'bg-slate-800 text-slate-500 border-slate-700'
                  }`}
                >
                  {isActive ? 'ACTIVE' : count > 0 ? `${count}x` : 'USED'}
                </span>
              </div>

              {/* Sub-text description */}
              <span className={`text-[8px] leading-tight font-medium mt-1 line-clamp-1 ${
                isActive ? 'text-black font-bold' : 'text-slate-400 group-hover:text-slate-200'
              }`}>
                {isActive ? p.activeText : p.description}
              </span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
};
