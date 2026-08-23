import React, { useState, useRef, useEffect } from 'react';
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
  ArrowRightLeft,
  Sparkles,
  FileText,
  X,
  Bot,
  Settings
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
  onSignOut,
  currentUser,
}) => {
  const [copied, setCopied] = useState(false);
  const [showHostNotice, setShowHostNotice] = useState(false);
  const [hostNoticeMessage, setHostNoticeMessage] = useState<string>('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMobileMenuOpen(false);
      }
    };
    if (isMobileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMobileMenuOpen]);

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

      <div className="h-14 sm:h-15 px-2 sm:px-3 md:px-4 flex items-center justify-between gap-1.5 sm:gap-2.5 w-full relative">
        {/* Left: Brand Logo & Room Passcode */}
        <div className="flex items-center space-x-1.5 sm:space-x-2.5 shrink-0 min-w-0">
          {/* Logo */}
          <div className="flex items-center space-x-1.5 shrink-0">
            <div className="w-7 h-7 sm:w-8 sm:h-8 bg-neo-yellow border-2 border-black brutal-shadow-sm flex items-center justify-center font-heavy text-black text-xs sm:text-sm -rotate-2 shrink-0">
              <Zap className="w-4 h-4 fill-black stroke-black" />
            </div>
            <div className="flex items-center space-x-1">
              <span className="text-xs sm:text-sm md:text-base font-heavy tracking-tight text-white uppercase shrink-0">
                SKETCH<span className="text-neo-yellow">CAST</span>
              </span>
              <span className="hidden xl:inline-block px-1.5 py-0.2 bg-neo-pink text-white font-mono text-[9px] font-extrabold uppercase border border-black brutal-shadow-sm">
                LIVE 2.0
              </span>
            </div>
          </div>

          <div className="h-5 w-0.5 bg-slate-800 hidden sm:block shrink-0" />

          {/* Desktop/Tablet Room Ticket Tag */}
          <div className="hidden sm:flex items-center space-x-1 shrink-0">
            <button
              onClick={handleCopyCode}
              className="h-8 flex items-center space-x-1.5 px-2 bg-[#1A1E2B] hover:bg-[#222738] border-2 border-black brutal-shadow-sm transition-all text-xs font-mono group cursor-copy-btn active:translate-x-px active:translate-y-px"
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

            {onOpenChangeRoom && (
              <button
                onClick={onOpenChangeRoom}
                className="h-8 flex items-center space-x-1 px-2 bg-neo-card hover:bg-neo-yellow hover:text-black border-2 border-black brutal-shadow-sm transition-all text-[11px] font-mono font-black uppercase text-slate-300 active:translate-x-px active:translate-y-px cursor-pointer"
                title="Change / Switch Arena Room without logging out"
              >
                <ArrowRightLeft className="w-3 h-3 stroke-[2.5]" />
                <span className="hidden lg:inline">SWITCH</span>
              </button>
            )}
          </div>
        </div>

        {/* Center: Neo-Brutalist Navigation Tabs (Desktop / Tablet) */}
        <nav className="hidden md:flex items-center space-x-1 bg-[#090B0F] p-0.5 border-2 border-black brutal-shadow-sm shrink-0">
          <button
            onClick={() => setActiveTab('quiz')}
            className={`h-8 px-2 lg:px-2.5 text-[11px] lg:text-xs font-mono font-bold uppercase transition-all flex items-center space-x-1 border-2 cursor-pointer ${
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
            className={`h-8 px-2 lg:px-2.5 text-[11px] lg:text-xs font-mono font-bold uppercase transition-all flex items-center space-x-1 border-2 cursor-pointer ${
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
            className={`h-8 px-2 lg:px-2.5 text-[11px] lg:text-xs font-mono font-bold uppercase transition-all flex items-center space-x-1 border-2 cursor-pointer ${
              activeTab === 'qa'
                ? 'bg-neo-cyan text-black border-black brutal-shadow-sm -translate-x-px -translate-y-px'
                : 'border-transparent text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Q&A</span>
            {questionsCount > 0 && (
              <span className="ml-0.5 px-1 py-0.1 bg-black text-white text-[9px] font-black rounded-full">
                {questionsCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('leaderboard')}
            className={`h-8 px-2 lg:px-2.5 text-[11px] lg:text-xs font-mono font-bold uppercase transition-all flex items-center space-x-1 border-2 cursor-pointer ${
              activeTab === 'leaderboard'
                ? 'bg-neo-mint text-black border-black brutal-shadow-sm -translate-x-px -translate-y-px'
                : 'border-transparent text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Trophy className="w-3.5 h-3.5" />
            <span>SCORES</span>
          </button>

          {(userRole === 'host' || Boolean(currentUser)) && (
            <button
              onClick={() => setActiveTab('rooms')}
              className={`h-8 px-2 lg:px-2.5 text-[11px] lg:text-xs font-mono font-bold uppercase transition-all flex items-center space-x-1 border-2 cursor-pointer ${
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

        {/* ================= DESKTOP / TABLET CONTROLS (≥ md) ================= */}
        <div className="hidden md:flex items-center space-x-1.5 shrink-0 min-w-0">
          {/* Desktop QR Code Button */}
          <button
            onClick={onOpenQRCode}
            className="h-8 px-2 bg-neo-cream text-black border-2 border-black brutal-shadow-sm hover:bg-neo-yellow active:translate-x-px active:translate-y-px active:shadow-none text-xs font-mono font-bold flex items-center space-x-1 transition-all cursor-zoom shrink-0"
            title="Open Mobile Join QR Code"
          >
            <QrCode className="w-3.5 h-3.5" />
            <span className="hidden lg:inline">JOIN_QR</span>
          </button>

          {/* Host AI Tools Group */}
          {userRole === 'host' && (
            <div className="flex items-center space-x-1 shrink-0">
              {onOpenAISettings && (
                <button
                  onClick={onOpenAISettings}
                  className="h-8 px-2 bg-neo-pink hover:bg-[#FF4782] text-white border-2 border-black brutal-shadow-sm text-xs font-mono font-black flex items-center space-x-1 transition-all active:translate-x-px active:translate-y-px cursor-pointer"
                  title="Configure Mesh AI key and models"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span className="hidden lg:inline">AI</span>
                </button>
              )}

              {onOpenAISummary && (
                <button
                  onClick={onOpenAISummary}
                  className="h-8 px-2 bg-neo-yellow hover:bg-[#FFF04D] text-black border-2 border-black brutal-shadow-sm text-xs font-mono font-black flex items-center space-x-1 transition-all active:translate-x-px active:translate-y-px cursor-pointer"
                  title="Generate Masterclass Summary Report with Mesh AI"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span className="hidden lg:inline">REPORT</span>
                </button>
              )}
            </div>
          )}

          {/* Live Online Indicator */}
          <button
            onClick={onOpenActiveAttendees}
            className="h-8 flex items-center space-x-1 px-2 bg-neo-card-darker hover:bg-[#1C2030] text-neo-mint border-2 border-black brutal-shadow-sm text-xs font-mono font-bold transition-all active:translate-x-px active:translate-y-px cursor-pointer shrink-0"
            title="Click to view live participants & manage room admins"
          >
            <Radio className="w-3 h-3 animate-pulse text-neo-mint shrink-0" />
            <span className="text-[11px] tracking-wide whitespace-nowrap">
              <span className="hidden lg:inline">{Math.max(1, activeViewerCount)} ONLINE</span>
              <span className="lg:hidden">{Math.max(1, activeViewerCount)}</span>
            </span>
          </button>

          {/* Role and Name Pill */}
          <div className="h-8 flex items-center space-x-1.5 bg-neo-card border-2 border-black brutal-shadow-sm px-2 text-xs font-mono shrink min-w-0 max-w-37.5 lg:max-w-50">
            <button
              onClick={handleRoleToggle}
              className={`flex items-center gap-0.5 font-extrabold uppercase text-[10px] px-1 py-0.5 border border-black cursor-pointer shrink-0 ${
                userRole === 'host' ? 'bg-neo-yellow text-black' : 'bg-slate-700 text-slate-200'
              }`}
              title={`Role: ${userRole}. Click to toggle.`}
            >
              {userRole === 'host' ? <Crown className="w-3 h-3" /> : <User className="w-3 h-3" />}
              <span className="hidden xl:inline">{userRole}</span>
            </button>

            <button
              onClick={onOpenAuthModal}
              className="text-slate-200 hover:text-neo-yellow font-bold truncate text-[11px] cursor-pointer min-w-0 flex items-center gap-1"
              title={`Profile & Settings: ${userName}. Click to view details.`}
            >
              <span className="truncate">{userName}</span>
              <Settings className="w-2.5 h-2.5 text-slate-400 shrink-0" />
            </button>
          </div>

          {/* Sign Out Button */}
          <button
            onClick={onSignOut}
            className="h-8 w-8 flex items-center justify-center bg-neo-card hover:bg-neo-pink text-slate-400 hover:text-white border-2 border-black brutal-shadow-sm active:translate-x-px active:translate-y-px active:shadow-none transition-all cursor-pointer shrink-0"
            title="Sign out & return to landing page"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* ================= COMPACT MOBILE CONTROLS (< md) ================= */}
        <div className="md:hidden flex items-center space-x-1.5 shrink-0 min-w-0" ref={menuRef}>
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

          {/* Unified Mobile Profile & Settings Trigger */}
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
              {userRole === 'host' ? <Crown className="w-2.5 h-2.5 text-black" /> : <User className="w-2.5 h-2.5 text-slate-200" />}
            </span>
            <span className="text-slate-200 truncate font-bold">{userName}</span>
            <Settings className={`w-3 h-3 shrink-0 ml-0.5 ${isMobileMenuOpen ? 'text-black rotate-45' : 'text-slate-400'} transition-transform`} />
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
                  <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block px-1">HOST TOOLS</span>
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
                </div>
              )}

              {/* Active Players & Room Information */}
              {onOpenActiveAttendees && (
                <div className="pt-1.5 border-t border-slate-800">
                  <button
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      onOpenActiveAttendees();
                    }}
                    className="w-full py-2 px-2.5 bg-neo-mint hover:bg-[#26F7A9] text-black border-2 border-black brutal-shadow-sm font-black flex items-center space-x-2 text-[11px] uppercase cursor-pointer text-left transition-all active:translate-x-px active:translate-y-px"
                  >
                    <Radio className="w-4 h-4 shrink-0" />
                    <span>ACTIVE PLAYERS ({activeViewerCount})</span>
                  </button>
                </div>
              )}

              {/* General & Account Settings */}
              <div className="space-y-1.5 pt-1.5 border-t border-slate-800">
                <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block px-1">SETTINGS & ACCOUNT</span>
                
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    onOpenAuthModal();
                  }}
                  className="w-full py-2 px-2.5 bg-[#1A1E2B] hover:bg-slate-700 text-slate-200 border-2 border-black font-bold flex items-center space-x-2 text-[11px] uppercase cursor-pointer text-left transition-all"
                >
                  <Settings className="w-3.5 h-3.5 text-neo-yellow shrink-0" />
                  <span>ACCOUNT & PROFILE SETTINGS</span>
                </button>

                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    setActiveTab('rooms');
                  }}
                  className="w-full py-2 px-2.5 bg-neo-yellow hover:bg-[#FFF04D] text-black border-2 border-black font-black flex items-center space-x-2 text-[11px] uppercase cursor-pointer text-left transition-all brutal-shadow-sm active:translate-x-px active:translate-y-px"
                >
                  <Crown className="w-3.5 h-3.5 text-black shrink-0" />
                  <span>MY HOST ROOMS HUB</span>
                </button>

                {onOpenChangeRoom && (
                  <button
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      onOpenChangeRoom();
                    }}
                    className="w-full py-1.5 px-2.5 bg-[#1A1E2B] hover:bg-neo-cyan hover:text-black text-slate-200 border-2 border-black font-bold flex items-center space-x-2 text-[11px] uppercase cursor-pointer text-left transition-all"
                  >
                    <ArrowRightLeft className="w-3.5 h-3.5 shrink-0" />
                    <span>SWITCH ARENA ROOM</span>
                  </button>
                )}

                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    onSignOut();
                  }}
                  className="w-full py-1.5 px-2.5 bg-red-600 hover:bg-red-700 text-white border-2 border-black font-black flex items-center space-x-2 text-[11px] uppercase cursor-pointer text-left transition-all"
                >
                  <LogOut className="w-3.5 h-3.5 shrink-0" />
                  <span>SIGN OUT & EXIT</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
