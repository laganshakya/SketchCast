import { useState, useMemo, useEffect, useCallback, lazy, Suspense } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import { useRoomSession } from './hooks/useRoomSession';
import { useQuizEngine } from './hooks/useQuizEngine';
import { usePollsEngine } from './hooks/usePollsEngine';
import { useQAFeed } from './hooks/useQAFeed';
import { LandingAuthPage } from './components/auth/LandingAuthPage';
import { AppHeader } from './components/common/AppHeader';
import { AppSidebar } from './components/common/AppSidebar';
import { QuizArena } from './components/quiz/QuizArena';
import { QuizHostPanel } from './components/quiz/QuizHostPanel';
import { LeaderboardPodium } from './components/quiz/LeaderboardPodium';
import { LivePollsView } from './components/polls/LivePollsView';
import { CreatePollModal } from './components/polls/CreatePollModal';
import { QuestionFeed } from './components/qa/QuestionFeed';
import { QuestionModal } from './components/qa/QuestionModal';
import { QRCodeModal } from './components/common/QRCodeModal';
import { AuthModal } from './components/common/AuthModal';
import { SurveyTab } from './components/survey/SurveyTab';
import { FloatingReactionsOverlay } from './components/common/FloatingReactionsOverlay';
import type { VerifiedCertPayload } from './components/certificate/CertificateVerificationModal';

// Dynamic lazy-loaded modals and admin views for minimal initial bundle
const RoomsAdminView = lazy(() => import('./components/rooms/RoomsAdminView').then((m) => ({ default: m.RoomsAdminView })));
const ChangeRoomModal = lazy(() => import('./components/rooms/ChangeRoomModal').then((m) => ({ default: m.ChangeRoomModal })));
const ActiveAttendeesModal = lazy(() => import('./components/common/ActiveAttendeesModal').then((m) => ({ default: m.ActiveAttendeesModal })));
const AISettingsModal = lazy(() => import('./components/common/AISettingsModal').then((m) => ({ default: m.AISettingsModal })));
const AISessionReportModal = lazy(() => import('./components/common/AISessionReportModal').then((m) => ({ default: m.AISessionReportModal })));
const SpotlightRouletteModal = lazy(() => import('./components/common/SpotlightRouletteModal').then((m) => ({ default: m.SpotlightRouletteModal })));
const SpotlightCelebrationModal = lazy(() => import('./components/common/SpotlightCelebrationModal').then((m) => ({ default: m.SpotlightCelebrationModal })));
const ChampionSocialCardModal = lazy(() => import('./components/quiz/ChampionSocialCardModal').then((m) => ({ default: m.ChampionSocialCardModal })));
const MasterclassCertificateModal = lazy(() => import('./components/certificate/MasterclassCertificateModal').then((m) => ({ default: m.MasterclassCertificateModal })));
const CertificateVerificationModal = lazy(() => import('./components/certificate/CertificateVerificationModal').then((m) => ({ default: m.CertificateVerificationModal })));
import { useSurveys } from './hooks/useSurveys';
import { playFanfare, playWhoosh, playClickSound, playPopSound, setAudioPack } from './lib/soundFx';

import { isUserRoomAdmin, dbFetchRooms, isRoomCreatedByMe } from './lib/supabase';
import type { SpotlightWinner, ChampionSocialCardData, LeaderboardEntry, QuestionCluster } from './types';
import { Zap, Vote, HelpCircle, Trophy, Layers, Sparkles, X, ShieldAlert, VolumeX, UserX, AlertTriangle, RotateCcw, ClipboardList } from 'lucide-react';

