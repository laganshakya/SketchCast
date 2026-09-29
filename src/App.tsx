import { useState, useMemo, useEffect, useCallback, useRef, lazy, Suspense } from 'react';
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
const RoomSettingsView = lazy(() => import('./components/rooms/RoomSettingsView').then((m) => ({ default: m.RoomSettingsView })));
const UserSettingsView = lazy(() => import('./components/profile/UserSettingsView').then((m) => ({ default: m.UserSettingsView })));
const ChangeRoomModal = lazy(() => import('./components/rooms/ChangeRoomModal').then((m) => ({ default: m.ChangeRoomModal })));
const ActiveAttendeesModal = lazy(() => import('./components/common/ActiveAttendeesModal').then((m) => ({ default: m.ActiveAttendeesModal })));
const AISettingsView = lazy(() => import('./components/common/AISettingsView').then((m) => ({ default: m.AISettingsView })));
const MasterclassReportView = lazy(() => import('./components/common/MasterclassReportView').then((m) => ({ default: m.MasterclassReportView })));
const ChampionSocialCardModal = lazy(() => import('./components/quiz/ChampionSocialCardModal').then((m) => ({ default: m.ChampionSocialCardModal })));
const MasterclassCertificateModal = lazy(() => import('./components/certificate/MasterclassCertificateModal').then((m) => ({ default: m.MasterclassCertificateModal })));
const CertificateVerificationModal = lazy(() => import('./components/certificate/CertificateVerificationModal').then((m) => ({ default: m.CertificateVerificationModal })));
import { useSurveys } from './hooks/useSurveys';
import { playWhoosh, playClickSound, playPopSound, playSuccessFanfare } from './lib/soundFx';

