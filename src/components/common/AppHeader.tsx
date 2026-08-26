import React, { useState, useRef, useEffect } from 'react';
import {
  QrCode,
  Copy,
  Check,
  Crown,
  Vote,
  Trophy,
  HelpCircle,
  Zap,
  Radio,
  LogOut,
  ShieldAlert,
  Layers,
  ArrowRightLeft,
  FileText,
  X,
  Bot,
  Settings,
  RotateCw,
  ChevronDown,
  Wrench,
} from 'lucide-react';
import type { Room, ActiveTabType } from '../../types';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import { isUserRoomAdmin } from '../../lib/supabase';

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
  onOpenAISettings?: () => void;
  onOpenAISummary?: () => void;
  onOpenSpotlightRoulette?: () => void;
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
  onOpenAISettings,
  onOpenAISummary,
  onOpenSpotlightRoulette,
  onSignOut,
  currentUser,
}) => {
  const [copied, setCopied] = useState(false);
  const [showHostNotice, setShowHostNotice] = useState(false);
  const [hostNoticeMessage, setHostNoticeMessage] = useState<string>('');
  const [isHostStudioOpen, setIsHostStudioOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const hostStudioRef = useRef<HTMLDivElement>(null);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click or Escape key
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (hostStudioRef.current && !hostStudioRef.current.contains(target)) {
        setIsHostStudioOpen(false);
      }
      if (profileMenuRef.current && !profileMenuRef.current.contains(target)) {
        setIsProfileMenuOpen(false);
      }
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(target)) {
        setIsMobileMenuOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsHostStudioOpen(false);
        setIsProfileMenuOpen(false);
        setIsMobileMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(room.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRoleToggle = () => {
    if (userRole === 'host') {
      setUserRole('attendee');
    } else {
      // Switching to host requires email authenticated session and room admin permissions
      if (!currentUser || currentUser.is_anonymous) {
        setHostNoticeMessage('Host / Admin privileges require email sign in. Opening auth...');
        setShowHostNotice(true);
        setTimeout(() => setShowHostNotice(false), 3000);
        onOpenAuthModal();
      } else {
        const isAuthorized = isUserRoomAdmin(room, currentUser, userName);
        if (isAuthorized) {
          setUserRole('host');
        } else {
          setHostNoticeMessage(`Access restricted: You are an attendee in Room [${room.code}]. Only the room owner or co-admins can access Host mode.`);
          setShowHostNotice(true);
          setTimeout(() => setShowHostNotice(false), 4000);
        }
      }
    }
  };

  return (
    <header className="flex flex-col bg-[#11131B] border-b-2 border-black z-40 select-none shrink-0 font-sans relative w-full">
      {/* Top Retro Hazard Line */}
      <div className="h-1.5 w-full hazard-stripes" />

      {/* Host Requirement Notice Toast */}
      {showHostNotice && (
        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 z-50 px-3.5 py-2 bg-neo-pink text-white border-2 border-black font-mono text-xs font-bold brutal-shadow flex items-center space-x-2 animate-bounce max-w-md text-center">
          <ShieldAlert className="w-4 h-4 shrink-0" />
          <span>{hostNoticeMessage || 'Host / Admin privileges require verified ownership.'}</span>
        </div>
      )}

      <div className="h-14 sm:h-15 px-2.5 sm:px-4 flex items-center justify-between gap-2 sm:gap-4 w-full relative">
        {/* ================= LEFT: Brand & Unified Room Badge ================= */}
        <div className="flex items-center space-x-2 sm:space-x-3 shrink-0 min-w-0">
          {/* Logo */}
          <div className="flex items-center space-x-1.5 shrink-0">
            <div className="w-7 h-7 sm:w-8 sm:h-8 bg-neo-yellow border-2 border-black brutal-shadow-sm flex items-center justify-center font-heavy text-black text-xs sm:text-sm -rotate-2 shrink-0">
              <Zap className="w-4 h-4 fill-black stroke-black" />
            </div>
            <div className="flex items-center space-x-1">
              <span className="text-xs sm:text-sm md:text-base font-heavy tracking-tight text-white uppercase shrink-0">
                SKETCH<span className="text-neo-yellow">CAST</span>
              </span>
            </div>
          </div>

          <div className="h-5 w-0.5 bg-slate-800 hidden sm:block shrink-0" />

          {/* Unified Compact Room & Actions Pill */}
          <div className="hidden sm:flex items-center bg-[#1A1E2B] border-2 border-black brutal-shadow-sm h-8 shrink-0 overflow-hidden font-mono text-xs">
            {/* Copy Code Action */}
            <button
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
            </button>

            {/* QR Modal Trigger */}
            <button
              onClick={onOpenQRCode}
              className="px-2 h-full bg-neo-cream text-black hover:bg-neo-yellow border-l-2 border-black transition-colors flex items-center gap-1 font-bold text-[11px] cursor-pointer"
              title="Open Mobile Join QR Code"
            >
              <QrCode className="w-3.5 h-3.5" />
              <span className="hidden xl:inline">QR</span>
            </button>

            {/* Change / Switch Room Trigger */}
            {onOpenChangeRoom && (
              <button
                onClick={onOpenChangeRoom}
                className="px-2 h-full bg-neo-card hover:bg-neo-pink hover:text-white text-slate-300 border-l-2 border-black transition-colors flex items-center gap-1 font-bold text-[11px] cursor-pointer"
                title="Switch to another Arena Room"
              >
                <ArrowRightLeft className="w-3 h-3 stroke-[2.5]" />
                <span className="hidden xl:inline">SWITCH</span>
              </button>
            )}
          </div>
        </div>

        {/* ================= CENTER: Core Neo-Brutalist Navigation Tabs ================= */}
        <nav className="hidden md:flex items-center space-x-1 bg-[#090B0F] p-0.5 border-2 border-black brutal-shadow-sm shrink-0">
          <button
            onClick={() => setActiveTab('quiz')}
            className={`h-8 px-2.5 lg:px-3 text-xs font-mono font-bold uppercase transition-all flex items-center space-x-1.5 border-2 cursor-pointer ${
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
            className={`h-8 px-2.5 lg:px-3 text-xs font-mono font-bold uppercase transition-all flex items-center space-x-1.5 border-2 cursor-pointer ${
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
            className={`h-8 px-2.5 lg:px-3 text-xs font-mono font-bold uppercase transition-all flex items-center space-x-1.5 border-2 cursor-pointer ${
              activeTab === 'qa'
                ? 'bg-neo-cyan text-black border-black brutal-shadow-sm -translate-x-px -translate-y-px'
                : 'border-transparent text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Q&A</span>
            {questionsCount > 0 && (
              <span className="ml-0.5 px-1.5 py-0.2 bg-black text-white text-[9px] font-black rounded-full">
                {questionsCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('leaderboard')}
            className={`h-8 px-2.5 lg:px-3 text-xs font-mono font-bold uppercase transition-all flex items-center space-x-1.5 border-2 cursor-pointer ${
              activeTab === 'leaderboard'
                ? 'bg-neo-mint text-black border-black brutal-shadow-sm -translate-x-px -translate-y-px'
                : 'border-transparent text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Trophy className="w-3.5 h-3.5" />
            <span>SCORES</span>
          </button>
        </nav>

        {/* ================= RIGHT: Presence, Host Studio & Profile ================= */}
        <div className="hidden md:flex items-center space-x-2 shrink-0 min-w-0">
          {/* Live Online Indicator */}
          <button
            onClick={onOpenActiveAttendees}
            className="h-8 flex items-center space-x-1.5 px-2.5 bg-[#141824] hover:bg-[#1E2436] text-neo-mint border-2 border-black brutal-shadow-sm text-xs font-mono font-bold transition-all active:translate-x-px active:translate-y-px cursor-pointer shrink-0"
            title="Click to view live participants & manage room admins"
          >
            <Radio className="w-3 h-3 animate-pulse text-neo-mint shrink-0" />
            <span className="text-xs tracking-wide whitespace-nowrap">
              {Math.max(1, activeViewerCount)} <span className="hidden lg:inline">ONLINE</span>
            </span>
          </button>

          {/* Unified Host Studio Dropdown (Exclusively for Host) */}
          {userRole === 'host' && (
            <div className="relative" ref={hostStudioRef}>
              <button
                onClick={() => setIsHostStudioOpen(!isHostStudioOpen)}
                className={`h-8 px-2.5 border-2 border-black brutal-shadow-sm font-mono text-xs font-black flex items-center space-x-1.5 transition-all active:translate-x-px active:translate-y-px cursor-pointer ${
                  isHostStudioOpen
                    ? 'bg-neo-yellow text-black -translate-x-px -translate-y-px'
                    : 'bg-neo-yellow hover:bg-[#FFE600] text-black'
                }`}
                title="Host Stage & AI Studio Tools"
              >
                <Wrench className="w-3.5 h-3.5 stroke-[2.5]" />
                <span className="hidden lg:inline">HOST STUDIO</span>
                <span className="lg:hidden">STUDIO</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isHostStudioOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Host Studio Dropdown Menu Popover */}
              {isHostStudioOpen && (
                <div className="absolute top-10 right-0 w-64 bg-[#141722] border-3 border-black brutal-shadow-lg p-2 space-y-1.5 z-50 font-mono text-xs animate-fadeIn">
                  <div className="px-2 py-1 border-b border-slate-700/80 flex items-center justify-between text-[10px] text-slate-400 font-extrabold uppercase">
                    <span>STAGE CONTROLS & AI</span>
                    <span className="px-1.5 py-0.2 bg-neo-yellow text-black border border-black font-black text-[9px]">
                      HOST
                    </span>
                  </div>

                  {/* 1. AI Settings */}
                  {onOpenAISettings && (
                    <button
                      onClick={() => {
                        setIsHostStudioOpen(false);
                        onOpenAISettings();
                      }}
                      className="w-full p-2 bg-[#1C2030] hover:bg-neo-pink hover:text-white text-slate-200 border-2 border-black brutal-shadow-sm transition-all flex items-center space-x-2.5 text-left cursor-pointer group"
                    >
                      <div className="w-7 h-7 bg-neo-pink text-white border border-black flex items-center justify-center shrink-0">
                        <Bot className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-heavy text-[11px] uppercase group-hover:text-white">AI ENGINE SETTINGS</div>
                        <div className="text-[9px] text-slate-400 group-hover:text-slate-100 truncate">Mesh API key & LLM models</div>
                      </div>
                    </button>
                  )}

                  {/* 2. AI Summary Report */}
                  {onOpenAISummary && (
                    <button
                      onClick={() => {
                        setIsHostStudioOpen(false);
                        onOpenAISummary();
                      }}
                      className="w-full p-2 bg-[#1C2030] hover:bg-neo-yellow hover:text-black text-slate-200 border-2 border-black brutal-shadow-sm transition-all flex items-center space-x-2.5 text-left cursor-pointer group"
                    >
                      <div className="w-7 h-7 bg-neo-yellow text-black border border-black flex items-center justify-center shrink-0">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-heavy text-[11px] uppercase group-hover:text-black">MASTERCLASS REPORT</div>
                        <div className="text-[9px] text-slate-400 group-hover:text-slate-900 truncate">Instant AI session synthesis</div>
                      </div>
                    </button>
                  )}

                  {/* 3. Attendee Spotlight Roulette */}
                  {onOpenSpotlightRoulette && (
                    <button
                      onClick={() => {
                        setIsHostStudioOpen(false);
                        onOpenSpotlightRoulette();
                      }}
                      className="w-full p-2 bg-[#1C2030] hover:bg-neo-cyan hover:text-black text-slate-200 border-2 border-black brutal-shadow-sm transition-all flex items-center space-x-2.5 text-left cursor-pointer group"
                    >
                      <div className="w-7 h-7 bg-neo-cyan text-black border border-black flex items-center justify-center shrink-0">
                        <RotateCw className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-heavy text-[11px] uppercase group-hover:text-black">ATTENDEE ROULETTE</div>
                        <div className="text-[9px] text-slate-400 group-hover:text-slate-900 truncate">Live stage giveaway wheel</div>
                      </div>
                    </button>
                  )}

                  {/* 4. Rooms Admin Hub */}
                  <button
                    onClick={() => {
                      setIsHostStudioOpen(false);
                      setActiveTab('rooms');
                    }}
                    className="w-full p-2 bg-[#1C2030] hover:bg-neo-mint hover:text-black text-slate-200 border-2 border-black brutal-shadow-sm transition-all flex items-center space-x-2.5 text-left cursor-pointer group"
                  >
                    <div className="w-7 h-7 bg-neo-mint text-black border border-black flex items-center justify-center shrink-0">
                      <Layers className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-heavy text-[11px] uppercase group-hover:text-black">ROOMS HUB</div>
                      <div className="text-[9px] text-slate-400 group-hover:text-slate-900 truncate">Manage broadcast arenas</div>
                    </div>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* User Profile & Account Dropdown */}
          <div className="relative" ref={profileMenuRef}>
            <button
              onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
              className="h-8 flex items-center space-x-1.5 bg-[#1A1E2B] hover:bg-[#252B3D] border-2 border-black brutal-shadow-sm px-2 text-xs font-mono cursor-pointer transition-all active:translate-x-px active:translate-y-px shrink min-w-0 max-w-40 lg:max-w-48"
              title="User Profile & Account Settings"
            >
              <span
                className={`px-1 py-0.2 text-[9px] font-black uppercase border border-black shrink-0 ${
                  userRole === 'host' ? 'bg-neo-yellow text-black' : 'bg-neo-cyan text-black'
                }`}
              >
                {userRole === 'host' ? 'HOST' : 'GUEST'}
              </span>
              <span className="text-slate-200 font-bold truncate text-xs">{userName}</span>
              <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${isProfileMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Profile Dropdown Popover */}
            {isProfileMenuOpen && (
              <div className="absolute top-10 right-0 w-56 bg-[#141722] border-3 border-black brutal-shadow-lg p-2 space-y-1.5 z-50 font-mono text-xs animate-fadeIn">
                <div className="p-2 bg-[#0C0E14] border-2 border-black space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] text-slate-400 font-bold uppercase">SIGNED IN AS</span>
                    <span className="px-1 py-0.1 bg-neo-mint text-black font-black text-[9px] border border-black">
                      ACTIVE
                    </span>
                  </div>
                  <div className="font-heavy text-white truncate text-xs">{userName}</div>
                  <div className="text-[10px] text-slate-400 truncate font-sans">{currentUser?.email || 'Guest Participant'}</div>
                </div>

                <button
                  onClick={() => {
                    setIsProfileMenuOpen(false);
                    onOpenAuthModal();
                  }}
                  className="w-full p-2 bg-[#1C2030] hover:bg-neo-yellow hover:text-black text-slate-200 border-2 border-black brutal-shadow-sm flex items-center space-x-2 text-xs font-bold cursor-pointer transition-colors text-left"
                >
                  <Settings className="w-3.5 h-3.5 shrink-0" />
                  <span>Profile & Auth</span>
                </button>

                <button
                  onClick={() => {
                    setIsProfileMenuOpen(false);
                    handleRoleToggle();
                  }}
                  className="w-full p-2 bg-[#1C2030] hover:bg-neo-cyan hover:text-black text-slate-200 border-2 border-black brutal-shadow-sm flex items-center space-x-2 text-xs font-bold cursor-pointer transition-colors text-left"
                >
                  <Crown className="w-3.5 h-3.5 shrink-0" />
                  <span>Toggle Role ({userRole === 'host' ? 'Attendee' : 'Host'})</span>
                </button>

                <button
                  onClick={() => {
                    setIsProfileMenuOpen(false);
                    onSignOut();
                  }}
                  className="w-full p-2 bg-neo-pink/20 hover:bg-neo-pink text-neo-pink hover:text-white border-2 border-neo-pink/60 hover:border-black flex items-center space-x-2 text-xs font-bold cursor-pointer transition-colors text-left"
                >
                  <LogOut className="w-3.5 h-3.5 shrink-0" />
                  <span>Log Out</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ================= COMPACT MOBILE CONTROLS (< md) ================= */}
        <div className="md:hidden flex items-center space-x-1.5 shrink-0 min-w-0" ref={mobileMenuRef}>
          {/* Mobile Room & QR Combo Pill */}
          <div className="flex items-center bg-[#1A1E2B] border-2 border-black brutal-shadow-sm h-8 shrink-0">
            <button
              onClick={handleCopyCode}
              className="px-1.5 h-full text-[10px] font-mono font-extrabold text-neo-yellow hover:text-white flex items-center gap-1 cursor-copy-btn"
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
              className="px-1.5 h-full bg-neo-cream text-black hover:bg-neo-yellow border-l-2 border-black transition-colors cursor-zoom flex items-center"
              title="Open Mobile QR Code"
            >
              <QrCode className="w-3 h-3" />
            </button>
          </div>

          {/* Unified Mobile Menu Trigger */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className={`h-8 flex items-center space-x-1 border-2 border-black brutal-shadow-sm px-2 text-[10px] sm:text-[11px] font-mono shrink min-w-0 max-w-32 xs:max-w-40 transition-all active:translate-x-px active:translate-y-px cursor-pointer ${
              isMobileMenuOpen
                ? 'bg-neo-yellow text-black'
                : 'bg-neo-card hover:bg-[#1E2230] text-slate-200'
            }`}
            title="Profile & Arena Settings"
          >
            <span
              className={`p-0.5 border border-black shrink-0 ${
                userRole === 'host' ? 'bg-neo-yellow text-black' : 'bg-slate-700 text-slate-200'
              }`}
            >
              {userRole === 'host' ? <Crown className="w-2.5 h-2.5 text-black" /> : <Settings className="w-2.5 h-2.5 text-slate-200" />}
            </span>
            <span className="text-slate-200 truncate font-bold">{userName}</span>
            <ChevronDown className={`w-3 h-3 shrink-0 ${isMobileMenuOpen ? 'rotate-180' : ''} transition-transform`} />
          </button>

          {/* Mobile Quick-Menu Dropdown Popover */}
          {isMobileMenuOpen && (
            <div className="absolute top-13 right-2 w-68 bg-neo-dark border-3 border-black brutal-shadow-lg p-2.5 space-y-2 z-50 font-mono text-xs animate-fadeIn">
              {/* Dropdown Header Info */}
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <div className="flex items-center space-x-1.5 min-w-0">
                  <span className={`px-1.5 py-0.2 text-[9px] font-black uppercase border border-black ${
                    userRole === 'host' ? 'bg-neo-yellow text-black' : 'bg-neo-cyan text-black'
                  }`}>
                    {userRole.toUpperCase()}
                  </span>
                  <span className="text-slate-300 font-bold text-[11px] truncate">
                    ROOM: {room.code}
                  </span>
                </div>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 border border-transparent hover:border-black cursor-pointer"
                  title="Close Menu"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Host Quick Actions */}
              {userRole === 'host' && (
                <div className="space-y-1.5">
                  <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block px-1">HOST STUDIO</span>
                  {onOpenAISettings && (
                    <button
                      onClick={() => {
                        setIsMobileMenuOpen(false);
                        onOpenAISettings();
                      }}
                      className="w-full py-2 px-2.5 bg-neo-pink hover:bg-[#FF4782] text-white border-2 border-black brutal-shadow-sm font-black flex items-center space-x-2 text-[11px] uppercase cursor-pointer text-left transition-all active:translate-x-px active:translate-y-px"
                    >
                      <Bot className="w-4 h-4 shrink-0" />
                      <span>AI ENGINE SETTINGS</span>
                    </button>
                  )}

                  {onOpenAISummary && (
                    <button
                      onClick={() => {
                        setIsMobileMenuOpen(false);
                        onOpenAISummary();
                      }}
                      className="w-full py-2 px-2.5 bg-neo-yellow hover:bg-[#FFF04D] text-black border-2 border-black brutal-shadow-sm font-black flex items-center space-x-2 text-[11px] uppercase cursor-pointer text-left transition-all active:translate-x-px active:translate-y-px"
                    >
                      <FileText className="w-4 h-4 shrink-0" />
                      <span>MASTERCLASS REPORT</span>
                    </button>
                  )}

                  {onOpenSpotlightRoulette && (
                    <button
                      onClick={() => {
                        setIsMobileMenuOpen(false);
                        onOpenSpotlightRoulette();
                      }}
                      className="w-full py-2 px-2.5 bg-neo-cyan hover:bg-[#33F3FF] text-black border-2 border-black brutal-shadow-sm font-black flex items-center space-x-2 text-[11px] uppercase cursor-pointer text-left transition-all active:translate-x-px active:translate-y-px"
                    >
                      <RotateCw className="w-4 h-4 shrink-0" />
                      <span>SPOTLIGHT ROULETTE</span>
                    </button>
                  )}

                  <button
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      setActiveTab('rooms');
                    }}
                    className="w-full py-2 px-2.5 bg-neo-mint hover:bg-[#00F59B] text-black border-2 border-black brutal-shadow-sm font-black flex items-center space-x-2 text-[11px] uppercase cursor-pointer text-left transition-all active:translate-x-px active:translate-y-px"
                  >
                    <Layers className="w-4 h-4 shrink-0" />
                    <span>ROOMS HUB</span>
                  </button>
                </div>
              )}

              {/* General Actions */}
              <div className="pt-2 border-t border-slate-800 space-y-1.5">
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    onOpenAuthModal();
                  }}
                  className="w-full py-1.5 px-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold flex items-center justify-between text-[11px] cursor-pointer"
                >
                  <span className="flex items-center space-x-1.5">
                    <Settings className="w-3.5 h-3.5 text-slate-400" />
                    <span>Account Settings</span>
                  </span>
                  <span className="text-[10px] text-neo-yellow">{userName}</span>
                </button>

                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    handleRoleToggle();
                  }}
                  className="w-full py-1.5 px-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold flex items-center justify-between text-[11px] cursor-pointer"
                >
                  <span className="flex items-center space-x-1.5">
                    <Crown className="w-3.5 h-3.5 text-neo-yellow" />
                    <span>Switch Role</span>
                  </span>
                  <span className="text-[10px] text-slate-400 uppercase">Now: {userRole}</span>
                </button>

                {onOpenChangeRoom && (
                  <button
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      onOpenChangeRoom();
                    }}
                    className="w-full py-1.5 px-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold flex items-center space-x-1.5 text-[11px] cursor-pointer"
                  >
                    <ArrowRightLeft className="w-3.5 h-3.5 text-neo-mint" />
                    <span>Switch Arena Room</span>
                  </button>
                )}

                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    onSignOut();
                  }}
                  className="w-full py-1.5 px-2 bg-neo-pink/20 hover:bg-neo-pink text-neo-pink hover:text-white border border-neo-pink/50 font-bold flex items-center space-x-1.5 text-[11px] cursor-pointer transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Log Out & Exit</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
