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
  Layers
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
    <header className="flex flex-col bg-[#11131B] border-b-2 border-black z-40 select-none flex-shrink-0 font-sans relative">
      {/* Top Retro Hazard Line */}
      <div className="h-1.5 w-full hazard-stripes" />

      {/* Host Requirement Notice Toast */}
      {showHostNotice && (
        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 z-50 px-3 py-1.5 bg-[#FF2A6D] text-white border-2 border-black font-mono text-xs font-bold brutal-shadow flex items-center space-x-2 animate-bounce">
          <ShieldAlert className="w-4 h-4 flex-shrink-0" />
          <span>Host / Admin privileges require email sign in. Opening auth...</span>
        </div>
      )}

      <div className="h-16 px-3 sm:px-5 flex items-center justify-between gap-3">
        {/* Left: Brand Logo & Room Passcode */}
        <div className="flex items-center space-x-3">
          {/* Logo */}
          <div className="flex items-center space-x-2">
            <div className="w-9 h-9 bg-[#FFE600] border-2 border-black brutal-shadow-sm flex items-center justify-center font-heavy text-black text-sm rotate-[-2deg]">
              <Zap className="w-5 h-5 fill-black stroke-black" />
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="text-base sm:text-lg font-heavy tracking-tight text-white uppercase font-display">
                  SKETCH<span className="text-[#FFE600]">CAST</span>
                </span>
                <span className="hidden sm:inline-block px-1.5 py-0.5 bg-[#FF2A6D] text-white font-mono text-[9px] font-extrabold uppercase border border-black brutal-shadow-sm">
                  LIVE 2.0
                </span>
              </div>
            </div>
          </div>

          <div className="h-6 w-[2px] bg-slate-800 hidden md:block" />

          {/* Room Ticket Tag */}
          <button
            onClick={handleCopyCode}
            className="flex items-center space-x-1.5 px-2.5 py-1 bg-[#1A1E2B] hover:bg-[#222738] border-2 border-black brutal-shadow-sm transition-all text-xs font-mono group"
            title="Click to copy Room Code"
          >
            <span className="text-slate-400 font-bold text-[10px]">ROOM:</span>
            <span className="font-extrabold text-[#FFE600] tracking-wider text-xs">
              {room.code}
            </span>
            {copied ? (
              <Check className="w-3.5 h-3.5 text-[#00F59B]" />
            ) : (
              <Copy className="w-3.5 h-3.5 text-slate-400 group-hover:text-white" />
            )}
          </button>

          {/* Live Indicator */}
          <div className="hidden lg:flex items-center space-x-1.5 px-2.5 py-1 bg-[#0E1017] border-2 border-black brutal-shadow-sm text-xs font-mono font-bold text-[#00F59B]">
            <Radio className="w-3.5 h-3.5 animate-pulse text-[#00F59B]" />
            <span className="text-[11px]">{Math.max(1, activeViewerCount)} ONLINE</span>
          </div>
        </div>

        {/* Center: Neo-Brutalist Navigation Tabs */}
        <nav className="hidden md:flex items-center space-x-1.5 bg-[#090B0F] p-1 border-2 border-black brutal-shadow-sm">
          <button
            onClick={() => setActiveTab('quiz')}
            className={`px-3 py-1.5 text-xs font-mono font-bold uppercase transition-all flex items-center space-x-1.5 border-2 ${
              activeTab === 'quiz'
                ? 'bg-[#FFE600] text-black border-black brutal-shadow-sm translate-x-[-1px] translate-y-[-1px]'
                : 'bg-transparent text-slate-400 border-transparent hover:text-white hover:bg-[#1A1E2B]'
            }`}
          >
            <Zap className={`w-3.5 h-3.5 ${activeTab === 'quiz' ? 'fill-black' : ''}`} />
            <span>QUIZ ARENA</span>
          </button>

          <button
            onClick={() => setActiveTab('polls')}
            className={`px-3 py-1.5 text-xs font-mono font-bold uppercase transition-all flex items-center space-x-1.5 border-2 ${
              activeTab === 'polls'
                ? 'bg-[#00F0FF] text-black border-black brutal-shadow-sm translate-x-[-1px] translate-y-[-1px]'
                : 'bg-transparent text-slate-400 border-transparent hover:text-white hover:bg-[#1A1E2B]'
            }`}
          >
            <Vote className="w-3.5 h-3.5" />
            <span>LIVE POLLS</span>
          </button>

          <button
            onClick={() => setActiveTab('qa')}
            className={`px-3 py-1.5 text-xs font-mono font-bold uppercase transition-all flex items-center space-x-1.5 border-2 ${
              activeTab === 'qa'
                ? 'bg-[#FF2A6D] text-white border-black brutal-shadow-sm translate-x-[-1px] translate-y-[-1px]'
                : 'bg-transparent text-slate-400 border-transparent hover:text-white hover:bg-[#1A1E2B]'
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Q&A ({questionsCount})</span>
          </button>

          <button
            onClick={() => setActiveTab('leaderboard')}
            className={`px-3 py-1.5 text-xs font-mono font-bold uppercase transition-all flex items-center space-x-1.5 border-2 ${
              activeTab === 'leaderboard'
                ? 'bg-[#00F59B] text-black border-black brutal-shadow-sm translate-x-[-1px] translate-y-[-1px]'
                : 'bg-transparent text-slate-400 border-transparent hover:text-white hover:bg-[#1A1E2B]'
            }`}
          >
            <Trophy className="w-3.5 h-3.5" />
            <span>SCORES</span>
          </button>

          {/* Admin / Host Exclusive: ROOMS TAB */}
          {userRole === 'host' && (
            <button
              onClick={() => setActiveTab('rooms')}
              className={`px-3 py-1.5 text-xs font-mono font-black uppercase transition-all flex items-center space-x-1.5 border-2 ${
                activeTab === 'rooms'
                  ? 'bg-[#9B5DE5] text-white border-black brutal-shadow-sm translate-x-[-1px] translate-y-[-1px]'
                  : 'bg-transparent text-purple-300 border-transparent hover:text-white hover:bg-[#1A1E2B]'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>ROOMS</span>
            </button>
          )}
        </nav>

        {/* Right: QR Code, Profile & Sign Out */}
        <div className="flex items-center space-x-2">
          <button
            onClick={onOpenQRCode}
            className="px-2.5 py-1.5 bg-[#FFFDF5] text-black border-2 border-black brutal-shadow-sm hover:bg-[#FFE600] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none text-xs font-mono font-bold flex items-center space-x-1.5 transition-all"
            title="Open Mobile Join QR Code"
          >
            <QrCode className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">JOIN_QR</span>
          </button>

          {/* Role and Name Pill */}
          <div className="flex items-center space-x-1.5 bg-[#151822] border-2 border-black brutal-shadow-sm px-2.5 py-1 text-xs font-mono">
            <button
              onClick={handleRoleToggle}
              className={`flex items-center gap-1 font-extrabold uppercase text-[10px] px-1.5 py-0.5 border border-black ${
                userRole === 'host' ? 'bg-[#FFE600] text-black' : 'bg-slate-700 text-slate-200'
              }`}
              title={`Click to switch role (Current: ${userRole}). Hosts require verified email account.`}
            >
              {userRole === 'host' ? <Crown className="w-3 h-3" /> : <User className="w-3 h-3" />}
              <span>{userRole}</span>
            </button>

            <button
              onClick={onOpenAuthModal}
              className="text-slate-200 hover:text-[#FFE600] font-bold max-w-[85px] truncate text-[11px]"
              title="Click to view profile & auth details"
            >
              {userName}
            </button>
          </div>

          {/* Sign Out Button */}
          <button
            onClick={onSignOut}
            className="p-1.5 bg-[#151822] hover:bg-[#FF2A6D] text-slate-400 hover:text-white border-2 border-black brutal-shadow-sm active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all"
            title="Sign out & return to landing page"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
