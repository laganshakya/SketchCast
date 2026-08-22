import React, { useState } from 'react';
import {
  QrCode,
  Copy,
  Check,
  Crown,
  User,
  Vote,
  Trophy,
  HelpCircle,
  Zap,
  Radio,
  LogOut,
  ShieldAlert,
  Layers,
  ArrowRightLeft
} from 'lucide-react';
import type { Room, ActiveTabType } from '../../types';
import type { User as SupabaseUser } from '@supabase/supabase-js';

interface AppHeaderProps {
  room: Room;
  userName: string;
  setUserName: (name: string) => void;
  userRole: 'host' | 'attendee';
  setUserRole: (role: 'host' | 'attendee') => void;
  activeViewerCount: number;
  activeTab: ActiveTabType;
  setActiveTab: (tab: ActiveTabType) => void;
  questionsCount: number;
  onOpenQRCode: () => void;
  onOpenAuthModal: () => void;
  onOpenChangeRoom?: () => void;
  onOpenActiveAttendees?: () => void;
  onSignOut: () => void;
  currentUser: SupabaseUser | null;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  room,
  userName,
  userRole,
  setUserRole,
  activeViewerCount,
  activeTab,
  setActiveTab,
  questionsCount,
  onOpenQRCode,
  onOpenAuthModal,
  onOpenChangeRoom,
  onOpenActiveAttendees,
  onSignOut,
  currentUser,
}) => {
  const [copied, setCopied] = useState(false);
  const [showHostNotice, setShowHostNotice] = useState(false);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(room.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRoleToggle = () => {
    if (userRole === 'host') {
      setUserRole('attendee');
    } else {
      // Switching to host requires email authenticated session
      if (!currentUser || currentUser.is_anonymous) {
        setShowHostNotice(true);
        setTimeout(() => setShowHostNotice(false), 3000);
        onOpenAuthModal();
      } else {
        setUserRole('host');
      }
    }
  };

  return (
    <header className="flex flex-col bg-[#11131B] border-b-2 border-black z-40 select-none shrink-0 font-sans relative">
      {/* Top Retro Hazard Line */}
      <div className="h-1.5 w-full hazard-stripes" />

      {/* Host Requirement Notice Toast */}
      {showHostNotice && (
        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 z-50 px-3 py-1.5 bg-neo-pink text-white border-2 border-black font-mono text-xs font-bold brutal-shadow flex items-center space-x-2 animate-bounce">
          <ShieldAlert className="w-4 h-4 shrink-0" />
          <span>Host / Admin privileges require email sign in. Opening auth...</span>
        </div>
      )}

      <div className="h-14 sm:h-16 px-2 sm:px-4 md:px-5 flex items-center justify-between gap-1.5 sm:gap-3 max-w-7xl mx-auto w-full">
        {/* Left: Brand Logo & Room Passcode (Desktop) */}
        <div className="flex items-center space-x-1.5 sm:space-x-3 shrink-0 min-w-0">
          {/* Logo */}
          <div className="flex items-center space-x-1 sm:space-x-1.5 shrink-0">
            <div className="w-7 h-7 sm:w-9 sm:h-9 bg-neo-yellow border-2 border-black brutal-shadow-sm flex items-center justify-center font-heavy text-black text-xs sm:text-sm -rotate-2 shrink-0">
              <Zap className="w-3.5 h-3.5 sm:w-5 sm:h-5 fill-black stroke-black" />
            </div>
            <div>
              <div className="flex items-center space-x-1">
                <span className="text-xs sm:text-base md:text-lg font-heavy tracking-tight text-white uppercase shrink-0">
                  SKETCH<span className="text-neo-yellow">CAST</span>
                </span>
                <span className="hidden lg:inline-block px-1.5 py-0.2 bg-neo-pink text-white font-mono text-[9px] font-extrabold uppercase border border-black brutal-shadow-sm">
                  LIVE 2.0
                </span>
              </div>
            </div>
          </div>

          <div className="h-5 w-0.5 bg-slate-800 hidden sm:block" />

          {/* Desktop/Tablet Room Ticket Tag (Hidden on small screens, rendered in right cluster on mobile) */}
          <div className="hidden sm:flex items-center space-x-1 shrink-0">
            <button
              onClick={handleCopyCode}
              className="flex items-center space-x-1 sm:space-x-1.5 px-2 py-1 bg-[#1A1E2B] hover:bg-[#222738] border-2 border-black brutal-shadow-sm transition-all text-xs font-mono group cursor-copy-btn"
              title="Click to copy Room Code"
            >
              <span className="text-slate-400 font-bold text-[10px]">ROOM:</span>
              <span className="font-extrabold text-neo-yellow tracking-wider text-xs">
                {room.code}
              </span>
              {copied ? (
                <Check className="w-3.5 h-3.5 text-neo-mint shrink-0" />
              ) : (
                <Copy className="w-3.5 h-3.5 text-slate-400 group-hover:text-white shrink-0" />
              )}
            </button>

            {onOpenChangeRoom && userRole === 'attendee' && (
              <button
                onClick={onOpenChangeRoom}
                className="flex items-center space-x-1 px-2 py-1 bg-neo-card hover:bg-neo-yellow hover:text-black border-2 border-black brutal-shadow-sm transition-all text-[11px] font-mono font-black uppercase text-slate-300 active:translate-x-px active:translate-y-px cursor-pointer"
                title="Change / Switch Arena Room without logging out"
              >
                <ArrowRightLeft className="w-3 h-3 stroke-[2.5]" />
                <span className="hidden md:inline">SWITCH</span>
              </button>
            )}
          </div>
        </div>

        {/* Center: Neo-Brutalist Navigation Tabs (Desktop / Tablet) */}
        <nav className="hidden md:flex items-center space-x-1.5 bg-[#090B0F] p-1 border-2 border-black brutal-shadow-sm shrink-0">
          <button
            onClick={() => setActiveTab('quiz')}
            className={`px-2.5 lg:px-3 py-1.5 text-xs font-mono font-bold uppercase transition-all flex items-center space-x-1.5 border-2 cursor-pointer ${
              activeTab === 'quiz'
                ? 'bg-neo-yellow text-black border-black brutal-shadow-sm -translate-x-px -translate-y-px'
                : 'border-transparent text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>QUIZ</span>
          </button>

          <button
            onClick={() => setActiveTab('polls')}
            className={`px-2.5 lg:px-3 py-1.5 text-xs font-mono font-bold uppercase transition-all flex items-center space-x-1.5 border-2 cursor-pointer ${
              activeTab === 'polls'
                ? 'bg-neo-pink text-white border-black brutal-shadow-sm -translate-x-px -translate-y-px'
                : 'border-transparent text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Vote className="w-3.5 h-3.5" />
            <span>POLLS</span>
          </button>

          <button
            onClick={() => setActiveTab('qa')}
            className={`px-2.5 lg:px-3 py-1.5 text-xs font-mono font-bold uppercase transition-all flex items-center space-x-1.5 border-2 cursor-pointer ${
              activeTab === 'qa'
                ? 'bg-neo-cyan text-black border-black brutal-shadow-sm -translate-x-px -translate-y-px'
                : 'border-transparent text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Q&A</span>
            {questionsCount > 0 && (
              <span className="ml-1 px-1.5 py-0.2 bg-black text-white text-[10px] font-black rounded-full">
                {questionsCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('leaderboard')}
            className={`px-2.5 lg:px-3 py-1.5 text-xs font-mono font-bold uppercase transition-all flex items-center space-x-1.5 border-2 cursor-pointer ${
              activeTab === 'leaderboard'
                ? 'bg-neo-mint text-black border-black brutal-shadow-sm -translate-x-px -translate-y-px'
                : 'border-transparent text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Trophy className="w-3.5 h-3.5" />
            <span>SCORES</span>
          </button>

          {userRole === 'host' && (
            <button
              onClick={() => setActiveTab('rooms')}
              className={`px-2.5 lg:px-3 py-1.5 text-xs font-mono font-bold uppercase transition-all flex items-center space-x-1.5 border-2 cursor-pointer ${
                activeTab === 'rooms'
                  ? 'bg-neo-yellow text-black border-black brutal-shadow-sm -translate-x-px -translate-y-px'
                  : 'border-transparent text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>ROOMS</span>
            </button>
          )}
        </nav>

        {/* Right Controls: Room Ticket (Mobile), Online Counter, QR, Profile & Sign Out */}
        <div className="flex items-center space-x-1 sm:space-x-2 shrink-0">
          {/* Mobile Room & QR Combo Pill (< sm) */}
          <div className="sm:hidden flex items-center bg-[#1A1E2B] border-2 border-black brutal-shadow-sm shrink-0">
            <button
              onClick={handleCopyCode}
              className="px-1.5 py-1 text-[10px] font-mono font-extrabold text-neo-yellow hover:text-white flex items-center gap-1 cursor-copy-btn"
              title="Click to copy Room Code"
            >
              <span>{room.code}</span>
              {copied ? (
                <Check className="w-3 h-3 text-neo-mint" />
              ) : (
                <Copy className="w-3 h-3 text-slate-400" />
              )}
            </button>
            <button
              onClick={onOpenQRCode}
              className="px-1.5 py-1 bg-neo-cream text-black hover:bg-neo-yellow border-l-2 border-black transition-colors cursor-zoom"
              title="Open Mobile QR Code"
            >
              <QrCode className="w-3 h-3" />
            </button>
          </div>

          {/* Desktop QR Code Button (≥ sm) */}
          <button
            onClick={onOpenQRCode}
            className="hidden sm:flex px-2.5 py-1 bg-neo-cream text-black border-2 border-black brutal-shadow-sm hover:bg-neo-yellow active:translate-x-px active:translate-y-px active:shadow-none text-xs font-mono font-bold items-center space-x-1.5 transition-all cursor-zoom shrink-0"
            title="Open Mobile Join QR Code"
          >
            <QrCode className="w-3.5 h-3.5" />
            <span className="hidden md:inline">JOIN_QR</span>
          </button>

          {/* Live Online Indicator (Admin/Host Only) */}
          {userRole === 'host' && (
            <button
              onClick={onOpenActiveAttendees}
              className="flex items-center space-x-1 px-1.5 sm:px-2 py-1 bg-neo-card-darker hover:bg-[#1C2030] text-neo-mint border-2 border-black brutal-shadow-sm text-xs font-mono font-bold transition-all active:translate-x-px active:translate-y-px cursor-pointer shrink-0"
              title="Click to view live participants & manage room admins"
            >
              <Radio className="w-2.5 h-2.5 sm:w-3 sm:h-3 animate-pulse text-neo-mint shrink-0" />
              <span className="text-[10px] sm:text-[11px] tracking-wide">
                <span className="hidden md:inline">{Math.max(1, activeViewerCount)} ONLINE</span>
                <span className="md:hidden">{Math.max(1, activeViewerCount)}</span>
              </span>
            </button>
          )}

          {/* Role and Name Pill */}
          <div className="flex items-center space-x-1 sm:space-x-1.5 bg-neo-card border-2 border-black brutal-shadow-sm px-1.5 sm:px-2 py-1 text-xs font-mono max-w-19 xs:max-w-25 sm:max-w-37.5 shrink-0">
            <button
              onClick={handleRoleToggle}
              className={`flex items-center gap-0.5 font-extrabold uppercase text-[9px] sm:text-[10px] px-1 py-0.5 border border-black cursor-pointer shrink-0 ${
                userRole === 'host' ? 'bg-neo-yellow text-black' : 'bg-slate-700 text-slate-200'
              }`}
              title={`Role: ${userRole}. Click to toggle.`}
            >
              {userRole === 'host' ? <Crown className="w-2.5 h-2.5 sm:w-3 sm:h-3" /> : <User className="w-2.5 h-2.5 sm:w-3 sm:h-3" />}
              <span className="hidden md:inline">{userRole}</span>
            </button>

            <button
              onClick={onOpenAuthModal}
              className="text-slate-200 hover:text-neo-yellow font-bold truncate text-[10px] sm:text-[11px] cursor-pointer"
              title="Click to view profile & auth details"
            >
              {userName}
            </button>
          </div>

          {/* Sign Out Button */}
          <button
            onClick={onSignOut}
            className="p-1 sm:p-1.5 bg-neo-card hover:bg-neo-pink text-slate-400 hover:text-white border-2 border-black brutal-shadow-sm active:translate-x-px active:translate-y-px active:shadow-none transition-all cursor-pointer shrink-0"
            title="Sign out & return to landing page"
          >
            <LogOut className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
          </button>
        </div>
      </div>
    </header>
  );
};
