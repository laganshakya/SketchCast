import React, { useState } from 'react';
import {
  Menu,
  QrCode,
  Copy,
  Check,
  Zap,
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
    <header className="flex flex-col bg-[#0A0A0C]/90 backdrop-blur-xl border-b border-white/[0.08] z-40 select-none shrink-0 font-sans relative w-full">
      <div className="h-14 sm:h-16 px-3 sm:px-6 flex items-center justify-between gap-3 w-full relative">
        {/* ================= LEFT: Navigation & Brand ================= */}
        <div className="flex items-center space-x-2.5 sm:space-x-4 shrink-0 min-w-0">
          {/* Mobile Drawer Toggle (< md) */}
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              playPopSound();
              onOpenMobileSidebar?.();
            }}
            className="md:hidden p-2 bg-white/[0.04] hover:bg-white/[0.08] text-white border border-white/[0.08] rounded-lg flex items-center justify-center cursor-pointer transition-colors shrink-0"
            title="Open Arena Menu"
            aria-label="Open Navigation Menu"
          >
            <Menu className="w-4 h-4" />
          </motion.button>

          {/* Minimalist Brand Logo */}
          <motion.div
            whileTap={{ scale: 0.98 }}
            className="flex items-center space-x-2.5 shrink-0 cursor-pointer"
          >
            <div className="w-8 h-8 bg-[#3B82F6] text-white rounded-lg flex items-center justify-center font-bold text-xs shrink-0 shadow-lg shadow-blue-500/25">
              <Zap className="w-4 h-4 fill-white stroke-white" />
            </div>
            <div className="flex items-baseline space-x-1.5">
              <span className="text-sm sm:text-base font-display font-extrabold tracking-tight text-white uppercase shrink-0">
                SKETCH<span className="text-[#3B82F6]">CAST</span>
              </span>
            </div>
          </motion.div>

          <div className="h-4 w-px bg-white/[0.08] hidden sm:block shrink-0" />

          {/* Desktop Room Code Pill */}
          <div className="hidden sm:flex items-center bg-white/[0.03] border border-white/[0.08] rounded-full h-8 shrink-0 overflow-hidden text-xs">
            <button
              onClick={handleCopyCode}
              className="flex items-center space-x-2 px-3 h-full hover:bg-white/[0.06] transition-colors text-[#FAFAFA]"
              title="Click to copy Room Code"
            >
              <span className="text-[#71717A] text-[11px]">ROOM</span>
              <span className="font-semibold text-[#3B82F6] tracking-wide text-xs">
                {room.code}
              </span>
              {copied ? (
                <Check className="w-3.5 h-3.5 text-[#10B981] shrink-0" />
              ) : (
                <Copy className="w-3.5 h-3.5 text-[#71717A] shrink-0" />
              )}
            </button>

            {/* QR Modal Trigger */}
            <button
              onClick={() => {
                playClickSound();
                onOpenQRCode();
              }}
              className="px-2.5 h-full bg-white/[0.02] hover:bg-white/[0.08] text-[#FAFAFA] border-l border-white/[0.08] transition-colors flex items-center gap-1 font-medium text-[11px] cursor-pointer"
              title="Open Mobile Join QR Code"
            >
              <QrCode className="w-3.5 h-3.5" />
              <span className="hidden xl:inline">QR</span>
            </button>

            {/* Switch Room Trigger */}
            {onOpenChangeRoom && (
              <button
                onClick={() => {
                  playClickSound();
                  onOpenChangeRoom();
                }}
                className="px-2.5 h-full bg-white/[0.02] hover:bg-white/[0.08] text-[#A1A1AA] hover:text-[#FAFAFA] border-l border-white/[0.08] transition-colors flex items-center gap-1 font-medium text-[11px] cursor-pointer"
                title="Switch to another Arena Room"
              >
                <ArrowRightLeft className="w-3 h-3" />
                <span className="hidden xl:inline">SWITCH</span>
              </button>
            )}
          </div>
        </div>

        {/* ================= RIGHT: Telemetry, Audio, Presence ================= */}
        <div className="flex items-center space-x-2 shrink-0 min-w-0">
          {/* Audio Sound Profile Switcher */}
          <button
            onClick={handleToggleAudioPack}
            className="h-8 px-3 flex items-center space-x-1.5 bg-white/[0.03] hover:bg-white/[0.06] text-[#FAFAFA] border border-white/[0.08] rounded-full text-xs font-medium transition-colors cursor-pointer shrink-0"
            title={`Active Sound Pack: ${audioPack.toUpperCase()}`}
          >
            <span className="text-[#3B82F6]">{audioPack === 'arcade' ? '⚡ 8-BIT' : '🎵 HI-FI'}</span>
          </button>

          {/* Mute Audio SFX */}
          <button
            onClick={handleToggleMute}
            className={`h-8 w-8 flex items-center justify-center rounded-full border transition-colors cursor-pointer shrink-0 ${
              muted
                ? 'bg-white/[0.03] text-[#71717A] border-white/[0.08] hover:text-white'
                : 'bg-white/[0.05] text-[#3B82F6] border-[#3B82F6]/40 shadow-sm shadow-blue-500/20'
            }`}
            title={muted ? 'Unmute Sound Effects' : 'Mute Sound Effects'}
          >
            {muted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
          </button>

          {/* Live Online Presence Indicator */}
          <button
            onClick={() => {
              playClickSound();
              onOpenActiveAttendees?.();
            }}
            className="hidden sm:flex h-8 items-center space-x-2 px-3 bg-white/[0.03] hover:bg-white/[0.06] text-[#FAFAFA] border border-white/[0.08] rounded-full text-xs font-medium transition-colors cursor-pointer shrink-0"
            title="View live participants"
          >
            <span className="w-2 h-2 rounded-full bg-[#3B82F6] animate-pulse" />
            <span className="text-xs whitespace-nowrap">
              {Math.max(1, activeViewerCount)} <span className="text-[#71717A] hidden lg:inline">online</span>
            </span>
          </button>

          {/* Mobile Room & QR Pill (< sm) */}
          <div className="sm:hidden flex items-center bg-white/[0.03] border border-white/[0.08] rounded-full h-8 shrink-0 overflow-hidden">
            <button
              onClick={handleCopyCode}
              className="px-2.5 h-full text-xs font-semibold text-[#3B82F6] flex items-center gap-1.5"
              title="Copy Room Code"
            >
              <span>{room.code}</span>
              {copied ? (
                <Check className="w-3 h-3 text-[#10B981] shrink-0" />
              ) : (
                <Copy className="w-3 h-3 text-[#71717A] shrink-0" />
              )}
            </button>
            <button
              onClick={() => {
                playClickSound();
                onOpenQRCode();
              }}
              className="px-2 h-full bg-white/[0.03] text-[#FAFAFA] border-l border-white/[0.08] transition-colors flex items-center cursor-pointer"
              title="Open QR Code"
            >
              <QrCode className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
