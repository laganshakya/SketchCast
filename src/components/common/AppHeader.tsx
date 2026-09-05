import React, { useState } from 'react';
import {
  Menu,
  QrCode,
  Copy,
  Check,
  Zap,
  Radio,
  ArrowRightLeft,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { motion } from 'motion/react';
import type { Room, ActiveTabType } from '../../types';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import {
  isAudioMuted,
  toggleAudioMute,
  getAudioPack,
  toggleAudioPack,
  onAudioPackChange,
  playClickSound,
  playPopSound,
  type AudioPackType,
} from '../../lib/soundFx';

interface AppHeaderProps {
  room: Room;
  userName?: string;
  setUserName?: (name: string) => void;
  userRole?: 'host' | 'attendee';
  setUserRole?: (role: 'host' | 'attendee') => void;
  activeViewerCount: number;
  activeTab?: ActiveTabType;
  setActiveTab?: (tab: ActiveTabType) => void;
  questionsCount?: number;
  onOpenQRCode: () => void;
  onOpenAuthModal?: () => void;
  onOpenChangeRoom?: () => void;
  onOpenActiveAttendees?: () => void;
  onOpenAISettings?: () => void;
  onOpenAISummary?: () => void;
  onOpenSpotlightRoulette?: () => void;
  onOpenMobileSidebar?: () => void;
  onSignOut?: () => void;
  currentUser?: SupabaseUser | null;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  room,
  activeViewerCount,
  onOpenQRCode,
  onOpenChangeRoom,
  onOpenActiveAttendees,
  onOpenMobileSidebar,
}) => {
  const [copied, setCopied] = useState(false);
  const [muted, setMuted] = useState(isAudioMuted());
  const [audioPack, setAudioPackState] = useState<AudioPackType>(getAudioPack());

  React.useEffect(() => {
    return onAudioPackChange((nextPack) => {
      setAudioPackState(nextPack);
    });
  }, []);

  const handleToggleAudioPack = () => {
    const next = toggleAudioPack();
    setAudioPackState(next);
    playPopSound();
  };

  const handleToggleMute = () => {
    const next = toggleAudioMute();
    setMuted(next);
    if (!next) {
      playPopSound();
    }
  };

  const handleCopyCode = () => {
    playPopSound();
    navigator.clipboard.writeText(room.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <header className="flex flex-col bg-[#11131B] border-b-2 border-black z-40 select-none shrink-0 font-sans relative w-full overflow-hidden">
      {/* Top Retro Hazard Line */}
      <div className="h-1.5 w-full hazard-stripes shrink-0" />

      <div className="h-14 sm:h-15 px-2 sm:px-4 flex items-center justify-between gap-1.5 sm:gap-4 w-full relative">
        {/* ================= LEFT: Mobile Hamburger, Brand & Room Pill ================= */}
        <div className="flex items-center space-x-1.5 sm:space-x-3 shrink-0 min-w-0">
          {/* Mobile Drawer Toggle Button (< md) */}
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={() => {
              playPopSound();
              onOpenMobileSidebar?.();
            }}
            className="md:hidden p-2 bg-[#1A1E2B] hover:bg-neo-yellow hover:text-black text-white border-2 border-black brutal-shadow-sm flex items-center justify-center cursor-pointer transition-colors shrink-0"
            title="Open Arena Navigation Menu"
            aria-label="Open Navigation Menu"
          >
            <Menu className="w-4 h-4" />
          </motion.button>

          {/* Logo */}
          <motion.div
            whileHover={{ scale: 1.04, rotate: -2 }}
            whileTap={{ scale: 0.95 }}
            className="flex items-center space-x-1.5 shrink-0 cursor-pointer"
          >
            <div className="w-7 h-7 sm:w-8 sm:h-8 bg-neo-yellow border-2 border-black brutal-shadow-sm flex items-center justify-center font-heavy text-black text-xs sm:text-sm -rotate-2 shrink-0">
              <Zap className="w-4 h-4 fill-black stroke-black" />
            </div>
            <div className="flex items-center space-x-1">
              <span className="text-xs sm:text-sm md:text-base font-heavy tracking-tight text-white uppercase shrink-0">
                SKETCH<span className="text-neo-yellow">CAST</span>
              </span>
            </div>
          </motion.div>

          <div className="h-5 w-0.5 bg-slate-800 hidden sm:block shrink-0" />

          {/* Desktop/Tablet Unified Room & Actions Pill (>= sm) */}
          <div className="hidden sm:flex items-center bg-[#1A1E2B] border-2 border-black brutal-shadow-sm h-8 shrink-0 overflow-hidden font-mono text-xs">
            {/* Copy Code Action */}
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleCopyCode}
              className="flex items-center space-x-1.5 px-2.5 h-full hover:bg-[#252B3D] transition-colors cursor-copy-btn text-slate-200"
              title="Click to copy Room Code"
            >
              <span className="text-slate-400 font-bold text-[10px]">ROOM:</span>
              <span className="font-extrabold text-neo-yellow tracking-wider text-xs">
                {room.code}
              </span>
              {copied ? (
                <Check className="w-3.5 h-3.5 text-neo-mint shrink-0" />
              ) : (
                <Copy className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              )}
            </motion.button>

            {/* QR Modal Trigger */}
            <motion.button
              whileTap={{ scale: 0.92 }}
              onClick={() => {
                playClickSound();
                onOpenQRCode();
              }}
              className="px-2 h-full bg-neo-cream text-black hover:bg-neo-yellow border-l-2 border-black transition-colors flex items-center gap-1 font-bold text-[11px] cursor-pointer"
              title="Open Mobile Join QR Code"
            >
              <QrCode className="w-3.5 h-3.5" />
              <span className="hidden xl:inline">QR</span>
            </motion.button>

            {/* Change / Switch Room Trigger */}
            {onOpenChangeRoom && (
              <motion.button
                whileTap={{ scale: 0.92 }}
                onClick={() => {
                  playClickSound();
                  onOpenChangeRoom();
                }}
                className="px-2 h-full bg-neo-card hover:bg-neo-pink hover:text-white text-slate-300 border-l-2 border-black transition-colors flex items-center gap-1 font-bold text-[11px] cursor-pointer"
                title="Switch to another Arena Room"
              >
                <ArrowRightLeft className="w-3 h-3 stroke-[2.5]" />
                <span className="hidden xl:inline">SWITCH</span>
              </motion.button>
            )}
          </div>
        </div>

        {/* ================= RIGHT: Audio, Presence & Mobile Room Pill ================= */}
        <div className="flex items-center space-x-1.5 sm:space-x-2 shrink-0 min-w-0">
          {/* Audio Pack Profile Switcher (8-Bit Arcade vs Modern Hi-Fi) */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.92 }}
            onClick={handleToggleAudioPack}
            className={`h-8 px-2 flex items-center space-x-1 border-2 border-black brutal-shadow-sm font-mono text-[10px] font-black tracking-wider transition-all cursor-pointer shrink-0 ${
              audioPack === 'arcade'
                ? 'bg-neo-yellow text-black hover:bg-yellow-300'
                : 'bg-neo-cyan text-black hover:bg-cyan-300'
            }`}
            title={`Active Sound Pack: ${audioPack.toUpperCase()} (Click to switch to ${audioPack === 'arcade' ? 'Modern Hi-Fi' : '8-Bit Arcade'})`}
          >
            <span>{audioPack === 'arcade' ? '⚡ 8-BIT' : '🎵 HI-FI'}</span>
          </motion.button>

          {/* Tactile Audio SFX Toggle Button */}
          <motion.button
            whileHover={{ scale: 1.06 }}
            whileTap={{ scale: 0.92 }}
            onClick={handleToggleMute}
            className={`h-8 w-8 flex items-center justify-center border-2 border-black brutal-shadow-sm transition-all cursor-pointer shrink-0 ${
              muted
                ? 'bg-[#181B26] text-slate-500 hover:text-slate-300'
                : 'bg-neo-yellow/20 hover:bg-neo-yellow text-neo-yellow hover:text-black border-neo-yellow/50 hover:border-black'
            }`}
            title={muted ? 'Unmute Sound Effects (SFX)' : 'Mute Sound Effects (SFX)'}
          >
            {muted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
          </motion.button>

          {/* Live Online Presence Indicator (>= sm) */}
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              playClickSound();
              onOpenActiveAttendees?.();
            }}
            className="hidden sm:flex h-8 items-center space-x-1.5 px-2.5 bg-[#141824] hover:bg-[#1E2436] text-neo-mint border-2 border-black brutal-shadow-sm text-xs font-mono font-bold transition-all active:translate-x-px active:translate-y-px cursor-pointer shrink-0"
            title="Click to view live participants & manage room admins"
          >
            <Radio className="w-3 h-3 animate-pulse text-neo-mint shrink-0" />
            <span className="text-xs tracking-wide whitespace-nowrap">
              {Math.max(1, activeViewerCount)} <span className="hidden lg:inline">ONLINE</span>
            </span>
          </motion.button>

          {/* Mobile Room & QR Combo Pill (< sm) */}
          <div className="sm:hidden flex items-center bg-[#1A1E2B] border-2 border-black brutal-shadow-sm h-8 shrink-0">
            <button
              onClick={handleCopyCode}
              className="px-2 h-full text-[10px] font-mono font-extrabold text-neo-yellow hover:text-white flex items-center gap-1 cursor-copy-btn"
              title="Click to copy Room Code"
            >
              <span>{room.code}</span>
              {copied ? (
                <Check className="w-3 h-3 text-neo-mint shrink-0" />
              ) : (
                <Copy className="w-3 h-3 text-slate-400 shrink-0" />
              )}
            </button>
            <button
              onClick={() => {
                playClickSound();
                onOpenQRCode();
              }}
              className="px-2 h-full bg-neo-cream text-black hover:bg-neo-yellow border-l-2 border-black transition-colors flex items-center cursor-pointer"
              title="Open Mobile QR Code"
            >
              <QrCode className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
