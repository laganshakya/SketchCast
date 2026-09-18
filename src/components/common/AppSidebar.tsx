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
  ChevronLeft,
  ChevronRight,
  X,
  Sparkles,
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
  onOpenCertificate,
  onSignOut,
  isOpenMobile,
  onCloseMobile,
}) => {
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
      if (activeTab === 'rooms') {
        setActiveTab('quiz');
      }
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

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (collapsedProfileRef.current && !collapsedProfileRef.current.contains(e.target as Node)) {
        setIsCollapsedProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpenMobile) {
        onCloseMobile();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpenMobile, onCloseMobile]);

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
      badge: null,
      desc: 'Real-time competitive quizzes',
    },
    {
      id: 'polls' as ActiveTabType,
      label: 'Live Polls',
      icon: Vote,
      badge: null,
      desc: 'Instant audience consensus',
    },
    {
      id: 'qa' as ActiveTabType,
      label: 'Q&A Feed',
      icon: HelpCircle,
      badge: questionsCount > 0 ? questionsCount : null,
      desc: 'Crowd questions & upvotes',
    },
    {
      id: 'leaderboard' as ActiveTabType,
      label: 'Leaderboard',
      icon: Trophy,
      badge: null,
      desc: 'Top players podium & stats',
    },
    {
      id: 'surveys' as ActiveTabType,
      label: 'Surveys',
      icon: ClipboardList,
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
      badge: 'HUB',
      desc: 'Manage broadcast arenas',
      requiresHost: true,
      action: () => handleSelectTab('rooms'),
    },
    {
      id: 'ai-settings' as ActiveTabType,
      type: 'tab',
      label: 'AI Settings',
      icon: Bot,
      badge: 'AI',
      desc: 'Keys, models & moderation',
      requiresHost: true,
      action: () => {
        handleSelectTab('ai-settings');
        onOpenAISettings?.();
      },
    },
    {
      id: 'session-report' as ActiveTabType,
      type: 'tab',
      label: 'Masterclass Report',
      icon: FileText,
      badge: hasGeneratedReport ? 'READY' : 'AI',
      desc: hasGeneratedReport ? 'View executive report' : 'AI session synthesis',
      requiresHost: !hasGeneratedReport,
      action: () => {
        handleSelectTab('session-report');
        onOpenAISummary?.();
      },
    },
    {
      id: 'certificate-pass',
      type: 'action',
      label: 'Masterclass Pass',
      icon: Award,
      badge: 'PASS',
      desc: 'Verifiable credential & pass',
      requiresHost: false,
      action: () => handleAction(onOpenCertificate),
    },
  ];

  const visibleHostToolItems = hostToolItems.filter((item) => {
    if (userRole === 'host') return true;
    return !item.requiresHost;
  });

  const userInitial = (userName.trim()[0] || 'U').toUpperCase();

  const renderSidebarContent = (mobile: boolean = false) => {
    const collapsed = mobile ? false : isCollapsed;

    return (
      <div className="flex flex-col h-full overflow-hidden font-sans select-none relative bg-[#0E0E11]">
        {/* Host Requirement Notice Toast */}
        <AnimatePresence>
          {showHostNotice && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="absolute top-2 inset-x-2 z-50 p-2.5 bg-red-950/90 text-red-400 border border-red-500/30 rounded-xl font-mono text-[11px] font-bold flex items-center space-x-2 text-center shadow-lg"
            >
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>{hostNoticeMessage}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Mobile Header with Logo and Close Button */}
        {mobile && (
          <div className="p-3 border-b border-white/[0.08] bg-[#121215] flex items-center justify-between shrink-0">
            <div className="flex items-center space-x-2.5">
              <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-white text-xs">
                <Zap className="w-4 h-4 fill-white stroke-white" />
              </div>
              <span className="font-display font-extrabold text-sm tracking-tight text-white uppercase">
                SKETCH<span className="text-blue-500">CAST</span>
              </span>
            </div>
            <motion.button
              whileTap={{ scale: 0.94 }}
              onClick={() => {
                playPopSound();
                onCloseMobile();
              }}
              className="p-1.5 rounded-lg bg-[#18181D] hover:bg-[#22222A] text-white border border-white/[0.08] cursor-pointer transition-colors"
              title="Close Menu"
            >
              <X className="w-4 h-4" />
            </motion.button>
          </div>
        )}

        {/* Scrollable Navigation Items */}
        <div className="flex-1 overflow-y-auto no-scrollbar space-y-2 p-2">
          {/* Section 1: LIVE ARENA TABS */}
          <div className="space-y-1">
            {!collapsed ? (
              <div className="px-2.5 py-1 text-[10px] font-mono font-bold tracking-widest text-zinc-500 uppercase flex items-center justify-between">
                <span>CHANNELS</span>
                <span className="text-[9px] text-blue-400 font-mono flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                  LIVE
                </span>
              </div>
            ) : (
              <div className="h-1" />
            )}

            <div className="space-y-1">
              {arenaNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;

                return (
                  <motion.button
                    key={item.id}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleSelectTab(item.id)}
                    title={collapsed ? `${item.label} (${item.desc})` : undefined}
                    className={`w-full group flex items-center rounded-xl transition-all cursor-pointer text-left ${
                      collapsed
                        ? 'justify-center p-2 h-10'
                        : 'px-3 py-2 space-x-2.5 min-h-[40px]'
                    } ${
                      isActive
                        ? 'bg-blue-500/10 text-white border border-blue-500/25 shadow-sm'
                        : 'text-zinc-400 hover:text-white hover:bg-white/[0.04] border border-transparent'
                    }`}
                  >
                    {/* Icon container */}
                    <div className="relative shrink-0 flex items-center justify-center">
                      <div
                        className={`w-5 h-5 flex items-center justify-center transition-colors ${
                          isActive ? 'text-blue-400' : 'text-zinc-400 group-hover:text-white'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                      </div>

                      {collapsed && item.badge !== null && (
                        <span className="absolute -top-1.5 -right-1.5 min-w-3.5 h-3.5 px-1 rounded-full bg-blue-600 text-white font-mono font-bold text-[8px] flex items-center justify-center ring-2 ring-[#0E0E11]">
                          {item.badge}
                        </span>
                      )}
                    </div>

                    {/* Expanded view label */}
                    {!collapsed && (
                      <div className="min-w-0 flex-1 flex items-center justify-between">
                        <div
                          className={`font-mono text-xs uppercase tracking-wide truncate ${
                            isActive ? 'font-bold text-white' : 'font-medium text-zinc-400 group-hover:text-zinc-200'
                          }`}
                        >
                          {item.label}
                        </div>

                        {item.badge !== null ? (
                          <span className="ml-1.5 px-2 py-0.5 rounded-full font-mono text-[9px] font-bold bg-blue-600 text-white shrink-0">
                            {item.badge}
                          </span>
                        ) : isActive ? (
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                        ) : null}
                      </div>
                    )}
                  </motion.button>
                );
              })}
            </div>
          </div>

          <div className="px-2 my-1">
            <div className="h-px bg-white/[0.06]" />
          </div>

          {/* Section 2: HOST STUDIO / PASS */}
          {visibleHostToolItems.length > 0 && (
            <div className="space-y-1">
              {!collapsed ? (
                <div className="px-2.5 py-1 text-[10px] font-mono font-bold tracking-widest text-zinc-500 uppercase flex items-center justify-between">
                  {userRole === 'host' ? (
                    <>
                      <span>HOST TOOLS</span>
                      <span className="px-1.5 py-0.2 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[8px] font-bold">
                        HOST
                      </span>
                    </>
                  ) : (
                    <>
                      <span>CREDENTIALS</span>
                      <span className="px-1.5 py-0.2 rounded-full bg-zinc-800 text-zinc-400 border border-white/[0.06] text-[8px] font-bold">
                        PASS
                      </span>
                    </>
                  )}
                </div>
              ) : (
                <div className="h-1" />
              )}

              <div className="space-y-1">
                {visibleHostToolItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = item.type === 'tab' && activeTab === item.id;

                  return (
                    <motion.button
                      key={item.id}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        item.action();
                      }}
                      title={collapsed ? `${item.label} - ${item.desc}` : undefined}
                      className={`w-full group flex items-center rounded-xl transition-all text-left ${
                        collapsed
                          ? 'justify-center p-2 h-10'
                          : 'px-3 py-2 space-x-2.5 min-h-[40px]'
                      } ${
                        isActive
                          ? 'bg-blue-500/10 text-white border border-blue-500/25 shadow-sm cursor-pointer'
                          : 'text-zinc-400 hover:text-white hover:bg-white/[0.04] border border-transparent cursor-pointer'
                      }`}
                    >
                      <div className="relative shrink-0 flex items-center justify-center">
                        <div
                          className={`w-5 h-5 flex items-center justify-center transition-colors ${
                            isActive ? 'text-blue-400' : 'text-zinc-400 group-hover:text-white'
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                        </div>

                        {collapsed && item.badge && (
                          <span className="absolute -top-1.5 -right-1.5 min-w-3.5 h-3.5 px-1 rounded-full bg-[#18181D] text-blue-400 border border-white/[0.08] font-mono text-[8px] flex items-center justify-center ring-2 ring-[#0E0E11]">
                            {item.badge}
                          </span>
                        )}
                      </div>

                      {!collapsed && (
                        <div className="min-w-0 flex-1 flex items-center justify-between">
                          <div
                            className={`font-mono text-xs uppercase tracking-wide truncate ${
                              isActive ? 'font-bold text-white' : 'font-medium text-zinc-400 group-hover:text-zinc-200'
                            }`}
                          >
                            {item.label}
                          </div>

                          {item.badge && (
                            <span className="ml-1.5 px-2 py-0.5 rounded-full font-mono text-[9px] font-bold bg-zinc-800 text-zinc-400 border border-white/[0.06] shrink-0">
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
          )}

          {!collapsed && (
            <div className="p-3 mx-1 mt-2 bg-[#121215] rounded-xl border border-white/[0.06] font-mono text-xs">
              <div className="flex items-center space-x-1.5 text-blue-400 font-bold text-[10px] uppercase">
                <Sparkles className="w-3 h-3 text-blue-400" />
                <span>INTERACTIVE ARENA</span>
              </div>
              <div className="text-[11px] text-zinc-500 mt-1 leading-relaxed font-sans">
                Real-time synchronized interactive audience engagement.
              </div>
            </div>
          )}
        </div>

        {/* ================= PINNED BOTTOM SECTION ================= */}
        <div className={`border-t border-white/[0.08] bg-[#0E0E11] shrink-0 p-2 space-y-2 ${mobile ? 'pb-safe' : ''}`}>
          {!mobile && (
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={toggleCollapse}
              className="w-full h-8 rounded-lg flex items-center justify-center space-x-1.5 bg-[#121215] hover:bg-[#18181D] text-zinc-400 hover:text-white border border-white/[0.06] font-mono text-[11px] transition-colors cursor-pointer"
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

          {collapsed ? (
            /* COLLAPSED VIEW */
            <div className="relative" ref={collapsedProfileRef}>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  playPopSound();
                  setIsCollapsedProfileOpen(!isCollapsedProfileOpen);
                }}
                className={`w-full h-10 rounded-xl flex items-center justify-center border transition-colors relative cursor-pointer ${
                  userRole === 'host'
                    ? 'bg-blue-500/10 border-blue-500/30 text-blue-400'
                    : 'bg-[#121215] border-white/[0.08] text-white'
                }`}
                title={`Signed in as ${userName} (${userRole})`}
              >
                <span className="font-mono font-bold text-xs">{userInitial}</span>
                <span
                  className={`absolute top-1.5 right-1.5 w-2 h-2 rounded-full ${
                    userRole === 'host' ? 'bg-blue-500' : 'bg-emerald-500'
                  }`}
                />
              </motion.button>

              <AnimatePresence>
                {isCollapsedProfileOpen && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, x: 10 }}
                    animate={{ opacity: 1, scale: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.95, x: 10 }}
                    className="absolute bottom-0 left-14 w-60 bg-[#121215] border border-white/[0.08] rounded-2xl p-2.5 space-y-2 z-50 font-mono text-xs shadow-modal"
                  >
                    <div className="p-2.5 bg-[#0A0A0C] rounded-xl border border-white/[0.06] space-y-0.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] text-zinc-500 font-bold uppercase">SIGNED IN</span>
                        <span
                          className={`px-1.5 py-0.2 rounded-full text-[8px] font-bold uppercase border ${
                            userRole === 'host'
                              ? 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                              : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                          }`}
                        >
                          {userRole}
                        </span>
                      </div>
                      <div className="font-bold text-white truncate text-xs">{userName}</div>
                      <div className="text-[9px] text-zinc-500 truncate">{currentUser?.email || 'Guest Participant'}</div>
                    </div>

                    <div className="space-y-1">
                      <button
                        onClick={() => {
                          setIsCollapsedProfileOpen(false);
                          handleRoleToggle();
                        }}
                        className="w-full p-2 rounded-lg bg-[#18181D] hover:bg-[#22222A] text-white border border-white/[0.06] flex items-center space-x-2 text-[11px] font-bold cursor-pointer transition-colors"
                      >
                        <Crown className="w-3.5 h-3.5 text-blue-400" />
                        <span>Switch to {userRole === 'host' ? 'Attendee' : 'Host'}</span>
                      </button>

                      <button
                        onClick={() => {
                          setIsCollapsedProfileOpen(false);
                          onOpenAuthModal();
                        }}
                        className="w-full p-2 rounded-lg bg-[#18181D] hover:bg-[#22222A] text-white border border-white/[0.06] flex items-center space-x-2 text-[11px] font-bold cursor-pointer transition-colors"
                      >
                        <Settings className="w-3.5 h-3.5 text-zinc-400" />
                        <span>Account & Auth</span>
                      </button>

                      <button
                        onClick={() => {
                          setIsCollapsedProfileOpen(false);
                          onSignOut();
                        }}
                        className="w-full p-2 rounded-lg bg-red-950/30 hover:bg-red-900/40 text-red-400 border border-red-500/20 flex items-center space-x-2 text-[11px] font-bold cursor-pointer transition-colors"
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
            /* EXPANDED VIEW */
            <div className="bg-[#121215] border border-white/[0.08] rounded-xl p-2.5 space-y-2">
              <div className="flex items-center space-x-2.5 min-w-0">
                <div
                  className={`w-8 h-8 rounded-lg shrink-0 flex items-center justify-center font-mono font-bold text-xs border ${
                    userRole === 'host'
                      ? 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                      : 'bg-[#18181D] text-white border-white/[0.08]'
                  }`}
                >
                  {userInitial}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-white truncate">{userName}</span>
                    <span
                      className={`px-1.5 py-0.2 rounded-full text-[8px] font-mono font-bold uppercase border ml-1 shrink-0 ${
                        userRole === 'host'
                          ? 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                          : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                      }`}
                    >
                      {userRole}
                    </span>
                  </div>
                  <div className="text-[10px] text-zinc-500 truncate">
                    {currentUser?.email || 'Guest Participant'}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center space-x-1 pt-2 border-t border-white/[0.06]">
                <button
                  onClick={handleRoleToggle}
                  className="flex-1 py-1.5 px-2 rounded-lg bg-[#18181D] hover:bg-[#22222A] text-white border border-white/[0.06] font-mono text-[10px] font-bold flex items-center justify-center space-x-1.5 cursor-pointer transition-colors"
                  title={`Switch to ${userRole === 'host' ? 'Attendee' : 'Host'}`}
                >
                  <Crown className="w-3 h-3 text-blue-400 shrink-0" />
                  <span className="truncate">{userRole === 'host' ? 'Attendee' : 'Host'}</span>
                </button>

                <button
                  onClick={() => {
                    playClickSound();
                    onCloseMobile();
                    onOpenAuthModal();
                  }}
                  className="p-1.5 rounded-lg bg-[#18181D] hover:bg-[#22222A] text-zinc-400 hover:text-white border border-white/[0.06] cursor-pointer transition-colors"
                  title="Account Settings"
                >
                  <Settings className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={() => {
                    playPopSound();
                    onCloseMobile();
                    onSignOut();
                  }}
                  className="p-1.5 rounded-lg bg-red-950/30 hover:bg-red-900/40 text-red-400 border border-red-500/20 cursor-pointer transition-colors"
                  title="Log Out"
                >
                  <LogOut className="w-3.5 h-3.5" />
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
      {/* DESKTOP SIDEBAR */}
      <aside
        className={`hidden md:flex flex-col bg-[#0E0E11] border-r border-white/[0.08] shrink-0 relative transition-all duration-200 z-30 ${
          isCollapsed ? 'w-16' : 'w-60'
        }`}
      >
        {renderSidebarContent(false)}
      </aside>

      {/* MOBILE SLIDE-OVER DRAWER */}
      <AnimatePresence>
        {isOpenMobile && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => {
                playClickSound();
                onCloseMobile();
              }}
              className="md:hidden fixed inset-0 bg-black/80 backdrop-blur-xs z-50 cursor-pointer"
            />

            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 26, stiffness: 280 }}
              className="md:hidden fixed top-0 bottom-0 left-0 w-72 max-w-[85vw] bg-[#0E0E11] border-r border-white/[0.08] rounded-r-2xl z-50 flex flex-col shadow-modal overflow-hidden"
            >
              {renderSidebarContent(true)}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};
