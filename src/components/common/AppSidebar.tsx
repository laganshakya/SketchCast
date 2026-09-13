import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Zap,
  Vote,
  HelpCircle,
  Trophy,
  Layers,
  Bot,
  FileText,
  RotateCw,
  ChevronLeft,
  ChevronRight,
  X,
  Sparkles,
  Lock,
  Crown,
  Settings,
  LogOut,
  ShieldAlert,
  ClipboardList,
  Award,
} from 'lucide-react';
import type { Room, ActiveTabType } from '../../types';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import { isUserRoomAdmin } from '../../lib/supabase';
import { playClickSound, playPopSound, playWhoosh } from '../../lib/soundFx';

export interface AppSidebarProps {
  activeTab: ActiveTabType;
  setActiveTab: (tab: ActiveTabType) => void;
  userRole: 'host' | 'attendee';
  setUserRole: (role: 'host' | 'attendee') => void;
  userName: string;
  room: Room;
  currentUser: SupabaseUser | null;
  questionsCount: number;
  activeSurveysCount?: number;
  hasGeneratedReport?: boolean;
  onOpenAuthModal: () => void;
  onOpenAISettings?: () => void;
  onOpenAISummary?: () => void;
  onOpenSpotlightRoulette?: () => void;
  onOpenCertificate?: () => void;
  onSignOut: () => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
}