import { isUserRoomAdmin, dbFetchRooms, isRoomCreatedByMe } from './lib/supabase';
import { generateRemediationPoll } from './lib/meshApi';
import type { ChampionSocialCardData, LeaderboardEntry, QuestionCluster, Room } from './types';
import { Zap, Vote, HelpCircle, Trophy, Layers, Sparkles, X, ShieldAlert, MicOff, UserX, AlertTriangle, RotateCcw, ClipboardList } from 'lucide-react';

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
    const score = Number(params.get('score') || 0);
    const hostName = params.get('host') || 'Arena Host';
    return {
      certId: verifyCert.trim(),
      roomCode,
      correctQuizzes,
      recipientName,
      roomTitle: rawTitle || `Masterclass Architecture Session (${roomCode})`,
      rank,
      totalAttendees,
      issueDate,
      score,
      hostName,
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
  const [isSocialCardModalOpen, setIsSocialCardModalOpen] = useState(false);
  const [socialCardData, setSocialCardData] = useState<ChampionSocialCardData | null>(null);
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
    setRoom,
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

  const autoAdvanceCallbackRef = useRef<() => void>(() => {});

  // 2. Live Quiz Engine (Isolated to room.code)
  const {
    quizState,
    leaderboard,
    timeRemaining,
    userQuizAnswers,
    startQuizRound,
    revealAnswer,
    selectOption,
    autoAdvanceCountdown,
    isAutoAdvanceEnabled,
    isAutoAdvancePaused,
    toggleAutoAdvance,
    pauseAutoAdvance,
    resumeAutoAdvance,
    startAdaptiveCampaign,
    advanceAdaptiveQuestionNow,
    adaptiveCampaign,
    extendQuestionTime,
    clearActiveQuizRound,
  } = useQuizEngine({
    channelManager,
    sessionId,
    userName,
    userRole,
    roomCode: room.code,
    appActiveTab: activeTab,
    onAutoAdvance: () => autoAdvanceCallbackRef.current(),
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
      const stored = localStorage.getItem(queueKey);
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

  // One-time startup purge of legacy un-scoped demo/fallback keys
  useEffect(() => {
    try {
      localStorage.removeItem('sketchcast_host_quiz_queue');
      localStorage.removeItem('sketchcast_surveys_default');
    } catch {
      // ignore
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
      }
    });

    return () => {
      unReport();
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

  // Safeguard: Ensure attendees cannot be on host-only tabs ('rooms' or 'ai-settings')
  useEffect(() => {
    if ((activeTab === 'rooms' || activeTab === 'ai-settings') && userRole !== 'host' && !isHostOrAdmin) {
      setActiveTab('quiz');
    }
  }, [activeTab, userRole, isHostOrAdmin, setActiveTab]);

  const myLeaderboardEntry = useMemo(() => {
    return (
      leaderboard.find(
        (e) =>
          e.session_id === sessionId ||
          (e.name && userName && e.name.toLowerCase() === userName.toLowerCase())
      ) || null
    );
  }, [leaderboard, sessionId, userName]);

  const myRank = useMemo(() => {
    if (!myLeaderboardEntry) return 1;
    const idx = leaderboard.indexOf(myLeaderboardEntry);
    return idx >= 0 ? idx + 1 : 1;
  }, [leaderboard, myLeaderboardEntry]);

  const resolvedHostName = useMemo(() => {
    // 1. If an active host is present in the attendees list, use their name
    const activeHost = attendees.find((a) => a.role === 'host' && a.name?.trim());
    if (activeHost && activeHost.name) {
      return activeHost.name.trim();
    }
    // 2. If current user is host or room admin, use current user's name
    if (userRole === 'host' || isHostOrAdmin) {
      if (userName && userName.trim()) return userName.trim();
    }
    // 3. If room has a valid host_name (excluding dummy placeholders)
    if (
      room.host_name &&
      room.host_name.trim() &&
      !['alex chen (host)', 'alex chen', 'room host', 'host admin', 'arena host'].includes(
        room.host_name.trim().toLowerCase()
      )
    ) {
      return room.host_name.replace(/\s*\(Host\)/i, '').trim();
    }
    // 4. If room has admins list, use the first named admin
    if (room.admins && room.admins.length > 0) {
      const validAdmin = room.admins.find(
        (a) => a && !a.includes('@') && !['alex chen', 'room host'].includes(a.toLowerCase())
      );
      if (validAdmin) return validAdmin.trim();
    }
    // 5. If room was created on this browser
    if (isRoomCreatedByMe(room.code) && userName) {
      return userName.trim();
    }
    // 6. Clean fallback
    return userName && userName.trim() ? userName.trim() : 'Masterclass Host';
  }, [attendees, userRole, isHostOrAdmin, userName, room]);

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
        const canModerate =
          userRole === 'host' || isUserRoomAdmin(room, currentUser, userName);
        if (canModerate) {
          playPopSound();
          setViolationAlert(alert);
        }
      }
    });

    return () => {
      unViolation();
    };
  }, [channelManager, userRole, room, currentUser, userName]);

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
    const cleanCode = newCode.toUpperCase().trim();
    const isOwner = isRoomCreatedByMe(cleanCode);
    const targetRole = isOwner ? 'host' : userRole;
    await handleAuthenticated(userName, targetRole, cleanCode, newTitle);
    setActiveTab('quiz');
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('room', cleanCode);
      url.hash = 'quiz';
      window.history.replaceState(null, '', url.toString());
    }
  };

  const handleOpenQRForRoom = (code: string, title: string) => {
    setQrRoomData({ code, title });
    setIsQRModalOpen(true);
  };

  // Check if there is a subsequent queued question or next adaptive challenge
  const hasNextQuestion = (() => {
    if (quizState.isAdaptiveCampaign || adaptiveCampaign?.isActive) {
      const current = quizState.adaptiveProgress?.current || adaptiveCampaign?.currentQuestionIndex || 1;
      const total = quizState.adaptiveProgress?.total || adaptiveCampaign?.totalQuestions || 1;
      return current < total;
    }

    try {
      const queueKey = `sketchcast_host_quiz_queue_${room.code.toUpperCase().trim()}`;
      const stored = localStorage.getItem(queueKey);
      if (stored) {
        const queue = JSON.parse(stored);
        if (Array.isArray(queue) && queue.length > 0) {
          const currentId = quizState.question?.id ? String(quizState.question.id).trim().toLowerCase() : '';
          const currentText = quizState.question?.question ? quizState.question.question.trim().toLowerCase() : '';
          const currentIndex = queue.findIndex(
            (q: any) =>
              (currentId && q && q.id && String(q.id).trim().toLowerCase() === currentId) ||
              (currentText && q && q.question && q.question.trim().toLowerCase() === currentText)
          );
          return currentIndex >= 0 && currentIndex + 1 < queue.length;
        }
      }
    } catch {
      // ignore
    }
    return false;
  })();

  // Host action: Quiz completion handler (transitions to Leaderboard with fanfare & confetti)
  const handleQuizComplete = useCallback(() => {
    setActiveTab('leaderboard');
    playSuccessFanfare();
    try {
      confetti({
        particleCount: 90,
        spread: 80,
        origin: { y: 0.5 },
        colors: ['#3B82F6', '#FAFAFA', '#10B981', '#F59E0B'],
      });
    } catch {
      // ignore
    }

    clearActiveQuizRound({ isFinished: true });

    if (channelManager) {
      channelManager.broadcast('quiz_completed', {
        roomId: room.code,
        completedAt: Date.now(),
      });
    }
  }, [channelManager, clearActiveQuizRound, room.code, setActiveTab]);

  // Host action: Launch next queued question in sequence or advance adaptive challenge
  const handleNextQuestion = useCallback(() => {
    if (quizState.isAdaptiveCampaign || adaptiveCampaign?.isActive) {
      advanceAdaptiveQuestionNow();
      return;
    }

    try {
      const queueKey = `sketchcast_host_quiz_queue_${room.code.toUpperCase().trim()}`;
      const stored = localStorage.getItem(queueKey);
      if (stored) {
        const queue = JSON.parse(stored);
        if (Array.isArray(queue) && queue.length > 0) {
          const currentId = quizState.question?.id ? String(quizState.question.id).trim().toLowerCase() : '';
          const currentText = quizState.question?.question ? quizState.question.question.trim().toLowerCase() : '';
          const currentIndex = queue.findIndex(
            (q: any) =>
              (currentId && q && q.id && String(q.id).trim().toLowerCase() === currentId) ||
              (currentText && q && q.question && q.question.trim().toLowerCase() === currentText)
          );
          if (currentIndex >= 0 && currentIndex + 1 < queue.length) {
            startQuizRound(queue[currentIndex + 1]);
            return;
          }
        }
      }
    } catch {
      // ignore
    }

    handleQuizComplete();
  }, [
    room.code,
    quizState.question,
    quizState.isAdaptiveCampaign,
    adaptiveCampaign,
    advanceAdaptiveQuestionNow,
    startQuizRound,
    handleQuizComplete,
  ]);

  // Sync auto-advance callback ref for useQuizEngine
  useEffect(() => {
    autoAdvanceCallbackRef.current = () => {
      if (hasNextQuestion) {
        handleNextQuestion();
      } else {
        handleQuizComplete();
      }
    };
  }, [hasNextQuestion, handleNextQuestion, handleQuizComplete]);

  // Attendee realtime listener for quiz completion
  useEffect(() => {
    if (!channelManager) return;
    const unQuizCompleted = channelManager.on('quiz_completed', (payload) => {
      if (payload.roomId.toUpperCase().trim() === room.code.toUpperCase().trim()) {
        clearActiveQuizRound({ isFinished: true });
        setActiveTab('leaderboard');
        playSuccessFanfare();
        try {
          confetti({
            particleCount: 90,
            spread: 80,
            origin: { y: 0.5 },
            colors: ['#3B82F6', '#FAFAFA', '#10B981', '#F59E0B'],
          });
        } catch {
          // ignore
        }
      }
    });
    return () => {
      unQuizCompleted();
    };
  }, [channelManager, clearActiveQuizRound, room.code, setActiveTab]);

  const handleOpenSocialCard = (entry: LeaderboardEntry, rank: number) => {
    const isMe =
      Boolean(sessionId && entry.session_id === sessionId) ||
      Boolean(userName && entry.name && entry.name.trim().toLowerCase() === userName.trim().toLowerCase());
    if (!isMe) return;

    const calculatedScore = entry.correct_quizzes * 100;
    setSocialCardData({
      playerName: entry.name,
      rank,
      score: calculatedScore,
      correctQuizzes: entry.correct_quizzes,
      totalQuizzes: entry.correct_quizzes,
      pollsVoted: 0,
      roomCode: room.code,
      roomTitle: room.title,
      hostName: resolvedHostName,
      totalAttendees: leaderboard.length || attendees.length || 1,
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
    <div className="h-screen w-full max-w-full flex flex-col bg-paper text-ink overflow-hidden font-sans select-none">
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
        onOpenAISettings={() => setActiveTab('ai-settings')}
        onOpenAISummary={() => setActiveTab('session-report')}
        onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
        onSignOut={handleSignOut}
        currentUser={currentUser}
      />

      {/* Floating Promotion Toast Notification */}
      {promotionToast && (
        <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50">
          <div className="bg-ink text-paper font-mono text-xs px-4 py-2.5 rounded-xl border border-hairline shadow-xl flex items-center space-x-2">
            <Sparkles className="w-4 h-4 text-lime shrink-0" />
            <span>{promotionToast}</span>
            <button
              onClick={() => setPromotionToast(null)}
              className="p-1 hover:bg-white/10 text-muted hover:text-paper rounded-lg transition-colors ml-2 cursor-pointer"
            >
              <X className="w-3 h-3" />
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
            className="fixed top-16 left-1/2 -translate-x-1/2 z-50 w-[95%] max-w-xl bg-paper-elevated text-ink border-2 border-orange shadow-2xl rounded-2xl p-4 font-mono"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start space-x-3 min-w-0">
                <div className="w-9 h-9 sm:w-10 sm:h-10 bg-orange/15 text-orange border border-orange/30 rounded-xl flex items-center justify-center shrink-0">
                  <ShieldAlert className="w-5 h-5 stroke-[2.5]" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs sm:text-sm uppercase tracking-tight text-ink font-bold font-sans">
                      SAFEGUARD STRIKE ALERT
                    </span>
                    <span className="px-2 py-0.5 bg-orange text-white text-[9px] font-bold uppercase rounded-full">
                      STRIKE {violationAlert.strikeCount}/3
                    </span>
                    {violationAlert.category && (
                      <span className="px-2 py-0.5 bg-paper-card text-muted text-[9px] font-bold uppercase rounded-full border border-hairline">
                        {violationAlert.category}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-ink/80 font-medium mt-1">
                    Attendee <span className="bg-ink text-lime px-1.5 py-0.5 rounded font-mono font-bold">{violationAlert.attendeeName}</span> repeatedly violated Q&A safety guidelines.
                  </p>
                  <div className="text-[11px] text-muted font-sans mt-1.5 bg-paper-card p-2.5 rounded-xl border border-hairline leading-snug">
                    <span className="font-bold text-ink">Reason:</span> {violationAlert.reason}
                    {violationAlert.sampleText && (
                      <span className="block italic text-[10px] text-muted truncate mt-0.5">
                        &ldquo;{violationAlert.sampleText}&rdquo;
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <button
                onClick={() => setViolationAlert(null)}
                className="p-1 bg-paper-card hover:bg-black/[0.05] text-muted hover:text-ink border border-hairline rounded-lg cursor-pointer shrink-0 transition-colors"
                title="Dismiss alert"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Quick Action Buttons */}
            <div className="flex flex-wrap items-center justify-end gap-2 mt-3 pt-2 border-t border-[#27272A]">
              <button
                onClick={() => {
                  playPopSound();
                  sendAttendeeWarning(violationAlert.attendeeSessionId, violationAlert.attendeeName);
                }}
                className="px-3 py-1.5 bg-[#F59E0B]/20 hover:bg-[#F59E0B]/30 text-[#F59E0B] font-mono text-xs font-bold uppercase border border-[#F59E0B]/50 flex items-center space-x-1.5 cursor-pointer"
                title="Send official safeguard warning to attendee"
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>WARN ATTENDEE</span>
              </button>
              <button
                onClick={() => {
                  playPopSound();
                  resetAttendeeStrikes(violationAlert.attendeeSessionId, violationAlert.attendeeName);
                  setViolationAlert(null);
                }}
                className="px-3 py-1.5 bg-[#18181D] hover:bg-[#22222A] text-[#FAFAFA] font-mono text-xs font-bold uppercase border border-[#27272A] flex items-center space-x-1.5 cursor-pointer"
                title="Reset strikes"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>RESET STRIKES</span>
              </button>
              <button
                onClick={() => {
                  playPopSound();
                  muteAttendee(violationAlert.attendeeSessionId, violationAlert.attendeeName);
                  setViolationAlert(null);
                }}
                className="px-3 py-1.5 bg-[#18181D] hover:bg-[#22222A] text-[#FAFAFA] font-mono text-xs font-bold uppercase border border-[#27272A] flex items-center space-x-1.5 cursor-pointer"
              >
                <MicOff className="w-3.5 h-3.5 text-[#3B82F6]" />
                <span>MUTE ATTENDEE</span>
              </button>
              <button
                onClick={() => {
                  playClickSound();
                  if (confirm(`Ban and eject "${violationAlert.attendeeName}" from this room?`)) {
                    banAttendee(violationAlert.attendeeSessionId, violationAlert.attendeeName);
                    setViolationAlert(null);
                  }
                }}
                className="px-3 py-1.5 bg-[#EF4444] hover:bg-[#DC2626] text-white font-mono text-xs font-bold uppercase border border-[#EF4444] flex items-center space-x-1.5 cursor-pointer"
              >
                <UserX className="w-3.5 h-3.5" />
                <span>BAN & KICK</span>
              </button>
              <button
                onClick={() => setViolationAlert(null)}
                className="px-2.5 py-1.5 bg-[#121215] hover:bg-[#18181D] text-[#A1A1AA] font-mono text-xs uppercase border border-[#27272A] cursor-pointer"
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
            className="fixed top-16 left-1/2 -translate-x-1/2 z-50 w-[95%] max-w-lg bg-ink text-paper border border-lime/40 shadow-2xl rounded-2xl p-4 font-mono flex items-center justify-between gap-3"
          >
            <div className="flex items-center space-x-3 min-w-0">
              <div className="w-10 h-10 bg-lime/20 text-lime border border-lime/40 rounded-xl flex items-center justify-center shrink-0 font-bold">
                <ClipboardList className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 bg-lime text-ink rounded-full">
                  SURVEY LAUNCHED
                </span>
                <h4 className="text-xs sm:text-sm font-bold uppercase tracking-tight text-paper truncate mt-1">
                  {incomingSurveyAlert.surveyTitle}
                </h4>
                <p className="text-[11px] text-paper/70 font-sans truncate">
                  Host {incomingSurveyAlert.launchedBy} invited you to provide feedback.
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2 shrink-0">
              <button
                onClick={() => {
                  playPopSound();
                  setActiveTab('surveys');
                  dismissSurveyAlert();
                }}
                className="px-3.5 py-1.5 btn-noma-lime font-mono text-xs font-bold uppercase cursor-pointer whitespace-nowrap rounded-xl shadow-xs"
              >
                TAKE SURVEY
              </button>
              <button
                onClick={dismissSurveyAlert}
                className="p-1.5 hover:bg-white/10 text-paper/70 hover:text-paper rounded-lg cursor-pointer transition-colors"
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
          onOpenAISettings={() => setActiveTab('ai-settings')}
          onOpenAISummary={() => setActiveTab('session-report')}
          onOpenCertificate={() => setIsCertificateModalOpen(true)}
          onSignOut={handleSignOut}
          isOpenMobile={isMobileSidebarOpen}
          onCloseMobile={() => setIsMobileSidebarOpen(false)}
        />

        {/* Main Content Area with Framer Motion Spring Transitions */}
        <main className="flex-1 flex overflow-y-auto relative p-2 sm:p-4 md:p-5 pb-44 sm:pb-48 md:pb-8">
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
                <div className="lg:hidden flex items-center justify-center p-1 bg-paper-card border border-hairline rounded-2xl font-mono text-xs font-bold shrink-0">
                  <motion.button
                    whileTap={{ scale: 0.96 }}
                    onClick={() => {
                      playClickSound();
                      setMobileHostQuizView('arena');
                    }}
                    className={`flex-1 py-2 rounded-xl flex items-center justify-center space-x-1.5 uppercase transition-all cursor-pointer ${
                      mobileHostQuizView === 'arena'
                        ? 'bg-ink text-paper shadow-xs'
                        : 'text-muted hover:text-ink'
                    }`}
                  >
                    <Zap className="w-3.5 h-3.5 text-lime" />
                    <span>LIVE ARENA</span>
                  </motion.button>
                  <motion.button
                    whileTap={{ scale: 0.96 }}
                    onClick={() => {
                      playClickSound();
                      setMobileHostQuizView('controls');
                    }}
                    className={`flex-1 py-2 rounded-xl flex items-center justify-center space-x-1.5 uppercase transition-all cursor-pointer ${
                      mobileHostQuizView === 'controls'
                        ? 'bg-ink text-paper shadow-xs'
                        : 'text-muted hover:text-ink'
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5 text-orange" />
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
                  onClearActiveQuiz={() => clearActiveQuizRound({ isFinished: false })}
                  onViewScores={() => setActiveTab('leaderboard')}
                  isHost={userRole === 'host'}
                  autoAdvanceCountdown={autoAdvanceCountdown}
                  isAutoAdvanceEnabled={isAutoAdvanceEnabled}
                  isAutoAdvancePaused={isAutoAdvancePaused}
                  onToggleAutoAdvance={toggleAutoAdvance}
                  onPauseAutoAdvance={pauseAutoAdvance}
                  onResumeAutoAdvance={resumeAutoAdvance}
                  onExtendTime={extendQuestionTime}
                  onLaunchRemediationPoll={async ({ question, mostPickedWrong }) => {
                    pauseAutoAdvance();
                    const wrongOptText = mostPickedWrong?.text;
                    const correctOpt = question.options?.find((o) => o.id === question.correctOptionId);
                    const poll = await generateRemediationPoll({
                      questionText: question.question,
                      correctOptionText: question.expectedAnswer || correctOpt?.text || question.correctOptionId,
                      wrongOptionText: question.questionType === 'short_answer'
                        ? (wrongOptText === 'Other' ? 'Alternative architectural pattern' : wrongOptText)
                        : wrongOptText,
                      explanation: question.explanation,
                    });
                    createPoll(poll.question, poll.options);
                    setActiveTab('polls');
                  }}
                  roomCode={room.code}
                  roomTitle={room.title}
                  sponsorCTA={room.sponsor_cta}
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
                    onStartAdaptiveCampaign={startAdaptiveCampaign}
                    activeQuestionId={quizState.question?.id}
                    isRevealed={quizState.isRevealed}
                    roomCode={room.code}
                    onOpenAISettings={() => setActiveTab('ai-settings')}
                    onClearActiveQuiz={clearActiveQuizRound}
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
              className="flex-1 flex flex-col overflow-y-auto pb-40 sm:pb-44 md:pb-8"
            >
              <LivePollsView
                polls={polls}
                userVotes={userVotes}
                onVote={voteOnPoll}
                onOpenCreatePoll={() => setIsCreatePollModalOpen(true)}
                onResetPoll={resetPoll}
                onDeletePoll={deletePoll}
                onUpdateAIConsensus={updatePollAIConsensus}
                onOpenAISettings={() => setActiveTab('ai-settings')}
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
                onOpenAISettings={() => setActiveTab('ai-settings')}
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
              className="flex-1 flex flex-col overflow-y-auto pb-40 sm:pb-44 md:pb-8"
            >
              <LeaderboardPodium
                leaderboard={leaderboard}
                currentUserSessionId={sessionId}
                currentUserName={userName}
                onExportCard={handleOpenSocialCard}
                onOpenCertificate={() => setIsCertificateModalOpen(true)}
                roomCode={room.code}
                roomTitle={room.title}
                sponsorCTA={room.sponsor_cta}
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
                sessionContext={{
                  roomTitle: room.title,
                  quizzes: [
                    ...(quizState.question ? [quizState.question.question] : []),
                    ...queuedQuizzes.map((q: any) => q.question || q.topic),
                  ].filter(Boolean),
                  questions: questions.map((q) => ({ content: q.content, upvotes: q.upvotes_count || 0 })),
                  polls: polls.map((p) => p.question).filter(Boolean),
                }}
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

          {/* TAB 6: Current Room Settings */}
          {activeTab === 'rooms' && (
            <motion.div
              key="tab-rooms"
              initial={{ opacity: 0, y: 10, scale: 0.99 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.99 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="flex-1 flex flex-col overflow-y-auto"
            >
              <Suspense fallback={<div className="flex-1 flex items-center justify-center p-8 font-mono text-xs text-slate-400">Loading Room Settings...</div>}>
                <RoomSettingsView
                  room={room}
                  onUpdateRoomTitle={(newTitle) => {
                    setRoom((prev: Room) => ({ ...prev, title: newTitle }));
                  }}
                  onUpdateRoomAdmins={(newAdmins) => {
                    setRoom((prev: Room) => ({ ...prev, admins: newAdmins }));
                  }}
                  onUpdateRoomSponsor={(cta) => {
                    setRoom((prev: Room) => ({ ...prev, sponsor_cta: cta }));
                  }}
                  onOpenQRCode={() => handleOpenQRForRoom(room.code, room.title)}
                  onOpenChangeRoom={() => setIsChangeRoomModalOpen(true)}
                  onDeleteCurrentRoom={async () => {
                    const fallbackCode = 'SKT-789';
                    await handleSwitchRoom(fallbackCode);
                  }}
                  onResetRoomState={() => {
                    try {
                      const cleanCode = room.code.toUpperCase().trim();
                      localStorage.removeItem(`sketchcast_host_quiz_queue_${cleanCode}`);
                      localStorage.removeItem(`sketchcast_surveys_${cleanCode}`);
                      localStorage.removeItem(`sketchcast_survey_responses_${cleanCode}`);
                      localStorage.removeItem(`sketchcast_active_quiz_round_${cleanCode}`);
                      localStorage.removeItem(`sketchcast_quiz_user_answers_${cleanCode}`);
                      localStorage.removeItem(`sketchcast_host_quiz_completed_${cleanCode}`);
                      localStorage.removeItem(`sketchcast_polls_${cleanCode}`);
                      localStorage.removeItem(`sketchcast_session_report_${cleanCode}`);
                    } catch {
                      // ignore
                    }
                  }}
                  isHost={isHostOrAdmin}
                  currentUser={currentUser}
                  userName={userName}
                />
              </Suspense>
            </motion.div>
          )}

          {/* TAB 6.5: User Settings & Affiliate Monetization Hub */}
          {activeTab === 'user-settings' && (
            <motion.div
              key="tab-user-settings"
              initial={{ opacity: 0, y: 10, scale: 0.99 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.99 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="flex-1 flex flex-col overflow-y-auto"
            >
              <Suspense fallback={<div className="flex-1 flex items-center justify-center p-8 font-mono text-xs text-slate-400">Loading Profile & User Settings...</div>}>
                <UserSettingsView
                  userName={userName}
                  setUserName={setUserName}
                  userRole={userRole}
                  setUserRole={setUserRole}
                  currentUser={currentUser}
                  sessionId={sessionId}
                  currentRoomCode={room.code}
                  onSwitchRoom={handleSwitchRoom}
                  onOpenQRCodeForRoom={handleOpenQRForRoom}
                  onOpenAuthModal={() => setIsAuthModalOpen(true)}
                  onSignOut={handleSignOut}
                  onNavigateToRoomSettings={() => setActiveTab('rooms')}
                />
              </Suspense>
            </motion.div>
          )}

          {/* TAB 7: AI Settings */}
          {activeTab === 'ai-settings' && (
            <motion.div
              key="tab-ai-settings"
              initial={{ opacity: 0, y: 10, scale: 0.99 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.99 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="flex-1 flex flex-col overflow-y-auto"
            >
              <Suspense fallback={<div className="flex-1 flex items-center justify-center p-8 font-mono text-xs text-slate-400">Loading AI Settings...</div>}>
                <AISettingsView roomCode={room.code} />
              </Suspense>
            </motion.div>
          )}

          {/* TAB 8: Masterclass Session Report */}
          {activeTab === 'session-report' && (
            <motion.div
              key="tab-session-report"
              initial={{ opacity: 0, y: 10, scale: 0.99 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.99 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="flex-1 flex flex-col overflow-y-auto pb-40 sm:pb-44 md:pb-8"
            >
              <Suspense fallback={<div className="flex-1 flex items-center justify-center p-8 font-mono text-xs text-slate-400">Loading Masterclass Report...</div>}>
                <MasterclassReportView
                  roomTitle={room.title}
                  roomCode={room.code}
                  totalAttendees={activeViewerCount}
                  quizzes={queuedQuizzes}
                  polls={polls}
                  questions={questions}
                  leaderboard={leaderboard}
                  isHost={isHostOrAdmin}
                  initialReportMarkdown={sessionReport}
                  userQuizAnswers={userQuizAnswers}
                  userPollVotes={userVotes}
                  onReportGenerated={handlePublishReport}
                  onOpenAISettings={() => setActiveTab('ai-settings')}
                  sponsorCTA={room.sponsor_cta}
                />
              </Suspense>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <div className="md:hidden fixed bottom-0 inset-x-0 min-h-[64px] bg-paper/95 backdrop-blur-md border-t border-hairline px-1 sm:px-2 flex items-center justify-around z-40 pb-safe shadow-lg">
        <motion.button
          whileTap={{ scale: 0.94 }}
          onClick={() => {
            playWhoosh();
            setActiveTab('quiz');
          }}
          className={`flex-1 py-2 mx-0.5 rounded-xl flex flex-col items-center justify-center font-mono text-[9px] xs:text-[10px] font-bold uppercase transition-all cursor-pointer ${
            activeTab === 'quiz'
              ? 'bg-ink text-paper shadow-xs'
              : 'text-muted hover:text-ink'
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
          className={`flex-1 py-2 mx-0.5 rounded-xl flex flex-col items-center justify-center font-mono text-[9px] xs:text-[10px] font-bold uppercase transition-all cursor-pointer ${
            activeTab === 'polls'
              ? 'bg-ink text-paper shadow-xs'
              : 'text-muted hover:text-ink'
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
          className={`flex-1 py-2 mx-0.5 rounded-xl flex flex-col items-center justify-center font-mono text-[9px] xs:text-[10px] font-bold uppercase transition-all cursor-pointer relative ${
            activeTab === 'qa'
              ? 'bg-ink text-paper shadow-xs'
              : 'text-muted hover:text-ink'
          }`}
        >
          <HelpCircle className="w-4 h-4 mb-0.5" />
          <span>Q&A</span>
          {filteredQuestions.length > 0 && (
            <span className="absolute top-1 right-2 w-2 h-2 bg-orange rounded-full ring-2 ring-paper animate-pulse" />
          )}
        </motion.button>

        <motion.button
          whileTap={{ scale: 0.94 }}
          onClick={() => {
            playWhoosh();
            setActiveTab('surveys');
          }}
          className={`flex-1 py-2 mx-0.5 rounded-xl flex flex-col items-center justify-center font-mono text-[9px] xs:text-[10px] font-bold uppercase transition-all cursor-pointer relative ${
            activeTab === 'surveys'
              ? 'bg-ink text-paper shadow-xs'
              : 'text-muted hover:text-ink'
          }`}
        >
          <ClipboardList className="w-4 h-4 mb-0.5" />
          <span>SURVEYS</span>
          {activeSurvey && !userSubmittedIds.has(activeSurvey.id) && (
            <span className="absolute top-1 right-2 w-2 h-2 bg-orange rounded-full ring-2 ring-paper animate-pulse" />
          )}
        </motion.button>

        <motion.button
          whileTap={{ scale: 0.94 }}
          onClick={() => {
            playWhoosh();
            setActiveTab('leaderboard');
          }}
          className={`flex-1 py-2 mx-0.5 rounded-xl flex flex-col items-center justify-center font-mono text-[9px] xs:text-[10px] font-bold uppercase transition-all cursor-pointer ${
            activeTab === 'leaderboard'
              ? 'bg-ink text-paper shadow-xs'
              : 'text-muted hover:text-ink'
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
        onOpenAISettings={() => setActiveTab('ai-settings')}
        sessionContext={{
          roomTitle: room.title,
          quizzes: [
            ...(quizState.question ? [quizState.question.question] : []),
            ...queuedQuizzes.map((q: any) => q.question || q.topic),
          ].filter(Boolean),
          questions: questions.map((q) => ({ content: q.content, upvotes: q.upvotes_count || 0 })),
          surveys: surveys.map((s) => s.title).filter(Boolean),
        }}
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
          onOpenRoomsHub={() => setActiveTab('user-settings')}
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
          rank={myRank}
          totalAttendees={leaderboard.length || attendees.length || 1}
          score={myLeaderboardEntry ? myLeaderboardEntry.correct_quizzes * 100 : 0}
          correctQuizzes={myLeaderboardEntry?.correct_quizzes || 0}
          hostName={resolvedHostName}
          sponsorCTA={room.sponsor_cta}
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
        <div className="fixed inset-0 z-50 bg-ink/70 backdrop-blur-sm flex items-center justify-center p-4 font-sans select-text">
          <div className="bg-paper text-ink border-2 border-orange rounded-3xl shadow-2xl p-6 max-w-md w-full font-mono">
            <div className="w-12 h-12 bg-orange/15 text-orange border border-orange/30 rounded-2xl mx-auto mb-4 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 stroke-[2]" />
            </div>
            <div className="text-center">
              <span className="px-3 py-1 bg-orange/15 text-orange font-bold text-[10px] uppercase tracking-wider rounded-full border border-orange/30">
                OFFICIAL HOST DIRECTIVE
              </span>
              <h2 className="text-xl font-display font-bold uppercase tracking-tight text-ink mt-3">
                WARNING ISSUED BY {officialWarning.issuedBy || 'HOST'}
              </h2>
              <p className="text-xs text-ink/80 font-sans mt-3 leading-relaxed bg-paper-card p-4 rounded-2xl border border-hairline">
                {officialWarning.message}
              </p>
              <p className="text-[11px] text-orange font-semibold mt-3 font-mono uppercase">
                Continued guideline violations will trigger an automatic mute or room ejection.
              </p>
            </div>
            <div className="mt-6">
              <button
                onClick={() => {
                  playClickSound();
                  dismissOfficialWarning();
                }}
                className="w-full py-3 btn-noma-orange font-mono text-xs font-bold uppercase rounded-xl cursor-pointer"
              >
                I UNDERSTAND & AGREE
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fullscreen Banned Notice Screen */}
      {isBanned && (
        <div className="fixed inset-0 z-50 bg-ink/80 backdrop-blur-md flex items-center justify-center p-4 font-sans select-text">
          <div className="bg-paper text-ink border-2 border-red-500 rounded-3xl shadow-2xl p-6 max-w-md w-full font-mono text-center">
            <div className="w-12 h-12 bg-red-500/10 text-red-500 border border-red-500/30 rounded-2xl mx-auto mb-4 flex items-center justify-center">
              <UserX className="w-6 h-6 stroke-[2]" />
            </div>
            <h2 className="text-xl font-display font-bold uppercase tracking-tight text-ink">
              ROOM ACCESS BANNED
            </h2>
            <p className="text-xs text-muted font-sans mt-2 leading-relaxed">
              {banNotice || `You have been removed and banned from Room ${room.code} by the host for repeated policy violations.`}
            </p>
            <div className="mt-6">
              <button
                onClick={() => {
                  dismissBanNotice();
                  handleSignOut();
                  window.location.href = window.location.pathname;
                }}
                className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-mono text-xs font-bold uppercase rounded-xl transition-colors cursor-pointer"
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
