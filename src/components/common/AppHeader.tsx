import React, { useState } from 'react';
import {
  Menu,
  QrCode,
  Copy,
  Check,
  ArrowRightLeft,
  Sun,
  Moon,
} from 'lucide-react';
import { motion } from 'motion/react';
import type { Room, ActiveTabType } from '../../types';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import { SketchCastLogo } from './SketchCastLogo';
import {
  playClickSound,
  playPopSound,
} from '../../lib/soundFx';
import { useTheme } from '../../lib/theme';

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
  const { isDark, toggleTheme } = useTheme();

  const handleCopyCode = () => {
    playPopSound();
    navigator.clipboard.writeText(room.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <header className="flex flex-col bg-paper/95 backdrop-blur-md border-b border-hairline z-40 select-none shrink-0 font-sans relative w-full">
      {/* Studio Noma Top Marquee Ribbon */}
      <div className="marquee">
        <div className="marquee-track">
          <span className="inline-flex items-center"><b>✦</b>Studio Noma × SketchCast / Live Technical Architecture Masterclass</span>
          <span className="inline-flex items-center"><b>✦</b>Room {room.code} • {room.title || 'Interactive Arena'}</span>
          <span className="inline-flex items-center"><b>✦</b>Independent creative engineering / Worldwide</span>
          <span className="inline-flex items-center"><b>✦</b>Studio Noma × SketchCast / Live Technical Architecture Masterclass</span>
          <span className="inline-flex items-center"><b>✦</b>Room {room.code} • {room.title || 'Interactive Arena'}</span>
        </div>
      </div>

      <div className="h-14 sm:h-16 px-3 sm:px-6 md:px-8 flex items-center justify-between gap-2 w-full max-w-full overflow-hidden relative">
        {/* ================= LEFT: Brand & Navigation ================= */}
        <div className="flex items-center space-x-2 sm:space-x-3 shrink-0 min-w-0">
          {/* Mobile Drawer Toggle (< md) */}
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              playPopSound();
              onOpenMobileSidebar?.();
            }}
            className="md:hidden p-2 bg-paper-card hover:bg-paper-elevated text-ink border border-hairline-strong rounded-xl flex items-center justify-center cursor-pointer transition-colors shrink-0 shadow-subtle"
            title="Open Arena Menu"
            aria-label="Open Navigation Menu"
          >
            <Menu className="w-4 h-4" />
          </motion.button>

          {/* Minimalist Studio Noma Brand Logo */}
          <SketchCastLogo size="sm" showWordmark={true} collapsedOnMobile={true} />

          <div className="h-4 w-px bg-hairline-strong hidden sm:block shrink-0" />

          {/* Desktop Room Code Pill */}
          <div className="hidden sm:flex items-center bg-paper-card border border-hairline-strong rounded-full h-8 shrink-0 overflow-hidden text-xs shadow-subtle">
            <button
              onClick={handleCopyCode}
              className="flex items-center space-x-2 px-3 h-full hover:bg-paper-elevated transition-colors text-ink"
              title="Click to copy Room Code"
            >
              <span className="text-muted font-mono text-[10px] font-bold tracking-wider">ROOM</span>
              <span className="font-mono font-bold text-orange tracking-wide text-xs">
                {room.code}
              </span>
              {copied ? (
                <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              ) : (
                <Copy className="w-3.5 h-3.5 text-muted shrink-0" />
              )}
            </button>

            {/* QR Modal Trigger */}
            <button
              onClick={() => {
                playClickSound();
                onOpenQRCode();
              }}
              className="px-2.5 h-full bg-paper-card hover:bg-paper-elevated text-ink border-l border-hairline-strong transition-colors flex items-center gap-1 font-mono font-bold text-[10px] uppercase cursor-pointer"
              title="Open Mobile Join QR Code"
            >
              <QrCode className="w-3.5 h-3.5 text-muted" />
              <span className="hidden xl:inline">QR</span>
            </button>

            {/* Switch Room Trigger */}
            {onOpenChangeRoom && (
              <button
                onClick={() => {
                  playClickSound();
                  onOpenChangeRoom();
                }}
                className="px-2.5 h-full bg-paper-card hover:bg-paper-elevated text-muted hover:text-ink border-l border-hairline-strong transition-colors flex items-center gap-1 font-mono font-bold text-[10px] uppercase cursor-pointer"
                title="Switch to another Arena Room"
              >
                <ArrowRightLeft className="w-3 h-3" />
                <span className="hidden xl:inline">SWITCH</span>
              </button>
            )}
          </div>
        </div>

        {/* ================= RIGHT: Telemetry, Theme, Presence ================= */}
        <div className="flex items-center space-x-1.5 sm:space-x-2.5 shrink-0 min-w-0">
          {/* Theme Mode Switcher */}
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={() => {
              playPopSound();
              toggleTheme();
            }}
            className="h-8 w-8 flex items-center justify-center rounded-full bg-paper-card hover:bg-paper-elevated text-ink border border-hairline-strong transition-colors cursor-pointer shrink-0 shadow-subtle"
            title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            aria-label={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {isDark ? (
              <Sun className="w-3.5 h-3.5 text-lime" />
            ) : (
              <Moon className="w-3.5 h-3.5 text-orange" />
            )}
          </motion.button>

          {/* Live Online Presence Indicator */}
          <button
            onClick={() => {
              playClickSound();
              onOpenActiveAttendees?.();
            }}
            className="hidden sm:flex h-8 items-center space-x-2 px-3 bg-paper-card hover:bg-paper-elevated text-ink border border-hairline-strong rounded-full text-xs font-mono font-medium transition-all cursor-pointer shrink-0 shadow-subtle"
            title="View live participants"
          >
            <span className="pulse shrink-0" />
            <span className="text-xs whitespace-nowrap font-bold">
              {Math.max(1, activeViewerCount)} <span className="text-muted font-normal lowercase hidden lg:inline">online</span>
            </span>
          </button>

          {/* Mobile QR Button (< sm) */}
          <button
            onClick={() => {
              playClickSound();
              onOpenQRCode();
            }}
            className="sm:hidden h-8 w-8 flex items-center justify-center rounded-full bg-paper-card hover:bg-paper-elevated text-ink border border-hairline-strong transition-colors cursor-pointer shrink-0 active:scale-95 shadow-subtle"
            title="Open Room QR Code"
            aria-label="Open Room QR Code"
          >
            <QrCode className="w-3.5 h-3.5 text-muted" />
          </button>
        </div>
      </div>
    </header>
  );
};