export const AppSidebar: React.FC<AppSidebarProps> = ({
  activeTab,
  setActiveTab,
  userRole,
  setUserRole,
  userName,
  room,
  currentUser,
  questionsCount,
  activeSurveysCount,
  hasGeneratedReport = false,
  onOpenAuthModal,
  onOpenAISettings,
  onOpenAISummary,
  onOpenSpotlightRoulette,
  onOpenCertificate,
  onSignOut,
  isOpenMobile,
  onCloseMobile,
}) => {
  // Desktop collapsed state initialized from localStorage
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('sketchcast_sidebar_collapsed');
      return saved === 'true';
    } catch {
      return false;
    }
  });

  const [isCollapsedProfileOpen, setIsCollapsedProfileOpen] = useState(false);
  const [showHostNotice, setShowHostNotice] = useState(false);
  const [hostNoticeMessage, setHostNoticeMessage] = useState('');
  const collapsedProfileRef = useRef<HTMLDivElement>(null);

  const toggleCollapse = () => {
    playClickSound();
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('sketchcast_sidebar_collapsed', String(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  const handleSelectTab = (tab: ActiveTabType) => {
    if (tab !== activeTab) {
      playWhoosh();
      setActiveTab(tab);
    }
    onCloseMobile();
  };

  const handleAction = (action?: () => void) => {
    if (action) {
      playClickSound();
      action();
      onCloseMobile();
    }
  };

  const handleRoleToggle = () => {
    playClickSound();
    if (userRole === 'host') {
      setUserRole('attendee');
    } else {
      if (!currentUser || currentUser.is_anonymous) {
        setHostNoticeMessage('Host privileges require verified sign in. Opening auth...');
        setShowHostNotice(true);
        setTimeout(() => setShowHostNotice(false), 3000);
        onOpenAuthModal();
      } else {
        const isAuthorized = isUserRoomAdmin(room, currentUser, userName);
        if (isAuthorized) {
          setUserRole('host');
        } else {
          setHostNoticeMessage(`Access restricted: Room [${room.code}] requires host permissions.`);
          setShowHostNotice(true);
          setTimeout(() => setShowHostNotice(false), 3500);
        }
      }
    }
  };

  // Close collapsed profile popover on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (collapsedProfileRef.current && !collapsedProfileRef.current.contains(e.target as Node)) {
        setIsCollapsedProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close mobile drawer on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpenMobile) {
        onCloseMobile();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpenMobile, onCloseMobile]);

  // Prevent background scrolling when mobile drawer is open
  useEffect(() => {
    if (isOpenMobile) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpenMobile]);

  // Primary Live Arena Navigation Items
  const arenaNavItems = [
    {
      id: 'quiz' as ActiveTabType,
      label: 'Quiz Arena',
      icon: Zap,
      bgColor: 'bg-neo-yellow',
      textColor: 'text-black',
      badge: null,
      desc: 'Real-time competitive quizzes',
    },
    {
      id: 'polls' as ActiveTabType,
      label: 'Live Polls',
      icon: Vote,
      bgColor: 'bg-neo-pink',
      textColor: 'text-white',
      badge: null,
      desc: 'Instant audience consensus',
    },
    {
      id: 'qa' as ActiveTabType,
      label: 'Q&A Feed',
      icon: HelpCircle,
      bgColor: 'bg-neo-cyan',
      textColor: 'text-black',
      badge: questionsCount > 0 ? questionsCount : null,
      desc: 'Crowd questions & upvotes',
    },
    {
      id: 'leaderboard' as ActiveTabType,
      label: 'Leaderboard',
      icon: Trophy,
      bgColor: 'bg-neo-mint',
      textColor: 'text-black',
      badge: null,
      desc: 'Top players podium & stats',
    },
    {
      id: 'surveys' as ActiveTabType,
      label: 'Surveys',
      icon: ClipboardList,
      bgColor: 'bg-[#FFF04D]',
      textColor: 'text-black',
      badge: activeSurveysCount && activeSurveysCount > 0 ? 'LIVE' : null,
      desc: 'Multi-question audience feedback',
    },
  ];

  // Host Studio & AI Tools Navigation Items
  const hostToolItems = [
    {
      id: 'rooms' as ActiveTabType,
      type: 'tab',
      label: 'Rooms Hub',
      icon: Layers,
      bgColor: 'bg-neo-mint',
      textColor: 'text-black',
      badge: 'HUB',
      desc: 'Manage broadcast arenas',
      requiresHost: false,
      action: () => handleSelectTab('rooms'),
    },
    {
      id: 'ai-settings',
      type: 'action',
      label: 'AI Engine Settings',
      icon: Bot,
      bgColor: 'bg-neo-pink',
      textColor: 'text-white',
      badge: 'AI',
      desc: 'Keys, models & prompts',
      requiresHost: true,
      action: () => handleAction(onOpenAISettings),
    },
    {
      id: 'ai-report',
      type: 'action',
      label: 'Masterclass Report',
      icon: FileText,
      bgColor: 'bg-neo-yellow',
      textColor: 'text-black',
      badge: hasGeneratedReport ? 'READY' : 'DOC',
      desc: hasGeneratedReport ? 'View AI session report' : 'Instant AI session synthesis',
      requiresHost: !hasGeneratedReport,
      action: () => handleAction(onOpenAISummary),
    },
    {
      id: 'spotlight-roulette',
      type: 'action',
      label: 'Spotlight Roulette',
      icon: RotateCw,
      bgColor: 'bg-neo-cyan',
      textColor: 'text-black',
      badge: 'LIVE',
      desc: 'Audience giveaway wheel',
      requiresHost: true,
      action: () => handleAction(onOpenSpotlightRoulette),
    },
    {
      id: 'certificate-pass',
      type: 'action',
      label: 'Masterclass Pass',
      icon: Award,
      bgColor: 'bg-neo-yellow',
      textColor: 'text-black',
      badge: 'PASS',
      desc: 'Verifiable credential & pass',
      requiresHost: false,
      action: () => handleAction(onOpenCertificate),
    },
  ];

  // User avatar initial
  const userInitial = (userName.trim()[0] || 'U').toUpperCase();

  // Core Render Content
  const renderSidebarContent = (mobile: boolean = false) => {
    const collapsed = mobile ? false : isCollapsed;

    return (
      <div className="flex flex-col h-full overflow-hidden font-sans select-none relative">
        {/* Host Requirement Notice Toast */}
        <AnimatePresence>
          {showHostNotice && (
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.95 }}
              className="absolute top-2 inset-x-2 z-50 p-2.5 bg-neo-pink text-white border-2 border-black font-mono text-[11px] font-bold brutal-shadow flex items-center space-x-1.5 text-center shadow-xl"
            >
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>{hostNoticeMessage}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Mobile Header with Logo and Close Button */}
        {mobile && (
          <div className="p-3 border-b-2 border-black bg-[#151926] flex items-center justify-between shrink-0">
            <div className="flex items-center space-x-2">
              <div className="w-7 h-7 bg-neo-yellow border-2 border-black brutal-shadow-sm flex items-center justify-center font-heavy text-black text-xs -rotate-2">
                <Zap className="w-4 h-4 fill-black stroke-black" />
              </div>
              <span className="font-heavy text-sm tracking-tight text-white uppercase font-mono">
                SKETCH<span className="text-neo-yellow">CAST</span>
              </span>
            </div>
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => {
                playPopSound();
                onCloseMobile();
              }}
              className="p-1.5 bg-[#1B2030] hover:bg-neo-pink text-white border-2 border-black brutal-shadow-sm cursor-pointer transition-colors"
              title="Close Menu"
            >
              <X className="w-4 h-4" />
            </motion.button>
          </div>
        )}

        {/* Scrollable Navigation Items */}
        <div className="flex-1 overflow-y-auto no-scrollbar space-y-1">
          {/* Section 1: LIVE ARENA TABS */}
          <div className="p-2 sm:p-2.5 space-y-1.5">
            {!collapsed ? (
              <div className="px-2 py-1 text-[10px] font-mono font-black tracking-wider text-slate-400 uppercase flex items-center justify-between">
                <span>LIVE ARENA</span>
                <span className="text-[9px] text-slate-500 font-mono">V2.0</span>
              </div>
            ) : (
              <div className="h-1.5" />
            )}

            <div className="space-y-1">
              {arenaNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;

                return (
                  <motion.button
                    key={item.id}
                    whileHover={{ scale: 1.02, x: collapsed ? 0 : 2 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => handleSelectTab(item.id)}
                    title={collapsed ? `${item.label} (${item.desc})` : undefined}
                    className={`w-full group flex items-center border-2 border-black transition-all cursor-pointer text-left ${
                      collapsed
                        ? 'justify-center p-2 h-11'
                        : 'px-2.5 py-2 space-x-2.5 min-h-10'
                    } ${
                      isActive
                        ? `${item.bgColor} ${item.textColor} brutal-shadow-sm font-black -translate-x-px -translate-y-px`
                        : 'bg-[#151926] hover:bg-[#1E2336] text-slate-300 hover:text-white'
                    }`}
                  >
                    {/* Icon container */}
                    <div className="relative shrink-0 flex items-center justify-center">
                      <div
                        className={`w-7 h-7 flex items-center justify-center border border-black ${
                          isActive
                            ? 'bg-black/20 text-current'
                            : 'bg-[#10131D] text-slate-300 group-hover:text-white'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                      </div>

                      {/* Collapsed view badge indicator */}
                      {collapsed && item.badge !== null && (
                        <span className="absolute -top-1.5 -right-1.5 min-w-4 h-4 px-1 bg-neo-pink text-white font-mono font-black text-[9px] border border-black flex items-center justify-center rounded-full">
                          {item.badge}
                        </span>
                      )}
                    </div>

                    {/* Expanded view label & description */}
                    {!collapsed && (
                      <div className="min-w-0 flex-1 flex items-center justify-between">
                        <div className="min-w-0">
                          <div
                            className={`font-mono text-xs uppercase tracking-wide truncate ${
                              isActive ? 'font-black' : 'font-bold'
                            }`}
                          >
                            {item.label}
                          </div>
                        </div>

                        {/* Question count or active indicator */}
                        {item.badge !== null ? (
                          <span
                            className={`ml-1.5 px-1.5 py-0.5 font-mono text-[9px] font-black border border-black rounded-full shrink-0 ${
                              isActive
                                ? 'bg-black text-white'
                                : 'bg-neo-pink text-white'
                            }`}
                          >
                            {item.badge}
                          </span>
                        ) : isActive ? (
                          <span className="w-1.5 h-1.5 rounded-full bg-black shrink-0" />
                        ) : null}
                      </div>
                    )}
                  </motion.button>
                );
              })}
            </div>
          </div>

          {/* Divider */}
          <div className="px-3 my-0.5">
            <div className="h-px bg-slate-800" />
          </div>

          {/* Section 2: HOST STUDIO & MANAGEMENT */}
          <div className="p-2 sm:p-2.5 space-y-1.5">
            {!collapsed ? (
              <div className="px-2 py-1 text-[10px] font-mono font-black tracking-wider text-slate-400 uppercase flex items-center justify-between">
                <span>HOST STUDIO & AI</span>
                {userRole === 'host' ? (
                  <span className="px-1 py-0.2 bg-neo-yellow text-black border border-black text-[8px] font-black">
                    HOST
                  </span>
                ) : (
                  <span className="px-1 py-0.2 bg-slate-800 text-slate-400 border border-slate-700 text-[8px] font-bold">
                    LOCKED
                  </span>
                )}
              </div>
            ) : (
              <div className="h-1.5" />
            )}

            <div className="space-y-1">
              {hostToolItems.map((item) => {
                const Icon = item.icon;
                const isLocked = item.requiresHost && userRole !== 'host';
                const isActive = item.type === 'tab' && activeTab === item.id;

                return (
                  <motion.button
                    key={item.id}
                    whileHover={!isLocked ? { scale: 1.02, x: collapsed ? 0 : 2 } : {}}
                    whileTap={!isLocked ? { scale: 0.97 } : {}}
                    onClick={() => {
                      if (isLocked) {
                        playClickSound(0.7);
                        setHostNoticeMessage('Host privileges required for this tool.');
                        setShowHostNotice(true);
                        setTimeout(() => setShowHostNotice(false), 2500);
                        return;
                      }
                      item.action();
                    }}
                    disabled={isLocked}
                    title={
                      isLocked
                        ? `${item.label} (Host exclusive feature)`
                        : collapsed
                        ? `${item.label} - ${item.desc}`
                        : undefined
                    }
                    className={`w-full group flex items-center border-2 border-black transition-all text-left ${
                      collapsed
                        ? 'justify-center p-2 h-11'
                        : 'px-2.5 py-2 space-x-2.5 min-h-10'
                    } ${
                      isLocked
                        ? 'bg-[#10131D] text-slate-600 border-slate-800 opacity-60 cursor-not-allowed'
                        : isActive
                        ? `${item.bgColor} ${item.textColor} brutal-shadow-sm font-black -translate-x-px -translate-y-px cursor-pointer`
                        : 'bg-[#151926] hover:bg-[#1E2336] text-slate-300 hover:text-white cursor-pointer'
                    }`}
                  >
                    {/* Icon */}
                    <div className="relative shrink-0 flex items-center justify-center">
                      <div
                        className={`w-7 h-7 flex items-center justify-center border border-black ${
                          isLocked
                            ? 'bg-slate-900 text-slate-600 border-slate-800'
                            : isActive
                            ? 'bg-black/20 text-current'
                            : 'bg-[#10131D] text-slate-300 group-hover:text-white'
                        }`}
                      >
                        {isLocked ? <Lock className="w-3.5 h-3.5" /> : <Icon className="w-4 h-4" />}
                      </div>
                    </div>

                    {/* Label & Details */}
                    {!collapsed && (
                      <div className="min-w-0 flex-1 flex items-center justify-between">
                        <div className="min-w-0">
                          <div
                            className={`font-mono text-xs uppercase tracking-wide truncate ${
                              isActive ? 'font-black' : 'font-bold'
                            }`}
                          >
                            {item.label}
                          </div>
                        </div>

                        {item.badge && (
                          <span
                            className={`ml-1.5 px-1.5 py-0.2 font-mono text-[9px] font-black border border-black shrink-0 ${
                              isLocked
                                ? 'bg-slate-800 text-slate-500 border-slate-700'
                                : isActive
                                ? 'bg-black text-white'
                                : 'bg-slate-800 text-slate-300'
                            }`}
                          >
                            {item.badge}
                          </span>
                        )}
                      </div>
                    )}
                  </motion.button>
                );
              })}
            </div>
          </div>

          {/* Section 3: FUTURE FEATURES EXTENSION HOOK */}
          {!collapsed && (
            <div className="p-2.5 m-2.5 bg-[#10131E] border-2 border-black/80 brutal-shadow-sm font-mono text-xs">
              <div className="flex items-center space-x-1.5 text-neo-yellow font-black text-[10px] uppercase">
                <Sparkles className="w-3 h-3 fill-neo-yellow" />
                <span>UPCOMING LABS</span>
              </div>
              <div className="text-[10px] text-slate-400 mt-1 leading-snug">
                Interactive Whiteboard & Stage Games arriving soon.
              </div>
            </div>
          )}
        </div>

        {/* ================= PINNED BOTTOM SECTION ================= */}
        <div className="border-t-2 border-black bg-[#0E111A] shrink-0 p-2 space-y-1.5">
          {/* Desktop Collapse / Expand Toggle Button */}
          {!mobile && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.96 }}
              onClick={toggleCollapse}
              className="w-full h-7 flex items-center justify-center space-x-1.5 bg-[#171B2A] hover:bg-neo-yellow hover:text-black text-slate-300 border-2 border-black brutal-shadow-sm font-mono text-[11px] font-bold transition-all cursor-pointer"
              title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar to Icon Rail'}
            >
              {isCollapsed ? (
                <ChevronRight className="w-3.5 h-3.5" />
              ) : (
                <>
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span className="text-[10px] uppercase tracking-wider">COLLAPSE</span>
                </>
              )}
            </motion.button>
          )}

          {/* ================= USER PROFILE & ACCOUNT SECTION ================= */}
          {collapsed ? (
            /* COLLAPSED DESKTOP VIEW: Compact Avatar Button + Popover */
            <div className="relative" ref={collapsedProfileRef}>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  playPopSound();
                  setIsCollapsedProfileOpen(!isCollapsedProfileOpen);
                }}
                className={`w-full h-11 flex items-center justify-center border-2 border-black brutal-shadow-sm transition-all relative cursor-pointer ${
                  userRole === 'host' ? 'bg-neo-yellow text-black' : 'bg-neo-cyan text-black'
                }`}
                title={`Signed in as ${userName} (${userRole})`}
              >
                <span className="font-heavy text-xs">{userInitial}</span>
                <span
                  className={`absolute -top-1 -right-1 w-2.5 h-2.5 border border-black rounded-full ${
                    userRole === 'host' ? 'bg-neo-pink' : 'bg-neo-mint'
                  }`}
                />
              </motion.button>

              {/* Popover */}
              <AnimatePresence>
                {isCollapsedProfileOpen && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.92, x: 10 }}
                    animate={{ opacity: 1, scale: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.92, x: 10 }}
                    className="absolute bottom-0 left-16 w-56 bg-[#141722] border-3 border-black brutal-shadow-lg p-2.5 space-y-2 z-50 font-mono text-xs shadow-2xl"
                  >
                    <div className="p-2 bg-[#0C0E14] border-2 border-black space-y-0.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] text-slate-400 font-bold uppercase">SIGNED IN</span>
                        <span
                          className={`px-1 py-0.2 text-[8px] font-black uppercase border border-black ${
                            userRole === 'host' ? 'bg-neo-yellow text-black' : 'bg-neo-cyan text-black'
                          }`}
                        >
                          {userRole}
                        </span>
                      </div>
                      <div className="font-heavy text-white truncate text-xs">{userName}</div>
                      <div className="text-[9px] text-slate-400 truncate">{currentUser?.email || 'Guest Participant'}</div>
                    </div>

                    <div className="space-y-1">
                      <button
                        onClick={() => {
                          setIsCollapsedProfileOpen(false);
                          handleRoleToggle();
                        }}
                        className="w-full p-1.5 bg-[#1C2030] hover:bg-neo-yellow hover:text-black text-slate-200 border border-black flex items-center space-x-2 text-[11px] font-bold cursor-pointer transition-colors"
                      >
                        <Crown className="w-3.5 h-3.5" />
                        <span>Switch to {userRole === 'host' ? 'Attendee' : 'Host'}</span>
                      </button>

                      <button
                        onClick={() => {
                          setIsCollapsedProfileOpen(false);
                          onOpenAuthModal();
                        }}
                        className="w-full p-1.5 bg-[#1C2030] hover:bg-neo-cyan hover:text-black text-slate-200 border border-black flex items-center space-x-2 text-[11px] font-bold cursor-pointer transition-colors"
                      >
                        <Settings className="w-3.5 h-3.5" />
                        <span>Account & Auth</span>
                      </button>

                      <button
                        onClick={() => {
                          setIsCollapsedProfileOpen(false);
                          onSignOut();
                        }}
                        className="w-full p-1.5 bg-neo-pink/20 hover:bg-neo-pink text-neo-pink hover:text-white border border-neo-pink/60 flex items-center space-x-2 text-[11px] font-bold cursor-pointer transition-colors"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Log Out</span>
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            /* EXPANDED & MOBILE VIEW: Full User Card Pinned at Bottom */
            <div className="bg-[#141724] border-2 border-black p-2 brutal-shadow-sm space-y-2">
              {/* User Details Row */}
              <div className="flex items-center space-x-2 min-w-0">
                <div
                  className={`w-7 h-7 shrink-0 flex items-center justify-center font-heavy text-xs border border-black brutal-shadow-sm ${
                    userRole === 'host' ? 'bg-neo-yellow text-black' : 'bg-neo-cyan text-black'
                  }`}
                >
                  {userInitial}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-black text-white truncate">{userName}</span>
                    <span
                      className={`px-1 py-0.2 text-[8px] font-mono font-black uppercase border border-black ml-1 shrink-0 ${
                        userRole === 'host' ? 'bg-neo-yellow text-black' : 'bg-neo-cyan text-black'
                      }`}
                    >
                      {userRole}
                    </span>
                  </div>
                  <div className="text-[9px] text-slate-400 truncate">
                    {currentUser?.email || 'Guest Participant'}
                  </div>
                </div>
              </div>

              {/* Action Buttons Row */}
              <div className="flex items-center space-x-1 pt-1 border-t border-slate-800">
                <button
                  onClick={handleRoleToggle}
                  className="flex-1 py-1 px-1.5 bg-[#1C2132] hover:bg-neo-yellow hover:text-black text-slate-200 border border-black font-mono text-[10px] font-bold flex items-center justify-center space-x-1 cursor-pointer transition-colors"
                  title={`Switch to ${userRole === 'host' ? 'Attendee' : 'Host'}`}
                >
                  <Crown className="w-3 h-3 shrink-0" />
                  <span className="truncate">{userRole === 'host' ? 'Attendee' : 'Host'}</span>
                </button>

                <button
                  onClick={() => {
                    playClickSound();
                    onCloseMobile();
                    onOpenAuthModal();
                  }}
                  className="p-1 bg-[#1C2132] hover:bg-neo-cyan hover:text-black text-slate-300 border border-black cursor-pointer transition-colors"
                  title="Account Settings & Authentication"
                >
                  <Settings className="w-3 h-3" />
                </button>

                <button
                  onClick={() => {
                    playPopSound();
                    onCloseMobile();
                    onSignOut();
                  }}
                  className="p-1 bg-neo-pink/20 hover:bg-neo-pink text-neo-pink hover:text-white border border-neo-pink/50 cursor-pointer transition-colors"
                  title="Log Out"
                >
                  <LogOut className="w-3 h-3" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      {/* ================= DESKTOP SIDEBAR ================= */}
      <aside
        className={`hidden md:flex flex-col bg-[#11131B] border-r-2 border-black shrink-0 relative transition-all duration-200 z-30 ${
          isCollapsed ? 'w-[72px]' : 'w-60'
        }`}
      >
        {renderSidebarContent(false)}
      </aside>

      {/* ================= MOBILE SLIDE-OVER DRAWER ================= */}
      <AnimatePresence>
        {isOpenMobile && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => {
                playClickSound();
                onCloseMobile();
              }}
              className="md:hidden fixed inset-0 bg-black/70 backdrop-blur-xs z-50 cursor-pointer"
            />

            {/* Slide-in Drawer */}
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 26, stiffness: 280 }}
              className="md:hidden fixed top-0 bottom-0 left-0 w-72 max-w-[85vw] bg-[#11131B] border-r-3 border-black brutal-shadow-lg z-50 flex flex-col shadow-2xl"
            >
              {renderSidebarContent(true)}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};