function parseVerificationUrl(): VerifiedCertPayload | null {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  let verifyCert = params.get('verify_cert');
  const pathMatch = window.location.pathname.match(/^\/verify\/([^/?#]+)/i);
  if (!verifyCert && pathMatch) {
    verifyCert = decodeURIComponent(pathMatch[1]);
  }
  if (verifyCert && verifyCert.trim()) {
    const roomCode = (params.get('room') || 'ARENA').toUpperCase().trim();
    const correctQuizzes = Number(params.get('correct') || params.get('score') || 0);
    const recipientName = params.get('name') || 'Masterclass Attendee';
    const rawTitle = params.get('title');
    const rank = Number(params.get('rank') || 1);
    const totalAttendees = Number(params.get('total') || 1);
    const issueDate = params.get('date') || new Date().toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    return {
      certId: verifyCert.trim(),
      roomCode,
      correctQuizzes,
      recipientName,
      roomTitle: rawTitle || `Masterclass Architecture Session (${roomCode})`,
      rank,
      totalAttendees,
      issueDate,
    };
  }
  return null;
}

export function App() {
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);
  const [qrRoomData, setQrRoomData] = useState<{ code: string; title: string } | null>(null);
  const [isAskModalOpen, setIsAskModalOpen] = useState(false);
  const [isCreatePollModalOpen, setIsCreatePollModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isChangeRoomModalOpen, setIsChangeRoomModalOpen] = useState(false);
  const [isActiveAttendeesModalOpen, setIsActiveAttendeesModalOpen] = useState(false);
  const [isAISettingsModalOpen, setIsAISettingsModalOpen] = useState(false);
  const [isAISessionReportModalOpen, setIsAISessionReportModalOpen] = useState(false);
  const [isSpotlightModalOpen, setIsSpotlightModalOpen] = useState(false);
  const [isSpotlightCelebrationOpen, setIsSpotlightCelebrationOpen] = useState(false);
  const [celebrationWinner, setCelebrationWinner] = useState<SpotlightWinner | null>(null);
  const [isSocialCardModalOpen, setIsSocialCardModalOpen] = useState(false);
  const [socialCardData, setSocialCardData] = useState<ChampionSocialCardData | null>(null);
  const [spotlightBanner, setSpotlightBanner] = useState<SpotlightWinner | null>(null);
  const [mobileHostQuizView, setMobileHostQuizView] = useState<'arena' | 'controls'>('arena');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isCertificateModalOpen, setIsCertificateModalOpen] = useState(false);
  const [qaClusters, setQaClusters] = useState<QuestionCluster[]>([]);
  const [verifiedCertData, setVerifiedCertData] = useState<VerifiedCertPayload | null>(parseVerificationUrl);

  // 1. Dynamic Room Session, Presence & Supabase Auth User
  const {
    sessionId,
    userName,
    setUserName,
    userRole,
    setUserRole,
    room,
    activeTab,
    setActiveTab,
    attendees,
    currentUser,
    isAuthenticated,
    handleAuthenticated,
    handleSignOut,
    channelManager,
    promotionToast,
    setPromotionToast,
    promoteToAdmin,
    demoteFromAdmin,
    mutedSessionIds,
    isMuted,
    isBanned,
    banNotice,
    dismissBanNotice,
    muteAttendee,
    unmuteAttendee,
    banAttendee,
    strikesBySession,
    myStrikes,
    recordMyStrike,
    officialWarning,
    dismissOfficialWarning,
    sendAttendeeWarning,
    resetAttendeeStrikes,
  } = useRoomSession('SKT-789');

  // 2. Live Quiz Engine (Isolated to room.code)
  const {
    quizState,
    leaderboard,
    timeRemaining,
    startQuizRound,
    revealAnswer,
    selectOption,
  } = useQuizEngine({
    channelManager,
    sessionId,
    userName,
    userRole,
    roomCode: room.code,
    appActiveTab: activeTab,
  });

  // 3. Live Polls Engine (Isolated to room.code)
  const {
    polls,
    userVotes,
    createPoll,
    voteOnPoll,
    resetPoll,
    deletePoll,
    updatePollAIConsensus,
  } = usePollsEngine({
    channelManager,
    sessionId,
    userName,
    roomCode: room.code,
    activeTab,
  });

  // 4. Live Q&A Feed Engine (Isolated to room.code)
  const {
    questions,
    filteredQuestions,
    upvotedIds,
    activeTab: qaFilterTab,
    setActiveTab: setQAFilterTab,
    toggleUpvote,
    submitQuestion,
    updateQuestionStatus,
    updateQuestionTalkingPoints,
  } = useQAFeed({
    channelManager,
    sessionId,
    userName,
    userRole,
    roomCode: room.code,
    appActiveTab: activeTab,
  });

  // 5. Live Survey System & Multi-Question Feedback
  const {
    surveys,
    activeSurvey,
    responsesBySurvey,
    userSubmittedIds,
    incomingSurveyAlert,
    dismissSurveyAlert,
    isSummarizing,
    createSurvey,
    launchSurvey,
    closeSurvey,
    deleteSurvey,
    submitResponse,
    generateAISummary,
    exportResponses,
  } = useSurveys(room.code, sessionId, userName, channelManager);

  const activeViewerCount = Math.max(1, attendees.length);

  // Host quiz queue for AI report export
  const queuedQuizzes = useMemo(() => {
    try {
      const queueKey = `sketchcast_host_quiz_queue_${room.code.toUpperCase().trim()}`;
      const stored = localStorage.getItem(queueKey) || localStorage.getItem('sketchcast_host_quiz_queue');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }, [room.code]);

  // Room AI Session Summary Report storage & realtime sync
  const reportStorageKey = `sketchcast_session_report_${room.code.toUpperCase().trim()}`;
  const [publishedReports, setPublishedReports] = useState<Record<string, string>>({});
  const sessionReport = publishedReports[room.code] ?? (typeof window !== 'undefined' ? localStorage.getItem(reportStorageKey) || '' : '');

  const setSessionReport = useCallback((markdown: string) => {
    setPublishedReports((prev) => ({ ...prev, [room.code]: markdown }));
    try {
      localStorage.setItem(reportStorageKey, markdown);
    } catch {
      // ignore
    }
  }, [room.code, reportStorageKey]);

  // Asynchronously enrich verified certificate room title from Supabase if not provided in URL
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const rawTitle = params.get('title');
    const verifyCert = params.get('verify_cert');
    if (verifyCert && !rawTitle) {
      const roomCode = (params.get('room') || 'ARENA').toUpperCase().trim();
      let isMounted = true;
      dbFetchRooms().then((rooms) => {
        if (!isMounted) return;
        const matching = rooms.find((r) => r.code.toUpperCase() === roomCode);
        if (matching && matching.title) {
          setVerifiedCertData((prev) => (prev ? { ...prev, roomTitle: matching.title } : null));
        }
      }).catch(() => {});
      return () => {
        isMounted = false;
      };
    }
  }, []);

  const handleCloseVerification = () => {
    setVerifiedCertData(null);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.delete('verify_cert');
      url.searchParams.delete('score');
      url.searchParams.delete('name');
      url.searchParams.delete('title');
      url.searchParams.delete('rank');
      url.searchParams.delete('total');
      url.searchParams.delete('date');
      const cleanPath = url.pathname.startsWith('/verify/') ? '/' : url.pathname;
      window.history.replaceState({}, '', `${cleanPath}${url.search}`);
    }
  };

  const handleEnterArenaFromCert = (targetRoomCode: string) => {
    handleCloseVerification();
    if (targetRoomCode && targetRoomCode !== room.code) {
      if (typeof window !== 'undefined') {
        const url = new URL(window.location.href);
        url.searchParams.set('room', targetRoomCode);
        window.history.replaceState({}, '', url.toString());
        window.location.reload();
      }
    }
  };

  // Realtime listener for published session report
  useEffect(() => {
    if (!channelManager) return;

    const unReport = channelManager.on('session_report_published', (payload) => {
      if (payload && payload.reportMarkdown) {
        setSessionReport(payload.reportMarkdown);
        setIsCertificateModalOpen(true);
      }
    });

    const unAudioPack = channelManager.on('room_audio_pack_update', ({ pack }) => {
      if (pack === 'arcade' || pack === 'hifi') {
        setAudioPack(pack);
      }
    });

    return () => {
      unReport();
      unAudioPack();
    };
  }, [channelManager, setSessionReport]);

  // Realtime listener for Q&A theme clustering
  useEffect(() => {
    if (!channelManager) return;
    const unCluster = channelManager.on('qa_cluster_update', (clusters) => {
      if (Array.isArray(clusters)) {
        setQaClusters(clusters);
      }
    });
    return () => {
      unCluster();
    };
  }, [channelManager]);






  const handlePublishReport = (markdown: string) => {
    setSessionReport(markdown);
    try {
      localStorage.setItem(reportStorageKey, markdown);
    } catch {
      // ignore
    }
    if (channelManager) {
      channelManager.broadcast('session_report_published', {
        reportMarkdown: markdown,
        generatedAt: Date.now(),
        publishedBy: userName,
      });
    }
  };

  const isHostOrAdmin = useMemo(() => {
    return userRole === 'host' || isUserRoomAdmin(room, currentUser, userName);
  }, [userRole, room, currentUser, userName]);

  // Safeguard: Ensure attendees cannot be on the host-only 'rooms' tab
  useEffect(() => {
    if (activeTab === 'rooms' && userRole !== 'host' && !isHostOrAdmin) {
      setActiveTab('quiz');
    }
  }, [activeTab, userRole, isHostOrAdmin, setActiveTab]);

  // Safeguard Strike Alert for Host / Admins
  const [violationAlert, setViolationAlert] = useState<{
    roomId: string;
    attendeeSessionId: string;
    attendeeName: string;
    strikeCount: number;
    reason: string;
    category?: string;
    sampleText: string;
    timestamp: number;
  } | null>(null);

  useEffect(() => {
    if (!channelManager) return;

    const unViolation = channelManager.on('safeguard_violation_alert', (alert) => {
      if (alert.roomId.toUpperCase().trim() === room.code.toUpperCase().trim()) {
        const isHostOrAdmin =
          userRole === 'host' || isUserRoomAdmin(room, currentUser, userName);
        if (isHostOrAdmin) {
          playPopSound();
          setViolationAlert(alert);
        }
      }
    });

    return () => {
      unViolation();
    };
  }, [channelManager, room.code, userRole, room, currentUser, userName]);

  const handleSafeguardViolation = (data: {
    strikeCount: number;
    reason: string;
    category?: string;
    sampleText: string;
  }) => {
    if (channelManager) {
      channelManager.broadcast('safeguard_violation_alert', {
        roomId: room.code,
        attendeeSessionId: sessionId,
        attendeeName: userName,
        strikeCount: data.strikeCount,
        reason: data.reason,
        category: data.category,
        sampleText: data.sampleText,
        timestamp: Date.now(),
      });
    }
  };

  // Handle switching rooms from Rooms Admin Hub or ChangeRoomModal
  const handleSwitchRoom = async (newCode: string, newTitle?: string) => {
    const isOwner = isRoomCreatedByMe(newCode);
    const targetRole = isOwner ? 'host' : userRole;
    await handleAuthenticated(userName, targetRole, newCode, newTitle);
    setActiveTab('quiz');
  };

  const handleOpenQRForRoom = (code: string, title: string) => {
    setQrRoomData({ code, title });
    setIsQRModalOpen(true);
  };

  // Host action: Launch next queued question in sequence
  const handleNextQuestion = () => {
    try {
      const queueKey = `sketchcast_host_quiz_queue_${room.code.toUpperCase().trim()}`;
      const stored = localStorage.getItem(queueKey) || localStorage.getItem('sketchcast_host_quiz_queue');
      if (stored) {
        const queue = JSON.parse(stored);
        if (queue && Array.isArray(queue) && queue.length > 0) {
          const currentId = quizState.question?.id;
          const currentIndex = queue.findIndex((q: any) => q.id === currentId);
          if (currentIndex >= 0 && currentIndex + 1 < queue.length) {
            startQuizRound(queue[currentIndex + 1]);
            return;
          }
          if (currentIndex === -1) {
            startQuizRound(queue[0]);
          }
        }
      }
    } catch {
      // ignore
    }
  };

  // Check if there is a subsequent queued question
  const hasNextQuestion = useMemo(() => {
    try {
      const queueKey = `sketchcast_host_quiz_queue_${room.code.toUpperCase().trim()}`;
      const stored = localStorage.getItem(queueKey) || localStorage.getItem('sketchcast_host_quiz_queue');
      if (stored) {
        const queue = JSON.parse(stored);
        if (Array.isArray(queue) && queue.length > 0) {
          const currentId = quizState.question?.id;
          const currentIndex = queue.findIndex((q: any) => q.id === currentId);
          return currentIndex >= 0 && currentIndex + 1 < queue.length;
        }
      }
    } catch {
      // ignore
    }
    return false;
  }, [room.code, quizState.question]);

  // Listen for live Spotlight Winner broadcasts
  useEffect(() => {
    if (!channelManager) return;
    const unSpotlight = channelManager.on('attendee_spotlight', (winner) => {
      setSpotlightBanner(winner);
      setCelebrationWinner(winner);

      if (winner.targetSessionId === sessionId) {
        setIsSpotlightCelebrationOpen(true);
        playFanfare();
        try {
          confetti({
            particleCount: 180,
            spread: 100,
            origin: { y: 0.4 },
            colors: ['#FFE600', '#FF2A6D', '#00F0FF', '#00F59B', '#9B5DE5'],
          });
        } catch {
          // ignore
        }
      }
      setTimeout(() => {
        setSpotlightBanner(null);
      }, 10000);
    });

    return () => {
      unSpotlight();
    };
  }, [channelManager, sessionId]);

  const handleSelectSpotlightWinner = (winner: SpotlightWinner) => {
    setSpotlightBanner(winner);
    setCelebrationWinner(winner);
    if (winner.targetSessionId === sessionId) {
      setIsSpotlightCelebrationOpen(true);
    }

    if (channelManager) {
      channelManager.broadcast('attendee_spotlight', winner);
    }
  };

  const handleOpenSocialCard = (entry: LeaderboardEntry, rank: number) => {
    setSocialCardData({
      playerName: entry.name,
      rank,
      correctQuizzes: entry.correct_quizzes,
      totalQuizzes: queuedQuizzes.length || entry.correct_quizzes,
      pollsVoted: entry.polls_voted,
      roomCode: room.code,
      roomTitle: room.title,
    });
    setIsSocialCardModalOpen(true);
  };

  // If user is not authenticated, show the Landing / Auth Page (with Verification Modal on top if verifying)
  if (!isAuthenticated) {
    return (
      <>
        {verifiedCertData && (
          <CertificateVerificationModal
            certData={verifiedCertData}
            onClose={handleCloseVerification}
            onEnterArena={handleEnterArenaFromCert}
          />
        )}
        <LandingAuthPage
          onAuthenticated={handleAuthenticated}
          roomCode={room.code}
        />
      </>
    );
  }

  // Once authenticated (or signed in as guest), show the Live Arena
  return (
    <div className="h-screen w-screen flex flex-col bg-retro-grid text-slate-100 overflow-hidden font-sans select-none">
      {/* Top Header */}
      <AppHeader
        room={room}
        userName={userName}
        setUserName={setUserName}
        userRole={userRole}
        setUserRole={setUserRole}
        activeViewerCount={activeViewerCount}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        questionsCount={filteredQuestions.length}
        onOpenQRCode={() => {
          setQrRoomData({ code: room.code, title: room.title });
          setIsQRModalOpen(true);
        }}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        onOpenChangeRoom={() => setIsChangeRoomModalOpen(true)}
        onOpenActiveAttendees={() => setIsActiveAttendeesModalOpen(true)}
        onOpenAISettings={() => setIsAISettingsModalOpen(true)}
        onOpenAISummary={() => setIsAISessionReportModalOpen(true)}
        onOpenSpotlightRoulette={() => setIsSpotlightModalOpen(true)}
        onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
        onSignOut={handleSignOut}
        currentUser={currentUser}
      />

      {/* Floating Realtime Spotlight Winner Celebration Banner */}
      {spotlightBanner && (
        <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 w-11/12 max-w-lg bg-neo-yellow text-black border-4 border-black brutal-shadow-lg p-2.5 sm:p-3 animate-bounce flex items-center justify-between font-mono gap-2">
          <div className="flex items-center space-x-2.5 min-w-0">
            <span className="text-xl sm:text-2xl shrink-0">{spotlightBanner.rewardIcon || '🎰'}</span>
            <div className="min-w-0">
              <div className="text-[9px] sm:text-[10px] font-black uppercase text-slate-900 tracking-wider">
                STAGE SPOTLIGHT WINNER SELECTED!
              </div>
              <div className="text-xs sm:text-sm font-heavy truncate text-black">
                👑 {spotlightBanner.targetName} {spotlightBanner.targetSessionId === sessionId ? '(YOU!)' : ''}
              </div>
              {spotlightBanner.rewardPerk && (
                <div className="text-[10px] font-black text-slate-900 truncate">
                  🎁 Perk: {spotlightBanner.rewardPerk}
                </div>
              )}
            </div>
          </div>
          <button
            onClick={() => setSpotlightBanner(null)}
            className="p-1 bg-black text-white hover:bg-neo-pink border border-black cursor-pointer shrink-0"
            title="Dismiss notification"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Floating Promotion Toast Notification */}
      {promotionToast && (
        <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 animate-bounce">
          <div className="bg-neo-yellow text-black font-mono font-black text-xs px-4 py-2 border-3 border-black brutal-shadow-lg flex items-center space-x-2">
            <Sparkles className="w-4 h-4 fill-black shrink-0" />
            <span>{promotionToast}</span>
            <button
              onClick={() => setPromotionToast(null)}
              className="p-1 hover:bg-black hover:text-white transition-colors border border-black ml-2 cursor-pointer"
            >
              <X className="w-3 h-3 stroke-3" />
            </button>
          </div>
        </div>
      )}

      {/* Real-time Safeguard Strike Alert Banner for Host/Admins */}
      <AnimatePresence>
        {violationAlert && (
          <motion.div
            initial={{ y: -60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -60, opacity: 0 }}
            className="fixed top-16 left-1/2 -translate-x-1/2 z-50 w-[95%] max-w-xl bg-neo-yellow text-black border-4 border-black brutal-shadow-lg p-3 sm:p-4 font-mono"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start space-x-2.5 sm:space-x-3 min-w-0">
                <div className="w-9 h-9 sm:w-10 sm:h-10 bg-neo-pink text-white border-2 border-black flex items-center justify-center font-heavy shrink-0 animate-bounce">
                  <ShieldAlert className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2.5]" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-heavy text-xs sm:text-sm uppercase tracking-tight text-black">
                      SAFEGUARD STRIKE ALERT
                    </span>
                    <span className="px-1.5 py-0.2 bg-neo-pink text-white text-[9px] font-black uppercase border border-black animate-pulse">
                      STRIKE {violationAlert.strikeCount}/3
                    </span>
                    {violationAlert.category && (
                      <span className="px-1.5 py-0.2 bg-black text-white text-[8px] sm:text-[9px] font-black uppercase border border-black">
                        {violationAlert.category}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-black font-bold mt-1">
                    Attendee <span className="bg-black text-neo-yellow px-1 py-0.2 font-black">{violationAlert.attendeeName}</span> repeatedly violated Q&A safety guidelines.
                  </p>
                  <div className="text-[11px] text-slate-900 font-sans mt-1 bg-white/90 p-1.5 border border-black leading-snug">
                    <span className="font-bold">Reason:</span> {violationAlert.reason}
                    {violationAlert.sampleText && (
                      <span className="block italic text-[10px] text-slate-700 truncate mt-0.5">
                        &ldquo;{violationAlert.sampleText}&rdquo;
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <button
                onClick={() => setViolationAlert(null)}
                className="p-1 bg-black text-white hover:bg-neo-pink border border-black cursor-pointer shrink-0"
                title="Dismiss alert"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Quick Action Buttons */}
            <div className="flex flex-wrap items-center justify-end gap-2 mt-2.5 pt-2 border-t-2 border-black/20">
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => {
                  playPopSound();
                  sendAttendeeWarning(violationAlert.attendeeSessionId, violationAlert.attendeeName);
                }}
                className="px-3 py-1.5 bg-amber-300 hover:bg-amber-400 text-black font-mono text-xs font-black uppercase border-2 border-black brutal-shadow-sm flex items-center space-x-1.5 cursor-pointer"
                title="Send official safeguard warning to attendee"
              >
                <AlertTriangle className="w-3.5 h-3.5 text-black" />
                <span>WARN ATTENDEE</span>
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => {
                  playPopSound();
                  resetAttendeeStrikes(violationAlert.attendeeSessionId, violationAlert.attendeeName);
                  setViolationAlert(null);
                }}
                className="px-3 py-1.5 bg-white hover:bg-neo-yellow text-black font-mono text-xs font-black uppercase border-2 border-black brutal-shadow-sm flex items-center space-x-1.5 cursor-pointer"
                title="Reset and forgive strikes"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>RESET STRIKES</span>
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => {
                  playPopSound();
                  muteAttendee(violationAlert.attendeeSessionId, violationAlert.attendeeName);
                  setViolationAlert(null);
                }}
                className="px-3 py-1.5 bg-slate-900 hover:bg-black text-white font-mono text-xs font-black uppercase border-2 border-black brutal-shadow-sm flex items-center space-x-1.5 cursor-pointer"
              >
                <VolumeX className="w-3.5 h-3.5 text-neo-pink" />
                <span>MUTE ATTENDEE</span>
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => {
                  playClickSound();
                  if (confirm(`Ban and eject "${violationAlert.attendeeName}" from this room?`)) {
                    banAttendee(violationAlert.attendeeSessionId, violationAlert.attendeeName);
                    setViolationAlert(null);
                  }
                }}
                className="px-3 py-1.5 bg-neo-pink hover:bg-[#FF4782] text-white font-mono text-xs font-black uppercase border-2 border-black brutal-shadow-sm flex items-center space-x-1.5 cursor-pointer"
              >
                <UserX className="w-3.5 h-3.5" />
                <span>BAN & KICK</span>
              </motion.button>
              <button
                onClick={() => setViolationAlert(null)}
                className="px-2.5 py-1.5 bg-white hover:bg-slate-100 text-black font-mono text-xs font-bold uppercase border-2 border-black cursor-pointer"
              >
                DISMISS
              </button>
            </div>
          </motion.div>
        )}

        {/* Real-time Survey Launched Floating Banner */}
        {incomingSurveyAlert && activeTab !== 'surveys' && (
          <motion.div
            initial={{ y: -60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -60, opacity: 0 }}
            className="fixed top-16 left-1/2 -translate-x-1/2 z-50 w-[95%] max-w-lg bg-[#00F59B] text-black border-4 border-black brutal-shadow-lg p-3 sm:p-4 font-mono flex items-center justify-between gap-3"
          >
            <div className="flex items-center space-x-2.5 min-w-0">
              <div className="w-9 h-9 bg-black text-[#00F59B] border-2 border-black flex items-center justify-center shrink-0 font-heavy">
                <ClipboardList className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-black uppercase px-1.5 py-0.2 bg-black text-white border border-black">
                  NEW SURVEY LAUNCHED
                </span>
                <h4 className="text-xs sm:text-sm font-heavy uppercase tracking-tight text-black truncate mt-0.5">
                  {incomingSurveyAlert.surveyTitle}
                </h4>
                <p className="text-[11px] text-slate-800 font-sans truncate">
                  Host {incomingSurveyAlert.launchedBy} invited you to share feedback!
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-1.5 shrink-0">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  playPopSound();
                  setActiveTab('surveys');
                  dismissSurveyAlert();
                }}
                className="px-3 py-1.5 bg-black text-white hover:bg-slate-900 font-mono text-xs font-black uppercase border-2 border-black brutal-shadow-sm cursor-pointer whitespace-nowrap"
              >
                TAKE SURVEY
              </motion.button>
              <button
                onClick={dismissSurveyAlert}
                className="p-1.5 hover:bg-black/10 text-black border border-black cursor-pointer"
                title="Dismiss"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Desktop Sidebar + Main Content Layout Area */}
      <div className="flex-1 flex overflow-hidden relative">
        <AppSidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          userRole={userRole}
          setUserRole={setUserRole}
          userName={userName}
          room={room}
          currentUser={currentUser}
          questionsCount={filteredQuestions.length}
          activeSurveysCount={activeSurvey && !userSubmittedIds.has(activeSurvey.id) ? 1 : 0}
          hasGeneratedReport={Boolean(sessionReport)}
          onOpenAuthModal={() => setIsAuthModalOpen(true)}
          onOpenAISettings={() => setIsAISettingsModalOpen(true)}
          onOpenAISummary={() => setIsAISessionReportModalOpen(true)}
          onOpenSpotlightRoulette={() => setIsSpotlightModalOpen(true)}
          onOpenCertificate={() => setIsCertificateModalOpen(true)}
          onSignOut={handleSignOut}
          isOpenMobile={isMobileSidebarOpen}
          onCloseMobile={() => setIsMobileSidebarOpen(false)}
        />

        {/* Main Content Area with Framer Motion Spring Transitions */}
        <main className="flex-1 flex overflow-y-auto relative p-2 sm:p-4 md:p-5 pb-24 sm:pb-28 md:pb-6">
        <AnimatePresence mode="wait">
          {/* TAB 1: Live Quiz Arena */}
          {activeTab === 'quiz' && (
            <motion.div
              key="tab-quiz"
              initial={{ opacity: 0, y: 10, scale: 0.99 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.99 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="flex-1 flex flex-col lg:flex-row gap-4 max-w-7xl mx-auto w-full h-full"
            >
              {/* Mobile Host Switcher Bar (Screen < lg) */}
              {userRole === 'host' && (
                <div className="lg:hidden flex items-center justify-center p-1 bg-[#11131B] border-2 border-black font-mono text-xs font-black shrink-0 brutal-shadow-sm">
                  <motion.button
                    whileTap={{ scale: 0.96 }}
                    onClick={() => {
                      playClickSound();
                      setMobileHostQuizView('arena');
                    }}
                    className={`flex-1 py-1.5 flex items-center justify-center space-x-1.5 uppercase transition-all cursor-pointer ${
                      mobileHostQuizView === 'arena'
                        ? 'bg-neo-yellow text-black border-2 border-black brutal-shadow-sm -translate-x-px -translate-y-px'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Zap className="w-3.5 h-3.5" />
                    <span>LIVE ARENA</span>
                  </motion.button>
                  <motion.button
                    whileTap={{ scale: 0.96 }}
                    onClick={() => {
                      playClickSound();
                      setMobileHostQuizView('controls');
                    }}
                    className={`flex-1 py-1.5 flex items-center justify-center space-x-1.5 uppercase transition-all cursor-pointer ${
                      mobileHostQuizView === 'controls'
                        ? 'bg-neo-yellow text-black border-2 border-black brutal-shadow-sm -translate-x-px -translate-y-px'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>HOST CONTROLS</span>
                  </motion.button>
                </div>
              )}

              {/* Main Arena View */}
              <div
                className={`flex-1 flex flex-col h-full min-w-0 ${
                  userRole === 'host' && mobileHostQuizView === 'controls' ? 'hidden lg:flex' : 'flex'
                }`}
              >
                <QuizArena
                  quizState={quizState}
                  timeRemaining={timeRemaining}
                  onSelectOption={selectOption}
                  onRevealAnswer={revealAnswer}
                  onNextQuestion={handleNextQuestion}
                  hasNextQuestion={hasNextQuestion}
                  onViewScores={() => setActiveTab('leaderboard')}
                  isHost={userRole === 'host'}
                />
              </div>

              {/* Host Quiz Launcher & Pack Selector (Shown if Host) */}
              {userRole === 'host' && (
                <div
                  className={`w-full lg:w-96 shrink-0 flex flex-col h-full ${
                    mobileHostQuizView === 'arena' ? 'hidden lg:flex' : 'flex'
                  }`}
                >
                  <QuizHostPanel
                    onStartQuiz={startQuizRound}
                    activeQuestionId={quizState.question?.id}
                    isRevealed={quizState.isRevealed}
                    roomCode={room.code}
                    onOpenAISettings={() => setIsAISettingsModalOpen(true)}
                  />
                </div>
              )}
            </motion.div>
          )}

          {/* TAB 2: Live Polls & Voting */}
          {activeTab === 'polls' && (
            <motion.div
              key="tab-polls"
              initial={{ opacity: 0, y: 10, scale: 0.99 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.99 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="flex-1 flex flex-col overflow-y-auto"
            >
              <LivePollsView
                polls={polls}
                userVotes={userVotes}
                onVote={voteOnPoll}
                onOpenCreatePoll={() => setIsCreatePollModalOpen(true)}
                onResetPoll={resetPoll}
                onDeletePoll={deletePoll}
                onUpdateAIConsensus={updatePollAIConsensus}
                onOpenAISettings={() => setIsAISettingsModalOpen(true)}
                isHost={userRole === 'host'}
              />
            </motion.div>
          )}

          {/* TAB 3: Q&A Upvoting Feed */}
          {activeTab === 'qa' && (
            <motion.div
              key="tab-qa"
              initial={{ opacity: 0, y: 10, scale: 0.99 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.99 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="flex-1 flex flex-col max-w-4xl mx-auto w-full h-full overflow-hidden"
            >
              <QuestionFeed
                questions={filteredQuestions}
                upvotedIds={upvotedIds}
                onToggleUpvote={toggleUpvote}
                onStatusChange={updateQuestionStatus}
                onUpdateTalkingPoints={updateQuestionTalkingPoints}
                onOpenAISettings={() => setIsAISettingsModalOpen(true)}
                activeTab={qaFilterTab}
                setActiveTab={setQAFilterTab}
                onOpenAskModal={() => setIsAskModalOpen(true)}
                isHost={userRole === 'host'}
                initialClusters={qaClusters}
                onClustersChange={(clusters) => {
                  setQaClusters(clusters);
                  channelManager?.broadcast('qa_cluster_update', clusters);
                }}
              />
            </motion.div>
          )}

          {/* TAB 4: Leaderboard Podium & Team Battle */}
          {activeTab === 'leaderboard' && (
            <motion.div
              key="tab-leaderboard"
              initial={{ opacity: 0, y: 10, scale: 0.99 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.99 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="flex-1 flex flex-col overflow-y-auto"
            >
              <LeaderboardPodium
                leaderboard={leaderboard}
                currentUserSessionId={sessionId}
                currentUserName={userName}
                onExportCard={handleOpenSocialCard}
                onOpenCertificate={() => setIsCertificateModalOpen(true)}
              />
            </motion.div>
          )}

          {/* TAB 5: Audience Feedback Surveys */}
          {activeTab === 'surveys' && (
            <motion.div
              key="tab-surveys"
              initial={{ opacity: 0, y: 10, scale: 0.99 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.99 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="flex-1 max-w-5xl mx-auto w-full"
            >
              <SurveyTab
                surveys={surveys}
                activeSurvey={activeSurvey}
                responsesBySurvey={responsesBySurvey}
                userSubmittedIds={userSubmittedIds}
                isHost={userRole === 'host'}
                isSummarizing={isSummarizing}
                onCreateSurvey={createSurvey}
                onLaunchSurvey={launchSurvey}
                onCloseSurvey={closeSurvey}
                onDeleteSurvey={deleteSurvey}
                onSubmitResponse={submitResponse}
                onGenerateAISummary={generateAISummary}
                onExportResponses={exportResponses}
              />
            </motion.div>
          )}

          {/* TAB 6: Rooms Admin Management */}
          {activeTab === 'rooms' && (
            <motion.div
              key="tab-rooms"
              initial={{ opacity: 0, y: 10, scale: 0.99 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.99 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="flex-1 flex flex-col overflow-y-auto"
            >
              <Suspense fallback={<div className="flex-1 flex items-center justify-center p-8 font-mono text-xs text-slate-400">Loading Rooms Admin...</div>}>
                <RoomsAdminView
                  currentRoomCode={room.code}
                  onSwitchRoom={handleSwitchRoom}
                  onOpenQRCodeForRoom={handleOpenQRForRoom}
                  onOpenAISummary={() => setIsAISessionReportModalOpen(true)}
                  onOpenAISettings={() => setIsAISettingsModalOpen(true)}
                  userName={userName}
                  currentUser={currentUser}
                  isHost={isHostOrAdmin}
                  hasGeneratedReport={Boolean(sessionReport)}
                />
              </Suspense>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <div className="md:hidden fixed bottom-0 inset-x-0 h-16 bg-neo-card-darker border-t-2 border-black px-1.5 flex items-center justify-around z-40 pb-safe shadow-[0_-4px_16px_rgba(0,0,0,0.6)]">
        <motion.button
          whileTap={{ scale: 0.94 }}
          onClick={() => {
            playWhoosh();
            setActiveTab('quiz');
          }}
          className={`flex-1 py-1.5 flex flex-col items-center justify-center font-mono text-[9px] xs:text-[10px] font-black uppercase transition-all cursor-pointer ${
            activeTab === 'quiz'
              ? 'bg-neo-yellow text-black border-2 border-black brutal-shadow-sm -translate-y-0.5'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Zap className="w-4 h-4 mb-0.5" />
          <span>QUIZ</span>
        </motion.button>

        <motion.button
          whileTap={{ scale: 0.94 }}
          onClick={() => {
            playWhoosh();
            setActiveTab('polls');
          }}
          className={`flex-1 py-1.5 flex flex-col items-center justify-center font-mono text-[9px] xs:text-[10px] font-black uppercase transition-all cursor-pointer ${
            activeTab === 'polls'
              ? 'bg-neo-pink text-white border-2 border-black brutal-shadow-sm -translate-y-0.5'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Vote className="w-4 h-4 mb-0.5" />
          <span>POLLS</span>
        </motion.button>

        <motion.button
          whileTap={{ scale: 0.94 }}
          onClick={() => {
            playWhoosh();
            setActiveTab('qa');
          }}
          className={`flex-1 py-1.5 flex flex-col items-center justify-center font-mono text-[9px] xs:text-[10px] font-black uppercase transition-all cursor-pointer relative ${
            activeTab === 'qa'
              ? 'bg-neo-cyan text-black border-2 border-black brutal-shadow-sm -translate-y-0.5'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <HelpCircle className="w-4 h-4 mb-0.5" />
          <span>Q&A</span>
          {filteredQuestions.length > 0 && (
            <span className="absolute top-1 right-2 w-2 h-2 bg-neo-yellow rounded-full animate-pulse" />
          )}
        </motion.button>

        <motion.button
          whileTap={{ scale: 0.94 }}
          onClick={() => {
            playWhoosh();
            setActiveTab('surveys');
          }}
          className={`flex-1 py-1.5 flex flex-col items-center justify-center font-mono text-[9px] xs:text-[10px] font-black uppercase transition-all cursor-pointer relative ${
            activeTab === 'surveys'
              ? 'bg-[#FFF04D] text-black border-2 border-black brutal-shadow-sm -translate-y-0.5'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <ClipboardList className="w-4 h-4 mb-0.5" />
          <span>SURVEYS</span>
          {activeSurvey && !userSubmittedIds.has(activeSurvey.id) && (
            <span className="absolute top-1 right-2 w-2 h-2 bg-neo-yellow rounded-full animate-pulse" />
          )}
        </motion.button>

        <motion.button
          whileTap={{ scale: 0.94 }}
          onClick={() => {
            playWhoosh();
            setActiveTab('leaderboard');
          }}
          className={`flex-1 py-1.5 flex flex-col items-center justify-center font-mono text-[9px] xs:text-[10px] font-black uppercase transition-all cursor-pointer ${
            activeTab === 'leaderboard'
              ? 'bg-neo-mint text-black border-2 border-black brutal-shadow-sm -translate-y-0.5'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Trophy className="w-4 h-4 mb-0.5" />
          <span>SCORES</span>
        </motion.button>
      </div>

      {/* Modals */}
      <QRCodeModal
        isOpen={isQRModalOpen}
        onClose={() => {
          setIsQRModalOpen(false);
          setQrRoomData(null);
        }}
        roomCode={qrRoomData?.code || room.code}
        roomTitle={qrRoomData?.title || room.title}
        activeViewerCount={activeViewerCount}
      />

      <CreatePollModal
        isOpen={isCreatePollModalOpen}
        onClose={() => setIsCreatePollModalOpen(false)}
        onCreatePoll={createPoll}
        onOpenAISettings={() => setIsAISettingsModalOpen(true)}
      />

      <QuestionModal
        isOpen={isAskModalOpen}
        onClose={() => setIsAskModalOpen(false)}
        onSubmit={submitQuestion}
        userName={userName}
        roomCode={room.code}
        sessionId={sessionId}
        isMuted={isMuted}
        currentStrikes={myStrikes}
        onRecordStrike={recordMyStrike}
        onSafeguardViolation={handleSafeguardViolation}
        existingQuestions={questions}
        onUpvoteExisting={(questionId) => {
          toggleUpvote(questionId);
          setActiveTab('qa');
        }}
      />

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        currentUser={currentUser}
        userName={userName}
        setUserName={setUserName}
        roomCode={room.code}
        onOpenChangeRoom={() => setIsChangeRoomModalOpen(true)}
      />

      <Suspense fallback={null}>
        <ChangeRoomModal
          isOpen={isChangeRoomModalOpen}
          onClose={() => setIsChangeRoomModalOpen(false)}
          onSwitchRoom={handleSwitchRoom}
          currentRoomCode={room.code}
          currentUser={currentUser}
          userName={userName}
          onOpenRoomsHub={() => setActiveTab('rooms')}
        />

        <ActiveAttendeesModal
          isOpen={isActiveAttendeesModalOpen}
          onClose={() => setIsActiveAttendeesModalOpen(false)}
          attendees={attendees}
          leaderboard={leaderboard}
          currentSessionId={sessionId}
          isHost={userRole === 'host'}
          roomCode={room.code}
          room={room}
          onPromoteToAdmin={promoteToAdmin}
          onDemoteFromAdmin={demoteFromAdmin}
          onRefresh={() => channelManager?.pingPresence()}
          mutedSessionIds={mutedSessionIds}
          strikesBySession={strikesBySession}
          onMuteAttendee={muteAttendee}
          onUnmuteAttendee={unmuteAttendee}
          onBanAttendee={banAttendee}
          onSendWarning={sendAttendeeWarning}
          onResetStrikes={resetAttendeeStrikes}
        />

        <AISettingsModal
          isOpen={isAISettingsModalOpen}
          onClose={() => setIsAISettingsModalOpen(false)}
          roomCode={room.code}
        />

        <AISessionReportModal
          isOpen={isAISessionReportModalOpen}
          onClose={() => setIsAISessionReportModalOpen(false)}
          roomTitle={room.title}
          roomCode={room.code}
          totalAttendees={activeViewerCount}
          quizzes={queuedQuizzes}
          polls={polls}
          questions={questions}
          leaderboard={leaderboard}
          isHost={isHostOrAdmin}
          initialReportMarkdown={sessionReport}
          onReportGenerated={handlePublishReport}
          onOpenAISettings={() => setIsAISettingsModalOpen(true)}
        />

        {/* Host Attendee Spotlight Roulette Wheel Modal */}
        <SpotlightRouletteModal
          isOpen={isSpotlightModalOpen}
          onClose={() => setIsSpotlightModalOpen(false)}
          attendees={attendees}
          leaderboard={leaderboard}
          currentUserName={userName}
          room={room}
          onSelectWinner={handleSelectSpotlightWinner}
        />

        {/* Realtime Spotlight Winner Celebration Modal (Shown on Winner screen) */}
        <SpotlightCelebrationModal
          isOpen={isSpotlightCelebrationOpen}
          onClose={() => setIsSpotlightCelebrationOpen(false)}
          winner={celebrationWinner}
          isMe={celebrationWinner?.targetSessionId === sessionId}
        />

        {/* Champion High-DPI Social Card Export Modal */}
        {socialCardData && (
          <ChampionSocialCardModal
            isOpen={isSocialCardModalOpen}
            onClose={() => setIsSocialCardModalOpen(false)}
            cardData={socialCardData}
          />
        )}

        {/* Masterclass Certificate Pass Modal */}
        <MasterclassCertificateModal
          isOpen={isCertificateModalOpen}
          onClose={() => setIsCertificateModalOpen(false)}
          recipientName={userName}
          roomTitle={room.title}
          roomCode={room.code}
          rank={
            leaderboard.findIndex(
              (e) => e.session_id === sessionId || (e.name && userName && e.name.toLowerCase() === userName.toLowerCase())
            ) >= 0 ? 
            leaderboard.findIndex(
              (e) => e.session_id === sessionId || (e.name && userName && e.name.toLowerCase() === userName.toLowerCase())
            ) + 1 : 1
          }
          totalAttendees={leaderboard.length || attendees.length || 1}
        />

        {/* Public Verified Certificate Modal */}
        {verifiedCertData && (
          <CertificateVerificationModal
            certData={verifiedCertData}
            onClose={handleCloseVerification}
            onEnterArena={handleEnterArenaFromCert}
          />
        )}
      </Suspense>

      {/* Official Host Warning Modal */}
      {officialWarning && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 font-sans select-text">
          <div className="bg-neo-cream text-black border-4 border-black brutal-shadow-lg p-6 max-w-md w-full font-mono">
            <div className="w-14 h-14 bg-amber-400 text-black border-3 border-black mx-auto mb-4 flex items-center justify-center brutal-shadow-sm">
              <AlertTriangle className="w-8 h-8 stroke-[2.5]" />
            </div>
            <div className="text-center">
              <span className="px-2 py-0.5 bg-black text-amber-300 font-black text-[10px] uppercase tracking-wider">
                OFFICIAL HOST DIRECTIVE
              </span>
              <h2 className="text-xl font-heavy uppercase tracking-tight text-black mt-2">
                WARNING ISSUED BY {officialWarning.issuedBy || 'HOST'}
              </h2>
              <p className="text-xs text-slate-800 font-sans mt-2.5 leading-relaxed bg-white p-3 border-2 border-black">
                {officialWarning.message}
              </p>
              <p className="text-[11px] text-red-600 font-bold mt-2 font-mono uppercase">
                ⚠️ Further inappropriate questions will result in an immediate mute or permanent ban.
              </p>
            </div>
            <div className="mt-5">
              <button
                onClick={() => {
                  playClickSound();
                  dismissOfficialWarning();
                }}
                className="w-full py-2.5 bg-neo-yellow hover:bg-[#FFF04D] text-black font-mono font-black uppercase border-2 border-black brutal-shadow cursor-pointer transition-all"
              >
                I UNDERSTAND & AGREE
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fullscreen Banned Notice Screen */}
      {isBanned && (
        <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4 font-sans select-text">
          <div className="bg-neo-cream text-black border-4 border-black brutal-shadow-lg p-6 max-w-md w-full font-mono text-center">
            <div className="w-14 h-14 bg-neo-pink text-white border-3 border-black mx-auto mb-4 flex items-center justify-center brutal-shadow-sm">
              <UserX className="w-8 h-8 stroke-[2.5]" />
            </div>
            <h2 className="text-xl font-heavy uppercase tracking-tight text-black">
              ROOM ACCESS BANNED
            </h2>
            <p className="text-xs text-slate-800 font-sans mt-2 leading-relaxed">
              {banNotice || `You have been removed and banned from Room ${room.code} by the host for repeated policy violations.`}
            </p>
            <div className="mt-5">
              <button
                onClick={() => {
                  dismissBanNotice();
                  handleSignOut();
                  window.location.href = window.location.pathname;
                }}
                className="w-full py-2.5 bg-neo-yellow text-black font-mono font-black uppercase border-2 border-black brutal-shadow hover:bg-[#FFF04D] cursor-pointer"
              >
                RETURN TO HOME
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Live Audience Floating Emoji Reactions Overlay */}
      <FloatingReactionsOverlay
        channelManager={channelManager}
        userName={userName}
      />
    </div>
  );
}

export default App;
